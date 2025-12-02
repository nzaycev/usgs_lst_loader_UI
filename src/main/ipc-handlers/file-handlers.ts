import { spawn } from "child_process";
import {
  BrowserWindow,
  dialog,
  ipcMain as electronIpcMain,
  nativeImage,
  shell,
} from "electron";
import { ipcMain } from "electron-typescript-ipc";
import fs from "fs";
import path from "path";
import type { USGSLayerType } from "../../actions/main-actions";
import { REQUIRED_LAYERS } from "../../constants/layers";
import type { Api } from "../../tools/ElectronApi";
import { FsWatcher } from "../fs-watcher";
import { getPreloadPath, getRendererUrl } from "../paths";
import { scenePathResolver } from "../scene-path-resolver";

export function setupFileHandlers(
  mainWindow: BrowserWindow,
  fsWatcher: FsWatcher
) {
  ipcMain.handle<Api>("openExplorer", async (_, displayId: string) => {
    // Используем утилиту для поиска пути к сцене
    const result = scenePathResolver.findScenePath(displayId, fsWatcher);

    if (!result) {
      console.error("[openExplorer] Scene not found:", displayId);
      return;
    }

    // Нормализуем путь для Windows (используем обратные слеши)
    const normalizedPath = path.normalize(result.scenePath);

    console.log("[openExplorer] Opening directory:", {
      displayId,
      scenePath: normalizedPath,
      isRepo: result.isRepo,
    });

    // Проверяем, что директория существует
    if (!fs.existsSync(normalizedPath)) {
      console.error("[openExplorer] Directory does not exist:", normalizedPath);
      return;
    }

    // Открываем саму директорию, а не родительскую с выделением
    spawn(`explorer`, [normalizedPath], {
      windowsVerbatimArguments: false,
    });
  });

  ipcMain.handle<Api>("openDirectory", async (_, directoryPath: string) => {
    // Нормализуем путь для Windows (используем обратные слеши)
    const normalizedPath = path.normalize(directoryPath);

    console.log("[openDirectory] Opening directory:", normalizedPath);

    // Проверяем, что директория существует
    if (!fs.existsSync(normalizedPath)) {
      console.error(
        "[openDirectory] Directory does not exist:",
        normalizedPath
      );
      return;
    }

    // Открываем саму директорию
    spawn(`explorer`, [normalizedPath], {
      windowsVerbatimArguments: false,
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

    // Используем withFileTypes для правильной обработки Unicode имен файлов
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
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
      if (!item.isFile()) {
        continue;
      }

      const fileName = item.name;
      if (!fileName.endsWith(".TIF") && !fileName.endsWith(".tif")) {
        continue;
      }

      const itemPath = path.join(folderPath, fileName);

      // Проверяем существование файла
      if (!fs.existsSync(itemPath)) {
        continue;
      }

      files.push(fileName);

      // Попытка автоматического определения типа слоя
      // Формат: {displayId}_{layerType}.TIF или {displayId}_T1_{layerType}.TIF
      const fileNameWithoutExt = fileName.replace(/\.(TIF|tif)$/, "");

      // Проверяем паттерн _T1_{layerType}
      const t1Match = fileNameWithoutExt.match(/_T1_(.+)$/);
      if (t1Match) {
        const potentialType = t1Match[1] as USGSLayerType;
        if (layerTypes.includes(potentialType)) {
          suggestedMapping[fileName] = potentialType;
          continue;
        }
      }

      // Проверяем паттерн _{layerType} в конце
      for (const layerType of layerTypes) {
        if (fileNameWithoutExt.endsWith(`_${layerType}`)) {
          suggestedMapping[fileName] = layerType;
          break;
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
          captureDate?: string;
          regionId?: string;
          satelliteId?: string;
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

  electronIpcMain.on("start-drag", async (event, directoryPath: string) => {
    // Нормализуем путь для Windows
    const normalizedPath = path.normalize(directoryPath);

    console.log("[startDrag] Starting drag for directory:", normalizedPath);

    // Проверяем, что директория существует
    if (!fs.existsSync(normalizedPath)) {
      console.error("[startDrag] Directory does not exist:", normalizedPath);
      return;
    }

    try {
      // Читаем все элементы в директории
      // Используем withFileTypes для правильной обработки Unicode имен файлов
      const items = fs.readdirSync(normalizedPath, { withFileTypes: true });
      const filePaths: string[] = [];

      // Фильтруем только файлы (не папки) и собираем полные пути
      for (const item of items) {
        if (!item.isFile()) {
          continue;
        }

        const fileName = item.name;
        if (!fileName.endsWith(".TIF") && !fileName.endsWith(".tif")) {
          continue;
        }

        // Используем path.join для правильной обработки путей с кириллицей
        const itemPath = path.join(normalizedPath, fileName);
        try {
          // Проверяем существование файла (для дополнительной валидации)
          if (fs.existsSync(itemPath)) {
            filePaths.push(itemPath);
          }
        } catch (error) {
          // Игнорируем ошибки доступа к отдельным файлам
          console.warn("[startDrag] Error reading file:", itemPath, error);
        }
      }

      if (filePaths.length === 0) {
        console.warn(
          "[startDrag] No files found in directory:",
          normalizedPath
        );
        return;
      }

      console.log(
        `[startDrag] Found ${filePaths.length} files, dragging first file:`,
        filePaths[0]
      );

      event.sender.startDrag({
        file: filePaths[0],
        files: filePaths,
        icon: await nativeImage.createThumbnailFromPath(filePaths[0], {
          width: 16,
          height: 16,
        }),
      });
    } catch (error) {
      console.error("[startDrag] Error reading directory:", error);
    }
  });

  // Обработчик для открытия файла нативным обработчиком
  ipcMain.handle<Api>("openFile", async (_, filePath: string) => {
    // Путь уже должен быть нормализован, но на всякий случай нормализуем еще раз
    // Важно: не используем path.normalize для путей с кириллицей, так как это может сломать кодировку
    // Вместо этого используем путь как есть, если он уже абсолютный
    let normalizedPath: string;

    if (path.isAbsolute(filePath)) {
      normalizedPath = filePath;
    } else {
      // Если путь относительный, нормализуем его
      normalizedPath = path.normalize(filePath);
    }

    console.log("[openFile] Opening file:", normalizedPath);
    console.log(
      "[openFile] File path bytes:",
      Buffer.from(normalizedPath, "utf-8").toString("hex")
    );

    if (!fs.existsSync(normalizedPath)) {
      console.error("[openFile] File does not exist:", normalizedPath);
      // Попробуем найти файл, используя разные варианты кодировки
      const dir = path.dirname(normalizedPath);
      const baseName = path.basename(normalizedPath);
      console.log("[openFile] Trying to find file in directory:", dir);
      console.log("[openFile] Looking for filename:", baseName);

      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        const foundFile = files.find((f) => f.isFile() && f.name === baseName);
        if (foundFile) {
          normalizedPath = path.join(dir, foundFile.name);
          console.log(
            "[openFile] Found file with correct encoding:",
            normalizedPath
          );
        }
      } catch (e) {
        console.error("[openFile] Error searching for file:", e);
      }
    }

    if (!fs.existsSync(normalizedPath)) {
      console.error(
        "[openFile] File still does not exist after search:",
        normalizedPath
      );
      return;
    }

    // Используем shell.openPath для открытия файла нативным обработчиком
    try {
      await shell.openPath(normalizedPath);
    } catch (error) {
      console.error("[openFile] Error opening file:", error);
    }
  });

  // Обработчик для drag and drop одного файла
  electronIpcMain.on("start-drag-file", async (event, filePath: string) => {
    const normalizedPath = path.normalize(filePath);

    console.log("[startDragFile] Starting drag for file:", normalizedPath);

    if (!fs.existsSync(normalizedPath)) {
      console.error("[startDragFile] File does not exist:", normalizedPath);
      return;
    }

    try {
      const stat = fs.statSync(normalizedPath);
      if (!stat.isFile()) {
        console.error("[startDragFile] Path is not a file:", normalizedPath);
        return;
      }

      event.sender.startDrag({
        file: normalizedPath,
        icon: await nativeImage.createThumbnailFromPath(normalizedPath, {
          width: 16,
          height: 16,
        }),
      });
    } catch (error) {
      console.error("[startDragFile] Error:", error);
    }
  });

  // Обработчик для drag and drop с фильтрацией по required layers
  electronIpcMain.on(
    "start-drag-required-layers",
    async (event, displayId: string) => {
      console.log(
        "[startDragRequiredLayers] Starting drag for required layers:",
        displayId
      );

      // Используем утилиту для поиска пути к сцене
      const result = scenePathResolver.findScenePath(displayId, fsWatcher);

      if (!result) {
        console.error("[startDragRequiredLayers] Scene not found:", displayId);
        return;
      }

      const normalizedPath = path.normalize(result.scenePath);
      const filePaths: string[] = [];

      try {
        // Для !isRepo сцен используем маппинги из index.json
        if (result.isRepo === false && result.indexState) {
          console.log(
            "[startDragRequiredLayers] Using file mappings from index.json for !isRepo scene"
          );

          // Получаем пути к файлам из маппинга для required layers
          for (const layer of REQUIRED_LAYERS) {
            const fileInfo = result.indexState.donwloadedFiles[layer];
            if (fileInfo?.filePath) {
              // Определяем полный путь к файлу
              let fullFilePath: string;
              if (path.isAbsolute(fileInfo.filePath)) {
                fullFilePath = fileInfo.filePath;
              } else {
                fullFilePath = path.join(normalizedPath, fileInfo.filePath);
              }

              // Нормализуем путь
              fullFilePath = path.normalize(fullFilePath);

              // Проверяем существование файла
              if (fs.existsSync(fullFilePath)) {
                filePaths.push(fullFilePath);
                console.log(
                  `[startDragRequiredLayers] Found mapped file for ${layer}:`,
                  fullFilePath
                );
              } else {
                console.warn(
                  `[startDragRequiredLayers] Mapped file does not exist for ${layer}:`,
                  fullFilePath
                );
              }
            }
          }
        } else {
          // Для isRepo сцен используем стандартную логику - ищем файлы в директории
          if (!fs.existsSync(normalizedPath)) {
            console.error(
              "[startDragRequiredLayers] Directory does not exist:",
              normalizedPath
            );
            return;
          }

          // Читаем все элементы в директории
          // Используем withFileTypes для правильной обработки Unicode имен файлов
          const items = fs.readdirSync(normalizedPath, { withFileTypes: true });

          // Фильтруем только файлы с required layers
          for (const item of items) {
            if (!item.isFile()) {
              continue;
            }

            const fileName = item.name;
            if (!fileName.endsWith(".TIF") && !fileName.endsWith(".tif")) {
              continue;
            }

            // Проверяем, содержит ли имя файла один из required layers
            const hasRequiredLayer = REQUIRED_LAYERS.some((layer) =>
              fileName.includes(layer)
            );

            if (!hasRequiredLayer) {
              continue;
            }

            // Используем path.join для правильной обработки путей с кириллицей
            const itemPath = path.join(normalizedPath, fileName);
            try {
              // Проверяем существование файла (для дополнительной валидации)
              if (fs.existsSync(itemPath)) {
                filePaths.push(itemPath);
              }
            } catch (error) {
              console.warn(
                "[startDragRequiredLayers] Error reading file:",
                itemPath,
                error
              );
            }
          }
        }

        if (filePaths.length === 0) {
          console.warn(
            "[startDragRequiredLayers] No required layer files found:",
            normalizedPath
          );
          return;
        }

        console.log(
          `[startDragRequiredLayers] Found ${filePaths.length} required layer files`
        );

        event.sender.startDrag({
          file: filePaths[0],
          files: filePaths,
          icon: await nativeImage.createThumbnailFromPath(filePaths[0], {
            width: 16,
            height: 16,
          }),
        });
      } catch (error) {
        console.error(
          "[startDragRequiredLayers] Error reading directory:",
          error
        );
      }
    }
  );

  // Обработчик для получения списка файлов из results директории с фильтрацией по output layers
  ipcMain.handle<Api>(
    "getResultsFiles",
    async (_, resultsPath: string, outputLayers: Record<string, boolean>) => {
      const normalizedPath = path.normalize(resultsPath);

      console.log("[getResultsFiles] Getting files from:", normalizedPath);

      if (!fs.existsSync(normalizedPath)) {
        console.error(
          "[getResultsFiles] Directory does not exist:",
          normalizedPath
        );
        return [];
      }

      try {
        const items = fs.readdirSync(normalizedPath);
        const filePaths: string[] = [];

        // Получаем список включенных output layers
        const enabledLayers = Object.entries(outputLayers)
          .filter(([, enabled]) => enabled)
          .map(([layer]) => layer);

        // Фильтруем файлы по output layers
        for (const item of items) {
          if (!item.endsWith(".TIF")) {
            continue;
          }

          // Проверяем, содержит ли имя файла один из output layers
          const hasOutputLayer = enabledLayers.some((layer) =>
            item.includes(layer)
          );

          if (!hasOutputLayer) {
            continue;
          }

          const itemPath = path.join(normalizedPath, item);
          try {
            const stat = fs.statSync(itemPath);
            if (stat.isFile()) {
              filePaths.push(itemPath);
            }
          } catch (error) {
            console.warn(
              "[getResultsFiles] Error reading file:",
              itemPath,
              error
            );
          }
        }

        console.log(
          `[getResultsFiles] Found ${filePaths.length} output layer files`
        );
        return filePaths;
      } catch (error) {
        console.error("[getResultsFiles] Error reading directory:", error);
        return [];
      }
    }
  );

  // Обработчик для получения путей к папкам при drop
  ipcMain.handle<Api>("validateDroppedPaths", async (_, paths: string[]) => {
    const folders: string[] = [];
    const errors: string[] = [];

    for (const droppedPath of paths) {
      const normalizedPath = path.normalize(droppedPath);

      try {
        if (!fs.existsSync(normalizedPath)) {
          errors.push(`Path does not exist: ${normalizedPath}`);
          continue;
        }

        const stat = fs.statSync(normalizedPath);
        if (stat.isDirectory()) {
          folders.push(normalizedPath);
        } else {
          errors.push(`Not a folder: ${normalizedPath}`);
        }
      } catch (error) {
        errors.push(
          `Error checking path ${normalizedPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      folders,
      errors,
    };
  });

  ipcMain.handle<Api>(
    "openMappingDialog",
    async (
      _event,
      payload: {
        folderPath: string;
        files: string[];
        suggestedMapping?: Record<string, USGSLayerType>;
        existingMapping?: Record<string, USGSLayerType>;
        existingMetadata?: {
          displayId: string;
          captureDate?: string;
          regionId?: string;
          satelliteId?: string;
        };
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
            preload: getPreloadPath(),
            webSecurity: false,
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
        dialogWindow.setBackgroundColor("#111827");

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
          existingMapping: payload.existingMapping,
          existingMetadata: payload.existingMetadata,
        };
        const data = encodeURIComponent(JSON.stringify(dialogData));
        dialogWindow.loadURL(`${getRendererUrl()}#mapping-dialog:${data}`);

        // Show window immediately
        dialogWindow.show();

        // добавляем горячую клавишу F12 для переключения DevTools
        dialogWindow.webContents.on(
          "before-input-event",
          (_event: Electron.Event, input: Electron.Input) => {
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
          }
        );

        // Если окно закрыто без результата
        dialogWindow.on("closed", () => {
          cleanupAndResolve(null);
        });
      });
    }
  );
}
