import { BrowserWindow, ipcMain as electronIpcMain } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import type { Api } from "../../tools/ElectronApi";
import { FsWatcher } from "../fs-watcher";
import { SettingsChema, store } from "../settings-store";
import { usgsApiManager } from "../usgs-api";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function setupDialogHandlers(
  mainWindow: BrowserWindow,
  fsWatcher: FsWatcher
) {
  ipcMain.handle<Api>(
    "openLoginDialog",
    async (
      _,
      payload: {
        username?: string;
        token?: string;
        autoLogin?: boolean;
      }
    ): Promise<{ username: string; token: string } | null> => {
      // Always show dialog immediately, even if we have stored credentials
      // The dialog will handle auto-login and show "Checking permissions..." state
      const storedCreds = store.get("userdata") as
        | SettingsChema["userdata"]
        | undefined;

      return new Promise((resolve) => {
        let isResolved = false;

        // Always create and show dialog window immediately
        const dialogWindow = new BrowserWindow({
          parent: mainWindow,
          modal: true,
          titleBarStyle: "hidden",
          width: 500,
          height: 400,
          resizable: true,
          title: "USGS Authentication",
          darkTheme: true,
          webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            webSecurity: false,
          },
        });
        dialogWindow.setBackgroundColor("#111827");

        // Prepare data for dialog
        const dialogData = {
          username: payload.username || storedCreds?.username || "",
          token: payload.token || storedCreds?.token || "",
          autoLogin: payload.autoLogin ?? true,
        };

        // Передаем данные через hash в URL
        const data = encodeURIComponent(JSON.stringify(dialogData));
        dialogWindow.loadURL(
          `${MAIN_WINDOW_WEBPACK_ENTRY}#login-dialog:${data}`
        );

        // Show window immediately
        dialogWindow.show();

        // добавляем горячую клавишу F12 для переключения DevTools
        dialogWindow.webContents.on("before-input-event", (_event, input) => {
          if (
            input.key === "F12" ||
            (input.control && input.shift && input.key === "I")
          ) {
            if (dialogWindow.webContents.isDevToolsOpened()) {
              dialogWindow.webContents.closeDevTools();
            } else {
              dialogWindow.webContents.openDevTools();
            }
          }
        });

        // Функция для очистки и разрешения промиса
        const cleanupAndResolve = (
          result: { username: string; token: string } | null
        ) => {
          if (isResolved) return;
          isResolved = true;

          // Удаляем listener перед закрытием окна
          try {
            electronIpcMain.removeListener(
              "login-dialog-result",
              resultHandler
            );
          } catch (e) {
            console.error("Error removing listener:", e);
          }

          // Закрываем окно, если оно еще не закрыто
          try {
            if (!dialogWindow.isDestroyed()) {
              dialogWindow.close();
            }
          } catch (e) {
            console.error("Error closing window:", e);
          }

          resolve(result);
        };

        // Слушаем результат от диалога
        const resultHandler = (
          event: Electron.IpcMainEvent,
          result: { username: string; token: string } | null
        ) => {
          // Проверяем, что результат пришел от правильного окна
          if (event.sender === dialogWindow.webContents) {
            if (result) {
              // Проверяем права доступа
              usgsApiManager
                .checkUserPermissions({
                  username: result.username,
                  token: result.token,
                })
                .then((response) => {
                  const { data } = response || {};
                  if (data?.data?.includes?.("download")) {
                    // Сохраняем креды
                    store.set("userdata", {
                      username: result.username,
                      token: result.token,
                    });
                    // Отправляем сообщение в renderer для обновления состояния
                    mainWindow.webContents.send("login-success", {
                      username: result.username,
                      token: result.token,
                    });
                    cleanupAndResolve(result);
                  } else {
                    cleanupAndResolve(null);
                  }
                })
                .catch((e) => {
                  console.error("Error checking permissions:", e);
                  cleanupAndResolve(null);
                });
            } else {
              cleanupAndResolve(null);
            }
          }
        };

        electronIpcMain.on("login-dialog-result", resultHandler);

        // Если окно закрыто без результата
        dialogWindow.on("closed", () => {
          cleanupAndResolve(null);
        });
      });
    }
  );

  ipcMain.handle<Api>(
    "openSearchSceneDialog",
    async (): Promise<{
      start: [number, number];
      end: [number, number];
    } | null> => {
      return new Promise(async (resolve) => {
        let isResolved = false;

        // Get current scenes list to pass to dialog
        const scenesState = await fsWatcher.getState();
        const existingDisplayIds = Object.keys(scenesState || {});
        const scenesData = JSON.stringify({ displayIds: existingDisplayIds });

        const dialogWindow = new BrowserWindow({
          parent: mainWindow,
          modal: true,
          titleBarStyle: "hidden",
          width: 1000,
          height: 700,
          resizable: true,
          title: "Search Scene",
          darkTheme: true,
          webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            webSecurity: false,
          },
        });
        dialogWindow.setBackgroundColor("#111827");

        dialogWindow.loadURL(
          `${MAIN_WINDOW_WEBPACK_ENTRY}#search-scene-dialog:${encodeURIComponent(
            scenesData
          )}`
        );

        dialogWindow.show();

        dialogWindow.webContents.on("before-input-event", (_event, input) => {
          if (
            input.key === "F12" ||
            (input.control && input.shift && input.key === "I")
          ) {
            if (dialogWindow.webContents.isDevToolsOpened()) {
              dialogWindow.webContents.closeDevTools();
            } else {
              dialogWindow.webContents.openDevTools();
            }
          }
        });

        const cleanupAndResolve = (
          result: {
            start: [number, number];
            end: [number, number];
          } | null
        ) => {
          if (isResolved) return;
          isResolved = true;

          try {
            electronIpcMain.removeListener(
              "search-scene-dialog-result",
              resultHandler
            );
          } catch (e) {
            console.error("Error removing listener:", e);
          }

          try {
            if (!dialogWindow.isDestroyed()) {
              dialogWindow.close();
            }
          } catch (e) {
            console.error("Error closing window:", e);
          }

          resolve(result);
        };

        const resultHandler = (
          event: Electron.IpcMainEvent,
          result: {
            start: [number, number];
            end: [number, number];
          } | null
        ) => {
          if (event.sender === dialogWindow.webContents) {
            cleanupAndResolve(result);
          }
        };

        electronIpcMain.on("search-scene-dialog-result", resultHandler);

        dialogWindow.on("closed", () => {
          cleanupAndResolve(null);
        });
      });
    }
  );

  ipcMain.handle<Api>(
    "openSettingsDialog",
    async (): Promise<boolean | null> => {
      return new Promise((resolve) => {
        let isResolved = false;

        const dialogWindow = new BrowserWindow({
          parent: mainWindow,
          modal: true,
          titleBarStyle: "hidden",
          width: 600,
          height: 700,
          resizable: true,
          title: "Network Settings",
          darkTheme: true,
          webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            webSecurity: false,
          },
        });
        dialogWindow.setBackgroundColor("#111827");

        dialogWindow.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}#settings-dialog:`);

        dialogWindow.show();

        dialogWindow.webContents.on("before-input-event", (_event, input) => {
          if (
            input.key === "F12" ||
            (input.control && input.shift && input.key === "I")
          ) {
            if (dialogWindow.webContents.isDevToolsOpened()) {
              dialogWindow.webContents.closeDevTools();
            } else {
              dialogWindow.webContents.openDevTools();
            }
          }
        });

        const cleanupAndResolve = (result: boolean | null) => {
          if (isResolved) return;
          isResolved = true;

          try {
            electronIpcMain.removeListener(
              "settings-dialog-result",
              resultHandler
            );
          } catch (e) {
            console.error("Error removing listener:", e);
          }

          try {
            if (!dialogWindow.isDestroyed()) {
              dialogWindow.close();
            }
          } catch (e) {
            console.error("Error closing window:", e);
          }

          resolve(result);
        };

        const resultHandler = (
          event: Electron.IpcMainEvent,
          result: boolean | null
        ) => {
          if (event.sender === dialogWindow.webContents) {
            cleanupAndResolve(result);
          }
        };

        electronIpcMain.on("settings-dialog-result", resultHandler);

        dialogWindow.on("closed", () => {
          cleanupAndResolve(null);
        });
      });
    }
  );

  ipcMain.handle<Api>(
    "openCalculationDialog",
    async (
      _,
      payload: {
        initialSettings?: import("../../actions/main-actions").RunArgs;
        displayId?: string;
      }
    ): Promise<import("../../actions/main-actions").RunArgs | null> => {
      return new Promise((resolve) => {
        let isResolved = false;

        const dialogWindow = new BrowserWindow({
          parent: mainWindow,
          modal: true,
          titleBarStyle: "hidden",
          width: 500,
          minWidth: 400,
          height: 600,
          minHeight: 400,
          resizable: true,
          title: "Preparing for calculation",
          darkTheme: true,
          webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            webSecurity: false,
          },
        });
        dialogWindow.setBackgroundColor("#111827");

        const cleanupAndResolve = (
          result: import("../../actions/main-actions").RunArgs | null
        ) => {
          if (isResolved) return;
          isResolved = true;

          try {
            electronIpcMain.removeListener(
              "calculation-dialog-result",
              resultHandler
            );
          } catch (e) {
            console.error("Error removing listener:", e);
          }

          try {
            if (!dialogWindow.isDestroyed()) {
              dialogWindow.close();
            }
          } catch (e) {
            console.error("Error closing window:", e);
          }

          resolve(result);
        };

        const resultHandler = (
          event: Electron.IpcMainEvent,
          result: import("../../actions/main-actions").RunArgs | null
        ) => {
          if (event.sender === dialogWindow.webContents) {
            cleanupAndResolve(result);
          }
        };

        electronIpcMain.on("calculation-dialog-result", resultHandler);

        const dialogData = {
          initialSettings: payload.initialSettings,
          displayId: (payload as any).displayId || null,
        };
        const data = encodeURIComponent(JSON.stringify(dialogData));
        dialogWindow.loadURL(
          `${MAIN_WINDOW_WEBPACK_ENTRY}#calculation-dialog:${data}`
        );

        dialogWindow.show();

        dialogWindow.webContents.on("before-input-event", (_event, input) => {
          if (
            input.key === "F12" ||
            (input.control && input.shift && input.key === "I")
          ) {
            if (dialogWindow.webContents.isDevToolsOpened()) {
              dialogWindow.webContents.closeDevTools();
            } else {
              dialogWindow.webContents.openDevTools();
            }
          }
        });

        dialogWindow.on("closed", () => {
          cleanupAndResolve(null);
        });
      });
    }
  );
}
