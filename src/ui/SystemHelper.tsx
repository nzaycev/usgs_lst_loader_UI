import { Copy, Minus, Satellite, Square, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { mainActions } from "../actions/main-actions";
import { useAppDispatch, useAppSelector } from "./app";

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

export const SystemHelper = () => {
  const [isMaximized, setIsMaximized] = useState(false);

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
      </div>

      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
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
