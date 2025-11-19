import { app, BrowserWindow } from "electron";

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
    // eslint-disable-next-line no-constant-condition
    // while (true) {
    //   if (!(await fsWatcher.stillWorking())) {
    //     break;
    //   }
    //   await new Promise((resolve) => setTimeout(resolve, 5000));
    // }
    app.quit();
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

