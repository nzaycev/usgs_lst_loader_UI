import { ChevronDown, Download, User, Wifi, WifiOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAppSelector } from "../../app";
import { NetworkState } from "../../network-test/network-state";

type UsgsApiStatus = {
  auth: "guest" | "authorizing" | "authorized";
  username?: string;
};

interface StatusBarProps {
  activeTab: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ activeTab }) => {
  const networkState = useAppSelector((state) => state.network.networkState);
  const [usgsStatus, setUsgsStatus] = useState<UsgsApiStatus | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    releaseDate: string;
  } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const updateDropdownRef = useRef<HTMLDivElement>(null);

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
        setShowUpdateDialog(false);
      }
    };

    if (showUpdateDialog) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showUpdateDialog]);

  const handleCheckForUpdates = async () => {
    const result = await window.ElectronAPI.invoke.checkForUpdates();
    if (!result.success) {
      console.error("[Update] Failed to check for updates:", result.error);
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

  const handleOpenReleaseNotes = () => {
    const { shell } = window.require("electron");
    shell.openExternal("https://github.com/nzaycev/STAGE/releases");
  };

  const getUserStatusInfo = () => {
    if (!usgsStatus) {
      return { icon: User, text: "Guest", color: "text-gray-400" };
    }
    switch (usgsStatus.auth) {
      case "guest":
        return { icon: User, text: "Guest", color: "text-gray-400" };
      case "authorizing":
        return {
          icon: User,
          text: "Authorizing...",
          color: "text-yellow-400",
        };
      case "authorized":
        return {
          icon: User,
          text: usgsStatus.username || "User",
          color: "text-blue-400",
        };
      default:
        return { icon: User, text: "Unknown", color: "text-gray-400" };
    }
  };

  const userInfo = getUserStatusInfo();
  const UserIcon = userInfo.icon;

  const getNetworkStatus = () => {
    switch (networkState) {
      case NetworkState.Stable:
        return { icon: Wifi, text: "Online", color: "text-green-500" };
      case NetworkState.Unstable:
        return { icon: WifiOff, text: "Offline", color: "text-red-500" };
      default:
        return { icon: Wifi, text: "Checking", color: "text-gray-400" };
    }
  };

  const networkInfo = getNetworkStatus();
  const NetworkIcon = networkInfo.icon;

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-3 py-1 pb-[6px] flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
      {/* Left: Mode */}
      <div className="flex items-center space-x-4">
        <span className="text-gray-200">Mode: {activeTab}</span>
      </div>

      {/* Right: Status widgets */}
      <div className="flex items-center space-x-4">
        {/* Version & Update */}
        <div ref={updateDropdownRef} className="relative">
          <button
            onClick={() => setShowUpdateDialog(!showUpdateDialog)}
            className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
            title="Version & updates"
          >
            <span>v{appVersion}</span>
            {isDownloadingUpdate || isUpdateDownloaded ? (
              <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {showUpdateDialog && (
            <div className="absolute right-0 bottom-full mb-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
              <div className="text-xs font-medium text-gray-200 px-3 py-2">
                Updates
              </div>

              {!updateInfo &&
                !isCheckingUpdate &&
                !isDownloadingUpdate &&
                !isUpdateDownloaded && (
                  <button
                    onClick={handleCheckForUpdates}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700/50 text-gray-400 flex items-center justify-between"
                  >
                    <span>Check for updates</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

              {isCheckingUpdate && (
                <div className="px-3 py-2 text-xs text-gray-400">
                  Checking for updates...
                </div>
              )}

              {updateInfo && !isDownloadingUpdate && !isUpdateDownloaded && (
                <button
                  onClick={handleDownloadUpdate}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700/50 text-gray-400 flex items-center justify-between"
                >
                  <span>Download update</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}

              {isDownloadingUpdate && (
                <div className="px-3 py-2">
                  <div className="text-xs text-gray-400 mb-2">
                    Downloading update...
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {isUpdateDownloaded && updateInfo && (
                <button
                  onClick={handleInstallUpdate}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700/50 text-gray-400"
                >
                  Restart to update
                </button>
              )}

              <button
                onClick={handleOpenReleaseNotes}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700/50 text-gray-400"
              >
                Release notes
              </button>

              <div className="border-t border-gray-700 my-1" />
              <div className="px-3 py-2 text-xs text-gray-400">
                Current: v{appVersion}
              </div>
            </div>
          )}
        </div>

        {/* Network Status */}
        <button
          onClick={async () => {
            await window.ElectronAPI.invoke.openSettingsDialog();
          }}
          className={`px-2 py-1 rounded hover:bg-gray-700/50 transition-colors flex items-center space-x-1.5 ${networkInfo.color}`}
          title="Network Settings"
        >
          <NetworkIcon className="w-3.5 h-3.5" />
          <span className="text-xs">{networkInfo.text}</span>
        </button>

        {/* User Status */}
        {usgsStatus && (
          <button
            onClick={async () => {
              await window.ElectronAPI.invoke.openLoginDialog({
                autoLogin: false,
              });
            }}
            className={`px-2 py-1 rounded flex items-center space-x-1.5 hover:bg-gray-700/50 transition-colors ${userInfo.color}`}
            title="USGS Authentication"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="text-xs">{userInfo.text}</span>
          </button>
        )}
      </div>
    </div>
  );
};
