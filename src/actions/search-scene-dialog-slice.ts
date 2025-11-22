import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SearchSceneDialogState {
  addedScenes: Record<string, true>; // displayId -> true
}

const initialState: SearchSceneDialogState = {
  addedScenes: {},
};

export const searchSceneDialogSlice = createSlice({
  name: "searchSceneDialog",
  initialState,
  reducers: {
    markSceneAsAdded: (state, action: PayloadAction<string>) => {
      state.addedScenes[action.payload] = true;
    },
    clearAddedScenes: (state) => {
      state.addedScenes = {};
    },
    setInitialScenes: (state, action: PayloadAction<string[]>) => {
      const scenes: Record<string, true> = {};
      action.payload.forEach((id) => {
        scenes[id] = true;
      });
      state.addedScenes = scenes;
    },
  },
});

export const {
  markSceneAsAdded,
  clearAddedScenes,
  setInitialScenes,
} = searchSceneDialogSlice.actions;

export default searchSceneDialogSlice.reducer;

