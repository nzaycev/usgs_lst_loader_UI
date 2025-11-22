import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import ReactDOM from "react-dom";
import { MainWindow } from "./mainWindow";
import { MappingDialogWindowApp } from "./mapping-dialog-window";
import { LoginDialogWindowApp } from "./login-dialog-window";
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
import { testNetworkApi } from "./network-test/network-test-request";
import { NetworkTestWrapper } from "./network-test/network-test-wrapper";
import { networkSlice } from "./network-test/network-state";
import { NetworkSettingsWrapper } from "./network-settings/network-settings-wrapper";
import { networkSettingsSlice } from "./network-settings/network-settings-state";

function render() {
  // Проверяем, является ли это окном диалога
  const hash = window.location.hash;
  const isMappingDialog = hash.startsWith("#mapping-dialog:");
  const isLoginDialog = hash.startsWith("#login-dialog:");

  try {
    if (isMappingDialog) {
      // Рендерим только диалог маппинга без Redux и других провайдеров
      ReactDOM.render(
        <MappingDialogWindowApp />,
        document.getElementById("root")
      );
    } else if (isLoginDialog) {
      // Рендерим только диалог авторизации без Redux и других провайдеров
      ReactDOM.render(
        <LoginDialogWindowApp />,
        document.getElementById("root")
      );
    } else {
      // Обычное главное окно
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
  } catch (error) {
    console.error("Error during render:", error);
    const rootElement = document.getElementById("root");
    if (rootElement) {
    ReactDOM.render(
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Render Error</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
          <pre>{error instanceof Error ? error.stack : String(error)}</pre>
        </div>,
        rootElement
    );
    }
  }
}

export const store = configureStore({
  devTools: false,
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
