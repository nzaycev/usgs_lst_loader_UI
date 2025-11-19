import { ipcMain } from "electron-typescript-ipc";
import { app } from "electron";
import type { Api, DownloadProps } from "../../tools/ElectronApi";
import type { ISceneState } from "../../actions/main-actions";
import fs from "fs";
import path from "path";

export function setupRepoHandlers() {
  /**
   * remember download url list and may be download immediately
   */
  ipcMain.handle<Api>(
    "addRepo",
    async (
      _,
      { displayId, entityId, ds }: DownloadProps,
      alsoDownload: boolean
    ) => {
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
        donwloadedFiles: Object.assign(
          {},
          ...ds.map((item) => ({
            [item.layerName]: {
              url: item.url,
            },
          }))
        ),
        calculated: false,
      };
      fs.writeFileSync(indexFilePath, JSON.stringify(sceneState, null, 2));
      console.log({ indexFilePath, sceneState });
    }
  );
}

