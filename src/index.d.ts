import { Api } from "./tools/ElectronApi"

declare global {
    interface Window {
        mapboxToken: string
        usgs_username: string
        usgs_password: string
        ElectronAPI: Api
    }
}