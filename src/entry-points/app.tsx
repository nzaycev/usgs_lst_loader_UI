import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import ReactDOM from "react-dom";
import { MainWindow } from "../ui/mainWindow";
import logger from "redux-logger";
import {
  Provider,
  TypedUseSelectorHook,
  useSelector,
  useDispatch,
} from "react-redux";
import { mainActions } from "../actions/main-actions";
import { searchApi } from "../actions/searchApi";
import { MapProvider } from "react-map-gl";

import { ChakraProvider } from "@chakra-ui/react";
import { testNetworkApi } from "../ui/network-test/network-test-request";
import { NetworkTestWrapper } from "../ui/network-test/network-test-wrapper";
import { networkSlice } from "../ui/network-test/network-state";
import { NetworkSettingsWrapper } from "../ui/network-settings/network-settings-wrapper";
import { networkSettingsSlice } from "../ui/network-settings/network-settings-state";

function render() {
  ReactDOM.render(
    <Provider store={store}>
      <ChakraProvider>
        <NetworkSettingsWrapper>
          <NetworkTestWrapper>
            <MapProvider>
              <MainWindow />
            </MapProvider>
          </NetworkTestWrapper>
        </NetworkSettingsWrapper>
      </ChakraProvider>
    </Provider>,
    document.getElementById("root")
  );
}

export const store = configureStore({
  middleware(gdf) {
    return gdf({
      serializableCheck: false,
    }).concat([searchApi.middleware, testNetworkApi.middleware, logger]);
  },
  reducer: {
    main: mainActions.reducer,
    network: networkSlice.reducer,
    [networkSettingsSlice.name]: networkSettingsSlice.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
    [testNetworkApi.reducerPath]: testNetworkApi.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

render();
