

export class ElectonAPI {
    static openExplorer(path: string) {
        ;(window as any).electronAPI.openExplorer(path)
    }
}