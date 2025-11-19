import { app } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import type { Api } from "../../tools/ElectronApi";
import type {
  ISceneState,
  RunArgs,
  USGSLayerType,
} from "../../actions/main-actions";
import { FsWatcher } from "../../backend/fs-watcher";
import { isNumber } from "lodash";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

export function setupDownloadHandlers(
  mainWindow: Electron.BrowserWindow,
  fsWatcher: FsWatcher
) {
  ipcMain.handle<Api>("download", async (_, sceneId: string, args: RunArgs) => {
    const publicPath = path.join(
      process.env.APP_DEV ? process.cwd() : process.resourcesPath,
      "public"
    );
    const appdataPath = path.join(app.getPath("userData"), "localStorage");
    const scenePath = path.join(appdataPath, sceneId);
    const calculationProcessPath = path.join(
      publicPath,
      "tasks/calculation.exe"
    );

    const runArgs: string[] = ["--path", `"${scenePath}"`];
    if (args.useQAMask) runArgs.push("--useQAMask");
    if (args.emissionCalcMethod)
      runArgs.push("--emissionCalcMethod", `"${args.emissionCalcMethod}"`);
    if (isNumber(args.emission))
      runArgs.push("--emission", args.emission.toString());
    Object.entries(args.outLayers).forEach(([outLayerKey, required]) => {
      if (required) runArgs.push(`--save${outLayerKey}`);
    });
    if (args.saveDirectory) runArgs.push("--out", `"${args.saveDirectory}"`);
    if (args.layerNamePattern)
      runArgs.push("--layerPattern", `"${args.layerNamePattern}"`);

    const calculationProcess = exec(
      `start /wait "Calculation of ${sceneId}" "${calculationProcessPath}" ${runArgs.join(
        " "
      )}`,
      (...args: any) => {
        console.log("Calculate", scenePath, JSON.stringify(args, null, 2));
      }
    );

    return `"${calculationProcessPath}" ${runArgs.join(" ")}`;
  });

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
    item.on("updated", (event, state) => {
      if (state === "interrupted") {
        console.log("Download is interrupted but can be resumed");
      } else if (state === "progressing") {
        if (item.isPaused()) {
          console.log("Download is paused");
        } else {
          // console.log(`progress: ${item.getReceivedBytes() / totalSize}`);
        }
      }
    });
    item.once("done", (event, state) => {
      if (state === "completed") {
        console.log("Download successfully");
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });
}
