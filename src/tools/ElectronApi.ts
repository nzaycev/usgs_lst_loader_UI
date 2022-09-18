import { GetApiType } from 'electron-typescript-ipc';

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

export type RequestApi = {
  openExplorer: (str: string) => Promise<void>
  searchScenes: (arg: ISearchScenesFilter) => Promise<IScene[] | any>
  watch: () => Promise<void>
  checkLastDate: () => Promise<string>
}


export type Api = GetApiType<
  RequestApi,
  // eslint-disable-next-line @typescript-eslint/ban-types
  {}
>;