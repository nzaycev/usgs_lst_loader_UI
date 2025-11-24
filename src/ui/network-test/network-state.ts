import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum NetworkState {
  Unknown,
  Stable,
  Unstable,
}

export const testNetwork = createAsyncThunk<void, void>(
  "network/test",
  async (_, thunkApi) => {
    try {
      await window.ElectronAPI.invoke.testNetwork();
    } catch (e) {
      console.error("[Network Test] Network test failed:", e);
      return thunkApi.rejectWithValue(e);
    }
  }
);

export const networkSlice = createSlice({
  name: "network",
  initialState: {
    networkState: NetworkState.Unknown,
  },
  reducers: {
    updateNetworkState: (state, action: PayloadAction<NetworkState>) => {
      state.networkState = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(testNetwork.pending, (state) => {
      state.networkState = NetworkState.Unknown;
    });

    builder.addCase(testNetwork.fulfilled, (state) => {
      state.networkState = NetworkState.Stable;
    });
    builder.addCase(testNetwork.rejected, (state) => {
      state.networkState = NetworkState.Unstable;
    });
  },
});

export const { updateNetworkState } = networkSlice.actions;
