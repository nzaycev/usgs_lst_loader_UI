import path from "path";
import fs, { stat } from "fs";
import type {
  DisplayId,
  ISceneState,
  ISceneMetadata,
  USGSLayerType,
} from "../actions/main-actions";
import { ipcMain } from "electron-typescript-ipc";
import { Api, ParsedPath } from "../tools/ElectronApi";
import { BrowserWindow } from "electron";
import chokidar from "chokidar";
import { throttle } from "lodash";
import FastGlob from "fast-glob";

function union<T>(a: T[], b: T[]): T[] {
  const union = [...a, ...b.filter((x) => !a.includes(x))];
  console.log("union", union);
  return union;
}

function send(
  event: "add" | "addDir" | "change" | "unlink" | "unlinkDir",
  path: string,
  stats: any,
  parsedPath: ParsedPath
) {
  ipcMain.send<Api>(this.mainWindow, "fsChange", {
    event,
    parsedPath,
    size: stats?.size,
    indexContent: parsedPath.isIndex
      ? JSON.parse(fs.readFileSync(path).toString())
      : undefined,
  });
}
const throttledSend = throttle(send, 500);

export class FsWatcher {
  state: Record<DisplayId, ISceneState>;
  watchers: Record<DisplayId, fs.FSWatcher>;
  mainWindow: BrowserWindow;
  app: Electron.App;
  appdataPath: string;
  globalIndexPath: string;

