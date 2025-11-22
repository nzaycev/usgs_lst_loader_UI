import { BrowserWindow, ipcMain as electronIpcMain } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import { checkUserPermissons } from "../../actions/usgs-api";
import type { Api } from "../../tools/ElectronApi";
import { SettingsChema, store } from "../settings-store";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function setupDialogHandlers(mainWindow: BrowserWindow) {
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
              checkUserPermissons({
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
}
