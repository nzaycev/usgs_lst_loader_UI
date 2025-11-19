import { ipcMain } from "electron-typescript-ipc";
import { app, BrowserWindow } from "electron";
import type { Api } from "../../tools/ElectronApi";
import type {
  CalculationSettings,
  INetworkSettings,
} from "../../ui/network-settings/network-settings-state";
import { applyProxySettings } from "../proxy-settings";
import { SettingsChema, store } from "../../backend/settings-store";
import path from "path";
import fs from "fs";

export function setupSettingsHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle<Api>("watchNetworkSettings", async () => {
    const userSettingsPath = path.join(
      app.getPath("userData"),
      ".networkSettings"
    );
    if (fs.existsSync(userSettingsPath)) {
      const settings = fs.readFileSync(userSettingsPath).toString();
      return JSON.parse(settings);
    }
    return {};
  });

  ipcMain.handle<Api>(
    "saveNetworkSettings",
    async (_, settings: INetworkSettings) => {
      applyProxySettings(app, mainWindow, settings.proxy);
      if (settings.proxy) {
        store.set("proxySettings", settings.proxy);
      } else {
        store.delete("proxySettings");
      }
    }
  );

  ipcMain.handle<Api>(
    "saveCalculationSettings",
    async (_, settings: CalculationSettings) => {
      if (settings.args) {
        store.set("calculationSettings", settings.args);
      } else {
        store.delete("calculationSettings");
      }
    }
  );

  ipcMain.handle<Api>(
    "getStoreValue",
    (event, key: keyof SettingsChema | string) => {
      return store.get(key);
    }
  );

  ipcMain.handle<Api>(
    "setStoreValue",
    async (event, key: keyof SettingsChema, value: unknown) => {
      if (!value) {
        store.delete(key);
      }
      return store.set(key, value);
    }
  );
}
