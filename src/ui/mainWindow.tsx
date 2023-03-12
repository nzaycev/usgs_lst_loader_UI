import React, { useEffect } from "react";
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
import { useAppDispatch } from "../entry-points/app";
import { DownloadManager } from "./download-manager/download-manager";
import { checkDates } from "../backend/usgs-api";

interface AppRoutes {
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
          <TypedRoute path="*" element={<Navigate to="/" />} />
          <TypedRoute path="/bounds" element={<BoundsSelector />} />
          <TypedRoute path="/date_list" element={<DateList />} />
          <TypedRoute path="/" element={<DownloadManager />} />
        </Routes>
      </HashRouter>
    </div>
  );
};
