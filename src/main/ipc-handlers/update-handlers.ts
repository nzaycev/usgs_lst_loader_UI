import { app, BrowserWindow } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import { autoUpdater } from "electron-updater";
import type { Api } from "../../tools/ElectronApi";

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.APP_DEV === "true";

// Настройка autoUpdater (только в production)
if (!isDev) {
  autoUpdater.autoDownload = false; // Не скачивать автоматически, только проверять
  autoUpdater.autoInstallOnAppQuit = true; // Устанавливать при закрытии приложения
}

export function setupUpdateHandlers(window: BrowserWindow) {
  mainWindow = window;

  // Обработчики событий autoUpdater (только в production)
  if (!isDev) {
    autoUpdater.on("checking-for-update", () => {
      console.log("[Updater] Checking for update...");
      mainWindow?.webContents.send("update-checking");
    });

    autoUpdater.on("update-available", (info) => {
      console.log("[Updater] Update available:", info.version);
      mainWindow?.webContents.send("update-available", info);
    });

    autoUpdater.on("update-not-available", (info) => {
      console.log("[Updater] Update not available. Current version is latest.");
      mainWindow?.webContents.send("update-not-available", info);
    });

    autoUpdater.on("error", (error) => {
      console.error("[Updater] Error:", error);
      mainWindow?.webContents.send("update-error", error.message);
    });

    autoUpdater.on("download-progress", (progress) => {
      console.log("[Updater] Download progress:", progress.percent);
      mainWindow?.webContents.send("update-download-progress", progress);
    });

    autoUpdater.on("update-downloaded", (info) => {
      console.log("[Updater] Update downloaded:", info.version);
      mainWindow?.webContents.send("update-downloaded", info);
    });
  } else {
    console.log(
      "[Updater] Running in development mode - update checks will be simulated"
    );
  }

  // IPC обработчики (всегда регистрируются, в dev режиме возвращают заглушки)
  ipcMain.handle<Api>("checkForUpdates", async () => {
    if (isDev) {
      // Симулируем проверку обновлений для тестирования UI
      console.log("[Updater] Simulating update check in dev mode");
      mainWindow?.webContents.send("update-checking");

      // Симулируем ответ через небольшую задержку
      setTimeout(() => {
        // Для тестирования можно раскомментировать одну из строк ниже:
        // mainWindow?.webContents.send("update-not-available", { version: app.getVersion() });
        // mainWindow?.webContents.send("update-available", { version: "2.3.0", releaseDate: new Date().toISOString() });
        mainWindow?.webContents.send("update-not-available", {
          version: app.getVersion(),
        });
      }, 1000);

      return { success: true };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error("[Updater] Error checking for updates:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle<Api>("downloadUpdate", async () => {
    if (isDev) {
      // Симулируем скачивание обновления для тестирования UI
      console.log("[Updater] Simulating update download in dev mode");

      // Симулируем прогресс скачивания
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        mainWindow?.webContents.send("update-download-progress", {
          percent: progress,
        });

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            mainWindow?.webContents.send("update-downloaded", {
              version: "2.3.0",
              releaseDate: new Date().toISOString(),
            });
          }, 500);
        }
      }, 200);

      return { success: true };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error("[Updater] Error downloading update:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle<Api>("quitAndInstall", async () => {
    if (isDev) {
      console.log(
        "[Updater] Simulating install in dev mode (no actual install)"
      );
      return { success: true };
    }
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });

  ipcMain.handle<Api>("getAppVersion", async () => {
    return app.getVersion();
  });
}
