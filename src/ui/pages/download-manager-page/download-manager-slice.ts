import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../app";
import { SceneStatus, DisplayId } from "../../../actions/main-actions";

export type SortField = "date" | "name" | "satellite" | "region" | "status" | "size" | "additionType";
export type SortDirection = "asc" | "desc";

export type AdditionType = "local" | "downloaded";

export interface DownloadManagerFilters {
  satelliteType?: string[];
  status?: SceneStatus[];
  region?: string[];
  additionType?: AdditionType[];
}

interface DownloadManagerState {
  searchQuery: string;
  filters: DownloadManagerFilters;
  sortField: SortField;
  sortDirection: SortDirection;
  expandedIds: DisplayId[];
  expandedFilesIds: DisplayId[];
  isFilterPanelOpen: boolean;
}

const initialState: DownloadManagerState = {
  searchQuery: "",
  filters: {},
  sortField: "date",
  sortDirection: "desc",
  expandedIds: [],
  expandedFilesIds: [],
  isFilterPanelOpen: false,
};

export const downloadManagerSlice = createSlice({
  name: "downloadManager",
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setFilters(state, action: PayloadAction<DownloadManagerFilters>) {
      state.filters = action.payload;
    },
    updateFilter(
      state: DownloadManagerState,
      action: PayloadAction<{
        key: keyof DownloadManagerFilters;
        value: DownloadManagerFilters[keyof DownloadManagerFilters];
      }>
    ) {
      (state.filters as any)[action.payload.key] = action.payload.value;
    },
    clearFilters(state) {
      state.filters = {};
    },
    setSortField(state, action: PayloadAction<SortField>) {
      if (state.sortField === action.payload) {
        // Toggle direction if same field
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = action.payload;
        state.sortDirection = "asc";
      }
    },
    setSortDirection(state, action: PayloadAction<SortDirection>) {
      state.sortDirection = action.payload;
    },
    toggleExpandedId(state, action: PayloadAction<DisplayId>) {
      const id = action.payload;
      if (state.expandedIds.includes(id)) {
        state.expandedIds = state.expandedIds.filter((i) => i !== id);
      } else {
        state.expandedIds.push(id);
      }
    },
    toggleExpandedFilesId(state, action: PayloadAction<DisplayId>) {
      const id = action.payload;
      if (state.expandedFilesIds.includes(id)) {
        state.expandedFilesIds = state.expandedFilesIds.filter((i) => i !== id);
      } else {
        state.expandedFilesIds.push(id);
      }
    },
    setFilterPanelOpen(state, action: PayloadAction<boolean>) {
      state.isFilterPanelOpen = action.payload;
    },
  },
});

export const downloadManagerActions = downloadManagerSlice.actions;

export const selectDownloadManager = (state: RootState) => state.downloadManager;

