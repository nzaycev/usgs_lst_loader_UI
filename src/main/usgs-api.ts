import axios, { AxiosError, AxiosInstance } from "axios";
import { BrowserWindow } from "electron";
import { EventEmitter } from "events";
import { USGSLayerType } from "../actions/main-actions";
import { ISearchScenesFilter } from "../tools/ElectronApi";
import { SettingsChema, store } from "./settings-store";

const USGS_API_URL = "https://m2m.cr.usgs.gov/api/api/json/stable";
const datasetName = "landsat_ot_c2_l2";

export type AuthStatus = "guest" | "authorizing" | "authorized";

export interface UsgsApiStatus {
  auth: AuthStatus;
  username?: string;
}

interface CachedPermissions {
  result: { data: any } | null;
  timestamp: number;
  username: string;
}

class UsgsApiManager extends EventEmitter {
  private axiosInstance: AxiosInstance;
  private authStatus: AuthStatus = "guest";
  private username?: string;
  private isGetActiveSessionRequest = false;
  private requestQueue: Array<(cookie: string, xAuth: string) => void> = [];
  private mainWindow?: BrowserWindow;
  private loginPromise: Promise<{ data: any } | null> | null = null;
  private permissionsCache: CachedPermissions | null = null;
  private readonly PERMISSIONS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    super();
    this.axiosInstance = axios.create({
      baseURL: USGS_API_URL,
    });

