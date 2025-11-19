import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getDownloadDS } from "../backend/usgs-api";
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

export interface ISceneState {
  isRepo: boolean; // was it added by app or manually
  scenePath: string;
  entityId: string;
  displayId: string;
  calculationPid?: number;
  donwloadedFiles: Record<
    USGSLayerType,
    {
      url?: string;
      size?: number;
      progress?: number;
    }
  >;
  calculation: number;
  calculated: boolean;
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
}

const initialState: IMainState = {
  loading: false,
  wait: false,
  scenes: {},
  authorized: false,
  searchValue: "",
  searchEnabled: false,
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
    const ds = await getDownloadDS(payload.entityId);
    console.log({ ds });
    window.ElectronAPI.invoke.addRepo({ ds, ...payload });
    ds.forEach(({ url }) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.download = "";
      anchor.click();
    });
  } catch (e) {
    console.error(e);
    return thunkApi.rejectWithValue(e);
  }
});

export const downloadScene = createAsyncThunk<
  string,
  { displayId: DisplayId; args: RunArgs }
>("scenes/download", async (payload, thunkApi) => {
  try {
    return window.ElectronAPI.invoke.download(payload.displayId, payload.args);
    // return;
  } catch (e) {
    console.error(e);
    thunkApi.rejectWithValue(e);
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
