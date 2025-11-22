import { app, BrowserWindow, session } from "electron";
import fs from "fs";
import path from "path";
import type { INetworkSettings } from "../ui/network-settings/network-settings-state";
import { FsWatcher } from "./fs-watcher";
import { applyProxySettings } from "./proxy-settings";
import { store } from "./settings-store";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createMainWindow(fsWatcher: FsWatcher): BrowserWindow {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: Object.assign(
        {
          "Content-Security-Policy": [
            "style-src-elem 'https://api.mapbox.com' 'unsafe-inline'",
          ],
        },
        details.responseHeaders
      ),
    });
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: "USGS Loader",
    height: 800,
    frame: false, // Required for -webkit-app-region to work on Windows
    width: 1200,
    darkTheme: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false,
    },
  });
  mainWindow.setBackgroundColor("#111827");

  fsWatcher.setMainWindow(mainWindow);

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Apply proxy settings if they exist
  const userSettingsPath = path.join(
    app.getPath("userData"),
    ".networkSettings"
  );

  if (fs.existsSync(userSettingsPath)) {
    const settings = store.get("proxySettings") as
      | INetworkSettings["proxy"]
      | undefined;
    applyProxySettings(app, mainWindow, settings);
  }

  return mainWindow;
}
