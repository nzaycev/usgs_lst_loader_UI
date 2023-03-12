import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getDownloadDS } from "../backend/usgs-api";
import { RootState } from "../entry-points/app";
import { ParsedPath } from "../tools/ElectronApi";

export type DisplayId = string;
export type USGSLayerType =
  | "ST_TRAD"
  | "ST_ATRAN"
  | "ST_URAD"
  | "ST_DRAD"
  | "SR_B5"
  | "SR_B4"
  | "QA_PIXEL";

export interface ISceneState {
  isRepo: boolean; // was it added by app or manually
  scenePath: string;
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
}
interface IMainState {
  loading: boolean;
  wait: boolean;
  lastAvailableDate?: Date;
  scenes: Partial<Record<DisplayId, ISceneState>>;
}

const initialState: IMainState = {
  loading: false,
  wait: false,
  scenes: {},
};

export const watchScenesState = createAsyncThunk<
  Partial<Record<string, ISceneState>>,
  void
>("scenes/watch", async (_, thunkApi) => {
  const state = await window.ElectronAPI.invoke.watch();
  console.log("state", state);
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
    // window.ElectronAPI.invoke.download({ ds, ...payload });
  } catch (e) {
    console.error(e);
    thunkApi.rejectWithValue(e);
  }
});

export const downloadScene = createAsyncThunk<string, { displayId: DisplayId }>(
  "scenes/download",
  async (payload, thunkApi) => {
    try {
      return window.ElectronAPI.invoke.download(payload.displayId);
      // return;
    } catch (e) {
      console.error(e);
      thunkApi.rejectWithValue(e);
    }
  }
);

type FsActionPayload = {
  parsedPath: ParsedPath;
  size?: number;
  indexContent?: ISceneState;
};

const mainActions = createSlice({
  name: "main",
  initialState,
  reducers: {
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
      const { isOutFile, isIndex, scenePath, sceneLayer } =
        action.payload.parsedPath;
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
      if (isOutFile) {
        return;
      }
      state.scenes[scenePath] = {
        isRepo: false,
        calculated: false,
        calculation: 0,
        scenePath,
        donwloadedFiles: {
          QA_PIXEL: {},
          SR_B4: {},
          SR_B5: {},
          ST_ATRAN: {},
          ST_DRAD: {},
          ST_TRAD: {},
          ST_URAD: {},
        },
      };
    },
    unlink(state, action: PayloadAction<FsActionPayload>) {
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
      .addCase(addSceneToRepo.pending, (state, action) => {
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
        console.log("scenes", action.payload);
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
