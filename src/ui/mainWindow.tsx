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
import { checkDates, checkUserPermissons } from "../actions/usgs-api";
import { SettingsChema } from "../main/settings-store";
import { useAppDispatch, useAppSelector } from "./app";
import { BoundsSelector, ISelectionCoordinates } from "./BoundsSelector";
import { DateList } from "./DateList";
import { DownloadManager } from "./download-manager/download-manager";
import { SystemHelper } from "./SystemHelper";

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

const MainWindowContent = () => {
  const dispatch = useAppDispatch();
  const navigate = useTypedNavigate();
  const authorized = useAppSelector((state) => state.main.authorized);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(watchScenesState());
    }, 1000);
    checkDates().then((ld) => {
      dispatch(setDate(ld));
    });
    return () => clearInterval(interval);
  }, [dispatch]);

  // Check stored credentials on app start and restore authorized state if valid
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        const storedCreds = (await window.ElectronAPI.invoke.getStoreValue(
          "userdata"
        )) as SettingsChema["userdata"] | undefined;

        if (storedCreds && storedCreds.username && storedCreds.token) {
          try {
            const { data } = (await checkUserPermissons(storedCreds)) || {};
            if (data?.data?.includes?.("download")) {
              dispatch(mainActions.actions.getAccess());
            }
          } catch (e) {
            console.error("Error checking stored credentials:", e);
            // Credentials are invalid, don't set authorized state
          }
        }
      } catch (e) {
        console.error("Error loading stored credentials:", e);
      }
    };

    checkStoredAuth();
  }, [dispatch]);

  // Listen for login success message from main process
  useEffect(() => {
    const handleLoginSuccess = (_event: any) => {
      dispatch(mainActions.actions.getAccess());
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
  // Intercept navigation to protected routes
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.hash.replace("#", "") || "/";
      if (
        (currentPath === "/bounds" || currentPath === "/date_list") &&
        !authorized
      ) {
        // Open login dialog with target route
        window.ElectronAPI.invoke.openLoginDialog({
          autoLogin: true,
          targetRoute: currentPath,
        });
      }
    };

    // Check on mount and route changes
    handleRouteChange();
    window.addEventListener("hashchange", handleRouteChange);

    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, [authorized]);

  return (
    <>
      <SystemHelper />
      <Routes>
        <TypedRoute
          path="/bounds"
          element={
            authorized ? <BoundsSelector /> : <Navigate to="/" replace />
          }
        />
        <TypedRoute
          path="/date_list"
          element={authorized ? <DateList /> : <Navigate to="/" replace />}
        />
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
