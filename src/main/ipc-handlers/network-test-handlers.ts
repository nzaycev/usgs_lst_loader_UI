import axios, { AxiosInstance } from "axios";
import { ipcMain } from "electron-typescript-ipc";
import type { Api } from "../../tools/ElectronApi";
import { configureAxiosProxy } from "../axios-proxy-config";
import type { SettingsChema } from "../settings-store";
import { store } from "../settings-store";

// Create a dedicated axios instance for network testing
const testAxiosInstance: AxiosInstance = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 10000, // 10 seconds timeout
});

// Configure proxy settings for test instance
const proxySettings = store.get("proxySettings") as
  | SettingsChema["proxySettings"]
  | undefined;
configureAxiosProxy(testAxiosInstance, proxySettings);

export function setupNetworkTestHandlers() {
  ipcMain.handle<Api>("testNetwork", async () => {
    try {
      console.log("[Network Test] Starting network test");
      const response = await testAxiosInstance.get("/todos/1");
      console.log("[Network Test] Network test successful", {
        status: response.status,
        statusText: response.statusText,
      });
      return { success: true, status: response.status };
    } catch (error) {
      console.error("[Network Test] Network test failed:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; statusText?: string };
        };
        // Even if we get a response, it means network is working
        if (axiosError.response?.status) {
          console.log("[Network Test] Network test successful (got response)", {
            status: axiosError.response.status,
          });
          return { success: true, status: axiosError.response.status };
        }
      }
      // Network error (no response) - connection failed
      throw error;
    }
  });

  // Reconfigure proxy when settings change
  store.onDidChange("proxySettings", (newProxySettings) => {
    console.log(
      "[Network Test] Proxy settings changed, reconfiguring test instance"
    );
    configureAxiosProxy(
      testAxiosInstance,
      newProxySettings as SettingsChema["proxySettings"] | undefined
    );
  });
}

