import { GetApiType } from "electron-typescript-ipc";
import type {
  DisplayId,
  ISceneState,
  USGSLayerType,
} from "../actions/main-actions";
import type { INetworkSettings } from "../ui/network-settings/network-settings-state";

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
  watch: () => Promise<Partial<Record<DisplayId, ISceneState>>>;
  checkLastDate: () => Promise<string>;
  download: (sceneId: string) => Promise<string>;
  addRepo: (arg: DownloadProps, alsoDownload?: boolean) => Promise<void>;
  watchNetworkSettings: () => Promise<INetworkSettings>;
  saveNetworkSettings: (settings: INetworkSettings) => Promise<void>;
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
};

export type Api = GetApiType<RequestApi, HookApi>;
