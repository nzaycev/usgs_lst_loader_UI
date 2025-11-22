import { contextBridge, ipcRenderer as electronIpcRenderer } from "electron";
import { ipcRenderer } from "electron-typescript-ipc";
import { Api } from "./src/tools/ElectronApi";
import type {
  DisplayId,
  ISceneState,
  USGSLayerType,
} from "./src/actions/main-actions";
import type { INetworkSettings } from "./src/ui/network-settings/network-settings-state";

const api: Api = {
  invoke: {
    openExplorer: async (str) => {
      await ipcRenderer.invoke<Api>("openExplorer", str);
    },
    async watch() {
      return (await ipcRenderer.invoke<Api>("watch")) as Partial<
        Record<DisplayId, ISceneState>
      >;
    },
    async checkLastDate() {
      return (await ipcRenderer.invoke<Api>("checkLastDate")) as string;
    },
    async download(...args) {
      return (await ipcRenderer.invoke<Api>("download", ...args)) as string;
    },
    async saveCalculationSettings(settings) {
      await ipcRenderer.invoke<Api>("saveCalculationSettings", settings);
    },
    async saveNetworkSettings(settings) {
      await ipcRenderer.invoke<Api>("saveNetworkSettings", settings);
    },
    async watchNetworkSettings() {
      return (await ipcRenderer.invoke<Api>(
        "watchNetworkSettings"
      )) as INetworkSettings;
    },
    async addRepo(arg, alsoDownload) {
      await ipcRenderer.invoke<Api>("addRepo", arg, alsoDownload);
    },
    async getStoreValue(key) {
      return await ipcRenderer.invoke<Api>("getStoreValue", key);
    },
    async setStoreValue(key, value) {
      await ipcRenderer.invoke<Api>("setStoreValue", key, value);
    },
    async selectFolder() {
      return (await ipcRenderer.invoke<Api>("selectFolder")) as string | null;
    },
    async selectFile() {
      return (await ipcRenderer.invoke<Api>("selectFile")) as string | null;
    },
    async scanFolder(folderPath) {
      return (await ipcRenderer.invoke<Api>("scanFolder", folderPath)) as {
        files: string[];
        suggestedMapping?: Record<string, USGSLayerType>;
      };
    },
    async addExternalFolder(payload) {
      await ipcRenderer.invoke<Api>("addExternalFolder", payload);
    },
    async openMappingDialog(payload) {
      return (await ipcRenderer.invoke<Api>("openMappingDialog", payload)) as {
        fileMapping: Record<string, USGSLayerType>;
        metadata?: {
          displayId: string;
          entityId?: string;
          captureDate?: string;
          source?: string;
          city?: string;
          displayName?: string;
        };
      } | null;
    },
    sendMappingDialogResult(result) {
      electronIpcRenderer.send("mapping-dialog-result", result);
      return Promise.resolve();
    },
    async openLoginDialog(payload) {
      return (await ipcRenderer.invoke<Api>("openLoginDialog", payload)) as {
        username: string;
        token: string;
      } | null;
    },
    sendLoginDialogResult(result) {
      electronIpcRenderer.send("login-dialog-result", result);
      return Promise.resolve();
    },
    async windowMinimize() {
      await ipcRenderer.invoke<Api>("windowMinimize");
    },
    async windowMaximize() {
      await ipcRenderer.invoke<Api>("windowMaximize");
    },
    async windowClose() {
      await ipcRenderer.invoke<Api>("windowClose");
    },
    async windowIsMaximized() {
      return (await ipcRenderer.invoke<Api>("windowIsMaximized")) as boolean;
    },
    async deleteScene(displayId) {
      await ipcRenderer.invoke<Api>("deleteScene", displayId);
    },
    async stopCalculation(displayId) {
      await ipcRenderer.invoke<Api>("stopCalculation", displayId);
    },
  },
  on: {
    stateChange(listener) {
      ipcRenderer.on<Api>("stateChange", (event, ...args) => {
        listener(event, args[0] as { displayId: string; state: ISceneState });
      });
    },
    fileStateChange(listener) {
      ipcRenderer.on<Api>("fileStateChange", (event, ...args) => {
        listener(
          event,
          args[0] as {
            displayId: string;
            type: USGSLayerType;
            progress: number;
          }
        );
      });
    },
    fsChange(listener) {
      ipcRenderer.on<Api>("fsChange", (event, ...args) => {
        listener(
          event,
          args[0] as {
            event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
            parsedPath: {
              scenePath: string;
              sceneLayer?: USGSLayerType;
              isIndex: boolean;
              isOutFile: boolean;
            };
            indexContent?: ISceneState;
            size?: number;
          }
        );
      });
    },
    loginSuccess(listener) {
      electronIpcRenderer.on("login-success", (event, data) => {
        listener(event, data);
      });
      return Promise.resolve();
    },
    openLoginDialog403(listener) {
      electronIpcRenderer.on("open-login-dialog-403", (event, data) => {
        listener(event, data);
      });
      return Promise.resolve();
    },
  },
};

contextBridge.exposeInMainWorld("ElectronAPI", api);
contextBridge.exposeInMainWorld("mapboxToken", process.env.mapboxToken);
contextBridge.exposeInMainWorld("usgs_username", process.env.usgs_username);
contextBridge.exposeInMainWorld("usgs_password", process.env.usgs_password);

// Override console methods to send logs to main process via IPC
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
};

const sendLogToMain = (
  level: "log" | "error" | "warn" | "info",
  args: unknown[]
) => {
  try {
    // Serialize arguments safely
    const serializedArgs = args.map((arg) => {
      if (arg === null || arg === undefined) {
        return String(arg);
      }
      if (
        typeof arg === "string" ||
        typeof arg === "number" ||
        typeof arg === "boolean"
      ) {
        return arg;
      }
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
          toString: arg.toString(),
        };
      }
      if (typeof arg === "object") {
        try {
          // Try to serialize, but handle circular references
          return JSON.parse(
            JSON.stringify(arg, (key, value) => {
              if (typeof value === "function") {
                return `[Function: ${value.name || "anonymous"}]`;
              }
              if (value instanceof Error) {
                return {
                  name: value.name,
                  message: value.message,
                  stack: value.stack,
                };
              }
              return value;
            })
          );
        } catch (e) {
          return `[Object: ${arg.constructor?.name || "Object"}]`;
        }
      }
      return String(arg);
    });

    // Send via IPC directly
    try {
      electronIpcRenderer.send("renderer-log", {
        level,
        args: serializedArgs,
      });
    } catch (sendError) {
      // Silently fail - don't break console if IPC fails
    }
  } catch (e) {
    // Log error to original console if IPC fails
    originalConsole.error("Failed to send log via IPC:", e, "Level:", level);
  }
};

// Override console methods
console.log = (...args: unknown[]) => {
  originalConsole.log(...args);
  sendLogToMain("log", args);
};

console.error = (...args: unknown[]) => {
  originalConsole.error(...args);
  sendLogToMain("error", args);
};

console.warn = (...args: unknown[]) => {
  originalConsole.warn(...args);
  sendLogToMain("warn", args);
};

console.info = (...args: unknown[]) => {
  originalConsole.info(...args);
  sendLogToMain("info", args);
};

// Console override initialized - all console.log/error/warn/info will be sent to main process via IPC
