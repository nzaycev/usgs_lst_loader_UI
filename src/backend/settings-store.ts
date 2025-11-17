import { EmissionCalcMethod, OutLayer } from "../actions/main-actions";
import Store, { Options } from "electron-store";
import {
  CalculationSettings,
  INetworkSettings,
} from "../ui/network-settings/network-settings-state";

export interface SettingsChema {
  calculationSettings: CalculationSettings["args"];
  proxySettings?: INetworkSettings["proxy"];
  userdata?: {
    username: string;
    password: string;
  };
}

const schema: Options<SettingsChema> = {
  defaults: {
    calculationSettings: {
      useQAMask: true,
      emission: undefined,
      // saveDirectory:
      //   "C:\\Users\\nzayt\\Documents\\диссер\\сравнение сезонов диапазоны",
      // layerNamePattern: "{date}-{name}",
      emissionCalcMethod: EmissionCalcMethod.ndmi,
      outLayers: {
        [OutLayer.LST]: true,
        [OutLayer.BT]: true,
        [OutLayer.Emission]: true,
        [OutLayer.NDMI]: true,
        [OutLayer.NDVI]: true,
        [OutLayer.Radiance]: true,
        [OutLayer.SurfRad]: true,
        [OutLayer.VegProp]: true,
      },
    },
    proxySettings: undefined,
    userdata: undefined,
  },
  encryptionKey: "test",
};

const store = new Store(schema);

export { store };
