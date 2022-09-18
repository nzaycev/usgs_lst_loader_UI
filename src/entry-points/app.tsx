import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import ReactDOM from 'react-dom';
import { MainWindow } from '../ui/mainWindow';
import {Provider, TypedUseSelectorHook, useSelector, useDispatch} from 'react-redux'
import { mainActions } from '../actions/main-actions';
import { searchApi } from '../actions/searchApi';
import {MapProvider} from 'react-map-gl';


function render() {
  ReactDOM.render(
    <Provider store={store}>
      <MapProvider>
        <MainWindow />
      </MapProvider>
    </Provider>,
  document.getElementById("root"));
}

export const store = configureStore({
  middleware(gdf) {
    return gdf({
      serializableCheck: false,
    }).concat([
      searchApi.middleware,
    ])
  },
  reducer: {
    main: mainActions.reducer,
    [searchApi.reducerPath]: searchApi.reducer
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

render();