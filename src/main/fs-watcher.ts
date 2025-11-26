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
import { REQUIRED_LAYERS } from "../constants/layers";

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

  /**
   * Выполняет миграции для всех сцен.
   * Вызывается только при старте приложения, до начала поллинга.
   * Использует версионирование для предотвращения повторного выполнения миграций.
   */
  migrate(): void {
    console.log("[Migration] Starting migrations...");
    const CURRENT_MIGRATION_VERSION = 2; // Увеличивать при добавлении новых миграций

    const dirs: string[] = [];

    // Получаем список всех директорий сцен
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

    let migratedCount = 0;
    dirs.forEach((scenePath) => {
      const indexPath = path.join(scenePath, "index.json");
      if (!fs.existsSync(indexPath)) {
        return;
      }

      try {
        const indexState: ISceneState & { migrationVersion?: number } =
          JSON.parse(fs.readFileSync(indexPath, "utf-8"));
        const currentVersion = indexState.migrationVersion || 0;

        // Пропускаем если уже на актуальной версии
        if (currentVersion >= CURRENT_MIGRATION_VERSION) {
          return;
        }

        let needsSave = false;
        const updatedState: Partial<ISceneState> & {
          migrationVersion?: number;
        } = { ...indexState };

        // Миграция 1: Парсинг captureDate, regionId, satelliteId из displayId для isRepo сцен
        if (currentVersion < 1 && indexState.isRepo && indexState.displayId) {
          const segments = indexState.displayId.split("_");
          const needsMetadataMigration =
            !indexState.metadata?.captureDate ||
            !indexState.metadata?.regionId ||
            !indexState.metadata?.satelliteId;

          if (needsMetadataMigration && segments.length >= 4) {
            // Парсим captureDate из displayId
            let captureDate = indexState.metadata?.captureDate;
            if (!captureDate && segments[3].length >= 8) {
              const dateStr = segments[3].slice(0, 8);
              if (/^\d{8}$/.test(dateStr)) {
                captureDate = `${dateStr.slice(0, 4)}-${dateStr.slice(
                  4,
                  6
                )}-${dateStr.slice(6, 8)}`;
              }
            }

            // Парсим regionId из displayId
            const regionId =
              indexState.metadata?.regionId ||
              (segments.length >= 3 ? segments[2] : undefined);

            // Парсим satelliteId из displayId
            const satelliteId =
              indexState.metadata?.satelliteId ||
              (segments.length >= 1 ? segments[0] : undefined);

            if (captureDate || regionId || satelliteId) {
              updatedState.metadata = {
                ...indexState.metadata,
                ...(captureDate && { captureDate }),
                ...(regionId && { regionId }),
                ...(satelliteId && { satelliteId }),
              };
              needsSave = true;
            }
          }
        }

        // Миграция 2: Обнуление legacy поля calculation если нет массива calculations
        if (currentVersion < 2) {
          if (
            (!indexState.calculations ||
              indexState.calculations.length === 0) &&
            indexState.calculation !== undefined &&
            indexState.calculation !== null &&
            indexState.calculation !== 0
          ) {
            updatedState.calculation = 0;
            // Удаляем calculationStep если он есть
            if ("calculationStep" in updatedState) {
              const stateWithStep = updatedState as Partial<ISceneState> & {
                calculationStep?: unknown;
              };
              delete stateWithStep.calculationStep;
            }
            needsSave = true;
          }
        }

        // Обновляем версию миграции
        if (needsSave || currentVersion < CURRENT_MIGRATION_VERSION) {
          updatedState.migrationVersion = CURRENT_MIGRATION_VERSION;
          fs.writeFileSync(indexPath, JSON.stringify(updatedState, null, 2));
          migratedCount++;
          console.log(
            `[Migration] Migrated scene: ${path.basename(
              scenePath
            )} (version ${currentVersion} -> ${CURRENT_MIGRATION_VERSION})`
          );
        }
      } catch (e) {
        console.error(`[Migration] Error migrating scene ${scenePath}:`, e);
      }
    });

    console.log(`[Migration] Completed. Migrated ${migratedCount} scene(s).`);
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
        // Для !isRepo сцен не считаем прогресс загрузки
        if (indexState?.isRepo === false) {
          return undefined;
        }

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
      const getFileStats = (type: USGSLayerType) => {
        const existingFile = indexState?.donwloadedFiles[type];

        // Для !isRepo сцен проверяем filePath и обновляем size если файл существует
        if (indexState?.isRepo === false && existingFile?.filePath) {
          const fullPath = path.isAbsolute(existingFile.filePath)
            ? existingFile.filePath
            : path.join(item, existingFile.filePath);

          let size = existingFile.size;
          // Если файл существует, обновляем размер
          if (fs.existsSync(fullPath)) {
            try {
              const stats = fs.statSync(fullPath);
              size = stats.size;
            } catch (e) {
              // Игнорируем ошибки чтения файла
            }
          }

          return {
            url: "",
            filePath: existingFile.filePath,
            size: size,
            progress: undefined, // Для !isRepo не используем progress
          };
        }

        // Для isRepo сцен используем стандартную логику
        return {
          url: existingFile?.url || "",
          filePath: existingFile?.filePath,
          size: existingFile?.size,
          progress: getFileProgress(type, existingFile?.size),
        };
      };
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
      // Приоритет: new < downloading < not ready < calculating < calculated < downloaded
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
            // Для !isRepo сцен используем другую логику - проверяем маппинг файлов
            if (indexState.isRepo === false) {
              const mappedLayers = REQUIRED_LAYERS.filter(
                (layer) => donwloadedFiles[layer]?.filePath
              );
              const allMapped = mappedLayers.length === REQUIRED_LAYERS.length;

              // Проверяем, что все привязанные файлы существуют
              const allFilesExist = mappedLayers.every((layer) => {
                const filePath = donwloadedFiles[layer]?.filePath;
                if (!filePath) return false;
                const fullPath = path.isAbsolute(filePath)
                  ? filePath
                  : path.join(item, filePath);
                return fs.existsSync(fullPath);
              });

              if (allMapped && allFilesExist) {
                sceneStatus = "ready";
              } else if (mappedLayers.length > 0) {
                sceneStatus = "unready";
              } else {
                sceneStatus = "unready";
              }
            } else {
              // Для isRepo сцен - проверяем прогресс загрузки
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
                    // (not ready - приоритет 3)
                    sceneStatus = "not ready";
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
      }

      // Синхронизируем legacy поле calculation с массивом calculations
      // Нормализуем resultsPath в calculations, чтобы он всегда был абсолютным
      let calculations = indexState?.calculations
        ? indexState.calculations.map((calc) => {
            // Нормализуем resultsPath: если относительный, делаем абсолютным относительно scenePath
            if (calc.resultsPath) {
              // Убираем ./ или .\ из начала, если есть
              const cleanPath = calc.resultsPath.replace(/^\.[/\\]/, "");
              const normalizedResultsPath = path.isAbsolute(cleanPath)
                ? cleanPath
                : path.resolve(item, cleanPath);

              return {
                ...calc,
                resultsPath: normalizedResultsPath,
              };
            }
            return calc;
          })
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

      // Используем metadata из indexState (миграции уже выполнены при старте через migrate())
      const metadata = indexState.metadata;

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
        metadata: metadata,
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
      fs.readFileSync(indexPath, "utf-8")
    );
    const newState = callback(prevState);
    fs.writeFileSync(indexPath, JSON.stringify(newState, null, 2));
  }

  addExternalFolder(
    folderPath: string,
    fileMapping: Record<string, USGSLayerType>,
    metadata?: {
      displayId: string;
      captureDate?: string;
      regionId?: string;
      satelliteId?: string;
    }
  ): ISceneState {
    const indexPath = path.join(folderPath, "index.json");

    // Проверяем, существует ли уже index.json
    let existingState: ISceneState | null = null;
    if (fs.existsSync(indexPath)) {
      try {
        existingState = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
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
      // Определяем полный путь к файлу
      let fullFilePath: string;
      if (path.isAbsolute(fileName)) {
        fullFilePath = fileName;
      } else {
        fullFilePath = path.join(folderPath, fileName);
      }

      if (fs.existsSync(fullFilePath)) {
        const stats = fs.statSync(fullFilePath);
        donwloadedFiles[layerType] = {
          filePath: fileName, // Сохраняем относительный путь или абсолютный, как было указано
          size: stats.size,
          progress: 1, // Файл уже существует, значит загружен полностью
        };
      } else {
        // Файл не существует, но маппинг есть - сохраняем путь
        donwloadedFiles[layerType] = {
          filePath: fileName,
        };
      }
    }

    // Создаем метаданные
    const sceneMetadata: ISceneMetadata | undefined = metadata
      ? {
          captureDate: metadata.captureDate,
          regionId: metadata.regionId,
          satelliteId: metadata.satelliteId,
        }
      : existingState?.metadata;

    // Определяем статус для внешней папки (!isRepo)
    // Проверяем наличие маппинга для всех обязательных слоев
    const mappedLayers = REQUIRED_LAYERS.filter(
      (layer) => donwloadedFiles[layer]?.filePath
    );
    const allMapped = mappedLayers.length === REQUIRED_LAYERS.length;

    // Проверяем, что все привязанные файлы существуют
    const allFilesExist = mappedLayers.every((layer) => {
      const filePath = donwloadedFiles[layer]?.filePath;
      if (!filePath) return false;
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(folderPath, filePath);
      return fs.existsSync(fullPath);
    });

    let externalStatus: SceneStatus;
    if (allMapped && allFilesExist) {
      externalStatus = "ready";
    } else if (mappedLayers.length > 0) {
      externalStatus = "unready";
    } else {
      externalStatus = "unready";
    }

    // Создаем новое состояние
    const sceneState: ISceneState = {
      isRepo: false,
      scenePath: folderPath,
      entityId: existingState?.entityId || `external_${Date.now()}`,
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
