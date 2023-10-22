import { contextBridge } from "electron";
import { ipcRenderer } from "electron-typescript-ipc";
import { Api } from "./src/tools/ElectronApi";

const api: Api = {
  invoke: {
    openExplorer: async (str) => {
      ipcRenderer.invoke<Api>("openExplorer", str);
    },
    async watch() {
      return ipcRenderer.invoke<Api>("watch");
    },
    async checkLastDate() {
      return ipcRenderer.invoke<Api>("checkLastDate");
    },
    async download(...args) {
      return ipcRenderer.invoke<Api>("download", ...args);
    },
    async saveNetworkSettings(settings) {
      return ipcRenderer.invoke<Api>("saveNetworkSettings", settings);
    },
    async watchNetworkSettings() {
      return ipcRenderer.invoke<Api>("watchNetworkSettings");
    },
    async addRepo(arg, alsoDownload) {
      return ipcRenderer.invoke<Api>("addRepo", arg, alsoDownload);
    },
    async getStoreValue(key) {
      return ipcRenderer.invoke<Api>("getStoreValue", key);
    },
    async setStoreValue(key, value) {
      return ipcRenderer.invoke<Api>("setStoreValue", key, value);
    },
  },
  on: {
    stateChange(listener) {
      ipcRenderer.on<Api>("stateChange", listener);
    },
    fileStateChange(listener) {
      ipcRenderer.on<Api>("fileStateChange", listener);
    },
    fsChange(listener) {
      ipcRenderer.on<Api>("fsChange", listener);
    },
  },
};

contextBridge.exposeInMainWorld("ElectronAPI", api);
contextBridge.exposeInMainWorld("mapboxToken", process.env.mapboxToken);
contextBridge.exposeInMainWorld("usgs_username", process.env.usgs_username);
contextBridge.exposeInMainWorld("usgs_password", process.env.usgs_password);
