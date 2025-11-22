import { app, BrowserWindow } from "electron";
import { usgsApiManager } from "./usgs-api";

export function setupAppEvents(createWindow: () => void) {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on("ready", createWindow);

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  /** window initialization */
  app.on("window-all-closed", async () => {
    // Logout from USGS API before quitting
    try {
      await usgsApiManager.logout();
    } catch (e) {
      console.error("Error during logout:", e);
    }
    app.quit();
  });

  app.on("before-quit", async () => {
    // Also logout on before-quit (handles force quit)
    try {
      await usgsApiManager.logout();
    } catch (e) {
      console.error("Error during logout:", e);
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

