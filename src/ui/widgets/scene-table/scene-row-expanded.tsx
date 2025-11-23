import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
import { ISceneState } from "../../../actions/main-actions";
import { getFilesProgress } from "./utils";

interface SceneRowExpandedProps {
  displayId: string;
  state: ISceneState;
  isFilesExpanded: boolean;
  onToggleFiles: () => void;
}

export const SceneRowExpanded: React.FC<SceneRowExpandedProps> = ({
  state,
  isFilesExpanded,
  onToggleFiles,
}) => {
  const hasFiles = state && Object.keys(state.donwloadedFiles).length > 0;

  return (
    <tr className="bg-gray-850 border-b border-gray-700">
      <td colSpan={10} className="p-0">
        <div className="px-12 py-3 space-y-4">
          {/* Downloaded Files - Collapsed View */}
          {hasFiles && (
            <div className="space-y-1.5">
              <button
                onClick={onToggleFiles}
                className="flex items-center gap-2 text-xs text-gray-400 font-medium hover:text-gray-300 transition-colors"
              >
                {isFilesExpanded ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                <span>Downloaded Files</span>
                {!isFilesExpanded && (
                  <span className="text-gray-500">
                    ({Math.round(getFilesProgress(state))}%)
                  </span>
                )}
              </button>

              {isFilesExpanded && (
                <div className="ml-6 space-y-1.5">
                  {Object.entries(state.donwloadedFiles).map(
                    ([layer, file]) => (
                      <div
                        key={layer}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="text-gray-400 w-32 font-mono">
                          {layer}
                        </span>
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{
                              width: `${(file.progress || 0) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-gray-500 w-12 text-right">
                          {Math.round((file.progress || 0) * 100)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Calculations */}
          {state.calculations && state.calculations.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-medium">
                Calculations:
              </div>
              {state.calculations.map((calc, idx) => (
                <div
                  key={idx}
                  className="ml-6 space-y-1.5 p-2 bg-gray-800 rounded border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300">
                        {new Date(calc.startTime).toLocaleString()}
                      </span>
                      {calc.status === "error" && (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertCircle size={12} />
                          Error
                        </span>
                      )}
                      {calc.status === "running" && (
                        <span className="text-xs text-purple-400">Running</span>
                      )}
                      {calc.status === "completed" && (
                        <span className="text-xs text-green-400">
                          Completed
                        </span>
                      )}
                    </div>
                    {calc.endTime && (
                      <span className="text-xs text-gray-500">
                        {new Date(calc.endTime).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {calc.status === "running" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          {calc.stage ?? "Starting..."}
                        </span>
                        <span className="text-gray-400">
                          {Math.round((calc.progress ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{
                            width: `${(calc.progress ?? 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {calc.status === "error" && calc.error && (
                    <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 p-2 rounded">
                      <div className="whitespace-pre-wrap break-words">
                        {calc.error}
                      </div>
                      {calc.exitCode !== undefined && (
                        <div className="text-gray-500 mt-1">
                          Exit code: {calc.exitCode}
                        </div>
                      )}
                    </div>
                  )}

                  {calc.status === "completed" && (
                    <div className="text-xs text-gray-400">
                      Results: {calc.resultsPath}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
