import { app } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import fs from "fs";
import path from "path";
import type { ISceneState } from "../../actions/main-actions";
import type { Api, DownloadProps } from "../../tools/ElectronApi";

export function setupRepoHandlers() {
  /**
   * remember download url list and may be download immediately
   */
  ipcMain.handle<Api>(
    "addRepo",
    async (_, { displayId, entityId, ds }: DownloadProps) => {
      const appdataPath = path.join(app.getPath("userData"), "localStorage");
      const scenePath = path.join(appdataPath, displayId);
      if (!fs.existsSync(scenePath)) {
        fs.mkdirSync(scenePath, { recursive: true });
      }
      const indexFilePath = path.join(scenePath, "index.json");

      // Читаем существующий state, если он есть
      let existingState: ISceneState | null = null;
      if (fs.existsSync(indexFilePath)) {
        try {
          const existingContent = fs.readFileSync(indexFilePath, "utf-8");
          existingState = JSON.parse(existingContent);
        } catch (e) {
          console.error("Error reading existing index.json:", e);
        }
      }

      // Сохраняем существующий прогресс файлов и calculations
      const existingFiles: ISceneState["donwloadedFiles"] =
        existingState?.donwloadedFiles ||
        ({} as ISceneState["donwloadedFiles"]);
      const existingCalculations = existingState?.calculations || [];
      const existingCalculated = existingState?.calculated || false;
      const existingCalculation = existingState?.calculation || 0;

      // Обновляем URL-ы для новых файлов, но сохраняем прогресс существующих
      const updatedFiles = Object.assign(
        {},
        ...ds.map((item) => {
          const existingFile = existingFiles[item.layerName];
          return {
            [item.layerName]: {
              url: item.url, // Всегда обновляем URL
              // Сохраняем существующий прогресс и размер, если они есть
              ...(existingFile?.progress !== undefined && {
                progress: existingFile.progress,
              }),
              ...(existingFile?.size !== undefined && {
                size: existingFile.size,
              }),
            },
          };
        })
      );

      const sceneState: ISceneState = {
        isRepo: true,
        calculation: existingCalculation,
        scenePath,
        entityId,
        displayId,
        // Сохраняем существующий статус, если он не "new"
        status:
          existingState?.status && existingState.status !== "new"
            ? existingState.status
            : "new",
        donwloadedFiles: updatedFiles,
        calculated: existingCalculated,
        calculations: existingCalculations,
        ...(existingState?.metadata && { metadata: existingState.metadata }),
      };
      fs.writeFileSync(indexFilePath, JSON.stringify(sceneState, null, 2));
      console.log("[addRepo] Updated scene state:", {
        indexFilePath,
        displayId,
        entityId,
      });
    }
  );
}
