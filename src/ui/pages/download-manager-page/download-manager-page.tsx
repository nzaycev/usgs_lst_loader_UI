import { useToast } from "@chakra-ui/react";
import { isFulfilled } from "@reduxjs/toolkit";
import { FolderOpen } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  addExternalFolder,
  addSceneToRepo,
  mainActions,
  watchScenesState,
} from "../../../actions/main-actions";
import { useAppDispatch, useAppSelector } from "../../app";
import { SmartLaunchButton } from "../../download-manager/smart-launch-button";
import { FilterButton } from "../../widgets/filter-button/filter-button";
import { FilterPanel } from "../../widgets/filter-panel/filter-panel";
import { SceneRow } from "../../widgets/scene-table/scene-row";
import { TableHeader } from "../../widgets/scene-table/table-header";
import { SearchBar } from "../../widgets/search-bar/search-bar";
import { SortButton } from "../../widgets/sort-button/sort-button";
import { selectFilteredAndSortedScenes } from "./download-manager-selectors";

export const DownloadManagerPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { scenes, selectedIds } = useAppSelector((state) => state.main);
  const authorized = useAppSelector((state) => state.main.authorized);
  const expandedIds = useAppSelector(
    (state) => state.downloadManager.expandedIds
  );
  const expandedFilesIds = useAppSelector(
    (state) => state.downloadManager.expandedFilesIds
  );
  const isFilterPanelOpen = useAppSelector(
    (state) => state.downloadManager.isFilterPanelOpen
  );

  const filteredAndSortedScenes = useAppSelector(selectFilteredAndSortedScenes);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(watchScenesState());
  }, [dispatch]);

  const processFolderDrop = useCallback(
    async (folderPath: string) => {
      try {
        const scanResult = await window.ElectronAPI.invoke.scanFolder(
          folderPath
        );

        if (scanResult.files.length === 0) {
          toast({
            title: "No TIF files found",
            description: "The selected folder does not contain any TIF files",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        const result = await window.ElectronAPI.invoke.openMappingDialog({
          folderPath,
          files: scanResult.files,
          suggestedMapping: scanResult.suggestedMapping,
        });

        if (result) {
          const action = await dispatch(
            addExternalFolder({
              folderPath,
              fileMapping: result.fileMapping,
              metadata: result.metadata,
            })
          );

          if (isFulfilled(action)) {
            toast({
              title: "Folder added successfully",
              description: "The folder has been added to the repository",
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to add folder",
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          }
        }
      } catch (e) {
        console.error("Error processing folder drop:", e);
        toast({
          title: "Error",
          description: "Failed to process folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [dispatch, toast]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (isProcessingDrop) return;

      // Get file paths from DataTransfer
      // In Electron, File objects have a 'path' property with the full file system path
      const files = Array.from(e.dataTransfer.files);
      const paths: string[] = [];

      for (const file of files) {
        // In Electron, File objects have a 'path' property
        const fileWithPath = file as any;
        if (fileWithPath.path) {
          paths.push(fileWithPath.path);
        } else {
          // Fallback: try to get path from name (this won't work for folders from external apps)
          console.warn("File object doesn't have path property:", file);
        }
      }

      if (paths.length === 0) {
        return;
      }

      setIsProcessingDrop(true);

      try {
        // Validate that dropped items are folders
        const validation = await window.ElectronAPI.invoke.validateDroppedPaths(
          paths
        );

        if (validation.errors.length > 0) {
          toast({
            title: "Invalid drop",
            description: validation.errors.join(", "),
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          setIsProcessingDrop(false);
          return;
        }

        if (validation.folders.length === 0) {
          toast({
            title: "No folders found",
            description: "Please drop a folder, not a file",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
          setIsProcessingDrop(false);
          return;
        }

        // Process the first folder (we only support one at a time)
        const folderPath = validation.folders[0];
        await processFolderDrop(folderPath);
      } catch (error) {
        console.error("Error processing folder drop:", error);
        toast({
          title: "Error",
          description: "Failed to process dropped folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [isProcessingDrop, toast, processFolderDrop]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      dispatch(mainActions.actions.setSelectedIds(filteredAndSortedScenes));
    } else {
      dispatch(mainActions.actions.setSelectedIds([]));
    }
  };

  const handleSelect = (id: string) => {
    dispatch(mainActions.actions.toggleSelectedId(id));
  };

  const handleAddFromCatalog = async () => {
    try {
      const folderPath = await window.ElectronAPI.invoke.selectFolder();
      if (!folderPath) {
        return;
      }

      try {
        const scanResult = await window.ElectronAPI.invoke.scanFolder(
          folderPath
        );

        if (scanResult.files.length === 0) {
          toast({
            title: "No TIF files found",
            description: "The selected folder does not contain any TIF files",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        const result = await window.ElectronAPI.invoke.openMappingDialog({
          folderPath,
          files: scanResult.files,
          suggestedMapping: scanResult.suggestedMapping,
        });

        if (result) {
          const action = await dispatch(
            addExternalFolder({
              folderPath,
              fileMapping: result.fileMapping,
              metadata: result.metadata,
            })
          );

          if (isFulfilled(action)) {
            toast({
              title: "Folder added successfully",
              description: "The folder has been added to the repository",
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to add folder",
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          }
        }
      } catch (e) {
        console.error("Error scanning folder:", e);
        toast({
          title: "Error",
          description: "Failed to scan folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (e) {
      console.error("Error selecting folder:", e);
      toast({
        title: "Error",
        description: "Failed to select folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleFindInUSGS = async () => {
    if (!authorized) {
      const result = await window.ElectronAPI.invoke.openLoginDialog({
        autoLogin: true,
      });
      if (!result) {
        return;
      }
    }

    await window.ElectronAPI.invoke.openSearchSceneDialog();
  };

  const openCalculationDialog = async (displayId: string) => {
    try {
      const result = await window.ElectronAPI.invoke.openCalculationDialog({
        displayId,
      });
      // Если result === null, это означает, что расчет уже был запущен в диалоге
      if (result === null) {
        console.log(
          "[openCalculationDialog] Calculation already started in dialog, skipping calculateScene"
        );
        return;
      }
    } catch (error) {
      console.error("Error in openCalculationDialog:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to open calculation dialog",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <SearchBar />

        <SmartLaunchButton
          onAddFromCatalog={handleAddFromCatalog}
          onFindInUSGS={handleFindInUSGS}
          onStartCalculation={(displayIds) => {
            displayIds.forEach((displayId) => {
              openCalculationDialog(displayId);
            });
          }}
          onStartDownloading={async (displayIds) => {
            dispatch(mainActions.actions.setActionBusy(true));
            try {
              for (const displayId of displayIds) {
                const scene = scenes[displayId];
                if (scene && scene.entityId) {
                  await dispatch(
                    addSceneToRepo({
                      displayId,
                      entityId: scene.entityId,
                    })
                  ).unwrap();
                } else {
                  toast({
                    title: "Scene not found",
                    description: `Scene ${displayId} needs to be added first. Use "Find in USGS Explorer" to add it.`,
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                  });
                }
              }
              if (displayIds.length > 0) {
                toast({
                  title: "Download started",
                  description: `Starting download for ${displayIds.length} scene(s)`,
                  status: "success",
                  duration: 3000,
                  isClosable: true,
                });
              }
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to start downloading",
                status: "error",
                duration: 3000,
                isClosable: true,
              });
            } finally {
              dispatch(mainActions.actions.setActionBusy(false));
            }
          }}
          onStopDownloading={(displayIds) => {
            toast({
              title: "Stop Downloading",
              description: `Stopping download for ${displayIds.length} scene(s). This feature will be implemented soon.`,
              status: "info",
              duration: 3000,
              isClosable: true,
            });
          }}
          onStopCalculation={async (displayIds) => {
            dispatch(mainActions.actions.setActionBusy(true));
            try {
              for (const displayId of displayIds) {
                await window.ElectronAPI.invoke.stopCalculation(displayId);
              }
              await dispatch(watchScenesState());
              toast({
                title: "Calculation stopped",
                description: `Stopped calculation for ${displayIds.length} scene(s)`,
                status: "success",
                duration: 3000,
                isClosable: true,
              });
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to stop calculation",
                status: "error",
                duration: 3000,
                isClosable: true,
              });
            } finally {
              dispatch(mainActions.actions.setActionBusy(false));
            }
          }}
          onOpenDirectory={(displayIds) => {
            displayIds.forEach((displayId) => {
              const scene = scenes[displayId];
              if (scene) {
                window.ElectronAPI.invoke.openExplorer(displayId);
              }
            });
          }}
          onDelete={async (displayIds) => {
            dispatch(mainActions.actions.setActionBusy(true));
            try {
              for (const displayId of displayIds) {
                await window.ElectronAPI.invoke.deleteScene(displayId);
              }
              await dispatch(watchScenesState());
              dispatch(mainActions.actions.setSelectedIds([]));
              toast({
                title: "Deleted",
                description: `Deleted ${displayIds.length} scene(s)`,
                status: "success",
                duration: 3000,
                isClosable: true,
              });
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to delete scene(s)",
                status: "error",
                duration: 3000,
                isClosable: true,
              });
            } finally {
              dispatch(mainActions.actions.setActionBusy(false));
            }
          }}
        />

        <FilterButton />
        <SortButton />
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel />
        </div>
      )}

      {/* Collections Table */}
      <div
        ref={dropZoneRef}
        className={`flex-1 bg-gray-800 rounded overflow-hidden border-2 transition-all ${
          isDragOver ? "border-blue-500 bg-blue-900/20" : "border-gray-700"
        } ${isProcessingDrop ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Only hide drag over if we're leaving the drop zone
          if (
            !dropZoneRef.current?.contains(e.relatedTarget as Node) &&
            e.relatedTarget !== dropZoneRef.current
          ) {
            setIsDragOver(false);
          }
        }}
        onDrop={handleDrop}
      >
        {filteredAndSortedScenes.length === 0 && !isProcessingDrop ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <FolderOpen size={64} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                No scenes found
              </h3>
              <p className="text-gray-500 mb-4">
                Drag and drop a folder here to add it from catalog, or use the
                "Add from Catalog" button above.
              </p>
              <div className="mt-6 p-4 bg-gray-700/50 rounded border border-gray-600 border-dashed">
                <p className="text-sm text-gray-400">
                  Drop a folder containing TIF files here
                </p>
              </div>
            </div>
          </div>
        ) : isDragOver ? (
          <div className="h-full flex items-center justify-center p-8 pointer-events-none">
            <div className="text-center">
              <FolderOpen
                size={64}
                className="mx-auto mb-4 text-blue-400 animate-pulse"
              />
              <h3 className="text-xl font-semibold text-blue-400 mb-2">
                Drop folder here
              </h3>
              <p className="text-gray-300">
                Release to add folder from catalog
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <table className="w-full">
              <TableHeader
                onSelectAll={handleSelectAll}
                allSelected={
                  selectedIds.length === filteredAndSortedScenes.length &&
                  filteredAndSortedScenes.length > 0
                }
                hasItems={filteredAndSortedScenes.length > 0}
              />
              <tbody>
                {filteredAndSortedScenes.map((displayId) => {
                  const state = scenes[displayId];
                  return (
                    <SceneRow
                      key={displayId}
                      displayId={displayId}
                      state={state}
                      isSelected={selectedIds.includes(displayId)}
                      isExpanded={expandedIds.includes(displayId)}
                      isFilesExpanded={expandedFilesIds.includes(displayId)}
                      onSelect={() => handleSelect(displayId)}
                      onStartCalculation={({ displayId: id }) => {
                        openCalculationDialog(id);
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
