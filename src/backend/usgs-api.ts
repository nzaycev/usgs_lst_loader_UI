import axios from "axios";
import { ISearchScenesFilter } from "../tools/ElectronApi";
// import dotenv from 'dotenv'
import { USGSLayerType } from "../actions/main-actions";
import turf from "@turf/turf";
import { SettingsChema } from "./settings-store";
// import HttpsProxyAgent from 'https-proxy-agent'

// console.log('dotenv', dotenv.config())
// console.log('procenv', process.env)

const USGS_API_URL = "https://m2m.cr.usgs.gov/api/api/json/stable";
const username = "";
const token = "";

const authParams = {
  username,
  token,
};

// Init instance of axios which works with BASE_URL
// const httpsAgent = HttpsProxyAgent({host: '172.16.0.2', port: 8080, auth: 'anna:gosteva'})
export const axiosInstance = axios.create({
  baseURL: USGS_API_URL,
});

const createSession = async () => {
  console.log("create session");

  console.log("auth", authParams);
  const resp = await axios.post(`${USGS_API_URL}/login-token`, authParams);
  const { data } = resp.data; // getting cookie from request
  const [cookie] = resp.headers["set-cookie"] || [];
  console.log("sss", axiosInstance.defaults.headers);
  (axiosInstance.defaults.headers as any)["User-Agent"] = "Node USGS";
  (axiosInstance.defaults.headers as any)["X-Auth-Token"] = data;
  (axiosInstance.defaults.headers as any)["Cookie"] = cookie;
  return [cookie, data]; // return Promise<cookie> because func is async
};

let isGetActiveSessionRequest = false;
let requestQueue: any[] = [];

const callRequestsFromQueue = (cookie: any, XAuth: any) => {
  requestQueue.forEach((sub) => sub(cookie, XAuth));
};
const addRequestToQueue = (...sub: any) => {
  requestQueue.push(...sub);
};
const clearQueue = () => {
  requestQueue = [];
};

// Function to open login dialog from main process (will be set by index.ts)
let openLoginDialogHandler: ((targetRoute?: string) => Promise<void>) | null =
  null;

export const setOpenLoginDialogHandler = (
  handler: (targetRoute?: string) => Promise<void>
) => {
  openLoginDialogHandler = handler;
};

// registering axios interceptor which handle response's errors
axiosInstance.interceptors.response.use(null, (error) => {
  const { response = {}, config: sourceConfig } = error;

  // checking if request failed cause Unauthorized
  if (response.status === 401 || response.status === 403) {
    // If session creation fails and we have a handler, open login dialog
    if (
      response.status === 403 &&
      openLoginDialogHandler &&
      !isGetActiveSessionRequest &&
      !response.data
    ) {
      // Get current route from window location if available
      const targetRoute =
        typeof window !== "undefined" && window.location
          ? window.location.hash.replace("#", "") || "/bounds"
          : "/bounds";
      openLoginDialogHandler(targetRoute).catch((e) => {
        console.error("Error opening login dialog:", e);
      });
      return Promise.reject(error);
    }
    // if (!response.data || response.data.errorCode === "UNAUTHORIZED_USER") {
    // if this request is first we set isGetActiveSessionRequest flag to true and run createSession
    if (!isGetActiveSessionRequest && response.data) {
      isGetActiveSessionRequest = true;
      createSession()
        .then((test) => {
          console.log({ test });
          const [cookie, XAuth] = test;
          // when createSession resolve with cookie value we run all request from queue with new cookie
          isGetActiveSessionRequest = false;
          callRequestsFromQueue(cookie, XAuth);
          clearQueue(); // and clean queue
        })
        .catch((e) => {
          isGetActiveSessionRequest = false; // Very important!
          console.error("Create session error %s", e.message);
          clearQueue();
        });
    }

    // and while isGetActiveSessionRequest equal true we create and return new promise
    const retryRequest = new Promise((resolve) => {
      // we push new function to queue
      if (!response.data) {
        console.log("some error from m2m. wait for 5s");
        setTimeout(() => {
          resolve(axiosInstance(sourceConfig));
        }, 5000);
      }
      addRequestToQueue((cookie: any, XAuth: any) => {
        // function takes one param 'cookie'
        console.log(
          "Retry with new session context %s request to %s",
          sourceConfig.method,
          sourceConfig.url
        );
        sourceConfig.headers.Cookie = cookie; // setting cookie to header
        sourceConfig.headers["X-Auth-Token"] = XAuth; // setting cookie to header
        resolve(axios(sourceConfig)); // and resolve promise with axios request by old config with cookie
        // we resolve exactly axios request - NOT axiosInstance's request because it could call recursion
      });
    });

    return retryRequest;
  } else {
    // if error is not related with Unauthorized we just reject promise
    return Promise.reject(error);
  }
});

