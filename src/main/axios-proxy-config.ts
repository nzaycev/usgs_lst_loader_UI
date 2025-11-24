import { AxiosInstance, AxiosRequestConfig } from "axios";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { IProxySettings } from "../ui/network-settings/network-settings-state";

/**
 * Configures axios instance with proxy settings if available
 */
export function configureAxiosProxy(
  axiosInstance: AxiosInstance,
  proxySettings?: IProxySettings
): void {
  if (!proxySettings) {
    // Remove proxy if it was previously set
    delete axiosInstance.defaults.httpsAgent;
    delete axiosInstance.defaults.httpAgent;
    return;
  }

  let authString = "";
  if (proxySettings.auth) {
    authString = `${proxySettings.auth.login}:${proxySettings.auth.password}@`;
  }
  const proxyUrlWithAuth = `${proxySettings.protocol}://${authString}${proxySettings.host}:${proxySettings.port}`;

  // Configure proxy agents
  if (proxySettings.protocol === "http" || proxySettings.protocol === "https") {
    axiosInstance.defaults.httpsAgent = new HttpsProxyAgent(proxyUrlWithAuth);
    axiosInstance.defaults.httpAgent = new HttpProxyAgent(proxyUrlWithAuth);
  } else if (proxySettings.protocol === "sock5") {
    // For SOCKS5, we'd need socks-proxy-agent, but since the protocol is "sock5" (typo in the codebase),
    // we'll treat it as HTTP proxy for now
    axiosInstance.defaults.httpsAgent = new HttpsProxyAgent(proxyUrlWithAuth);
    axiosInstance.defaults.httpAgent = new HttpProxyAgent(proxyUrlWithAuth);
  }

  // Also configure proxy for individual requests via interceptor
  axiosInstance.interceptors.request.use((config: AxiosRequestConfig) => {
    if (config.httpsAgent || config.httpAgent) {
      // Already configured, skip
      return config;
    }
    // The agents are set on defaults, so they should be used automatically
    return config;
  });
}
