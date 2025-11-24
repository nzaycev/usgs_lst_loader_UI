import { exec } from "child_process";
import { app, BrowserWindow } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import fs from "fs";
import path from "path";
import type { ISceneState } from "../../actions/main-actions";
import type { Api } from "../../tools/ElectronApi";
import type {
  CalculationSettings,
  INetworkSettings,
} from "../../ui/network-settings/network-settings-state";
import { applyProxySettings } from "../proxy-settings";
import { SettingsChema, store } from "../settings-store";
import { usgsApiManager } from "../usgs-api";

export function setupSettingsHandlers(mainWindow: BrowserWindow) {
  // Window control handlers
  ipcMain.handle<Api>("windowMinimize", async () => {
    mainWindow.minimize();
  });

  ipcMain.handle<Api>("windowMaximize", async () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle<Api>("windowClose", async () => {
    mainWindow.close();
  });

  ipcMain.handle<Api>("windowIsMaximized", async () => {
    return mainWindow.isMaximized();
  });

  ipcMain.handle<Api>("deleteScene", async (_, displayId: string) => {
    const appdataPath = path.join(app.getPath("userData"), "localStorage");
    const scenePath = path.join(appdataPath, displayId);
    if (fs.existsSync(scenePath)) {
      fs.rmSync(scenePath, { recursive: true, force: true });
    }
  });

  ipcMain.handle<Api>("stopCalculation", async (_, displayId: string) => {
    const appdataPath = path.join(app.getPath("userData"), "localStorage");
    const scenePath = path.join(appdataPath, displayId);
    const indexPath = path.join(scenePath, "index.json");

    if (fs.existsSync(indexPath)) {
      const indexState: ISceneState = JSON.parse(
        fs.readFileSync(indexPath).toString()
      );

      // Ищем активный расчет
      if (indexState.calculations && indexState.calculations.length > 0) {
        const runningCalc = indexState.calculations.find(
          (calc) => calc.status === "running" && calc.pid
        );

        if (runningCalc && runningCalc.pid) {
          try {
            // Убиваем процесс на Windows
            if (process.platform === "win32") {
              exec(`taskkill /PID ${runningCalc.pid} /F /T`);
            } else {
              process.kill(runningCalc.pid, "SIGTERM");
            }

            // Обновляем состояние расчета
            runningCalc.status = "cancelled";
            runningCalc.endTime = new Date().toISOString();
            delete runningCalc.pid;

            // Обновляем legacy поля
            indexState.calculation = 0;

            fs.writeFileSync(indexPath, JSON.stringify(indexState, null, 2));
          } catch (error) {
            console.error("Error stopping calculation:", error);
          }
        }
      }

      // Legacy support для старого формата
      if ((indexState as any).calculationPid) {
        try {
          const pid = (indexState as any).calculationPid;
          if (process.platform === "win32") {
            exec(`taskkill /PID ${pid} /F /T`);
          } else {
            process.kill(pid, "SIGTERM");
          }
          indexState.calculation = 0;
          delete (indexState as any).calculationPid;
          fs.writeFileSync(indexPath, JSON.stringify(indexState, null, 2));
        } catch (error) {
          console.error("Error stopping calculation:", error);
        }
      }
    }
  });

  ipcMain.handle<Api>("watchNetworkSettings", async () => {
    // Read from store (same place as credentials)
    let proxySettings = store.get("proxySettings") as
      | INetworkSettings["proxy"]
      | undefined;

    // Migrate from old .networkSettings file if it exists and store is empty
    if (!proxySettings) {
      const userSettingsPath = path.join(
        app.getPath("userData"),
        ".networkSettings"
      );
      if (fs.existsSync(userSettingsPath)) {
        try {
          console.log(
            "[Settings] Migrating network settings from .networkSettings file to store"
          );
          const fileContent = fs.readFileSync(userSettingsPath).toString();
          const oldSettings = JSON.parse(fileContent) as INetworkSettings;
          if (oldSettings.proxy) {
            // Migrate to store
            store.set("proxySettings", oldSettings.proxy);
            proxySettings = oldSettings.proxy;
            console.log("[Settings] Migration completed successfully");
          }
        } catch (e) {
          console.error(
            "[Settings] Error migrating network settings from file:",
            e
          );
        }
      }
    }

    return {
      proxy: proxySettings,
    } as INetworkSettings;
  });

  ipcMain.handle<Api>(
    "saveNetworkSettings",
    async (_, settings: INetworkSettings) => {
      applyProxySettings(app, mainWindow, settings.proxy);

      // Save to store (same place as credentials)
      if (settings.proxy) {
        store.set("proxySettings", settings.proxy);
      } else {
        store.delete("proxySettings");
      }

      // Update proxy settings in usgs-api
      usgsApiManager.updateProxySettings(settings.proxy);

      // Re-authenticate if credentials exist (proxy change may require new session)
      const creds = store.get("userdata") as
        | SettingsChema["userdata"]
        | undefined;
      if (creds?.username && creds?.token) {
        console.log(
          "[Settings] Proxy settings changed, re-authenticating USGS API"
        );
        // Re-authenticate in background (don't block settings save)
        usgsApiManager.login(creds).catch((e) => {
          console.error(
            "[Settings] Error re-authenticating after proxy change:",
            e
          );
        });
      }

      // Notify all windows that network settings changed (to trigger network test)
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("network-settings-changed");
        }
      });
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
    (_event, key: keyof SettingsChema | string) => {
      return store.get(key);
    }
  );

  ipcMain.handle<Api>(
    "setStoreValue",
    async (_event, key: keyof SettingsChema, value: unknown) => {
      if (!value) {
        store.delete(key);
      }
      return store.set(key, value);
    }
  );
}
