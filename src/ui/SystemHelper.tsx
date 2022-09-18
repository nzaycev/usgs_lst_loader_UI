import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

import {faRefresh, faFolderOpen, faTimes} from "@fortawesome/free-solid-svg-icons"
// import { ElectonAPI } from "../tools/ElectronApi";

// const { ipcRenderer } = window.require('electron')

export const SystemHelper = () => {
    return <div className="system-helper">
        <span title="Close app" onClick={() => {
            console.log('aaa', (window as any))
            window.close()
            // ;(window as any).api.send('message', {data: 123})
            
            // ipcRenderer.emit('message', {data: 123})
        }}>
            <FontAwesomeIcon icon={faTimes}/>
        </span>
        <span title="Reload page" onClick={() => location.reload()}>
            <FontAwesomeIcon icon={faRefresh}/>
        </span>
        <span title="Open out folder" onClick={() => window.ElectronAPI.invoke.openExplorer('')}>
            <FontAwesomeIcon icon={faFolderOpen}/>
        </span>

    </div>
}