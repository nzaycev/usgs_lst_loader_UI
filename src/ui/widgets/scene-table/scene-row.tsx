import { useToast } from "@chakra-ui/react";
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  HardDrive,
  Play,
  Trash2,
} from "lucide-react";
import React from "react";
import Highlighter from "react-highlight-words";
import {
  addSceneToRepo,
  DisplayId,
  ISceneState,
  mainActions,
  watchScenesState,
} from "../../../actions/main-actions";
import { useLazyGetSceneByIdQuery } from "../../../actions/searchApi";
import { useAppDispatch, useAppSelector } from "../../app";
import { downloadManagerActions } from "../../pages/download-manager-page/download-manager-slice";
import { SceneRowExpanded } from "./scene-row-expanded";
import {
  formatBytes,
  getAggregatedProgress,
  getDownloadedSize,
  getOutputFilesSize,
  getSceneStatus,
  getTrProgressStyle,
  parseDisplayId,
  statusColors,
} from "./utils";

interface SceneRowProps {
  displayId: DisplayId;
  state: ISceneState | undefined;
  isSelected: boolean;
  isExpanded: boolean;
  isFilesExpanded: boolean;
  onSelect: () => void;
  onStartCalculation: (args: any) => void;
}

export const SceneRow: React.FC<SceneRowProps> = ({
  displayId,
  state,
  isSelected,
  isExpanded,
  isFilesExpanded,
  onSelect,
  onStartCalculation,
}) => {
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector(
    (state) => state.downloadManager.searchQuery
  );
  const toast = useToast();
  const authorized = useAppSelector((state) => state.main.authorized);
  const downloadingScenes = useAppSelector(
    (state) => state.main.downloadingScenes
  );
  const [getSceneById] = useLazyGetSceneByIdQuery();

  const sceneInfo = parseDisplayId(displayId);
  const status = getSceneStatus(state);

  // Расчет размеров
  const downloadSizes = getDownloadedSize(state);
  const outputSize = getOutputFilesSize(state);

  // Расчет прогрессов
  const downloadProgress = getAggregatedProgress(state);
  const calculationProgress =
    state?.calculations?.find((calc) => calc.status === "running")?.progress ||
    0;

  // Определение активных процессов
  const isDownloading = status === "downloading";
  const isCalculating = status === "calculating";
  const hasActiveProcess = isDownloading || isCalculating;

  // Определяем какой прогресс показывать
  const rawProgress = isCalculating
    ? calculationProgress
    : isDownloading
    ? downloadProgress
    : downloadProgress;
  const activeProgress = Math.min(Math.max(rawProgress, 0), 1);

  const handleToggleExpand = () => {
    dispatch(downloadManagerActions.toggleExpandedId(displayId));
  };

  const handleToggleFilesExpand = () => {
    dispatch(downloadManagerActions.toggleExpandedFilesId(displayId));
  };

  const handleDownload = async () => {
    if (downloadingScenes.includes(displayId)) {
      return;
    }

    if (!authorized) {
      const result = await window.ElectronAPI.invoke.openLoginDialog({
        autoLogin: true,
      });
      if (!result) {
        return;
      }
    }

    dispatch(mainActions.actions.addDownloadingScene(displayId));
    dispatch(mainActions.actions.setActionBusy(true));
    try {
      let entityId = state?.entityId;

      if (!entityId) {
        const result = await getSceneById(displayId).unwrap();
        if (result.results && result.results.length > 0) {
          entityId = result.results[0].entityId;
        } else {
          throw new Error("Scene not found in USGS database");
        }
      }

      if (entityId) {
        await dispatch(
          addSceneToRepo({
            displayId,
            entityId,
          })
        ).unwrap();
        toast({
          title: "Download started",
          description: `Starting download for ${displayId}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error("Entity ID not found");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start downloading",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      dispatch(mainActions.actions.removeDownloadingScene(displayId));
      dispatch(mainActions.actions.setActionBusy(false));
    }
  };

  return (
    <>
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      <tr
        className="border-b border-gray-700 hover:backdrop-saturate-150 transition-colors"
        style={getTrProgressStyle(
          hasActiveProcess,
          isCalculating ? "calculate" : "download",
          activeProgress
        )}
      >
        <td className="p-3 relative">
          <div className="relative">
            <button
              onClick={handleToggleExpand}
              className="text-gray-400 hover:text-gray-200"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
        <td className="p-3">
          <input type="checkbox" checked={isSelected} onChange={onSelect} />
        </td>
        <td className="p-3">
          {state?.isRepo === true ? (
            <span title="Downloaded (from repository)">
              <Cloud size={16} className="text-blue-400" />
            </span>
          ) : (
            <span title="Local (manually added)">
              <HardDrive size={16} className="text-gray-500" />
            </span>
          )}
        </td>
        <td className="p-3">
          <div className="flex flex-col">
            {state?.metadata?.displayName ? (
              <span className="text-sm font-medium">
                <Highlighter
                  highlightClassName="bg-yellow-400 text-gray-900 font-semibold"
                  searchWords={searchQuery ? [searchQuery] : []}
                  autoEscape={true}
                  textToHighlight={state.metadata.displayName}
                  caseSensitive={false}
                />
              </span>
            ) : (
              <span className="text-sm font-medium">{sceneInfo.name}</span>
            )}
            <span className="text-xs text-gray-500 font-mono">
              <Highlighter
                highlightClassName="bg-yellow-400 text-gray-900 font-semibold"
                searchWords={searchQuery ? [searchQuery] : []}
                autoEscape={true}
                textToHighlight={sceneInfo.sceneId}
                caseSensitive={false}
              />
            </span>
          </div>
        </td>
        <td className="p-3 text-sm text-gray-300">{sceneInfo.satellite}</td>
        <td className="p-3">
          <div className="flex flex-col">
            <span className="text-sm text-gray-300 font-mono">
              {sceneInfo.region}
            </span>
          </div>
        </td>
        <td className="p-3">
          <span
            className={`inline-block px-2 py-1 rounded text-xs border ${
              statusColors[status] || statusColors.error
            }`}
          >
            {status}
          </span>
        </td>
        <td className="p-3 text-sm text-gray-400">
          {sceneInfo.date.toLocaleDateString()}
        </td>
        <td className="p-3 relative">
          <div className="flex flex-col">
            <div className="text-sm text-gray-200">
              {downloadSizes.total > 0
                ? downloadSizes.downloaded < downloadSizes.total
                  ? `${formatBytes(downloadSizes.downloaded)} of ${formatBytes(
                      downloadSizes.total
                    )}`
                  : formatBytes(downloadSizes.total)
                : "—"}
            </div>
            {outputSize > 0 && (
              <div className="text-xs text-gray-500 mt-0.5">
                {formatBytes(outputSize)} output
              </div>
            )}
          </div>
        </td>
        <td className="p-3">
          <div className="flex gap-1">
            {(status === "new" || status === "downloading cancelled") &&
            state?.isRepo === true ? (
              <button
                onClick={handleDownload}
                disabled={downloadingScenes.includes(displayId)}
                className="p-1.5 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
                title="Continue download"
              >
                <Download size={16} />
              </button>
            ) : null}
            {status !== "new" &&
              status !== "downloading" &&
              status !== "calculating" &&
              status !== "downloading cancelled" && (
                <button
                  onClick={() => onStartCalculation({ displayId })}
                  className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                  title="Launch"
                >
                  <Play size={16} />
                </button>
              )}
            <button
              className="p-1.5 hover:bg-red-900 text-red-400 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && state && (
        <SceneRowExpanded
          displayId={displayId}
          state={state}
          isFilesExpanded={isFilesExpanded}
          onToggleFiles={handleToggleFilesExpand}
          onCalculationDeleted={() => {
            // Обновляем состояние после удаления
            dispatch(watchScenesState());
          }}
        />
      )}
    </>
  );
};
