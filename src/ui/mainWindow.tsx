import React, { useEffect, useState } from "react";
import { SystemHelper } from "./SystemHelper";

import { BoundsSelector, ISelectionCoordinates } from "./BoundsSelector";
import { DateList } from "./DateList";
import {
  HashRouter,
  Route,
  Navigate,
  Routes,
  PathRouteProps,
  useNavigate,
  useLocation,
  Location,
} from "react-router-dom";
import {
  mainActions,
  setDate,
  watchScenesState,
} from "../actions/main-actions";
import { useAppDispatch, useAppSelector } from "../entry-points/app";
import { DownloadManager } from "./download-manager/download-manager";
import { checkDates } from "../backend/usgs-api";
import { LoginView } from "./login-view";

interface AppRoutes {
  "/auth": void;
  "/date-selector": void;
  "/bounds": void;
  "/date_list": ISelectionCoordinates;
  "/": void;
}

const TypedRoute: React.FC<PathRouteProps & { path: keyof AppRoutes | "*" }> =
  Route;
export function useTypedNavigate() {
  const navigate = useNavigate();
  return function <T extends keyof AppRoutes>(
    url: T,
    options?: { state: AppRoutes[T] }
  ) {
    navigate(url, options);
  };
}

export function useTypedLocation<T extends keyof AppRoutes>() {
  return useLocation() as Location & { state: AppRoutes[T] };
}

export const MainWindow = () => {
  const dispatch = useAppDispatch();
  const authorized = useAppSelector((state) => state.main.authorized);
  const localMode = useAppSelector((state) => state.main.localMode);
  const setLocalMode = () => {
    dispatch(mainActions.actions.setLocalState());
  };
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(watchScenesState());
    }, 1000);
    checkDates().then((ld) => {
      dispatch(setDate(ld));
    });
    return () => clearInterval(interval);
  }, [dispatch]);
  return (
    <div className="main-window">
      <HashRouter>
        <SystemHelper />
        <Routes>
          {authorized && (
            <>
              {" "}
              <TypedRoute path="/bounds" element={<BoundsSelector />} />
              <TypedRoute path="/date_list" element={<DateList />} />
            </>
          )}
          <TypedRoute path="/" element={<DownloadManager />} />
          {!authorized && <TypedRoute
            path="/auth"
            element={<LoginView skipLogin={() => setLocalMode()} />}
          />}
          <TypedRoute
            path="*"
            element={
              authorized || localMode ? (
                <Navigate to="/" />
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
        </Routes>
      </HashRouter>
    </div>
  );
};
