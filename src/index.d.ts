import { Api } from "./tools/ElectronApi"

declare global {
    interface Window {
        mapboxToken: string
        ElectronAPI: Api
    }
}