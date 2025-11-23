import { createSelector } from "@reduxjs/toolkit";
import { ISceneState, SceneStatus } from "../../../actions/main-actions";
import { RootState } from "../../app";
import { AdditionType } from "./download-manager-slice";

// Helper to parse display ID
const parseDisplayId = (displayId: string) => {
  const segments = displayId.split("_");
  if (segments.length < 4)
    return {
      name: displayId,
      sceneId: displayId,
      satellite: "Unknown",
      region: "",
      date: new Date(0),
    };
  const landsatId =
    segments[0] === "LC08"
      ? "Landsat 8"
      : segments[0] === "LC09"
      ? "Landsat 9"
      : segments[0];
  const date = new Date(
    parseInt(segments[3].slice(0, 4)),
    parseInt(segments[3].slice(4, 6)) - 1,
    parseInt(segments[3].slice(6))
  );
  const region = segments[2];
  return {
    name: displayId,
    sceneId: displayId,
    satellite: landsatId,
    region: region,
    date: date,
  };
};

// Helper to get scene status
const getSceneStatus = (state: ISceneState): SceneStatus => {
  return state.status || "new";
};

// Helper to get addition type
const getAdditionType = (state: ISceneState | undefined): AdditionType => {
  if (!state) return "downloaded";
  // isRepo: true = downloaded (from repository), false/undefined = local (manually added)
  // Explicitly check for true, default to local if undefined, null, or false
  if (state.isRepo === true) {
    return "downloaded";
  }
  return "local";
};

// Helper to get scene size
const getSceneSize = (state: ISceneState | undefined): number => {
  if (!state) return 0;
  let total = 0;
  Object.values(state.donwloadedFiles).forEach((file) => {
    if (file.size) {
      total += file.size;
    }
  });
  return total;
};

// Select all scenes
const selectAllScenes = (state: RootState) => state.main.scenes;
const selectSearchQuery = (state: RootState) =>
  state.downloadManager.searchQuery;
const selectFilters = (state: RootState) => state.downloadManager.filters;
const selectSortField = (state: RootState) => state.downloadManager.sortField;
const selectSortDirection = (state: RootState) =>
  state.downloadManager.sortDirection;

// Filter scenes by search query
const selectFilteredBySearch = createSelector(
  [selectAllScenes, selectSearchQuery],
  (scenes, searchQuery) => {
    if (!searchQuery) return Object.keys(scenes);
    const query = searchQuery.toLowerCase();
    return Object.keys(scenes).filter((displayId) => {
      const state = scenes[displayId];
      const displayIdMatch = displayId.toLowerCase().includes(query);
      const displayNameMatch = state?.metadata?.displayName
        ?.toLowerCase()
        .includes(query);
      return displayIdMatch || displayNameMatch;
    });
  }
);

// Filter scenes by filters
const selectFilteredScenes = createSelector(
  [selectAllScenes, selectFilteredBySearch, selectFilters],
  (scenes, filteredIds, filters) => {
    if (
      !filters.satelliteType?.length &&
      !filters.status?.length &&
      !filters.region?.length &&
      !filters.additionType?.length
    ) {
      return filteredIds;
    }

    return filteredIds.filter((displayId) => {
      const state = scenes[displayId];
      if (!state) return false;

      // Filter by satellite type
      if (filters.satelliteType?.length) {
        const parsed = parseDisplayId(displayId);
        if (!filters.satelliteType.includes(parsed.satellite)) {
          return false;
        }
      }

      // Filter by status
      if (filters.status?.length) {
        const status = getSceneStatus(state);
        if (!filters.status.includes(status)) {
          return false;
        }
      }

      // Filter by region
      if (filters.region?.length) {
        const parsed = parseDisplayId(displayId);
        if (!filters.region.includes(parsed.region)) {
          return false;
        }
      }

      // Filter by addition type
      if (filters.additionType?.length) {
        const additionType = getAdditionType(state);
        if (!filters.additionType.includes(additionType)) {
          return false;
        }
      }

      return true;
    });
  }
);

// Sort scenes
export const selectFilteredAndSortedScenes = createSelector(
  [selectAllScenes, selectFilteredScenes, selectSortField, selectSortDirection],
  (scenes, filteredIds, sortField, sortDirection) => {
    const sorted = [...filteredIds].sort((a, b) => {
      const stateA = scenes[a];
      const stateB = scenes[b];

      let comparison = 0;

      switch (sortField) {
        case "date": {
          const parsedA = parseDisplayId(a);
          const parsedB = parseDisplayId(b);
          comparison = parsedA.date.getTime() - parsedB.date.getTime();
          break;
        }
        case "name": {
          comparison = a.localeCompare(b);
          break;
        }
        case "satellite": {
          const parsedA = parseDisplayId(a);
          const parsedB = parseDisplayId(b);
          comparison = parsedA.satellite.localeCompare(parsedB.satellite);
          break;
        }
        case "region": {
          const parsedA = parseDisplayId(a);
          const parsedB = parseDisplayId(b);
          comparison = parsedA.region.localeCompare(parsedB.region);
          break;
        }
        case "status": {
          const statusA = getSceneStatus(stateA);
          const statusB = getSceneStatus(stateB);
          comparison = statusA.localeCompare(statusB);
          break;
        }
        case "size": {
          const sizeA = getSceneSize(stateA);
          const sizeB = getSceneSize(stateB);
          comparison = sizeA - sizeB;
          break;
        }
        case "additionType": {
          const typeA = getAdditionType(stateA);
          const typeB = getAdditionType(stateB);
          comparison = typeA.localeCompare(typeB);
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }
);

// Get unique filter values
export const selectUniqueFilterValues = createSelector(
  [selectAllScenes],
  (scenes) => {
    const satellites = new Set<string>();
    const statuses = new Set<SceneStatus>();
    const regions = new Set<string>();
    const additionTypes = new Set<AdditionType>();

    Object.entries(scenes).forEach(([displayId, state]) => {
      if (!state) return;
      const parsed = parseDisplayId(displayId);
      satellites.add(parsed.satellite);
      statuses.add(getSceneStatus(state));
      if (parsed.region) regions.add(parsed.region);
      additionTypes.add(getAdditionType(state));
    });

    return {
      satellites: Array.from(satellites).sort(),
      statuses: Array.from(statuses).sort(),
      regions: Array.from(regions).sort(),
      additionTypes: Array.from(additionTypes) as AdditionType[],
    };
  }
);

// Get active filters count
export const selectActiveFiltersCount = createSelector(
  [selectFilters],
  (filters) => {
    let count = 0;
    if (filters.satelliteType?.length) count += filters.satelliteType.length;
    if (filters.status?.length) count += filters.status.length;
    if (filters.region?.length) count += filters.region.length;
    if (filters.additionType?.length) count += filters.additionType.length;
    return count;
  }
);
