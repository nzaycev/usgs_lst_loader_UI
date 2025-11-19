import {
  ipcMain as electronIpcMain,
  dialog,
  BrowserWindow,
  app,
} from "electron";
import { ipcMain } from "electron-typescript-ipc";
import type { Api } from "../../tools/ElectronApi";
import type { USGSLayerType } from "../../actions/main-actions";
import { FsWatcher } from "../../backend/fs-watcher";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function setupFileHandlers(
  mainWindow: BrowserWindow,
  fsWatcher: FsWatcher
) {
  ipcMain.handle<Api>("openExplorer", async (_, path_: string) => {
    const appdataPath = path.join(app.getPath("userData"), "localStorage");
    spawn(`explorer`, [`/select,"${path.join(appdataPath, path_)}"`], {
      windowsVerbatimArguments: true,
    });
  });

  ipcMain.handle<Api>("watch", async () => {
    return fsWatcher.getState();
  });

  ipcMain.handle<Api>("selectFolder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle<Api>("selectFile", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "TIF Files", extensions: ["tif", "TIF"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle<Api>("scanFolder", async (_, folderPath: string) => {
    const files: string[] = [];
    const suggestedMapping: Record<string, USGSLayerType> = {};

    if (!fs.existsSync(folderPath)) {
      return { files: [] };
    }

    const items = fs.readdirSync(folderPath);
    const layerTypes: USGSLayerType[] = [
      "ST_TRAD",
      "ST_ATRAN",
      "ST_URAD",
      "ST_DRAD",
      "SR_B6",
      "SR_B5",
      "SR_B4",
      "QA_PIXEL",
    ];

    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isFile() && (item.endsWith(".TIF") || item.endsWith(".tif"))) {
        files.push(item);

        // Попытка автоматического определения типа слоя
        // Формат: {displayId}_{layerType}.TIF или {displayId}_T1_{layerType}.TIF
        const fileName = item.replace(/\.(TIF|tif)$/, "");

        // Проверяем паттерн _T1_{layerType}
        const t1Match = fileName.match(/_T1_(.+)$/);
        if (t1Match) {
          const potentialType = t1Match[1] as USGSLayerType;
          if (layerTypes.includes(potentialType)) {
            suggestedMapping[item] = potentialType;
            continue;
          }
        }

        // Проверяем паттерн _{layerType} в конце
        for (const layerType of layerTypes) {
          if (fileName.endsWith(`_${layerType}`)) {
            suggestedMapping[item] = layerType;
            break;
          }
        }
      }
    }

    return {
      files,
      suggestedMapping:
        Object.keys(suggestedMapping).length > 0 ? suggestedMapping : undefined,
    };
  });

  ipcMain.handle<Api>(
    "addExternalFolder",
    async (
      _,
      payload: {
        folderPath: string;
        fileMapping: Record<string, USGSLayerType>;
        metadata?: {
          displayId: string;
          entityId?: string;
          captureDate?: string;
          source?: string;
          city?: string;
          displayName?: string;
        };
      }
    ) => {
      fsWatcher.addExternalFolder(
        payload.folderPath,
        payload.fileMapping,
        payload.metadata
      );
    }
  );

  ipcMain.handle<Api>(
    "openMappingDialog",
    async (
      _event,
      payload: {
        folderPath: string;
        files: string[];
        suggestedMapping?: Record<string, USGSLayerType>;
      }
    ): Promise<{
      fileMapping: Record<string, USGSLayerType>;
      metadata?: {
        displayId: string;
        entityId?: string;
        captureDate?: string;
        source?: string;
        city?: string;
        displayName?: string;
      };
    } | null> => {
      return new Promise((resolve) => {
        let isResolved = false;
        const dialogWindow = new BrowserWindow({
          parent: mainWindow,
          modal: true,
          titleBarStyle: "hidden",
          width: 600,
          height: 900,
          resizable: true,
          title: "Map Files and Add Metadata",
          webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            webSecurity: false,
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        // Функция для очистки и разрешения промиса
        const cleanupAndResolve = (
          result: {
            fileMapping: Record<string, USGSLayerType>;
            metadata?: {
              displayId: string;
              entityId?: string;
              captureDate?: string;
              source?: string;
              city?: string;
              displayName?: string;
            };
          } | null
        ) => {
          if (isResolved) return;
          isResolved = true;

          // Удаляем listener перед закрытием окна
          try {
            electronIpcMain.removeListener(
              "mapping-dialog-result",
              resultHandler
            );
          } catch (e) {
            // Игнорируем ошибки при удалении listener
            console.error("Error removing listener:", e);
          }

          // Закрываем окно, если оно еще не закрыто
          try {
            if (!dialogWindow.isDestroyed()) {
              dialogWindow.close();
            }
          } catch (e) {
            // Игнорируем ошибки при закрытии
            console.error("Error closing window:", e);
          }

          resolve(result);
        };

        // Слушаем результат от диалога
        const resultHandler = (
          event: Electron.IpcMainEvent,
          result: {
            fileMapping: Record<string, USGSLayerType>;
            metadata?: {
              displayId: string;
              entityId?: string;
              captureDate?: string;
              source?: string;
              city?: string;
              displayName?: string;
            };
          } | null
        ) => {
          // Проверяем, что результат пришел от правильного окна
          if (event.sender === dialogWindow.webContents) {
            cleanupAndResolve(result);
          }
        };

        electronIpcMain.on("mapping-dialog-result", resultHandler);

        // Передаем данные через hash в URL
        const dialogData = {
          folderPath: payload.folderPath,
          files: payload.files,
          suggestedMapping: payload.suggestedMapping,
        };
        const data = encodeURIComponent(JSON.stringify(dialogData));
        dialogWindow.loadURL(
          `${MAIN_WINDOW_WEBPACK_ENTRY}#mapping-dialog:${data}`
        );

        // Show window immediately
        dialogWindow.show();

        // добавляем горячую клавишу F12 для переключения DevTools
        dialogWindow.webContents.on("before-input-event", (event, input) => {
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

        // Если окно закрыто без результата
        dialogWindow.on("closed", () => {
          cleanupAndResolve(null);
        });
      });
    }
  );
}
