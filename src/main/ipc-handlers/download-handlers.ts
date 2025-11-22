import { app } from "electron";
import fs from "fs";
import path from "path";
import type { ISceneState, USGSLayerType } from "../../actions/main-actions";
import { FsWatcher } from "../../backend/fs-watcher";

export function setupDownloadHandlers(
  mainWindow: Electron.BrowserWindow,
  fsWatcher: FsWatcher
) {
  mainWindow.webContents.session.on("will-download", (event, item) => {
    const fn = item.getFilename().split(".TIF")[0];
    const [dir, type] = fn.split("_T1_");
    const sceneId = dir + "_T1";
    const appdataPath = path.join(app.getPath("userData"), "localStorage");
    const scenePath = path.join(appdataPath, sceneId);
    const layerPath = path.join(scenePath, item.getFilename());
    const indexPath = path.join(scenePath, "index.json");
    if (fs.existsSync(layerPath)) {
      const index: ISceneState = JSON.parse(
        fs.readFileSync(indexPath).toString()
      );
      const { size } = index.donwloadedFiles[type as USGSLayerType];
      if (size !== fs.statSync(layerPath).size) {
        fs.rmSync(layerPath);
      } else {
        event.preventDefault();
        return;
      }
    }
    item.setSavePath(layerPath);
    const totalSize = item.getTotalBytes();

    // Добавляем в активные загрузки
    fsWatcher.addActiveDownload(sceneId, type);

    fsWatcher.setState(sceneId, (prev) => ({
      ...prev,
      donwloadedFiles: {
        ...prev.donwloadedFiles,
        [type]: {
          ...prev.donwloadedFiles[type as USGSLayerType],
          size: totalSize,
        },
      },
    }));
    item.on("updated", (_event, state) => {
      if (state === "interrupted") {
        console.log("Download is interrupted but can be resumed");
        // Пытаемся автоматически возобновить загрузку, если это возможно
        if (item.canResume()) {
          console.log("Resuming interrupted download...");
          item.resume();
        } else {
          console.error("Download cannot be resumed");
        }
      } else if (state === "progressing") {
        if (item.isPaused()) {
          console.log("Download is paused");
        } else {
          // Обновляем прогресс
          const progress = item.getReceivedBytes() / totalSize;
          fsWatcher.setState(sceneId, (prev) => ({
            ...prev,
            donwloadedFiles: {
              ...prev.donwloadedFiles,
              [type]: {
                ...prev.donwloadedFiles[type as USGSLayerType],
                progress,
              },
            },
          }));
        }
      }
    });
    item.once("done", (_event, state) => {
      // Удаляем из активных загрузок
      fsWatcher.removeActiveDownload(sceneId, type);

      if (state === "completed") {
        console.log("Download successfully");
        // Устанавливаем прогресс в 1
        fsWatcher.setState(sceneId, (prev) => ({
          ...prev,
          donwloadedFiles: {
            ...prev.donwloadedFiles,
            [type]: {
              ...prev.donwloadedFiles[type as USGSLayerType],
              progress: 1,
            },
          },
        }));
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });
}
