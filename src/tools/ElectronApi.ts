import { GetApiType } from "electron-typescript-ipc";
import type {
  DisplayId,
  ISceneState,
  RunArgs,
  USGSLayerType,
} from "../actions/main-actions";
import { SettingsChema } from "../main/settings-store";
import type {
  CalculationSettings,
  INetworkSettings,
} from "../ui/network-settings/network-settings-state";

export interface IScene {
  id: string;
  date: string;
  coords: number[];
}

export interface ISearchScenesFilter {
  startDate?: string;
  endDate?: string;
  bounds?: {
    lng: [number, number];
    lat: [number, number];
  };
}

export interface DownloadDS {
  id: string;
  url: string;
  layerName: USGSLayerType;
}
export interface DownloadProps {
  entityId: string;
  displayId: string;
  ds: DownloadDS[];
}

export type RequestApi = {
  openExplorer: (str: string) => Promise<void>;
  openDirectory: (path: string) => Promise<void>;
  watch: () => Promise<Partial<Record<DisplayId, ISceneState>>>;
  checkLastDate: () => Promise<string>;
  calculate: (sceneId: string, args: RunArgs) => Promise<string>;
  deleteCalculation: (
    sceneId: string,
    calculationIndex: number
  ) => Promise<void>;
  addRepo: (arg: DownloadProps) => Promise<void>;
  getStoreValue: (key: keyof SettingsChema | string) => Promise<unknown>;
  setStoreValue: (
    key: keyof SettingsChema | string,
    value: unknown
  ) => Promise<void>;
  watchNetworkSettings: () => Promise<INetworkSettings>;
  saveNetworkSettings: (settings: INetworkSettings) => Promise<void>;
  saveCalculationSettings: (settings: CalculationSettings) => Promise<void>;
  selectFolder: () => Promise<string | null>;
  selectFile: () => Promise<string | null>;
  scanFolder: (folderPath: string) => Promise<{
    files: string[];
    suggestedMapping?: Record<string, USGSLayerType>;
  }>;
  addExternalFolder: (payload: {
    folderPath: string;
    fileMapping: Record<string, USGSLayerType>; // filePath -> layerType
    metadata?: {
      displayId: string;
      captureDate?: string;
      regionId?: string;
      satelliteId?: string;
    };
  }) => Promise<void>;
  openMappingDialog: (payload: {
    folderPath: string;
    files: string[];
    suggestedMapping?: Record<string, USGSLayerType>;
    existingMapping?: Record<string, USGSLayerType>; // Для редактирования
    existingMetadata?: {
      displayId: string;
      captureDate?: string;
      regionId?: string;
      satelliteId?: string;
    }; // Для редактирования
  }) => Promise<{
    fileMapping: Record<string, USGSLayerType>;
    metadata?: {
      displayId: string;
      captureDate?: string;
      regionId?: string;
      satelliteId?: string;
    };
  } | null>;
  sendMappingDialogResult: (
    result: {
      fileMapping: Record<string, USGSLayerType>;
      metadata?: {
        displayId: string;
        captureDate?: string;
        regionId?: string;
        satelliteId?: string;
      };
    } | null
  ) => Promise<void>;
  openLoginDialog: (payload: {
    username?: string;
    token?: string;
    autoLogin?: boolean;
    targetRoute?: string;
  }) => Promise<{ username: string; token: string } | null>;
  sendLoginDialogResult: (
    result: { username: string; token: string } | null
  ) => Promise<void>;
  openSearchSceneDialog: () => Promise<{
    start: [number, number];
    end: [number, number];
  } | null>;
  sendSearchSceneDialogResult: (
    result: {
      start: [number, number];
      end: [number, number];
    } | null
  ) => Promise<void>;
  openSettingsDialog: () => Promise<boolean | null>;
  sendSettingsDialogResult: (result: boolean | null) => Promise<void>;
  openCalculationDialog: (payload: {
    initialSettings?: RunArgs;
    displayId?: string;
  }) => Promise<RunArgs | null>;
  sendCalculationDialogResult: (result: RunArgs | null) => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  deleteScene: (displayId: string) => Promise<void>;
  stopCalculation: (displayId: string) => Promise<void>;
  usgsCheckUserPermissions: (
    creds: SettingsChema["userdata"]
  ) => Promise<{ data: any } | null>;
  usgsSearchScenes: (filter: ISearchScenesFilter) => Promise<any>;
  usgsReindexScene: (displayId: string) => Promise<any>;
  usgsCheckDates: () => Promise<string>;
  usgsGetDownloadDS: (entityId: string) => Promise<
    Array<{
      id: string;
      url: string;
      layerName: USGSLayerType;
    }>
  >;
  usgsGetStatus: () => Promise<{
    auth: "guest" | "authorizing" | "authorized";
    username?: string;
  }>;
  usgsLogout: () => Promise<void>;
  testNetwork: () => Promise<{ success: boolean; status?: number }>;
  startDrag: (directoryPath: string) => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  startDragFile: (filePath: string) => Promise<void>;
  startDragRequiredLayers: (displayId: string) => Promise<void>;
  getResultsFiles: (
    resultsPath: string,
    outputLayers: Record<string, boolean>
  ) => Promise<string[]>;
  validateDroppedPaths: (
    paths: string[]
  ) => Promise<{ folders: string[]; errors: string[] }>;
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall: () => Promise<{ success: boolean }>;
  getAppVersion: () => Promise<string>;
};

export type ParsedPath = {
  scenePath: string;
  sceneLayer?: USGSLayerType;
  isIndex: boolean;
  isOutFile: boolean;
};

export type HookApi = {
  stateChange: (args: {
    displayId: string;
    state: ISceneState;
  }) => Promise<void>;
  fileStateChange: (args: {
    displayId: string;
    type: USGSLayerType;
    progress: number;
  }) => Promise<void>;
  fsChange: (args: {
    event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
    parsedPath: ParsedPath;
    indexContent?: ISceneState;
    size?: number;
  }) => Promise<void>;
  loginSuccess: (data: {
    username: string;
    token: string;
    targetRoute: string;
  }) => Promise<void>;
  openLoginDialog403: (data: { targetRoute: string }) => Promise<void>;
  usgsApiStatusChange: (data: {
    auth: "guest" | "authorizing" | "authorized";
    username?: string;
  }) => Promise<void>;
  networkSettingsChanged: () => Promise<void>;
  updateChecking: () => Promise<void>;
  updateAvailable: (info: { version: string; releaseDate: string }) => Promise<void>;
  updateNotAvailable: (info: { version: string }) => Promise<void>;
  updateError: (error: string) => Promise<void>;
  updateDownloadProgress: (progress: { percent: number; transferred: number; total: number }) => Promise<void>;
  updateDownloaded: (info: { version: string; releaseDate: string }) => Promise<void>;
};

export type Api = GetApiType<RequestApi, HookApi>;
