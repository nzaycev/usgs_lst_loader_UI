import fs from "fs";
import path from "path";
import { app, ipcMain as electronIpcMain } from "electron";

const logPath = path.join(app.getPath("userData"), "log.txt");
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, "");
}
const fLog = fs.openSync(logPath, "a");

const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);
  fs.appendFileSync(
    fLog,
    new Date().getTime() + " : [LOG] : " + JSON.stringify(args) + "\n"
  );
};

const originalError = console.error;
console.error = (...args) => {
  originalError(...args);
  fs.appendFileSync(
    fLog,
    new Date().getTime() + " : [ERROR] : " + JSON.stringify(args) + "\n"
  );
};

// Register renderer log handler early, before windows are created
export function setupRendererLogging() {
  electronIpcMain.on(
    "renderer-log",
    (event, data: { level: string; args: unknown[] }) => {
      try {
        const { level, args } = data;
        const timestamp = new Date().toISOString();
        let windowTitle = "Unknown Window";
        try {
          windowTitle = event.sender.getTitle() || "Unknown Window";
        } catch (e) {
          // If we can't get title, use sender ID
          windowTitle = `Window-${event.sender.id}`;
        }

        // Format message - args are already serialized in preload
        const formattedArgs = args.map((arg) => {
          if (arg === null || arg === undefined) {
            return String(arg);
          }
          if (
            typeof arg === "string" ||
            typeof arg === "number" ||
            typeof arg === "boolean"
          ) {
            return String(arg);
          }
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        });

        const message = formattedArgs.join(" ");

        // Log to console with window context
        const logMessage = `[${timestamp}] [${windowTitle}] [${level.toUpperCase()}] ${message}`;

        switch (level) {
          case "error":
            console.error(logMessage);
            break;
          case "warn":
            console.warn(logMessage);
            break;
          case "info":
            console.info(logMessage);
            break;
          default:
            console.log(logMessage);
        }

        // Also append to log file if available
        try {
          fs.appendFileSync(
            fLog,
            `${timestamp} : [${level.toUpperCase()}] [${windowTitle}] : ${message}\n`
          );
        } catch (e) {
          // Ignore file write errors
        }
      } catch (e) {
        // Don't break if log handling fails
        console.error("Error handling renderer log:", e);
      }
    }
  );
}

