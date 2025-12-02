import { app, BrowserWindow, session } from "electron";
import * as fs from "fs";
import type { INetworkSettings } from "../ui/network-settings/network-settings-state";
import { FsWatcher } from "./fs-watcher";
import { getPreloadPath, getRendererPath, getRendererUrl } from "./paths";
import { applyProxySettings } from "./proxy-settings";
import { store } from "./settings-store";

export function createMainWindow(fsWatcher: FsWatcher): BrowserWindow {
  const isDev = process.env.APP_DEV === "true";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Build CSP based on environment
    const csp = isDev
      ? "style-src-elem 'https://api.mapbox.com' 'unsafe-inline' http://localhost:5173"
      : "style-src-elem 'https://api.mapbox.com' 'unsafe-inline' file://* 'self'";

    callback({
      responseHeaders: Object.assign(
        {
          "Content-Security-Policy": [csp],
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
      preload: getPreloadPath(),
      webSecurity: false,
    },
  });
  mainWindow.setBackgroundColor("#111827");

  fsWatcher.setMainWindow(mainWindow);

  // and load the index.html of the app.
  if (isDev) {
    mainWindow.loadURL(getRendererUrl());
  } else {
    const rendererPath = getRendererPath();
    console.log("[window-creation] Loading renderer from:", rendererPath);
    if (fs.existsSync(rendererPath)) {
      console.log("[window-creation] Renderer file exists");
      const content = fs.readFileSync(rendererPath, "utf-8");
      console.log(
        "[window-creation] Renderer file content length:",
        content.length
      );
      console.log(
        "[window-creation] Renderer file preview:",
        content.substring(0, 200)
      );
    } else {
      console.error(
        "[window-creation] Renderer file does not exist:",
        rendererPath
      );
    }
    mainWindow.loadFile(rendererPath);
  }

  // Apply proxy settings if they exist in store
  const proxySettings = store.get("proxySettings") as
    | INetworkSettings["proxy"]
    | undefined;
  if (proxySettings) {
    applyProxySettings(app, mainWindow, proxySettings);
  }

  // Handle drop events from external applications
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Prevent navigation on file drops
    if (url.startsWith("file://")) {
      event.preventDefault();
    }
  });

  return mainWindow;
}
