import { BrowserWindow } from "electron";
import FastGlob from "fast-glob";
import fs from "fs";
import path from "path";
import type {
  DisplayId,
  ISceneMetadata,
  ISceneState,
  SceneStatus,
  USGSLayerType,
} from "../actions/main-actions";

export class FsWatcher {
  state: Record<DisplayId, ISceneState>;
  watchers: Record<DisplayId, fs.FSWatcher>;
  mainWindow: BrowserWindow;
  app: Electron.App;
  appdataPath: string;
  globalIndexPath: string;
  activeDownloads: Map<string, Set<string>>; // sceneId -> Set<layerType>

  setMainWindow(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  hasActiveDownloads(sceneId: string): boolean {
    return (
      this.activeDownloads.has(sceneId) &&
      this.activeDownloads.get(sceneId)!.size > 0
    );
  }

  addActiveDownload(sceneId: string, layerType: string) {
    if (!this.activeDownloads.has(sceneId)) {
      this.activeDownloads.set(sceneId, new Set());
    }
    this.activeDownloads.get(sceneId)!.add(layerType);
  }

  removeActiveDownload(sceneId: string, layerType: string) {
    this.activeDownloads.get(sceneId)?.delete(layerType);
    if (this.activeDownloads.get(sceneId)?.size === 0) {
      this.activeDownloads.delete(sceneId);
    }
  }

  constructor(app: Electron.App) {
    this.state = {};
    this.watchers = {};
    this.app = app;
    this.appdataPath = path.join(app.getPath("userData"), "localStorage");
    this.globalIndexPath = path.join(this.appdataPath, "index.json");
    this.activeDownloads = new Map<string, Set<string>>();
    console.log("appdatapath constr", this.appdataPath);

    if (!fs.existsSync(this.appdataPath)) {
      fs.mkdirSync(this.appdataPath);
    }
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
      const indexPath = path.join(item, "index.json");
      let indexState: ISceneState | undefined;
      if (fs.existsSync(indexPath)) {
        // Читаем файл каждый раз заново, чтобы получить актуальные данные
        // Используем readFileSync без кэширования
        const fileContent = fs.readFileSync(indexPath, "utf-8");
        indexState = JSON.parse(fileContent);
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

      // Определяем статус сцены
      // Приоритет: new < downloading < downloading cancelled < calculating < calculated < downloaded
      let sceneStatus: SceneStatus = "new";

      // 1. Проверяем ошибки расчетов (calculation error - приоритет 4.5)
      const hasCalculationError =
        indexState?.calculations?.[indexState.calculations.length - 1]
          ?.status === "error";

      if (hasCalculationError) {
        sceneStatus = "calculation error";
      } else {
        // 2. Проверяем активные расчеты (calculating - приоритет 4)
        const hasRunningCalculation =
          (indexState?.calculations || []).some(
            (calc) => calc.status === "running"
          ) ||
          (indexState?.calculation > 0 && indexState?.calculation < 1);

        if (hasRunningCalculation) {
          sceneStatus = "calculating";
        } else {
          // 3. Проверяем завершенные расчеты (calculated - приоритет 5)
          const hasCompletedCalculation =
            (indexState?.calculations || []).some(
              (calc) => calc.status === "completed"
            ) || indexState?.calculated;

          if (hasCompletedCalculation) {
            sceneStatus = "calculated";
          } else {
            // 4. Проверяем статус загрузки файлов
            const filesWithUrl = Object.entries(donwloadedFiles);

            if (filesWithUrl.length > 0) {
              // Проверяем прогресс загрузки
              const allProgresses = filesWithUrl.map(
                ([, file]) => file.progress
              );
              const allComplete = allProgresses.every((p) => p === 1);

              if (allComplete) {
                // Все файлы загружены (downloaded - приоритет 6)
                sceneStatus = "downloaded";
              } else {
                // Есть незавершенные загрузки
                const sceneId = path.basename(item);
                const hasActiveDownload = this.hasActiveDownloads(sceneId);

                // Проверяем прогресс загрузки
                const hasAnyProgress = allProgresses.some(
                  (p) => p !== undefined && p > 0
                );

                if (hasActiveDownload) {
                  // Есть активный процесс загрузки (downloading - приоритет 2)
                  sceneStatus = "downloading";
                } else if (hasAnyProgress) {
                  // Есть частично загруженные файлы, но нет активного процесса
                  // (downloading cancelled - приоритет 3)
                  sceneStatus = "downloading cancelled";
                } else {
                  // Нет загруженных файлов (new - приоритет 1)
                  sceneStatus = "new";
                }
              }
            } else {
              // Нет файлов с URL (new - приоритет 1)
              sceneStatus = "new";
            }
          }
        }
      }

      // Синхронизируем legacy поле calculation с массивом calculations
      let calculations = indexState?.calculations
        ? [...indexState.calculations]
        : [];
      // Проверяем наличие активного расчета и legacy поля calculation
      // Важно: проверяем не только undefined, но и что значение >= 0 (может быть 0)
      const hasRunningCalc = calculations.some(
        (calc) => calc.status === "running"
      );
      const legacyProgress = indexState?.calculation;
      const progressStage = indexState?.calculationStep;
      const hasLegacyProgress =
        legacyProgress !== undefined &&
        legacyProgress !== null &&
        typeof legacyProgress === "number";

      if (hasRunningCalc && hasLegacyProgress) {
        // Находим активный расчет (running)
        const runningCalcIndex = calculations.findIndex(
          (calc) => calc.status === "running"
        );
        if (runningCalcIndex !== -1) {
          // Обновляем прогресс на основе legacy поля calculation

          // Определяем этап на основе прогресса
          // Reading bands: 0-0.33, Calculation: 0.33-0.66, Saving: 0.66-1.0

          // Создаем новый массив с обновленным расчетом
          calculations = calculations.map((calc, idx) =>
            idx === runningCalcIndex
              ? {
                  ...calc,
                  progress: legacyProgress,
                  stage: progressStage,
                }
              : calc
          );
        }
      }

      state[path.basename(sceneId)] = {
        displayId: indexState.displayId,
        entityId: indexState.entityId,
        isRepo: indexState.isRepo,
        scenePath: item,
        status: sceneStatus,
        calculation: indexState?.calculation || 0,
        calculated: indexState?.calculated || false,
        calculations: calculations, // Используем обновленный массив
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

    // Определяем статус для внешней папки
    // Для внешних папок обычно все файлы уже есть, поэтому статус "downloaded"
    let externalStatus: SceneStatus = "downloaded";
    const hasFiles = Object.values(donwloadedFiles).some(
      (f) => f.progress === 1
    );
    if (!hasFiles) {
      externalStatus = "new";
    }

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
      status: existingState?.status || externalStatus,
      calculation: existingState?.calculation || 0,
      calculated: existingState?.calculated || false,
      donwloadedFiles,
      calculations: existingState?.calculations || [],
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
