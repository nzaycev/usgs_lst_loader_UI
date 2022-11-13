import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { testNetworkApi } from "./network-test-request";

export enum NetworkState {
  Unknown,
  Stable,
  Unstable,
}

export const testNetwork = createAsyncThunk<void, void>(
  "network/test",
  async (_, thunkApi) => {
    try {
      thunkApi.dispatch(testNetworkApi.util.resetApiState());
      const { error } = await thunkApi.dispatch(
        testNetworkApi.endpoints.test.initiate()
      );
      if (error) {
        return thunkApi.rejectWithValue(error);
      }
    } catch (e) {
      console.error(e);
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