  setMainWindow(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  constructor(app: Electron.App) {
    this.state = {};
    this.watchers = {};
    this.app = app;
    // this.handlers = {}
    this.appdataPath = path.join(app.getPath("userData"), "localStorage");
    this.globalIndexPath = path.join(this.appdataPath, "index.json");
    console.log("appdatapath constr", this.appdataPath);

    if (!fs.existsSync(this.appdataPath)) {
      fs.mkdirSync(this.appdataPath);
    }
    chokidar
      .watch(this.appdataPath, {
        alwaysStat: true,
        depth: 2,
        interval: 400,
        // atomic: 1000,
      })
      .on("all", (event, path, stats) => {
        // console.log(event, path, stats?.size);
        const parsedPath = this.parsePath(path);
        // switch (event) {
        //   case "addDir":
        //     this.addDir(path);
        //     break;
        //   case "add":
        //     this.add(path, stats.size);
        //     break;
        //   case "change":
        //     break;
        //   case "unlink":
        //     break;
        //   case "unlinkDir":
        //     break;
        // }

        // throttledSend(event, path, stats, parsedPath);
        // const throttled = throttle(send, 500);
        // throttled();
      });
  }

  private parsePath(path: string): ParsedPath {
    const relative = path.replace(this.appdataPath, "");
    const [scenePath, ...depth] = relative.split("/");
    const getSceneLayer = (depth1: string): USGSLayerType | undefined => {
      if (!depth1 || depth1 === "out" || depth1 === "index.json") {
        return;
      }
      return depth1.split(".TIF")[0].split("_T1_")[1] as USGSLayerType;
    };
    return {
      scenePath,
      isIndex: depth[1] === "index.json",
      isOutFile: depth[1] === "out",
      sceneLayer: getSceneLayer(depth[1]),
    };
  }

  getState() {
    const state: Record<DisplayId, ISceneState> = {};
    const dirs: string[] = [];
    if (fs.existsSync(this.globalIndexPath)) {
      const index = JSON.parse(fs.readFileSync(this.globalIndexPath, "utf-8"));
      if (index.externalPaths) {
        dirs.push(...index.externalPaths);
      }
    }
    const internalDirs = FastGlob.sync("*", {
      absolute: true,
      cwd: this.appdataPath,
      onlyDirectories: true,
    });
    dirs.push(...internalDirs);
    dirs.forEach((sceneId) => {
      const item = sceneId;
      const stat = fs.statSync(item);
      if (!stat.isDirectory) {
        return;
      }
      //   const splitted = item.split("/");
      //   const sceneId = splitted[splitted.length - 1];
      const subItems = fs.readdirSync(item);
      const indexPath = path.join(item, "index.json");
      let indexState: ISceneState | undefined;
      if (fs.existsSync(indexPath)) {
        indexState = JSON.parse(fs.readFileSync(indexPath).toString());
      }
      const getFileProgress = (
        type: USGSLayerType,
        size?: number
      ): number | undefined => {
        const filePath = path.join(
          item,
          `${path.basename(sceneId)}_${type}.TIF`
        );
        const fileExists = fs.existsSync(filePath);
        if (!size) {
          return fileExists ? 1 : 0;
        }
        if (fileExists) {
          const stats = fs.statSync(filePath);
          return stats.size / size;
        }
        return;
      };
      const getFileStats = (type: USGSLayerType) => ({
        url: indexState?.donwloadedFiles[type]?.url || "",
        size: indexState?.donwloadedFiles[type]?.size,
        progress: getFileProgress(
          type,
          indexState?.donwloadedFiles[type]?.size
        ),
      });
      const donwloadedFiles: ISceneState["donwloadedFiles"] = {
        QA_PIXEL: getFileStats("QA_PIXEL"),
        SR_B4: getFileStats("SR_B4"),
        SR_B5: getFileStats("SR_B5"),
        SR_B6: getFileStats("SR_B6"),
        ST_ATRAN: getFileStats("ST_ATRAN"),
        ST_DRAD: getFileStats("ST_DRAD"),
        ST_TRAD: getFileStats("ST_TRAD"),
        ST_URAD: getFileStats("ST_URAD"),
      };

      state[path.basename(sceneId)] = {
        displayId: indexState.displayId,
        entityId: indexState.entityId,
        isRepo: !!indexState,
        scenePath: item,
        calculation: indexState?.calculation,
        calculated: indexState?.calculated,
        donwloadedFiles,
      };
    });
    return state;
    // return this.state;
  }

  getSceneState(sceneId: DisplayId) {
    return this.state[sceneId];
  }

  setState(sceneId: DisplayId, callback: (args: ISceneState) => ISceneState) {
    const indexPath = path.resolve(
      this.app.getPath("userData"),
      "localStorage",
      sceneId,
      "index.json"
    );

    const prevState: ISceneState = JSON.parse(
      fs.readFileSync(indexPath).toString()
    );
    const newState = callback(prevState);
    fs.writeFileSync(indexPath, JSON.stringify(newState, null, 2));
  }

  addExternalFolder(
    folderPath: string,
    fileMapping: Record<string, USGSLayerType>,
    metadata?: {
      displayId: string;
      entityId?: string;
      captureDate?: string;
      source?: string;
      city?: string;
      displayName?: string;
    }
  ): ISceneState {
    const indexPath = path.join(folderPath, "index.json");

    // Проверяем, существует ли уже index.json
    let existingState: ISceneState | null = null;
    if (fs.existsSync(indexPath)) {
      try {
        existingState = JSON.parse(fs.readFileSync(indexPath).toString());
      } catch (e) {
        console.error("Error reading existing index.json:", e);
      }
    }

    // Создаем структуру donwloadedFiles на основе маппинга
    const donwloadedFiles: ISceneState["donwloadedFiles"] = {
      QA_PIXEL: {},
      SR_B4: {},
      SR_B5: {},
      SR_B6: {},
      ST_ATRAN: {},
      ST_DRAD: {},
      ST_TRAD: {},
      ST_URAD: {},
    };

    // Заполняем информацию о файлах на основе маппинга
    for (const [fileName, layerType] of Object.entries(fileMapping)) {
      const filePath = path.join(folderPath, fileName);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        donwloadedFiles[layerType] = {
          size: stats.size,
          progress: 1, // Файл уже существует, значит загружен полностью
        };
      } else {
        donwloadedFiles[layerType] = {};
      }
    }

    // Создаем метаданные
    const sceneMetadata: ISceneMetadata | undefined = metadata
      ? {
          captureDate: metadata.captureDate,
          source: metadata.source,
          city: metadata.city,
          displayName: metadata.displayName,
        }
      : existingState?.metadata;

    // Создаем новое состояние
    const sceneState: ISceneState = {
      isRepo: false,
      scenePath: folderPath,
      entityId:
        metadata?.entityId ||
        existingState?.entityId ||
        `external_${Date.now()}`,
      displayId:
        metadata?.displayId ||
        existingState?.displayId ||
        path.basename(folderPath),
      calculation: existingState?.calculation || 0,
      calculated: existingState?.calculated || false,
      donwloadedFiles,
      metadata: sceneMetadata,
    };

    // Сохраняем index.json
    fs.writeFileSync(indexPath, JSON.stringify(sceneState, null, 2));

    const externalPaths = [folderPath];
    if (fs.existsSync(this.globalIndexPath)) {
      const index = JSON.parse(fs.readFileSync(this.globalIndexPath, "utf-8"));
      if (index.externalPaths) {
        externalPaths.push(...index.externalPaths);
      }
    }
    fs.writeFileSync(
      this.globalIndexPath,
      JSON.stringify(
        {
          externalPaths,
        },
        null,
        2
      ),
      "utf-8"
    );

    return sceneState;
  }
}
