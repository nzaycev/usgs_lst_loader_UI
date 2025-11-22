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
      const sceneState: ISceneState = {
        isRepo: true,
        calculation: 0,
        scenePath,
        entityId,
        displayId,
        status: "new", // Новый статус, файлы еще не загружены
        donwloadedFiles: Object.assign(
          {},
          ...ds.map((item) => ({
            [item.layerName]: {
              url: item.url,
            },
          }))
        ),
        calculated: false,
        calculations: [],
      };
      fs.writeFileSync(indexFilePath, JSON.stringify(sceneState, null, 2));
      console.log({ indexFilePath, sceneState });
    }
  );
}
