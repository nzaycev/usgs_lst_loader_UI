import * as path from "path";

const isDev = process.env.APP_DEV === "true";

/**
 * Get the path to the preload script
 */
export function getPreloadPath(): string {
  if (isDev) {
    return path.resolve(__dirname, "../../.vite/preload/preload.js");
  }
  return path.join(__dirname, "../preload/preload.js");
}

/**
 * Get the URL or path to the renderer HTML file
 */
export function getRendererUrl(): string {
  if (isDev) {
    return "http://localhost:5173";
  }
  return path.join(__dirname, "../renderer/index.html");
}

/**
 * Get the path to the renderer HTML file (for loadFile)
 */
export function getRendererPath(): string {
  if (isDev) {
    return "http://localhost:5173";
  }
  return path.join(__dirname, "../renderer/index.html");
}
