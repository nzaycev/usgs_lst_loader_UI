import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ParsedPath } from "../tools/ElectronApi";
import { RootState } from "../ui/app";

export type DisplayId = string;
export type USGSLayerType =
  | "ST_TRAD"
  | "ST_ATRAN"
  | "ST_URAD"
  | "ST_DRAD"
  | "SR_B6"
  | "SR_B5"
  | "SR_B4"
  | "QA_PIXEL";

export interface ISceneMetadata {
  captureDate?: string;
  source?: string;
  city?: string;
  displayName?: string;
}

export interface ICalculationResult {
  resultsPath: string; // Path to calculation results directory
  parameters: {
    useQAMask?: boolean;
    emission?: number;
    outLayers?: Record<string, boolean>;
    saveDirectory?: string;
    layerNamePattern?: string;
    emissionCalcMethod?: string;
  };
  startTime: string; // ISO date string
  endTime?: string; // ISO date string, undefined if still running
  status: "running" | "completed" | "failed" | "cancelled" | "error";
  pid?: number; // Process ID if running
  progress?: number; // Overall progress 0-1
  stage?: string; // Current calculation stage
  error?: string; // Error message if failed
  exitCode?: number; // Process exit code
  stderrLines?: string[]; // Last lines from stderr for error display
  outputSize?: number; // Total size of output files in bytes
}

export type SceneStatus =
  | "new"
  | "downloading"
  | "downloading cancelled"
  | "calculating"
  | "calculation error"
  | "calculated"
  | "downloaded";

export interface ISceneState {
  isRepo: boolean; // was it added by app or manually
  scenePath: string;
  entityId: string;
  displayId: string;
  status: SceneStatus; // Status determined by main process
  donwloadedFiles: Record<
    USGSLayerType,
    {
      url?: string;
      size?: number;
      progress?: number;
    }
  >;
  calculation?: number;
  calculationStep?: string;
  calculated: boolean;
  calculations?: ICalculationResult[]; // Array of all calculations (optional for backward compatibility)
  metadata?: ISceneMetadata;
}
interface IMainState {
  loading: boolean;
  wait: boolean;
  lastAvailableDate?: Date;
  scenes: Partial<Record<DisplayId, ISceneState>>;
  authorized: boolean;
  searchValue: string;
  searchEnabled: boolean;
  selectedIds: DisplayId[];
  isActionBusy: boolean;
  // Список сцен, для которых идет процесс начала загрузки (busy state кнопки)
  // Используется для предотвращения двойных кликов, а не для отслеживания фактической загрузки
  downloadingScenes: DisplayId[];
}

const initialState: IMainState = {
  loading: false,
  wait: false,
  scenes: {},
  authorized: false,
  searchValue: "",
  searchEnabled: false,
  selectedIds: [],
  isActionBusy: false,
  downloadingScenes: [],
};

export const watchScenesState = createAsyncThunk<
  Partial<Record<string, ISceneState>>,
  void
>("scenes/watch", async (_) => {
  const state = await window.ElectronAPI.invoke.watch();
  return state;
});

export const addSceneToRepo = createAsyncThunk<
  void,
  { entityId: string; displayId: DisplayId }
