import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron-typescript-ipc';
import {Api} from './src/tools/ElectronApi'

const api: Api = {
    invoke: {
      openExplorer: async (str) => { ipcRenderer.invoke<Api>('openExplorer', str) },
      async watch() {
          return ipcRenderer.invoke<Api>('watch')
      },
      async searchScenes(args) {
        return ipcRenderer.invoke<Api>('searchScenes', args)
      },
      async checkLastDate() {
        return ipcRenderer.invoke<Api>('checkLastDate')
      },
    },
    on: {
    },
  };
  
  contextBridge.exposeInMainWorld('ElectronAPI', api);
  contextBridge.exposeInMainWorld('mapboxToken', process.env.mb_access_token);