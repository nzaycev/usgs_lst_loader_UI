import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RunArgs } from "../../actions/main-actions";

export interface IProxySettings {
  protocol: string;
  host: string;
  port: number;
  auth?: {
    login: string;
    password: string;
  };
}

export interface INetworkSettings {
  proxy?: IProxySettings;
}
export interface CalculationSettings {
  args?: RunArgs;
}

export const readSettings = createAsyncThunk<INetworkSettings, void>(
  "networkSettings/read",
  async (_, thunkApi) => {
    try {
      return await window.ElectronAPI.invoke.watchNetworkSettings();
    } catch (e) {
      return thunkApi.rejectWithValue(e);
    }
  }
);

export const writeSettings = createAsyncThunk<void, INetworkSettings>(
  "networkSettings/write",
  async (settings, thunkApi) => {
    try {
      return await window.ElectronAPI.invoke.saveNetworkSettings(settings);
    } catch (e) {
      return thunkApi.rejectWithValue(e);
    }
  }
);

export const networkSettingsSlice = createSlice({
  name: "networkSettings",
  initialState: {
    settingsOpened: false,
    saving: false,
    loading: false,
    settings: {} as INetworkSettings,
  },
  reducers: {
    openSettings: (state) => {
      state.settingsOpened = true;
    },
    justCloseSettings: (state) => {
      state.settingsOpened = false;
    },
  },
  extraReducers(builder) {
    builder.addCase(readSettings.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(readSettings.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.settings = payload;
    });
    builder.addCase(writeSettings.pending, (state) => {
      state.saving = true;
    });
    builder.addCase(writeSettings.fulfilled, (state, { meta: { arg } }) => {
      state.saving = false;
      state.settings = arg;
    });
  },
});