const datasetName = "landsat_ot_c2_l2";

const defaultSceneFilter = (
  satelliteId: string,
  prodIdentId: string,
  collecCatId: string
) => ({
  sceneFilter: {
    metadataFilter: {
      filterType: "and",
      childFilters: [
        // {
        //   filterType: "value",
        //   filterId: satelliteId,
        //   value: "8", // LC08
        //   operand: "=",
        // },
        {
          filterType: "value",
          filterId: collecCatId,
          value: "T1",
          operand: "=",
        },
        {
          filterType: "value",
          filterId: prodIdentId,
          value: "SP", // L2SP
          operand: "=",
        },
      ],
    },
  },
});

export const getDownloadDS = async (entityId: string) => {
  const sceneIds = [entityId];
  const downloadOptions = await axiosInstance
    .post("/download-options", {
      datasetName: datasetName,
      entityIds: sceneIds,
    })
    .then((x) => x.data.data);
  console.log("do", downloadOptions);
  // Aggregate a list of available products
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
    // if(name.indexOf('LC09') > -1) {
    //   // TODO: discuss
    //   return false
    // }
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
    // Make sure the product is available for this scene
    const product = downloadOptions[i];
    if (product["available"]) {
      product["secondaryDownloads"].forEach((file: any) => {
        console.log(
          `secondary file ${file["available"]} ${check_name(
            file["displayId"]
          )}`,
          i,
          JSON.stringify(file, null, 2)
        );
        const layerName = check_name(file["displayId"]);
        if (file["available"] && layerName) {
          downloads[file["displayId"]] = {
            entityId: file["entityId"],
            productId: file["id"],
            layerName: layerName as USGSLayerType,
          };
        }
      });
      // break
    }
  }
  // Did we find products?
  if (downloads) {
    console.log("downloads", downloads);
    const requestedDownloadsCount = Object.keys(downloads).length;
    // set a label for the download request
    const label = "download-sample" + entityId;
    const downloadUrls: {
      id: string;
      url: string;
      layerName: USGSLayerType;
    }[] = [];
    // Call the download to get the direct download urls
    const requestResults = await axiosInstance
      .post("/download-request", {
        downloads: downloads,
        label: label,
        downloadApplication: "EE",
      })
      .then((x) => x.data.data);
    console.log("rr", requestResults);
    // PreparingDownloads has a valid link that can be used but data may not be immediately available
    // Call the download-retrieve method to get download that is available for immediate download
    if (
      requestResults["preparingDownloads"] &&
      requestResults["preparingDownloads"].length
    ) {
      const moreDownloadUrls = await axiosInstance
        .post("/download-retrieve", {
          label: label,
        })
        .then((x) => x.data.data);
      console.log("mdurls", moreDownloadUrls);

      moreDownloadUrls["available"].forEach((download: any) => {
        console.log("test", download["displayId"], downloads);
        if (!requiredLayers.find((x) => download["displayId"].includes(x))) {
          return;
        }
        downloadUrls.push({
          id: download["downloadId"],
          url: download["url"],
          layerName: downloads[download["displayId"]].layerName,
        });
        console.log("DOWNLOAD: " + download["url"]);
      });

      moreDownloadUrls["requested"].forEach((download: any) => {
        downloadUrls.push({
          id: download["downloadId"],
          url: download["url"],
          layerName: downloads[download["displayId"]].layerName,
        });
        console.log("DOWNLOAD: " + download["url"]);
      });

      // Didn't get all of the reuested downloads, call the download-retrieve method again probably after 30 seconds
      while (downloadUrls.length < requestedDownloadsCount) {
        const preparingDownloads =
          requestedDownloadsCount - downloadUrls.length;
        console.log(
          "\n",
          preparingDownloads,
          "downloads are not available. Waiting for 5 seconds.\n"
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log("Trying to retrieve data\n");
        const moreDownloadUrls = await axiosInstance
          .post("/download-retrieve", {
            label: label,
          })
          .then((x) => x.data.data);
        moreDownloadUrls["available"].forEach((download: any) => {
          if (!downloadUrls.find((x) => x.id === download["downloadId"])) {
            console.log("test2", download["displayId"], downloads);

            downloadUrls.push({
              id: download["downloadId"],
              url: download["url"],
              layerName: downloads[download["displayId"]].layerName,
            });
            console.log("DOWNLOAD: " + download["url"]);
          }
        });
      }
    } else {
      requestResults["availableDownloads"].forEach(
        (download: any, ind: number) => {
          downloadUrls.push({
            id: download["downloadId"],
            url: download["url"],
            // TODO: check
            layerName: Object.values(downloads)[ind].layerName,
          });
        }
      );
    }
    console.log("\nAll downloads are available to download.\n");
    return downloadUrls;
  }
  return [];
};

