import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { ICalculationResult, ISceneState } from "../../../actions/main-actions";
import {
  getLayerFilePath,
  handleDragDirectory,
  handleDragFile,
  handleOpenDirectory,
  handleOpenFile,
} from "./file-handlers";
import { getFilesProgress } from "./utils";

interface SceneRowExpandedProps {
  displayId: string;
  state: ISceneState;
  isFilesExpanded: boolean;
  onToggleFiles: () => void;
  onCalculationDeleted?: () => void;
}

export const SceneRowExpanded: React.FC<SceneRowExpandedProps> = ({
  displayId,
  state,
  isFilesExpanded,
  onToggleFiles,
  onCalculationDeleted,
}) => {
  const hasFiles = state && Object.keys(state.donwloadedFiles).length > 0;
  const [expandedCalculations, setExpandedCalculations] = useState<Set<number>>(
    new Set()
  );
  const [resultsFiles, setResultsFiles] = useState<Record<number, string[]>>(
    {}
  );

  const handleToggleCalculationResults = async (
    calcIdx: number,
    calc: ICalculationResult
  ) => {
    if (expandedCalculations.has(calcIdx)) {
      // Сворачиваем
      setExpandedCalculations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(calcIdx);
        return newSet;
      });
    } else {
      // Разворачиваем и загружаем файлы
      if (
        calc.status === "completed" &&
        calc.resultsPath &&
        calc.parameters.outLayers
      ) {
        try {
          const files = await window.ElectronAPI.invoke.getResultsFiles(
            calc.resultsPath,
            calc.parameters.outLayers
          );
          setResultsFiles((prev) => ({
            ...prev,
            [calcIdx]: files,
          }));
        } catch (error) {
          console.error("Error loading results files:", error);
        }
      }
      setExpandedCalculations((prev) => new Set(prev).add(calcIdx));
    }
  };

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
                    ([layer, file]) => {
                      const hasMapping = !!file.filePath;
                      const layerFilePath = getLayerFilePath(
                        displayId,
                        layer,
                        state.scenePath,
                        state.isRepo ?? true,
                        file.filePath
                      );
                      const canInteract =
                        hasMapping || (state.isRepo && file.progress === 1);

                      return (
                        <div
                          key={layer}
                          className="flex items-center gap-3 text-xs"
                        >
                          {canInteract && layerFilePath ? (
                            <button
                              draggable
                              onDragStart={(e) => {
                                e.preventDefault();
                                try {
                                  handleDragFile(layerFilePath);
                                } catch (error) {
                                  console.error("Error starting drag:", error);
                                }
                              }}
                              onClick={() => {
                                handleOpenFile(layerFilePath);
                              }}
                              className="text-gray-400 w-32 font-mono text-left hover:text-blue-400 underline transition-colors cursor-grab active:cursor-grabbing"
                              title="Click to open file, drag to copy"
                            >
                              {layer}
                            </button>
                          ) : (
                            <span className="text-gray-400 w-32 font-mono">
                              {layer}
                            </span>
                          )}
                          {state.isRepo === false ? (
                            // Для !isRepo показываем статус маппинга
                            <div className="flex-1 flex items-center gap-2">
                              {hasMapping ? (
                                <>
                                  <span className="text-green-400">✓</span>
                                  <span className="text-gray-500 text-[10px] font-mono truncate">
                                    {file.filePath}
                                  </span>
                                </>
                              ) : (
                                <span className="text-orange-400">
                                  ✗ Not mapped
                                </span>
                              )}
                            </div>
                          ) : (
                            // Для isRepo показываем прогресс загрузки
                            <>
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
                            </>
                          )}
                        </div>
                      );
                    }
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
                  className="space-y-1.5 p-2 bg-gray-800 rounded border border-gray-700"
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
                    <div className="flex items-center gap-2">
                      {calc.endTime && (
                        <span className="text-xs text-gray-500">
                          {new Date(calc.endTime).toLocaleString()}
                        </span>
                      )}
                      {calc.status === "completed" && (
                        <div className="flex items-center gap-2">
                          <CalculationInfoTooltip calc={calc} />
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this calculation result? This will delete the output directory and cannot be undone."
                                )
                              ) {
                                try {
                                  await window.ElectronAPI.invoke.deleteCalculation(
                                    displayId,
                                    idx
                                  );
                                  onCalculationDeleted?.();
                                } catch (error) {
                                  console.error(
                                    "Error deleting calculation:",
                                    error
                                  );
                                  alert(
                                    `Failed to delete calculation: ${error}`
                                  );
                                }
                              }
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors flex items-center justify-center"
                            title="Delete calculation result"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
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
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="flex items-center gap-2 text-xs overflow-hidden">
                        <span className="text-gray-400">Results:</span>
                        <button
                          draggable
                          onDragStart={(e) => {
                            e.preventDefault();
                            try {
                              handleDragDirectory(calc.resultsPath);
                            } catch (error) {
                              console.error("Error starting drag:", error);
                            }
                          }}
                          onClick={() => {
                            handleOpenDirectory(calc.resultsPath);
                          }}
                          className="text-blue-400 hover:text-blue-300 underline transition-colors font-mono cursor-grab active:cursor-grabbing whitespace-nowrap text-ellipsis overflow-hidden"
                          title="Drag to copy all files or click to open directory"
                        >
                          {calc.resultsPath}
                        </button>
                        <button
                          onClick={() =>
                            handleToggleCalculationResults(idx, calc)
                          }
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {expandedCalculations.has(idx) ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                          <span>Files</span>
                        </button>
                      </div>
                      {expandedCalculations.has(idx) && resultsFiles[idx] && (
                        <div className="ml-6 space-y-1">
                          {resultsFiles[idx].map((filePath, fileIdx) => {
                            const fileName =
                              filePath.split(/[/\\]/).pop() || filePath;
                            return (
                              <div
                                key={fileIdx}
                                className="flex items-center gap-2 text-xs"
                              >
                                <button
                                  draggable
                                  onDragStart={(e) => {
                                    e.preventDefault();
                                    try {
                                      handleDragFile(filePath);
                                    } catch (error) {
                                      console.error(
                                        "Error starting drag:",
                                        error
                                      );
                                    }
                                  }}
                                  onClick={() => {
                                    handleOpenFile(filePath);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 underline transition-colors font-mono cursor-grab active:cursor-grabbing truncate"
                                  title="Click to open file, drag to copy"
                                >
                                  {fileName}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

const CalculationInfoTooltip: React.FC<{ calc: ICalculationResult }> = ({
  calc,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatCalculationInfo = (calc: ICalculationResult): string => {
    const lines: string[] = [];
    lines.push(`Status: ${calc.status}`);
    lines.push(`Start Time: ${new Date(calc.startTime).toLocaleString()}`);
    if (calc.endTime) {
      lines.push(`End Time: ${new Date(calc.endTime).toLocaleString()}`);
    }
    if (calc.progress !== undefined) {
      lines.push(`Progress: ${Math.round(calc.progress * 100)}%`);
    }
    if (calc.stage) {
      lines.push(`Stage: ${calc.stage}`);
    }
    if (calc.pid) {
      lines.push(`Process ID: ${calc.pid}`);
    }
    if (calc.exitCode !== undefined) {
      lines.push(`Exit Code: ${calc.exitCode}`);
    }
    if (calc.outputSize !== undefined) {
      const sizeMB = (calc.outputSize / 1024 / 1024).toFixed(2);
      lines.push(`Output Size: ${sizeMB} MB`);
    }
    lines.push("");
    lines.push("Parameters:");
    if (calc.parameters.useQAMask) {
      lines.push("  • Use QA Mask: Yes");
    }
    if (calc.parameters.emission !== undefined) {
      lines.push(`  • Emission: ${calc.parameters.emission}`);
    }
    if (calc.parameters.emissionCalcMethod) {
      lines.push(`  • Emission Method: ${calc.parameters.emissionCalcMethod}`);
    }
    if (calc.parameters.saveDirectory) {
      lines.push(`  • Save Directory: ${calc.parameters.saveDirectory}`);
    }
    if (calc.parameters.layerNamePattern) {
      lines.push(`  • Layer Pattern: ${calc.parameters.layerNamePattern}`);
    }
    if (calc.parameters.outLayers) {
      const enabledLayers = Object.entries(calc.parameters.outLayers)
        .filter(([, enabled]) => enabled)
        .map(([layer]) => layer);
      if (enabledLayers.length > 0) {
        lines.push(`  • Output Layers: ${enabledLayers.join(", ")}`);
      }
    }
    lines.push("");
    lines.push(`Results Path: ${calc.resultsPath}`);
    if (calc.error) {
      lines.push("");
      lines.push(`Error: ${calc.error}`);
    }
    return lines.join("\n");
  };

  return (
    <div className="relative flex items-center">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-400 hover:text-gray-300 transition-colors"
        title="Calculation details"
      >
        <Info size={14} />
      </button>
      {showTooltip && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-80 p-3 bg-gray-900 border border-gray-700 rounded shadow-lg text-xs text-gray-300 whitespace-pre-wrap break-words">
          {formatCalculationInfo(calc)}
        </div>
      )}
    </div>
  );
};
