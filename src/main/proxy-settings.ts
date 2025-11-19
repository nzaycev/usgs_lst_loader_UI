import type { BrowserWindow, App } from "electron";
import { IProxySettings } from "../ui/network-settings/network-settings-state";

const cleanUppProxy = (app: App, mainWindow: BrowserWindow) => {
  mainWindow.webContents.session.setProxy({ proxyRules: undefined });
  app.commandLine.removeSwitch("proxy-server");
  app.removeAllListeners("login");
};

export const applyProxySettings = (
  app: App,
  mainWindow: BrowserWindow,
  proxySettings?: IProxySettings
) => {
  cleanUppProxy(app, mainWindow);
  if (!proxySettings) {
    return;
  }
  const proxyUrl = `${proxySettings.protocol}://${proxySettings.host}:${proxySettings.port}`;
  mainWindow.webContents.session.setProxy({
    proxyRules: proxyUrl,
  });
  app.commandLine.appendSwitch("proxy-server", proxyUrl);
  if (!proxySettings.auth) {
    return;
  }
  app.on("login", function (event, webContents, request, authInfo, callback) {
    if (authInfo.isProxy) {
      event.preventDefault();
      callback(proxySettings.auth.login, proxySettings.auth.password);
    }
  });
};
