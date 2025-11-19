import { app, BrowserWindow, session } from "electron";
import { FsWatcher } from "../backend/fs-watcher";
import { setOpenLoginDialogHandler } from "../backend/usgs-api";
import { applyProxySettings } from "./proxy-settings";
import type { INetworkSettings } from "../ui/network-settings/network-settings-state";
import { store } from "../backend/settings-store";
import path from "path";
import fs from "fs";

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
    height: 600,
    titleBarStyle: "hidden",
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false,
    },
  });

  fsWatcher.setMainWindow(mainWindow);

  // Set up 403 error handler to open login dialog
  setOpenLoginDialogHandler(async (targetRoute?: string) => {
    // Trigger the login dialog via renderer
    mainWindow.webContents.send("open-login-dialog-403", {
      targetRoute: targetRoute || "/bounds",
    });
  });

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

