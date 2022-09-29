import React, { useEffect } from "react";
// import "react-dates/initialize";
// import "react-dates/lib/css/_datepicker.css";
import { SystemHelper } from "./SystemHelper";

import { WaySelector } from "./WaySelector";
import { DateSelector } from "./DateSelector";
import { BoundsSelector, ISelectionCoordinates } from "./BoundsSelector";
import { SectorSelector } from "./SectorSelector";
import { DateList } from "./DateList";
import { HashRouter, Route, Navigate, Routes, PathRouteProps, useNavigate, useLocation, Location } from "react-router-dom";
import { setDate, setSceneState, watchScenesState } from "../actions/main-actions";
import { useAppDispatch } from "../entry-points/app";
import { DownloadManager } from "./download-manager/download-manager";
import { checkDates } from "../backend/usgs-api";

interface AppRoutes {
  '/add-downloading': void
  '/date-selector': void
  '/map': {date: Date}
  '/bounds': void
  '/date_list': ISelectionCoordinates
  '/': void
}

const TypedRoute: React.FC<PathRouteProps & {path: keyof AppRoutes | '*'}> = Route
export function useTypedNavigate() { 
  const navigate = useNavigate()
  return function<T extends keyof AppRoutes>(url: T, options?: {state: AppRoutes[T]}) {
    navigate(url, options)
  }
}

export function useTypedLocation<T extends keyof AppRoutes>(){ 
  return useLocation() as Location & {state: AppRoutes[T]}
}

export const MainWindow = () => {
  const dispatch = useAppDispatch()
  useEffect(() => {
    window.ElectronAPI.on.stateChange((_, {state, displayId}) => {
      console.log('change state', {state, displayId})
      dispatch(setSceneState({state, displayId}))
    })
    checkDates().then((ld) => {
      dispatch(setDate(ld))
    })
  }, [dispatch])
  return (
    <div className="main-window">
        
        <HashRouter>
          <SystemHelper />
          <Routes>
            <TypedRoute path="*" element={<Navigate to='/'/>} />
            <TypedRoute path="/add-downloading" element={<WaySelector />}/>
            <TypedRoute path="/date-selector" element={<DateSelector />}/>
            <TypedRoute path="/map" element={<SectorSelector />}/>
            <TypedRoute path="/bounds" element={<BoundsSelector />}/>
            <TypedRoute path="/date_list" element={<DateList />}/>
            <TypedRoute path="/" element={<DownloadManager />}/>
          </Routes>
        </HashRouter>
    </div>
  );
};