export const findoutFilterIds = async () => {
  // const { data, ...props } = await axiosInstance.post("dataset-filters", {
  //   datasetName,
  // });
  return {
    satellite: "61af9273566bb9a8",
    productIdentifier: "5e83d14f567d0086",
    collectionCategory: "5f6a6fb2137a3c00",
  };
  // TODO: request access to the API
  // return {
  //   satellite: data.find((x: any) => x.fieldLabel === "Satellite").id, // 8/9/All
  //   productIdentifier: data.find(
  //     (x: any) => x.fieldLabel === "Landsat Product Identifier L2"
  //   ).id, // SP
  //   collectionCategory: data.find(
  //     (x: any) => x.fieldLabel === "Collection Category"
  //   ).id, // T1
  // };
};

export const reindexScene = async ({ displayId }: { displayId: string }) => {
  const { productIdentifier } = await findoutFilterIds();
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
  try {
    const { data, ...props } = await axiosInstance.post(
      "scene-search",
      filters
    );
    console.log({ data, props });
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
  } catch (e) {
    throw new Error(`Can't get scenes cause of ${e}`);
  }
};

export const searchScenes = async ({
  startDate,
  endDate,
  bounds,
}: ISearchScenesFilter) => {
  const { satellite, productIdentifier, collectionCategory } =
    await findoutFilterIds();
  const filters: any = {
    datasetName,
    maxResults: 50000,
    ...defaultSceneFilter(satellite, productIdentifier, collectionCategory),
  };

  if (startDate && endDate) {
    filters.sceneFilter["acquisitionFilter"] = {
      start: startDate,
      end: endDate,
    };
  }

  if (bounds) {
    const { lng, lat } = bounds;
    const ll = { longitude: Math.min(...lng), latitude: Math.min(...lat) };
    const ur = { longitude: Math.max(...lng), latitude: Math.max(...lat) };
    filters.sceneFilter["spatialFilter"] = {
      filterType: "mbr",
      lowerLeft: ll,
      upperRight: ur,
    };
  }

  try {
    const { data, ...props } = await axiosInstance.post(
      "scene-search",
      filters
    );
    console.log({ data, props });
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
  } catch (e) {
    throw new Error(`Can't get scenes cause of ${e}`);
  }
};

export const checkUserPermissons = async (creds: SettingsChema["userdata"]) => {
  authParams.username = creds.username;
  authParams.token = creds.token;
  try {
    await axiosInstance.post(`${USGS_API_URL}/logout`);
  } catch (e) {
    console.log("cant logout");
  }
  try {
    await axiosInstance.post(`${USGS_API_URL}/login-token`, creds);
  } catch (e) {
    return;
  }
  return axiosInstance.get("permissions");
};

export const checkDates = async () => {
  const { satellite, productIdentifier, collectionCategory } =
    await findoutFilterIds();
  const filters = {
    datasetName,
    maxResults: 1,
    ...defaultSceneFilter(satellite, productIdentifier, collectionCategory),
  };
  try {
    const { data, ...props } = await axiosInstance.post(
      "scene-search",
      filters
    );
    console.log("check dates", data);
    // return data
    if (!data) {
      throw new Error(`Can't get scenes cause of ${JSON.stringify(props)}`);
    }
    return data["data"]["results"][0]["temporalCoverage"]["endDate"];
  } catch (error) {
    throw new Error(`Can't check dates cause of ${error}`);
  }
};
