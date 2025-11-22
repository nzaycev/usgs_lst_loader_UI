import React from "react";
import { X } from "lucide-react";

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ title, onClose }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-gray-50 -webkit-app-region-drag select-none">
      <h2 className="m-0 text-base font-semibold text-gray-800 flex-1">
        {title}
      </h2>
      <button
        onClick={onClose}
        title="Close"
        className="-webkit-app-region-no-drag bg-transparent border-none cursor-pointer p-1 text-gray-600 flex items-center justify-center rounded transition-all duration-200 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
      >
        <X size={16} />
      </button>
    </div>
  );
};
