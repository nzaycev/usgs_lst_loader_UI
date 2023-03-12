import Store, { Options } from "electron-store";
import { INetworkSettings } from "../ui/network-settings/network-settings-state";

export interface SettingsChema {
  proxySettings?: INetworkSettings["proxy"];
  userdata?: {
    username: string;
    password: string;
  };
}

const schema: Options<SettingsChema> = {
  defaults: {
    proxySettings: undefined,
    userdata: undefined,
  },
  encryptionKey: "test",
};

const store = new Store(schema);

export { store };
