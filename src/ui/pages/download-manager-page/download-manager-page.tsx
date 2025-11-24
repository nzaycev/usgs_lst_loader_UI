import { useToast } from "@chakra-ui/react";
import { isFulfilled } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
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

  useEffect(() => {
    dispatch(watchScenesState());
  }, [dispatch]);

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
      <div className="flex-1 bg-gray-800 rounded overflow-hidden border border-gray-700">
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
      </div>
    </div>
  );
};