>("scenes/download", async (payload, thunkApi) => {
  try {
    const ds = await window.ElectronAPI.invoke.usgsGetDownloadDS(
      payload.entityId
    );
    console.log("[addSceneToRepo] Got download URLs:", { ds });

    // Получаем текущий state сцены из Redux store
    const state = thunkApi.getState() as RootState;
    const currentScene = state.main.scenes[payload.displayId];

    // Определяем, какие файлы нужно догрузить
    const filesToDownload = ds.filter((item) => {
      if (!currentScene) {
        // Если сцены нет в state, загружаем все файлы
        return true;
      }

      const fileState = currentScene.donwloadedFiles[item.layerName];
      // Загружаем файл, если:
      // 1. Файла нет в state
      // 2. Прогресс не определен
      // 3. Прогресс меньше 1 (файл не полностью загружен)
      const needsDownload =
        !fileState ||
        fileState.progress === undefined ||
        fileState.progress < 1;

      if (!needsDownload) {
        console.log(
          `[addSceneToRepo] Skipping ${item.layerName} - already downloaded (progress: ${fileState.progress})`
        );
      }

      return needsDownload;
    });

    console.log(
      `[addSceneToRepo] Files to download: ${filesToDownload.length} of ${ds.length}`
    );

    // Обновляем repo с новыми URL-ами (сохраняя существующий прогресс)
    window.ElectronAPI.invoke.addRepo({ ds, ...payload });

    // Запускаем скачивание только для недостающих файлов
    filesToDownload.forEach(({ url, layerName }) => {
      console.log(`[addSceneToRepo] Starting download for ${layerName}`);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.download = "";
      anchor.click();
    });

    if (filesToDownload.length === 0) {
      console.log("[addSceneToRepo] All files already downloaded");
    }
  } catch (e) {
    console.error("[addSceneToRepo] Error:", e);
    return thunkApi.rejectWithValue(e);
  }
});

export const calculateScene = createAsyncThunk<
  string,
  { displayId: DisplayId; args: RunArgs }
>("scenes/calculate", async (payload, thunkApi) => {
  try {
    const result = await window.ElectronAPI.invoke.calculate(
      payload.displayId,
      payload.args
    );
    return result;
  } catch (e) {
    console.error("Error in calculateScene thunk:", e);
    return thunkApi.rejectWithValue(e);
  }
});

