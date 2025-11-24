import { Copy, Minus, Satellite, Square, Wifi, WifiOff, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { mainActions } from "../actions/main-actions";
import { useAppDispatch, useAppSelector } from "./app";
import { NetworkState } from "./network-test/network-state";

// import { ElectonAPI } from "../tools/ElectonApi";

// const { ipcRenderer } = window.require('electron')

// вроде как проверка наличия загрузок, но кривая

export const useHelperSearch = () => {
  const searchEnabled = useAppSelector((state) => state.main.searchEnabled);
  const value = useAppSelector((state) => state.main.searchValue);
  const dispatch = useAppDispatch();
  const setValue = (value: string) =>
    dispatch(mainActions.actions.setSearch(value));
  const toggle = (value: boolean) =>
    dispatch(mainActions.actions.toggleSearch(value));
  return {
    searchEnabled,
    value,
    setValue,
    toggle,
  };
};

type UsgsApiStatus = {
  auth: "guest" | "authorizing" | "authorized";
  username?: string;
};

export const SystemHelper = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [usgsStatus, setUsgsStatus] = useState<UsgsApiStatus | null>(null);
  const networkState = useAppSelector((state) => state.network.networkState);

  // Check window state on mount and after maximize/minimize
  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.ElectronAPI.invoke.windowIsMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    // Listen for window state changes
    const interval = setInterval(checkMaximized, 100);

    return () => clearInterval(interval);
  }, []);

  // Load USGS API status and listen for changes
  useEffect(() => {
    const loadStatus = async () => {
      const status = await window.ElectronAPI.invoke.usgsGetStatus();
      setUsgsStatus(status);
    };
    loadStatus();

    const handleStatusChange = (_event: any, newStatus: UsgsApiStatus) => {
      setUsgsStatus(newStatus);
    };

    window.ElectronAPI.on.usgsApiStatusChange(handleStatusChange);
  }, []);

  const handleMinimize = async () => {
    await window.ElectronAPI.invoke.windowMinimize();
  };

  const handleMaximize = async () => {
    await window.ElectronAPI.invoke.windowMaximize();
    // Update state after a short delay
    setTimeout(async () => {
      const maximized = await window.ElectronAPI.invoke.windowIsMaximized();
      setIsMaximized(maximized);
    }, 100);
  };

  const handleClose = async () => {
    await window.ElectronAPI.invoke.windowClose();
  };

  // Windows 11 style: buttons are full height with 16:9 aspect ratio
  // Typical Windows 11 title bar height is ~32px, buttons are ~46px wide (16:9 = 46:26)
  const buttonWidth = 46; // 16:9 ratio: 46px width for ~26px height
  const titleBarHeight = 32; // Slightly smaller than default

  return (
    <div
      className="bg-gray-800 px-0 flex items-center justify-between border-b border-gray-700 select-none"
      style={
        {
          WebkitAppRegion: "drag",
          height: `${titleBarHeight}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="flex items-center gap-2 px-3 h-full"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <Satellite size={14} className="text-blue-400" />
        <span className="text-xs font-medium text-gray-200">
          USGS LST Loader
        </span>
      </div>

      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Network status button - opens network settings */}
        <button
          title="Network Settings"
          className="flex items-center gap-1.5 mr-1 px-2 h-full hover:bg-gray-700/50 transition-colors"
          onClick={async () => {
            await window.ElectronAPI.invoke.openSettingsDialog();
          }}
        >
          {networkState === NetworkState.Stable ? (
            <Wifi size={12} className="text-green-400" />
          ) : networkState === NetworkState.Unstable ? (
            <WifiOff size={12} className="text-red-400" />
          ) : (
            <Wifi size={12} className="text-gray-400" />
          )}
          <span className="text-[10px] text-gray-400">
            {networkState === NetworkState.Stable
              ? "online"
              : networkState === NetworkState.Unstable
              ? "offline"
              : "checking"}
          </span>
        </button>
        {/* USGS auth status button - opens authorization dialog */}
        {usgsStatus && (
          <button
            title="USGS Authentication"
            className="flex items-center gap-1.5 mr-1 px-2 h-full hover:bg-gray-700/50 transition-colors"
            onClick={async () => {
              await window.ElectronAPI.invoke.openLoginDialog({
                autoLogin: false,
              });
            }}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                usgsStatus.auth === "authorized"
                  ? "bg-green-400"
                  : usgsStatus.auth === "authorizing"
                  ? "bg-yellow-400"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-[10px] text-gray-400">
              {usgsStatus.auth === "authorized" && usgsStatus.username
                ? usgsStatus.username
                : usgsStatus.auth}
            </span>
          </button>
        )}
        <button
          title="Minimize"
          className="h-full hover:bg-gray-700/50 transition-colors flex items-center justify-center"
          style={{ width: `${buttonWidth}px` }}
          onClick={handleMinimize}
        >
          <Minus size={12} className="text-gray-300" />
        </button>
        <button
          title={isMaximized ? "Restore Down" : "Maximize"}
          className="h-full hover:bg-gray-700/50 transition-colors flex items-center justify-center"
          style={{ width: `${buttonWidth}px` }}
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <Copy size={10} className="text-gray-300 -scale-x-100" />
          ) : (
            <Square size={10} className="text-gray-300" />
          )}
        </button>
        <button
          title="Close"
          className="h-full hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center"
          style={{ width: `${buttonWidth}px` }}
          onClick={handleClose}
        >
          <X size={12} className="text-gray-300" />
        </button>
      </div>
    </div>
  );
};
