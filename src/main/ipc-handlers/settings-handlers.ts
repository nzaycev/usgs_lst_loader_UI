import { app, BrowserWindow } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { FsWatcher } from "../../backend/fs-watcher";
import { SettingsChema, store } from "../../backend/settings-store";
import type { Api } from "../../tools/ElectronApi";
import type {
  CalculationSettings,
  INetworkSettings,
} from "../../ui/network-settings/network-settings-state";
import type { ISceneState } from "../../actions/main-actions";
import { applyProxySettings } from "../proxy-settings";

export function setupSettingsHandlers(mainWindow: BrowserWindow, fsWatcher?: FsWatcher) {
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
