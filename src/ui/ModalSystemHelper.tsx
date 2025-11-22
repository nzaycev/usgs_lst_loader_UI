import { X } from "lucide-react";
import React from "react";

interface ModalSystemHelperProps {
  title: string;
  onClose: () => void;
}

export const ModalSystemHelper: React.FC<ModalSystemHelperProps> = ({
  title,
  onClose,
}) => {
  const buttonWidth = 46;
  const titleBarHeight = 32;

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
        <span className="text-xs font-medium text-gray-200">{title}</span>
      </div>

      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          title="Close"
          className="h-full hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center"
          style={{ width: `${buttonWidth}px` }}
          onClick={onClose}
        >
          <X size={12} className="text-gray-300" />
        </button>
      </div>
    </div>
  );
};

