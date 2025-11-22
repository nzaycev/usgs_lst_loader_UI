import { BrowserWindow } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import type { Api } from "../../tools/ElectronApi";
import { ISearchScenesFilter } from "../../tools/ElectronApi";
import { SettingsChema, store } from "../settings-store";
import { usgsApiManager } from "../usgs-api";

export function setupUsgsApiHandlers(mainWindow: BrowserWindow) {
  // Set main window for status updates
  usgsApiManager.setMainWindow(mainWindow);

  // Initialize session with stored credentials on startup
  const initSession = async () => {
    try {
      console.log("[USGS API Handler] Initializing session on startup");
      const creds = store.get("userdata") as
        | SettingsChema["userdata"]
        | undefined;
      if (creds?.username && creds?.token) {
        console.log(
          "[USGS API Handler] Found stored credentials, attempting login",
          {
            username: creds.username,
          }
        );
        await usgsApiManager.login(creds);
        console.log("[USGS API Handler] Session initialized successfully");
      } else {
        console.log("[USGS API Handler] No stored credentials found");
      }
    } catch (e) {
      console.error("[USGS API Handler] Failed to initialize USGS session:", e);
    }
  };
  initSession();

  // Listen for status changes and broadcast to all windows
  usgsApiManager.on("status-change", (status) => {
    // Status is already sent via mainWindow.webContents.send in usgsApiManager
    // But we can also send to all windows if needed
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("usgs-api-status-change", status);
      }
    });
  });

  ipcMain.handle<Api>(
    "usgsCheckUserPermissions",
    async (_, creds: SettingsChema["userdata"]) => {
      try {
        console.log("[USGS API Handler] usgsCheckUserPermissions called", {
          username: creds.username,
        });
        const result = await usgsApiManager.checkUserPermissions(creds);
        console.log("[USGS API Handler] usgsCheckUserPermissions result:", {
          hasResult: !!result,
          hasData: !!result?.data,
        });
        if (result) {
          // Save credentials
          store.set("userdata", creds);
          console.log("[USGS API Handler] Credentials saved to store");
        }
        return result;
      } catch (e) {
        console.error("[USGS API Handler] Error checking user permissions:", e);
        // If it's an Error with message, log it
        if (e instanceof Error) {
          console.error("[USGS API Handler] Error message:", e.message);
          // Re-throw the error so UI can show the message
          throw e;
        }
        // If it's an Axios error, log response details
        if (e && typeof e === "object" && "response" in e) {
          const axiosError = e as {
            response?: { data?: unknown; status?: number };
          };
          console.error("[USGS API Handler] Axios error details:", {
            status: axiosError.response?.status,
            data: axiosError.response?.data,
          });
        }
        // Re-throw to let UI handle it
        throw e;
      }
    }
  );

  ipcMain.handle<Api>(
    "usgsSearchScenes",
    async (_, filter: ISearchScenesFilter) => {
      try {
        return await usgsApiManager.searchScenes(filter);
      } catch (e) {
        console.error("Error searching scenes:", e);
        throw e;
      }
    }
  );

  ipcMain.handle<Api>("usgsReindexScene", async (_, displayId: string) => {
    try {
      return await usgsApiManager.reindexScene(displayId);
    } catch (e) {
      console.error("Error reindexing scene:", e);
      throw e;
    }
  });

  ipcMain.handle<Api>("usgsCheckDates", async () => {
    try {
      return await usgsApiManager.checkDates();
    } catch (e) {
      console.error("Error checking dates:", e);
      throw e;
    }
  });

  ipcMain.handle<Api>("usgsGetDownloadDS", async (_, entityId: string) => {
    try {
      return await usgsApiManager.getDownloadDS(entityId);
    } catch (e) {
      console.error("Error getting download DS:", e);
      throw e;
    }
  });

  ipcMain.handle<Api>("usgsGetStatus", async () => {
    return usgsApiManager.getStatus();
  });

  ipcMain.handle<Api>("usgsLogout", async () => {
    try {
      await usgsApiManager.logout();
      store.delete("userdata");
    } catch (e) {
      console.error("Error logging out:", e);
    }
  });
}
