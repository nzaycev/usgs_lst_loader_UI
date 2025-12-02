import {
  ChevronDown,
  Copy,
  Minus,
  Satellite,
  Square,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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

  // Update state
  const [appVersion, setAppVersion] = useState<string>("");
  const [isUpdateDropdownOpen, setIsUpdateDropdownOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    releaseDate: string;
  } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const [timeUntilNextCheck, setTimeUntilNextCheck] = useState<number | null>(
    null
  );
  const lastUpdateCheckTimeRef = useRef<number | null>(null);
  const updateDropdownRef = useRef<HTMLDivElement>(null);

  const UPDATE_CHECK_RATE_LIMIT_MS = 5 * 60 * 1000; // 5 минут

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

    const handleStatusChange = (_event: unknown, newStatus: UsgsApiStatus) => {
      setUsgsStatus(newStatus);
    };

    window.ElectronAPI.on.usgsApiStatusChange(handleStatusChange);
  }, []);

  // Load app version
  useEffect(() => {
    const loadVersion = async () => {
      const version = await window.ElectronAPI.invoke.getAppVersion();
      setAppVersion(version);
    };
    loadVersion();
  }, []);

  // Setup update event listeners
  useEffect(() => {
    const handleUpdateChecking = () => {
      setIsCheckingUpdate(true);
    };

    const handleUpdateAvailable = (
      _event: unknown,
      info: { version: string; releaseDate: string }
    ) => {
      setIsCheckingUpdate(false);
      setUpdateInfo(info);
      setIsUpdateDownloaded(false);
    };

    const handleUpdateNotAvailable = () => {
      setIsCheckingUpdate(false);
      setUpdateInfo(null);
    };

    const handleUpdateError = (_event: unknown, error: string) => {
      setIsCheckingUpdate(false);
      console.error("[Update] Error:", error);
    };

    const handleUpdateDownloadProgress = (
      _event: unknown,
      progress: { percent: number }
    ) => {
      setIsDownloadingUpdate(true);
      setDownloadProgress(progress.percent);
    };

    const handleUpdateDownloaded = (
      _event: unknown,
      info: { version: string; releaseDate: string }
    ) => {
      setIsDownloadingUpdate(false);
      setIsUpdateDownloaded(true);
      setUpdateInfo(info);
    };

    window.ElectronAPI.on.updateChecking(handleUpdateChecking);
    window.ElectronAPI.on.updateAvailable(handleUpdateAvailable);
    window.ElectronAPI.on.updateNotAvailable(handleUpdateNotAvailable);
    window.ElectronAPI.on.updateError(handleUpdateError);
    window.ElectronAPI.on.updateDownloadProgress(handleUpdateDownloadProgress);
    window.ElectronAPI.on.updateDownloaded(handleUpdateDownloaded);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        updateDropdownRef.current &&
        !updateDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUpdateDropdownOpen(false);
      }
    };

    if (isUpdateDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isUpdateDropdownOpen]);

  // Update time until next check
  useEffect(() => {
    if (!isUpdateDropdownOpen || lastUpdateCheckTimeRef.current === null) {
      setTimeUntilNextCheck(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const lastCheck = lastUpdateCheckTimeRef.current;
      if (lastCheck === null) {
        setTimeUntilNextCheck(null);
        return;
      }

      const timeSinceLastCheck = now - lastCheck;
      const timeUntilNext = UPDATE_CHECK_RATE_LIMIT_MS - timeSinceLastCheck;

      if (timeUntilNext > 0) {
        setTimeUntilNextCheck(timeUntilNext);
      } else {
        setTimeUntilNextCheck(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isUpdateDropdownOpen]);

  // Check for updates when dropdown opens (with rate limit)
  const handleUpdateDropdownToggle = async () => {
    const newState = !isUpdateDropdownOpen;
    setIsUpdateDropdownOpen(newState);

    if (newState) {
      const now = Date.now();
      const lastCheck = lastUpdateCheckTimeRef.current;

      // Проверяем, прошло ли 5 минут с последней проверки
      const shouldCheck =
        lastCheck === null || now - lastCheck >= UPDATE_CHECK_RATE_LIMIT_MS;

      if (shouldCheck) {
        lastUpdateCheckTimeRef.current = now;
        const result = await window.ElectronAPI.invoke.checkForUpdates();
        if (!result.success) {
          console.error("[Update] Failed to check for updates:", result.error);
        }
      }
    }
  };

  const handleDownloadUpdate = async () => {
    const result = await window.ElectronAPI.invoke.downloadUpdate();
    if (!result.success) {
      console.error("[Update] Failed to download update:", result.error);
    }
  };

  const handleInstallUpdate = async () => {
    await window.ElectronAPI.invoke.quitAndInstall();
  };

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
        <span className="text-xs font-medium text-gray-200">ASAP</span>
        {/* Version dropdown */}
        <div
          ref={updateDropdownRef}
          className="relative"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={handleUpdateDropdownToggle}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-700/50 transition-colors text-[10px] text-gray-400 relative"
          >
            v{appVersion}
            {updateInfo && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-gray-800"></span>
            )}
            <ChevronDown
              size={10}
              className={`transition-transform ${
                isUpdateDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isUpdateDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-200 mb-2">
                  Current app version: {appVersion}
                </div>

                {isCheckingUpdate && (
                  <div className="text-xs text-gray-400 mb-2">
                    Cheching for updates...
                  </div>
                )}

                {updateInfo && !isDownloadingUpdate && !isUpdateDownloaded && (
                  <div className="mb-3">
                    <div className="text-xs text-blue-400 mb-2">
                      New version available: {updateInfo.version}
                    </div>
                    <button
                      onClick={handleDownloadUpdate}
                      className="w-full px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Upgdate
                    </button>
                  </div>
                )}

                {isDownloadingUpdate && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-2">
                      Updating...
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(downloadProgress)}%
                    </div>
                  </div>
                )}

                {isUpdateDownloaded && updateInfo && (
                  <div className="mb-3">
                    <div className="text-xs text-green-400 mb-2">
                      Update is ready to install: {updateInfo.version}
                    </div>
                    <button
                      onClick={handleInstallUpdate}
                      className="w-full px-2 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    >
                      Restart to finish update
                    </button>
                  </div>
                )}

                {!updateInfo &&
                  !isCheckingUpdate &&
                  lastUpdateCheckTimeRef.current !== null && (
                    <div className="text-xs text-gray-400">
                      The app is up to date
                    </div>
                  )}

                {!updateInfo &&
                  !isCheckingUpdate &&
                  lastUpdateCheckTimeRef.current === null && (
                    <div className="text-xs text-gray-400">
                      Click to check for updates
                    </div>
                  )}

                {!updateInfo &&
                  !isCheckingUpdate &&
                  timeUntilNextCheck !== null &&
                  timeUntilNextCheck > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Next check available in{" "}
                      {Math.ceil(timeUntilNextCheck / (60 * 1000))} minute
                      {Math.ceil(timeUntilNextCheck / (60 * 1000)) !== 1
                        ? "s"
                        : ""}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
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
