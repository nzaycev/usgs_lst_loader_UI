import { GetApiType } from 'electron-typescript-ipc';
import type { DisplayId, ISceneState, USGSLayerType } from '../actions/main-actions';

export interface IScene {
  id: string
  date: string
  coords: number[]
}

export interface ISearchScenesFilter {
  startDate?: string
  endDate?: string
  bounds?: {
    lng: [number, number]
    lat: [number, number]
  }
}

export interface DownloadDS {
  id: string;
  url: string;
  layerName: USGSLayerType
}
export interface DownloadProps {
  entityId: string;
  displayId: string;
  ds: DownloadDS[]
}

export type RequestApi = {
  openExplorer: (str: string) => Promise<void>
  searchScenes: (arg: ISearchScenesFilter) => Promise<IScene[] | any>
  watch: () => Promise<Partial<Record<DisplayId, ISceneState>>>
  checkLastDate: () => Promise<string>
  download: (arg: DownloadProps) => Promise<void>
}

export type HookApi = {
  stateChange: (args: {displayId: string, state: ISceneState}) => Promise<void>
}


export type Api = GetApiType<
  RequestApi,
  HookApi
>;