export const addExternalFolder = createAsyncThunk<
  void,
  {
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
>("scenes/addExternalFolder", async (payload, thunkApi) => {
  try {
    await window.ElectronAPI.invoke.addExternalFolder(payload);
    // Обновляем состояние после добавления
    await thunkApi.dispatch(watchScenesState());
  } catch (e) {
    console.error(e);
    return thunkApi.rejectWithValue(e);
  }
});

type FsActionPayload = {
  parsedPath: ParsedPath;
  size?: number;
  indexContent?: ISceneState;
};

export enum OutLayer {
  BT = "BT",
  Emission = "Emission",
  LST = "LST",
  NDVI = "NDVI",
  NDMI = "NDMI",
  Radiance = "Radiance",
  SurfRad = "SurfRad",
  VegProp = "VegProp",
}

export enum EmissionCalcMethod {
  vegProp = "vegProp",
  log = "log",
  logDiapasons = "logDiapasons",
  ndmi = "ndmi",
}

export type RunArgs = {
  useQAMask: boolean;
  emission?: number;
  outLayers: Record<OutLayer, boolean>;
  saveDirectory?: string;
  layerNamePattern?: string;
  emissionCalcMethod?: EmissionCalcMethod;
};

const mainActions = createSlice({
  name: "main",
  initialState,
  reducers: {
    getAccess(state) {
      state.authorized = true;
    },
    toggleSearch(state, action: PayloadAction<boolean>) {
      state.searchEnabled = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.searchValue = action.payload;
    },
    setSelectedIds(state, action: PayloadAction<DisplayId[]>) {
      state.selectedIds = action.payload;
    },
    toggleSelectedId(state, action: PayloadAction<DisplayId>) {
      const id = action.payload;
      if (state.selectedIds.includes(id)) {
        state.selectedIds = state.selectedIds.filter((i) => i !== id);
      } else {
        state.selectedIds.push(id);
      }
    },
    setActionBusy(state, action: PayloadAction<boolean>) {
      state.isActionBusy = action.payload;
    },
    // Добавляет сцену в список загружающихся (для busy state кнопки)
    addDownloadingScene(state, action: PayloadAction<DisplayId>) {
      const displayId = action.payload;
      if (!state.downloadingScenes.includes(displayId)) {
        state.downloadingScenes.push(displayId);
      }
    },
    // Удаляет сцену из списка загружающихся (освобождает кнопку)
    removeDownloadingScene(state, action: PayloadAction<DisplayId>) {
      state.downloadingScenes = state.downloadingScenes.filter(
        (id) => id !== action.payload
      );
    },
    setDate(state, action: PayloadAction<string>) {
      state.lastAvailableDate = new Date(action.payload);
    },
    setFileProgress(
      state,
      action: PayloadAction<{
        displayId: DisplayId;
        type: USGSLayerType;
        progress: number;
      }>
    ) {
      const { displayId, type, progress } = action.payload;
      state.scenes[displayId].donwloadedFiles[type].progress = progress;
    },
    setSceneState(
      state,
      action: PayloadAction<{ displayId: DisplayId; state: ISceneState }>
    ) {
      if (!action.payload.state) {
        delete state.scenes[action.payload.displayId];
        return;
      }
      state.scenes[action.payload.displayId] = action.payload.state;
    },
    add(state, action: PayloadAction<FsActionPayload>) {
      const { isOutFile, isIndex, sceneLayer } = action.payload.parsedPath;
      if (isIndex) {
        // TODO:
        console.log({ indexContent: action.payload.indexContent });
        return;
      }
      if (isOutFile || !sceneLayer) {
        return;
      }
      state.scenes[sceneLayer].donwloadedFiles[sceneLayer].progress = 0;
    },
    addDir(state, action: PayloadAction<FsActionPayload>) {
      const { isOutFile, scenePath } = action.payload.parsedPath;
      const { displayId, entityId } = action.payload.indexContent;
      if (isOutFile) {
        return;
      }
      state.scenes[scenePath] = {
        isRepo: false,
        calculated: false,
        calculation: 0,
        displayId,
        entityId,
        scenePath,
        status: "new",
        donwloadedFiles: {
          QA_PIXEL: {},
          SR_B4: {},
          SR_B5: {},
          SR_B6: {},
          ST_ATRAN: {},
          ST_DRAD: {},
          ST_TRAD: {},
          ST_URAD: {},
        },
        calculations: [],
      };
    },
    unlink() {
      return;
    },
    unlinkDir(state, action: PayloadAction<FsActionPayload>) {
      const { isOutFile, scenePath } = action.payload.parsedPath;
      if (isOutFile) {
        return;
      }
      delete state.scenes[scenePath];
    },
    change(state, action: PayloadAction<FsActionPayload>) {
      const { isOutFile, isIndex, scenePath, sceneLayer } =
        action.payload.parsedPath;
      const size = action.payload.size;
      if (isOutFile || isIndex || !sceneLayer || !size) {
        return;
      }
      const totalSize =
        state.scenes[scenePath].donwloadedFiles[sceneLayer].size;
      if (!totalSize) {
        return;
      }
      state.scenes[scenePath].donwloadedFiles[sceneLayer].progress =
        size / totalSize;
    },
  },
  extraReducers(builder) {
    builder
      // .addCase(downloadScene.pending, (state) => {
      //   state.scenes[]
      // })
      .addCase(addSceneToRepo.pending, (state) => {
        state.wait = true;
        // state.scenes[action.meta.arg.displayId] = {
        //   stillLoading: true,
        //   donwloadedFiles: {},
        //   calculated: false,
        //   calculation: 0,
        // };
      })
      .addCase(addSceneToRepo.fulfilled, (state) => {
        state.wait = false;
      })
      .addCase(addSceneToRepo.rejected, (state, action) => {
        state.wait = false;
        delete state.scenes[action.meta.arg.displayId];
      })
      .addCase(watchScenesState.pending, (state) => {
        state.loading = true;
      })
      .addCase(watchScenesState.fulfilled, (state, action) => {
        state.loading = false;
        // console.log("scenes", action.payload);
        state.scenes = action.payload;
      })
      .addCase(watchScenesState.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setDate, setSceneState, setFileProgress } = mainActions.actions;

export const selectMain = (state: RootState) => state.main;

export { mainActions };
