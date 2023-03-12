import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../entry-points/app";
import { DisplayId } from "./main-actions";

export const selectDownloadUrls = createSelector(
  (state: RootState) => state.main.scenes,
  (_: unknown, sceneId: DisplayId) => sceneId,
  (scenes, sceneId) => {
    return Object.values(scenes[sceneId].donwloadedFiles)
      .map((x) => x.url)
      .filter((x) => !!x);
  }
);