    // Setup request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log("[USGS API] Request:", {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullUrl: `${config.baseURL}${config.url}`,
          hasData: !!config.data,
          dataSize: config.data ? JSON.stringify(config.data).length : 0,
        });
        return config;
      },
      (error) => {
        console.error("[USGS API] Request error:", error);
        return Promise.reject(error);
      }
    );

    // Setup response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log("[USGS API] Response:", {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          statusText: response.statusText,
          hasData: !!response.data,
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
        });
        return response;
      },
      (error: AxiosError) => {
        console.error("[USGS API] Response error:", {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          hasResponseData: !!error.response?.data,
        });
        return this.handleError(error);
      }
    );

    // Connection status is handled by network-test system
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setAuthStatus(status: AuthStatus, username?: string) {
    if (this.authStatus !== status || this.username !== username) {
      this.authStatus = status;
      this.username = username;
      // Clear cache if status changed to guest
      if (status === "guest") {
        this.permissionsCache = null;
      }
      this.emitStatusChange();
    }
  }

  private emitStatusChange() {
    const status: UsgsApiStatus = {
      auth: this.authStatus,
      username: this.username,
    };
    this.emit("status-change", status);
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("usgs-api-status-change", status);
    }
  }

  getStatus(): UsgsApiStatus {
    return {
      auth: this.authStatus,
      username: this.username,
    };
  }

  // Connection status is handled by network-test system, not here

  private async createSession(creds: SettingsChema["userdata"]) {
    console.log("[USGS API] createSession: Sending login-token request", {
      url: `${USGS_API_URL}/login-token`,
      username: creds.username,
    });
    const resp = await axios.post(`${USGS_API_URL}/login-token`, creds);
    console.log("[USGS API] createSession: Received response", {
      status: resp.status,
      statusText: resp.statusText,
      hasCookie: !!resp.headers["set-cookie"],
    });
    const { data } = resp.data;
    const [cookie] = resp.headers["set-cookie"] || [];

    (this.axiosInstance.defaults.headers as any)["User-Agent"] = "Node USGS";
    (this.axiosInstance.defaults.headers as any)["X-Auth-Token"] = data;
    (this.axiosInstance.defaults.headers as any)["Cookie"] = cookie;

    return [cookie, data] as [string, string];
  }

  private callRequestsFromQueue(cookie: string, xAuth: string) {
    this.requestQueue.forEach((sub) => sub(cookie, xAuth));
  }

  private addRequestToQueue(sub: (cookie: string, xAuth: string) => void) {
    this.requestQueue.push(sub);
  }

  private clearQueue() {
    this.requestQueue = [];
  }

  // Network error detection is handled by network-test system, not here

  private async handleError(error: AxiosError): Promise<any> {
    const { response, config: sourceConfig } = error;

    // Network status is handled by network-test system, not here
    if (!response) {
      return Promise.reject(error);
    }

    // Handle 401/403 errors - these are auth errors
    if (response.status === 401 || response.status === 403) {
      // If 403 and no data, user needs to login
      if (response.status === 403 && !response.data) {
        this.setAuthStatus("guest");
        // Notify main window to open login dialog
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send("open-login-dialog-403", {
            targetRoute: "/",
          });
        }
        return Promise.reject(error);
      }

      // Try to recreate session if we have credentials
      if (!this.isGetActiveSessionRequest && response.data) {
        this.isGetActiveSessionRequest = true;
        const creds = this.getStoredCredentials();
        if (creds?.username && creds?.token) {
          this.createSession(creds)
            .then(([cookie, xAuth]) => {
              this.isGetActiveSessionRequest = false;
              this.callRequestsFromQueue(cookie, xAuth);
              this.clearQueue();
            })
            .catch((e) => {
              this.isGetActiveSessionRequest = false;
              console.error("Create session error:", e);
              this.clearQueue();
            });
        } else {
          this.isGetActiveSessionRequest = false;
        }
      }

      // Queue the request to retry with new session
      const retryRequest = new Promise((resolve) => {
        if (!response.data) {
          setTimeout(() => {
            resolve(this.axiosInstance(sourceConfig!));
          }, 5000);
        }
        this.addRequestToQueue((cookie: string, xAuth: string) => {
          if (sourceConfig) {
            console.log("[USGS API] Retrying queued request with new session", {
              method: sourceConfig.method?.toUpperCase(),
              url: sourceConfig.url,
              baseURL: sourceConfig.baseURL,
            });
            sourceConfig.headers = sourceConfig.headers || {};
            sourceConfig.headers.Cookie = cookie;
            sourceConfig.headers["X-Auth-Token"] = xAuth;
            resolve(axios(sourceConfig));
          }
        });
      });

      return retryRequest;
    }

    return Promise.reject(error);
  }

  private getStoredCredentials(): SettingsChema["userdata"] | undefined {
    try {
      return store.get("userdata") as SettingsChema["userdata"] | undefined;
    } catch (e) {
      return undefined;
    }
  }

  async login(creds: SettingsChema["userdata"]): Promise<{ data: any } | null> {
    console.log("[USGS API] login() called", {
      hasActiveLogin: !!this.loginPromise,
      username: creds.username,
    });

    // If login is already in progress, wait for it to complete
    if (this.loginPromise) {
      console.log(
        "[USGS API] Login already in progress, waiting for existing promise"
      );
      return this.loginPromise;
    }

    console.log("[USGS API] Starting new login process");
    // Start new login process
    this.loginPromise = this.performLogin(creds).finally(() => {
      // Clear the promise when done (success or failure)
      console.log("[USGS API] Login process completed, clearing promise");
      this.loginPromise = null;
    });

    return this.loginPromise;
  }

  private async performLogin(
    creds: SettingsChema["userdata"]
  ): Promise<{ data: any } | null> {
    try {
      console.log("[USGS API] performLogin() started", {
        username: creds.username,
      });
      this.setAuthStatus("authorizing");

      // Logout first with the credentials that came in (as in old code)
      // This allows using same login on multiple devices
      try {
        console.log("[USGS API] Attempting logout with provided credentials", {
          url: `${USGS_API_URL}/logout`,
          username: creds.username,
        });
        const logoutResp = await axios.post(`${USGS_API_URL}/logout`, creds, {
          timeout: 5000,
        });
        console.log("[USGS API] Logout successful", {
          status: logoutResp.status,
          statusText: logoutResp.statusText,
        });
      } catch (e) {
        // Logout errors are expected if there's no active session
        if (e && typeof e === "object" && "response" in e) {
          const axiosError = e as {
            response?: { status?: number; statusText?: string };
          };
          console.log("[USGS API] Logout failed (ignored)", {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
          });
        } else {
          console.log("[USGS API] Logout failed (ignored)", { error: e });
        }
      }

      console.log("[USGS API] Sending login-token request", {
        url: `${USGS_API_URL}/login-token`,
        username: creds.username,
      });
      let resp;
      try {
        resp = await axios.post(`${USGS_API_URL}/login-token`, creds);
        console.log("[USGS API] Login-token request successful", {
          status: resp.status,
          statusText: resp.statusText,
          hasCookie: !!resp.headers["set-cookie"],
        });
      } catch (e) {
        console.error("[USGS API] Login-token request failed:", e);
        if (e && typeof e === "object" && "response" in e) {
          const axiosError = e as {
            response?: { status?: number; statusText?: string; data?: unknown };
          };
          console.error("[USGS API] Login-token error details:", {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
          });
        }
        throw e;
      }

      // Parse response as in old code: resp.data contains { data: token }
      const responseData = resp.data;
      const [cookie] = resp.headers["set-cookie"] || [];

      // Check for API errors first (as in old code)
      if (responseData.errorCode || responseData.errorMessage) {
        const errorMsg =
          responseData.errorMessage || `API error: ${responseData.errorCode}`;
        console.error("[USGS API] API returned error:", {
          errorCode: responseData.errorCode,
          errorMessage: responseData.errorMessage,
        });
        // Throw error with API message
        throw new Error(errorMsg);
      }

      const token = responseData.data; // resp.data is { data: "token_string" }
      console.log("[USGS API] Login-token response received", {
        hasToken: !!token,
        hasCookie: !!cookie,
        status: resp.status,
      });

      if (!token) {
        console.error("[USGS API] No token in response:", responseData);
        throw new Error("No token received in login response");
      }

      // Set headers for axiosInstance (as in old code)
      (this.axiosInstance.defaults.headers as any)["User-Agent"] = "Node USGS";
      (this.axiosInstance.defaults.headers as any)["X-Auth-Token"] = token;
      (this.axiosInstance.defaults.headers as any)["Cookie"] = cookie;

      // Check permissions
      console.log("[USGS API] Checking permissions", {
        url: "permissions",
        method: "GET",
      });
      let permissionsResp;
      try {
        permissionsResp = await this.axiosInstance.get("permissions");
        console.log("[USGS API] Permissions check successful", {
          status: permissionsResp.status,
          statusText: permissionsResp.statusText,
        });
      } catch (e) {
        console.error("[USGS API] Permissions check failed:", e);
        if (e && typeof e === "object" && "response" in e) {
          const axiosError = e as {
            response?: { status?: number; statusText?: string; data?: unknown };
          };
          console.error("[USGS API] Permissions error details:", {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
          });
        }
        throw e;
      }
      const permissionsData = permissionsResp.data;
      console.log("[USGS API] Permissions response:", {
        hasData: !!permissionsData?.data,
        permissions: permissionsData?.data,
        status: permissionsResp.status,
      });

      if (permissionsData?.data?.includes?.("download")) {
        console.log(
          "[USGS API] Login successful, user has download permissions"
        );
        this.setAuthStatus("authorized", creds.username);
        const result = { data: permissionsData };
        // Cache the result
        this.permissionsCache = {
          result,
          timestamp: Date.now(),
          username: creds.username,
        };
        console.log("[USGS API] Permissions result cached after login");
        return result;
      } else {
        console.log(
          "[USGS API] Login failed: user does not have download permissions"
        );
        this.setAuthStatus("guest");
        // Clear cache on failed login
        this.permissionsCache = null;
        return null;
      }
    } catch (e) {
      console.error("[USGS API] performLogin() error:", e);
      // If it's an Error with message, log it
      if (e instanceof Error) {
        console.error("[USGS API] Error message:", e.message);
      }
      // If it's an Axios error, log response details
      if (e && typeof e === "object" && "response" in e) {
        const axiosError = e as {
          response?: { data?: unknown; status?: number };
        };
        console.error("[USGS API] Axios error details:", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
      this.setAuthStatus("guest");
      // Clear cache on error
      this.permissionsCache = null;
      throw e;
    }
  }

  async logout(): Promise<void> {
    console.log("[USGS API] logout: Sending logout request", {
      url: `${USGS_API_URL}/logout`,
      method: "POST",
    });
    try {
      const resp = await this.axiosInstance.post(`${USGS_API_URL}/logout`);
      console.log("[USGS API] logout: Logout successful", {
        status: resp.status,
        statusText: resp.statusText,
      });
    } catch (e) {
      // Ignore errors
      if (e && typeof e === "object" && "response" in e) {
        const axiosError = e as {
          response?: { status?: number; statusText?: string };
        };
        console.log("[USGS API] logout: Logout error (ignored)", {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        });
      } else {
        console.log("[USGS API] logout: Logout error (ignored)", { error: e });
      }
    }
    this.setAuthStatus("guest");
    // Clear headers
    delete (this.axiosInstance.defaults.headers as any)["X-Auth-Token"];
    delete (this.axiosInstance.defaults.headers as any)["Cookie"];
    // Clear login promise to allow new login
    this.loginPromise = null;
    // Clear permissions cache
    this.permissionsCache = null;
  }

  async checkUserPermissions(
    creds: SettingsChema["userdata"]
  ): Promise<{ data: any } | null> {
    console.log("[USGS API] checkUserPermissions() called", {
      username: creds.username,
      currentAuthStatus: this.authStatus,
      hasCachedPermissions: !!this.permissionsCache,
    });

    // If already authorized with the same username, check cache first
    if (
      this.authStatus === "authorized" &&
      this.username === creds.username &&
      this.permissionsCache
    ) {
      const cacheAge = Date.now() - this.permissionsCache.timestamp;
      if (cacheAge < this.PERMISSIONS_CACHE_TTL) {
        console.log("[USGS API] Using cached permissions result", {
          cacheAge: Math.round(cacheAge / 1000) + "s",
        });
        return this.permissionsCache.result;
      } else {
        console.log("[USGS API] Cache expired, will refresh", {
          cacheAge: Math.round(cacheAge / 1000) + "s",
        });
        this.permissionsCache = null;
      }
    }

    // If status is guest or different username, need to login
    if (this.authStatus !== "authorized" || this.username !== creds.username) {
      console.log(
        "[USGS API] Not authorized or different user, performing login"
      );
      const result = await this.login(creds);
      // Cache the result
      if (result) {
        this.permissionsCache = {
          result,
          timestamp: Date.now(),
          username: creds.username,
        };
        console.log("[USGS API] Permissions result cached");
      }
      return result;
    }

    // If authorized but cache expired, refresh permissions without full login
    console.log(
      "[USGS API] Authorized but cache expired, refreshing permissions",
      {
        url: "permissions",
        method: "GET",
      }
    );
    try {
      const permissionsResp = await this.axiosInstance.get("permissions");
      console.log("[USGS API] Permissions refresh successful", {
        status: permissionsResp.status,
        statusText: permissionsResp.statusText,
      });
      const permissionsData = permissionsResp.data;
      const result = { data: permissionsData };

      // Update cache
      this.permissionsCache = {
        result,
        timestamp: Date.now(),
        username: creds.username,
      };
      console.log("[USGS API] Permissions refreshed and cached");

      return result;
    } catch (e) {
      console.error(
        "[USGS API] Failed to refresh permissions, falling back to login:",
        e
      );
      if (e && typeof e === "object" && "response" in e) {
        const axiosError = e as {
          response?: { status?: number; statusText?: string; data?: unknown };
        };
        console.error("[USGS API] Permissions refresh error details:", {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
        });
      }
      // If refresh fails, do full login
      const result = await this.login(creds);
      if (result) {
        this.permissionsCache = {
          result,
          timestamp: Date.now(),
          username: creds.username,
        };
      }
      return result;
    }
  }

  private defaultSceneFilter(
    _satelliteId: string,
    prodIdentId: string,
    collecCatId: string
  ) {
    return {
      sceneFilter: {
        metadataFilter: {
          filterType: "and",
          childFilters: [
            {
              filterType: "value",
              filterId: collecCatId,
              value: "T1",
              operand: "=",
            },
            {
              filterType: "value",
              filterId: prodIdentId,
              value: "SP",
              operand: "=",
            },
          ],
        },
      },
    };
  }

  private async findoutFilterIds() {
    return {
      satellite: "61af9273566bb9a8",
      productIdentifier: "5e83d14f567d0086",
      collectionCategory: "5f6a6fb2137a3c00",
    };
  }

  async searchScenes(filter: ISearchScenesFilter) {
    const { satellite, productIdentifier, collectionCategory } =
      await this.findoutFilterIds();
    const filters: any = {
      datasetName,
      maxResults: 50000,
      ...this.defaultSceneFilter(
        satellite,
        productIdentifier,
        collectionCategory
      ),
    };

    if (filter.startDate && filter.endDate) {
      filters.sceneFilter["acquisitionFilter"] = {
        start: filter.startDate,
        end: filter.endDate,
      };
    }

    if (filter.bounds) {
      const { lng, lat } = filter.bounds;
      const ll = { longitude: Math.min(...lng), latitude: Math.min(...lat) };
      const ur = { longitude: Math.max(...lng), latitude: Math.max(...lat) };
      filters.sceneFilter["spatialFilter"] = {
        filterType: "mbr",
        lowerLeft: ll,
        upperRight: ur,
      };
    }

    console.log("[USGS API] searchScenes: Sending scene-search request", {
      url: "scene-search",
      method: "POST",
      maxResults: filters.maxResults,
      hasDateFilter: !!(filter.startDate && filter.endDate),
      hasBoundsFilter: !!filter.bounds,
    });
    const { data, ...props } = await this.axiosInstance.post(
      "scene-search",
      filters
    );

    if (!data || !data.data) {
      throw new Error(
        `Can't get scenes cause of "${JSON.stringify(
          data,
          null,
          2
        )}"; \n"${JSON.stringify(props, null, 2)}"`
      );
    }

    return { ...data, ...filters };
  }

  async reindexScene(displayId: string) {
    const { productIdentifier } = await this.findoutFilterIds();
    const filters: any = {
      datasetName,
      maxResults: 1,
      sceneFilter: {
        metadataFilter: {
          filterType: "value",
          filterId: productIdentifier,
          value: displayId,
          operand: "=",
        },
      },
    };

    console.log("[USGS API] reindexScene: Sending scene-search request", {
      url: "scene-search",
      method: "POST",
      displayId,
      maxResults: filters.maxResults,
    });
    const { data, ...props } = await this.axiosInstance.post(
      "scene-search",
      filters
    );

    if (!data || !data.data) {
      throw new Error(
        `Can't get scenes cause of "${JSON.stringify(
          data,
          null,
          2
        )}"; \n"${JSON.stringify(props, null, 2)}"`
      );
    }

    return { ...data, ...filters };
  }

  async checkDates(): Promise<string> {
    const { satellite, productIdentifier, collectionCategory } =
      await this.findoutFilterIds();
    const filters = {
      datasetName,
      maxResults: 1,
      ...this.defaultSceneFilter(
        satellite,
        productIdentifier,
        collectionCategory
      ),
    };

    console.log("[USGS API] checkDates: Sending scene-search request", {
      url: "scene-search",
      method: "POST",
      maxResults: filters.maxResults,
    });
    const { data, ...props } = await this.axiosInstance.post(
      "scene-search",
      filters
    );

    if (!data) {
      throw new Error(`Can't get scenes cause of ${JSON.stringify(props)}`);
    }

    return data["data"]["results"][0]["temporalCoverage"]["endDate"];
  }

  async getDownloadDS(entityId: string) {
    const sceneIds = [entityId];
    console.log("[USGS API] getDownloadDS: Sending download-options request", {
      url: "/download-options",
      method: "POST",
      entityId,
      sceneIdsCount: sceneIds.length,
    });
    const downloadOptions = await this.axiosInstance
      .post("/download-options", {
        datasetName: datasetName,
        entityIds: sceneIds,
      })
      .then((x) => {
        console.log(
          "[USGS API] getDownloadDS: download-options response received",
          {
            status: x.status,
            hasData: !!x.data?.data,
            optionsCount: Array.isArray(x.data?.data) ? x.data.data.length : 0,
          }
        );
        return x.data.data;
      });

    const requiredLayers = [
      "ST_TRAD",
      "ST_ATRAN",
      "ST_URAD",
      "ST_DRAD",
      "SR_B5",
      "SR_B6",
      "SR_B4",
      "QA_PIXEL",
    ];

    const check_name = (name: string) => {
      for (let i = 0; i < requiredLayers.length; i += 1) {
        const layerName = requiredLayers[i];
        if (name.indexOf(layerName) != -1 && name.indexOf(".TIF") != -1) {
          return layerName;
        }
      }
      return false;
    };

    const downloads: Record<
      string,
      {
        entityId: string;
        productId: string;
        layerName?: USGSLayerType;
      }
    > = {};

    for (let i = 0; i < downloadOptions.length; i += 1) {
      const product = downloadOptions[i];
      if (product["available"]) {
        product["secondaryDownloads"].forEach((file: any) => {
          const layerName = check_name(file["displayId"]);
          if (file["available"] && layerName) {
            downloads[file["displayId"]] = {
              entityId: file["entityId"],
              productId: file["id"],
              layerName: layerName as USGSLayerType,
            };
          }
        });
      }
    }

    if (downloads) {
      const requestedDownloadsCount = Object.keys(downloads).length;
      const label = "download-sample" + entityId;
      const downloadUrls: {
        id: string;
        url: string;
        layerName: USGSLayerType;
      }[] = [];

      console.log("[USGS API] getDownloadDS: Sending download-request", {
        url: "/download-request",
        method: "POST",
        label,
        downloadsCount: Object.keys(downloads).length,
      });
      const requestResults = await this.axiosInstance
        .post("/download-request", {
          downloads: downloads,
          label: label,
          downloadApplication: "EE",
        })
        .then((x) => {
          console.log(
            "[USGS API] getDownloadDS: download-request response received",
            {
              status: x.status,
              hasData: !!x.data?.data,
              hasPreparingDownloads: !!x.data?.data?.preparingDownloads?.length,
              hasAvailableDownloads: !!x.data?.data?.availableDownloads?.length,
              preparingCount: x.data?.data?.preparingDownloads?.length || 0,
              availableCount: x.data?.data?.availableDownloads?.length || 0,
            }
          );
          return x.data.data;
        });

      if (
        requestResults["preparingDownloads"] &&
        requestResults["preparingDownloads"].length
      ) {
        console.log(
          "[USGS API] getDownloadDS: Sending download-retrieve request (initial)",
          {
            url: "/download-retrieve",
            method: "POST",
            label,
          }
        );
        const moreDownloadUrls = await this.axiosInstance
          .post("/download-retrieve", {
            label: label,
          })
          .then((x) => {
            console.log(
              "[USGS API] getDownloadDS: download-retrieve response received (initial)",
              {
                status: x.status,
                hasData: !!x.data?.data,
                availableCount: x.data?.data?.available?.length || 0,
                requestedCount: x.data?.data?.requested?.length || 0,
              }
            );
            return x.data.data;
          });

        moreDownloadUrls["available"].forEach((download: any) => {
          if (!requiredLayers.find((x) => download["displayId"].includes(x))) {
            return;
          }
          downloadUrls.push({
            id: download["downloadId"],
            url: download["url"],
            layerName: downloads[download["displayId"]].layerName,
          });
        });

        moreDownloadUrls["requested"].forEach((download: any) => {
          downloadUrls.push({
            id: download["downloadId"],
            url: download["url"],
            layerName: downloads[download["displayId"]].layerName,
          });
        });

        while (downloadUrls.length < requestedDownloadsCount) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          console.log(
            "[USGS API] getDownloadDS: Sending download-retrieve request (retry)",
            {
              url: "/download-retrieve",
              method: "POST",
              label,
              currentUrlsCount: downloadUrls.length,
              requestedCount: requestedDownloadsCount,
            }
          );
          const moreDownloadUrls = await this.axiosInstance
            .post("/download-retrieve", {
              label: label,
            })
            .then((x) => {
              console.log(
                "[USGS API] getDownloadDS: download-retrieve response received (retry)",
                {
                  status: x.status,
                  hasData: !!x.data?.data,
                  availableCount: x.data?.data?.available?.length || 0,
                  requestedCount: x.data?.data?.requested?.length || 0,
                  currentUrlsCount: downloadUrls.length,
                }
              );
              return x.data.data;
            });

          moreDownloadUrls["available"].forEach((download: any) => {
            if (!downloadUrls.find((x) => x.id === download["downloadId"])) {
              downloadUrls.push({
                id: download["downloadId"],
                url: download["url"],
                layerName: downloads[download["displayId"]].layerName,
              });
            }
          });
        }
      } else {
        requestResults["availableDownloads"].forEach(
          (download: any, ind: number) => {
            downloadUrls.push({
              id: download["downloadId"],
              url: download["url"],
              layerName: Object.values(downloads)[ind].layerName,
            });
          }
        );
      }

      return downloadUrls;
    }

    return [];
  }
}

export const usgsApiManager = new UsgsApiManager();
