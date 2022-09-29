import path from "path";
import fs, { stat } from 'fs';
import type { DisplayId, ISceneState } from "../actions/main-actions";
import { ipcMain } from "electron-typescript-ipc";
import { Api } from "../tools/ElectronApi";
import { BrowserWindow } from "electron";

const union = (a: any[], b: any[]) => {
    const union = [...a, ...b.filter(x => !a.includes(x))]
    console.log('union', union)
    return union
}

export class FsWatcher {

    state: Record<DisplayId, ISceneState>
    watchers: Record<DisplayId, fs.FSWatcher>
    mainWindow: BrowserWindow
    app: Electron.App

    setMainWindow(mainWindow?: BrowserWindow) {
        this.mainWindow = mainWindow
    }

    private checkScene(scenePath: string){
        const appdataPath = path.join(this.app.getPath('userData'), 'localStorage')
        const indexPath = path.join(appdataPath, scenePath, 'index.json')
        if (!fs.existsSync(indexPath)) {
            delete this.state[scenePath]
            this.watchers[scenePath].close()
            this.mainWindow && !this.mainWindow.isDestroyed() 
                && ipcMain.send<Api>(this.mainWindow, 'stateChange', {displayId: scenePath, state: undefined})
            delete this.watchers[scenePath]
            return
        }
        const fileContent = fs.readFileSync(indexPath).toString()
        console.log('scene', fileContent)
        if (fileContent === JSON.stringify(this.state[scenePath], null, 2)) {
            return
        }
        try {
            const sceneState = JSON.parse(fileContent)
            this.state[scenePath] = sceneState
            this.mainWindow && !this.mainWindow.isDestroyed() 
                && ipcMain.send<Api>(this.mainWindow, 'stateChange', {displayId: scenePath, state: sceneState})
        } catch(e) {
            console.warn(e)
        }
    }

    private checkDir() {
        const appdataPath = path.join(this.app.getPath('userData'), 'localStorage')
        union(fs.readdirSync(appdataPath), Object.keys(this.state)).forEach(scenePath => {
            const indexPath = path.join(appdataPath, scenePath, 'index.json')
            console.log(`checkdir ${scenePath}`)
            this.checkScene(scenePath)
            if (this.watchers[scenePath] || !fs.existsSync(indexPath)) {
                return
            }
            this.watchers[scenePath] = fs.watch(indexPath, (event) => {
                console.log('file watcher',scenePath)
                this.checkScene(scenePath)
            })
            
        })
    }

    constructor(app: Electron.App) { 
        this.state = {}
        this.watchers = {}
        this.app = app
        const appdataPath = path.join(app.getPath('userData'), 'localStorage')
        console.log('appdatapath constr', appdataPath)

        if (!fs.existsSync(appdataPath)) {
            fs.mkdirSync(appdataPath)
        }
        fs.watch(appdataPath, event => {
            console.log('fs watch', event)
            this.checkDir()
        })
        this.checkDir()
    }

    getState() {
        return this.state
    }

    async stillWorking() {
        return !!Object.values(this.state).find(x => x.downloadPid || x.calculationPid)
    }

}