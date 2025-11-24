import { Notification } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import type { Api } from "../../tools/ElectronApi";

// Try to import electron-windows-notifications, but use fallback if not available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ToastNotification: new (options: {
  appId: string;
  template: string;
  text1: string;
  text2?: string;
}) => {
  show: () => void;
  close: () => void;
} | null = null;

try {
  // Dynamic require for optional dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const electronWindowsNotifications = require("electron-windows-notifications");
  ToastNotification = electronWindowsNotifications.ToastNotification;
} catch (e) {
  console.warn(
    "electron-windows-notifications not available, using fallback Notification API"
  );
  ToastNotification = null;
}

export function setupNotificationHandlers() {
  ipcMain.handle<Api>(
    "showNotification",
    async (
      _,
      options: {
        title: string;
        body?: string;
        status?: "success" | "error" | "warning" | "info";
        duration?: number;
      }
    ) => {
      // Prepare text content with status prefix
      const statusPrefix = options.status
        ? `[${options.status.toUpperCase()}] `
        : "";
      const body = options.body
        ? `${statusPrefix}${options.body}`
        : statusPrefix.trim();

      // Try to use electron-windows-notifications if available
      if (ToastNotification) {
        try {
          const text1 = options.title;
          const text2 = body || undefined;

          // Use ToastText02 template for title + body, or ToastText01 for title only
          const template = text2 ? "ToastText02" : "ToastText01";

          const notification = new ToastNotification({
            appId: "com.usgs.lst.loader",
            template,
            text1,
            text2,
            // Remove scenario to allow notifications even when app is in focus
            // Windows will show toast notifications regardless of focus state
          });

          // Show the notification
          notification.show();

          // Auto-close notification after duration (default 3000ms)
          const duration = options.duration || 3000;
          if (duration > 0) {
            setTimeout(() => {
              try {
                notification.close();
              } catch (e) {
                // Ignore errors when closing
                console.error("Error closing notification:", e);
              }
            }, duration);
          }

          return;
        } catch (error) {
          console.error(
            "Error showing ToastNotification, falling back to standard Notification:",
            error
          );
          // Fall through to fallback
        }
      }

      // Fallback to standard Electron Notification
      // Note: Standard Notification API may not show when app is in focus
      try {
        const notification = new Notification({
          title: options.title,
          body: body,
          silent: false,
        });

        notification.show();

        // Auto-close notification after duration (default 3000ms)
        const duration = options.duration || 3000;
        if (duration > 0) {
          setTimeout(() => {
            try {
              notification.close();
            } catch (e) {
              // Ignore errors when closing
              console.error("Error closing notification:", e);
            }
          }, duration);
        }
      } catch (fallbackError) {
        console.error("Fallback notification also failed:", fallbackError);
      }
    }
  );
}
