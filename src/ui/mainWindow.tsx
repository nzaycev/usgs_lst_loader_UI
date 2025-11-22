import React, { useEffect } from "react";
import {
  HashRouter,
  Location,
  Navigate,
  PathRouteProps,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  mainActions,
  setDate,
  watchScenesState,
} from "../actions/main-actions";
import { useAppDispatch, useAppSelector } from "./app";
import { DownloadManager } from "./download-manager/download-manager";
import { SystemHelper } from "./SystemHelper";

interface AppRoutes {
  "/auth": void;
  "/date-selector": void;
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

const MainWindowContent = () => {
  const dispatch = useAppDispatch();
  const navigate = useTypedNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(watchScenesState());
    }, 1000);
    window.ElectronAPI.invoke.usgsCheckDates().then((ld) => {
      dispatch(setDate(ld));
    });
    return () => clearInterval(interval);
  }, [dispatch]);

  // Check USGS API status on app start and restore authorized state if valid
  // Note: Session is already initialized in main process, we just check the status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log("[MainWindow] Checking USGS API status");
        const status = await window.ElectronAPI.invoke.usgsGetStatus();
        console.log("[MainWindow] USGS API status:", status);
        if (status.auth === "authorized") {
          dispatch(mainActions.actions.getAccess());
        }
      } catch (e) {
        console.error("[MainWindow] Error checking USGS API status:", e);
      }
    };

    // Wait a bit for main process to initialize session
    const timeout = setTimeout(checkAuthStatus, 500);
    return () => clearTimeout(timeout);
  }, [dispatch]);

  // Listen for login success message from main process
  useEffect(() => {
    const handleLoginSuccess = async (_event: unknown) => {
      console.log("[MainWindow] Login success received, checking status");
      // Session is already initialized in main process via login dialog
      // Just check the status and update UI
      try {
        const status = await window.ElectronAPI.invoke.usgsGetStatus();
        console.log("[MainWindow] USGS API status after login:", status);
        if (status.auth === "authorized") {
          dispatch(mainActions.actions.getAccess());
        }
      } catch (e) {
        console.error("[MainWindow] Failed to check status after login:", e);
        // Still grant access if login was successful
        dispatch(mainActions.actions.getAccess());
      }
    };

    const handle403Error = async (
      _event: any,
      data: { targetRoute: string }
    ) => {
      // Open login dialog when 403 error occurs
      await window.ElectronAPI.invoke.openLoginDialog({
        autoLogin: true,
        targetRoute: data.targetRoute,
      });
    };

    window.ElectronAPI.on.loginSuccess(handleLoginSuccess);
    window.ElectronAPI.on.openLoginDialog403(handle403Error);

    return () => {
      // Note: electron-typescript-ipc doesn't provide removeListener for custom events
      // The cleanup will happen when component unmounts
    };
  }, [dispatch, navigate]);

  return (
    <>
      <SystemHelper />
      <Routes>
        <TypedRoute path="/" element={<DownloadManager />} />
        <TypedRoute path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export const MainWindow = () => {
  return (
    <div className="h-screen bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      <HashRouter>
        <MainWindowContent />
      </HashRouter>
    </div>
  );
};
