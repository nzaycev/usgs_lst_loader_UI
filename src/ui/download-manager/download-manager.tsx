import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  Select,
  SimpleGrid,
  Switch,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { isFulfilled } from "@reduxjs/toolkit";
import { noop } from "lodash";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  Filter,
  HardDrive,
  Play,
  Search,
  Trash2,
} from "lucide-react";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  addExternalFolder,
  addSceneToRepo,
  calculateScene,
  EmissionCalcMethod,
  ISceneState,
  mainActions,
  RunArgs,
  USGSLayerType,
  watchScenesState,
} from "../../actions/main-actions";
import { useLazyGetSceneByIdQuery } from "../../actions/searchApi";
import { SettingsChema } from "../../main/settings-store";
import { useAppDispatch, useAppSelector } from "../app";
import { useTypedNavigate } from "../mainWindow";
import { SmartLaunchButton } from "./smart-launch-button";

// SceneStateView removed - now using table view

function getTrProgressStyle(
  active: boolean,
  type: "download" | "calculate",
  progress: number
) {
  if (!active && type === "download") {
    return {
      background: `linear-gradient(90deg,transparent 0%, transparent ${
        progress * 100
      }%, rgb(44 50 58) ${progress * 100}%, rgb(44 50 58) 100%)`,
    };
  }
  const bgColor = type === "calculate" ? [69, 34, 197] : [34, 197, 94];
  if (active && progress === 0) {
    return {
      background: `linear-gradient(90deg, rgba(${bgColor.join(
        ", "
      )}, 0.1) 0%, rgba(${bgColor.join(", ")}, 0.05) 50%, transparent 100%)`,
      backgroundSize: "200% 100%",
      animation: "gradient-shift 2s ease-in-out infinite",
    };
  }
  if (active) {
    return {
      background: `linear-gradient(90deg, rgba(${bgColor.join(
        ", "
      )}, 0.1) 0%, rgba(${bgColor.join(", ")}, 0.1) ${
        progress * 100
      }%, transparent ${progress * 100}%, transparent 100%)`,
    };
  }
  return {};
}

type OnStartFunction = (args: RunArgs) => void;
type OpenDialogFunction = (args: { onStart: OnStartFunction }) => void;

const useFormState = () => {
  const [initialFormState, setInitialFormState] = useState<
    RunArgs | undefined
  >();
  const [formState, setFormState] = useState<RunArgs | null>(null);

  const saveFormState = (value: RunArgs) => {
    window.ElectronAPI.invoke.saveCalculationSettings({ args: value });
  };
  useEffect(() => {
    if (formState) {
      saveFormState(formState);
    }
  }, [formState]);
  useEffect(() => {
    (async () => {
      const initialState = (await window.ElectronAPI.invoke.getStoreValue(
        "calculationSettings"
      )) as SettingsChema["calculationSettings"];
      console.log("get", initialState);
      setFormState(initialState);
      setInitialFormState(initialState);
    })();
  }, []);
  return [formState, setFormState, initialFormState] as const;
};

const ConfirmDialog = ({
  children,
}: {
  children: (props: { ask: OpenDialogFunction }) => ReactNode;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [formState, setFormState] = useFormState();

  const [onStart, setOnStart] = useState<OnStartFunction>(noop);

  const openNewDialog: OpenDialogFunction = ({ onStart }) => {
    if (!formState) {
      console.warn("Form state not loaded yet");
      return;
    }
    setFormState(formState);
    onOpen();
    setOnStart(() => onStart);
  };

  return (
    <>
      {children({
        ask: openNewDialog,
      })}
      {formState && (
        <AlertDialog
          isOpen={isOpen}
          leastDestructiveRef={cancelRef}
          onClose={onClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Preparing for calculation
              </AlertDialogHeader>

              <AlertDialogBody>
                <FormControl as={SimpleGrid} columns={{ base: 2 }}>
                  <FormLabel>Enable QA mask?</FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.useQAMask}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        useQAMask: !formState.useQAMask,
                      }))
                    }
                  />
                </FormControl>
                <FormControl as={SimpleGrid} columns={{ base: 2 }}>
                  <FormLabel>Custom emission value:</FormLabel>
                  <Input
                    placeholder="default"
                    value={formState.emission}
                    type="number"
                    size={"xs"}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        emission:
                          e.target.value !== ""
                            ? parseFloat(e.target.value)
                            : undefined,
                      }))
                    }
                  />
                </FormControl>
                <FormLabel>Layers to be saved on finish:</FormLabel>
                <FormControl
                  as={SimpleGrid}
                  columns={{ base: 4 }}
                  alignItems={"center"}
                  spacing={1}
                >
                  <FormLabel color="gray.400" margin={0}>
                    LST:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.LST}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          LST: !prev.outLayers.LST,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    NDVI:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.NDVI}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          NDVI: !prev.outLayers.NDVI,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    Emission:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.Emission}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          Emission: !prev.outLayers.Emission,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    BT:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.BT}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          BT: !prev.outLayers.BT,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    VegProp:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.VegProp}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          VegProp: !prev.outLayers.VegProp,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    Radiance:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.Radiance}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          Radiance: !prev.outLayers.Radiance,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    SurfRad:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.SurfRad}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          SurfRad: !prev.outLayers.SurfRad,
                        },
                      }))
                    }
                  />
                  <FormLabel color="gray.400" margin={0}>
                    NDMI:
                  </FormLabel>
                  <Switch
                    size={"sm"}
                    isChecked={formState.outLayers.NDMI}
                    onChange={() =>
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          ...prev.outLayers,
                          NDMI: !prev.outLayers.NDMI,
                        },
                      }))
                    }
                  />
                  <Select
                    defaultValue={EmissionCalcMethod.ndmi}
                    size="xs"
                    gridColumn={"1/3"}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        emissionCalcMethod: e.target
                          .value as EmissionCalcMethod,
                      }))
                    }
                  >
                    <option value={EmissionCalcMethod.log}>
                      {EmissionCalcMethod.log}
                    </option>
                    <option value={EmissionCalcMethod.logDiapasons}>
                      {EmissionCalcMethod.logDiapasons}
                    </option>
                    <option value={EmissionCalcMethod.ndmi}>
                      {EmissionCalcMethod.ndmi}
                    </option>
                    <option value={EmissionCalcMethod.vegProp}>
                      {EmissionCalcMethod.vegProp}
                    </option>
                  </Select>
                  <Link
                    as="button"
                    onClick={() => {
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          BT: true,
                          Emission: true,
                          LST: true,
                          NDVI: true,
                          NDMI: true,
                          Radiance: true,
                          SurfRad: true,
                          VegProp: true,
                        },
                      }));
                    }}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    select all
                  </Link>
                  <Link
                    as="button"
                    onClick={() => {
                      setFormState((prev) => ({
                        ...prev,
                        outLayers: {
                          BT: false,
                          Emission: false,
                          LST: false,
                          NDVI: false,
                          NDMI: false,
                          Radiance: false,
                          SurfRad: false,
                          VegProp: false,
                        },
                      }));
                    }}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    deselect all
                  </Link>
                </FormControl>
                <FormControl
                  as={SimpleGrid}
                  marginTop={1}
                  columns={{ base: 2 }}
                >
                  <FormLabel>Save directory</FormLabel>
                  <Input
                    placeholder="./out_{date}-{args}"
                    value={formState.saveDirectory}
                    size={"xs"}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        saveDirectory: e.target.value || undefined,
                      }))
                    }
                  />
                  <FormLabel>Layername pattern</FormLabel>
                  <Input
                    placeholder="{name}"
                    value={formState.layerNamePattern}
                    size={"xs"}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        layerNamePattern: e.target.value || undefined,
                      }))
                    }
                  />
                </FormControl>
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="green"
                  onClick={() => {
                    onClose();
                    onStart(formState);
                  }}
                  ml={3}
                >
                  Run
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      )}
    </>
  );
};

export const DownloadManager = () => {
  try {
    const { scenes, selectedIds } = useAppSelector((state) => state.main);
    const dispatch = useAppDispatch();
    const navigate = useTypedNavigate();
    const [initialFormState] = useFormState();
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [expandedFilesIds, setExpandedFilesIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const toast = useToast();
    const authorized = useAppSelector((state) => state.main.authorized);
    const downloadingScenes = useAppSelector(
      (state) => state.main.downloadingScenes
    );
    const [getSceneById] = useLazyGetSceneByIdQuery();

    useEffect(() => {
      dispatch(watchScenesState());
    }, [dispatch]);

    const filteredScenes = useMemo(() => {
      if (!searchQuery) return Object.keys(scenes);
      return Object.keys(scenes).filter((displayId) =>
        displayId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [scenes, searchQuery]);

    if (!initialFormState) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-200">
          <div className="text-center">
            <div className="text-lg mb-2">Loading...</div>
            <div className="text-sm text-gray-400">
              Initializing application
            </div>
          </div>
        </div>
      );
    }

    const statusColors: Record<string, string> = {
      new: "bg-gray-700 text-gray-300 border-gray-600",
      downloading: "bg-yellow-900 text-yellow-300 border-yellow-700",
      "downloading cancelled":
        "bg-orange-900 text-orange-300 border-orange-700",
      downloaded: "bg-blue-900 text-blue-300 border-blue-700",
      calculating: "bg-purple-900 text-purple-300 border-purple-700",
      "calculation error": "bg-red-900 text-red-300 border-red-700",
      calculated: "bg-green-900 text-green-300 border-green-700",
      processing: "bg-blue-900 text-blue-300 border-blue-700",
      error: "bg-red-900 text-red-300 border-red-700",
    };

    // Helper для вычисления общего прогресса загрузки файлов
    const getFilesProgress = (state: ISceneState | undefined): number => {
      if (!state) return 0;
      const files = Object.values(state.donwloadedFiles);
      if (files.length === 0) return 0;
      const totalProgress = files.reduce(
        (sum, file) => sum + (file.progress || 0),
        0
      );
      return (totalProgress / files.length) * 100;
    };

    // Helper для форматирования размера в читаемый формат
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    // Helper для расчета размера загруженных файлов
    const getDownloadedSize = (
      state: ISceneState | undefined
    ): {
      downloaded: number;
      total: number;
    } => {
      if (!state) return { downloaded: 0, total: 0 };

      let downloaded = 0;
      let total = 0;

      Object.values(state.donwloadedFiles).forEach((file) => {
        if (file.size) {
          total += file.size;
          downloaded += file.size * (file.progress || 0);
        }
      });

      return { downloaded, total };
    };

    // Helper для расчета размера выходных файлов
    const getOutputFilesSize = (state: ISceneState | undefined): number => {
      if (!state || !state.calculations) return 0;

      // Суммируем размеры всех завершенных расчетов
      return state.calculations.reduce((total, calc) => {
        if (calc.status === "completed" && calc.outputSize) {
          return total + calc.outputSize;
        }
        return total;
      }, 0);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        dispatch(mainActions.actions.setSelectedIds(Object.keys(scenes)));
      } else {
        dispatch(mainActions.actions.setSelectedIds([]));
      }
    };

    const handleSelect = (id: string) => {
      dispatch(mainActions.actions.toggleSelectedId(id));
    };

    const toggleExpand = (id: string) => {
      setExpandedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    };

    const toggleFilesExpand = (id: string) => {
      setExpandedFilesIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    };

    const handleAddFromCatalog = async () => {
      try {
        const folderPath = await window.ElectronAPI.invoke.selectFolder();
        if (!folderPath) {
          return;
        }

        try {
          // Сканируем папку для получения списка файлов
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

          // Открываем модальное окно Electron
          const result = await window.ElectronAPI.invoke.openMappingDialog({
            folderPath,
            files: scanResult.files,
            suggestedMapping: scanResult.suggestedMapping,
          });

          if (result) {
            // Сохраняем результат
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
      if (authorized) {
        navigate("/bounds");
      } else {
        // Open login dialog
        const result = await window.ElectronAPI.invoke.openLoginDialog({
          autoLogin: true,
        });
        if (result) {
          // После успешной авторизации делаем редирект вручную
          navigate("/bounds");
        }
      }
    };

    const getSceneStatus = (state: ISceneState | undefined): string => {
      if (!state) return "error";
      // Статус определяется в main process, просто возвращаем его
      return state.status || "new";
    };

    const parseDisplayId = (displayId: string) => {
      const segments = displayId.split("_");
      if (segments.length < 4)
        return {
          name: displayId,
          sceneId: displayId,
          satellite: "Unknown",
          region: "",
          date: "",
        };
      const landsatId =
        segments[0] === "LC08"
          ? "Landsat 8"
          : segments[0] === "LC09"
          ? "Landsat 9"
          : segments[0];
      const date = new Date(
        parseInt(segments[3].slice(0, 4)),
        parseInt(segments[3].slice(4, 6)) - 1,
        parseInt(segments[3].slice(6))
      );
      const region = segments[2];
      return {
        name: displayId,
        sceneId: displayId,
        satellite: landsatId,
        region: region,
        date: date.toLocaleDateString(),
      };
    };

    return (
      <ConfirmDialog>
        {({ ask }) => (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {/* Toolbar */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 text-gray-200 pl-10 pr-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <SmartLaunchButton
                onAddFromCatalog={handleAddFromCatalog}
                onFindInUSGS={handleFindInUSGS}
                onStartCalculation={(displayIds) => {
                  displayIds.forEach((displayId) => {
                    ask({
                      onStart: async (args) => {
                        const action = await dispatch(
                          calculateScene({ displayId, args })
                        );
                        if (isFulfilled(action)) {
                          toast({
                            title: "The scene calculation was started",
                            position: "bottom-left",
                            description: `If the process fall, run it manually by [> ${action.payload}]`,
                            duration: 5000,
                            isClosable: true,
                          });
                        }
                      },
                    });
                  });
                }}
                onStartDownloading={async (displayIds) => {
                  dispatch(mainActions.actions.setActionBusy(true));
                  try {
                    for (const displayId of displayIds) {
                      const scene = scenes[displayId];
                      if (scene && scene.entityId) {
                        // Сцена уже в репозитории, начинаем загрузку
                        await dispatch(
                          addSceneToRepo({
                            displayId,
                            entityId: scene.entityId,
                          })
                        ).unwrap();
                      } else {
                        // Новая сцена - нужно найти через поиск
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
                  // TODO: Implement stop downloading - нужно добавить IPC метод для остановки загрузки
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
                      await window.ElectronAPI.invoke.stopCalculation(
                        displayId
                      );
                    }
                    // Обновляем состояние после остановки
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
                    // Обновляем состояние после удаления
                    await dispatch(watchScenesState());
                    // Очищаем выделение
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

              <button className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors border border-gray-700">
                <Filter size={18} />
              </button>
            </div>

            {/* Collections Table */}
            <div className="flex-1 bg-gray-800 rounded overflow-hidden border border-gray-700">
              <div className="overflow-auto h-full">
                <table className="w-full">
                  <thead className="bg-gray-900 sticky top-0 z-10">
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                      <th></th>

                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            selectedIds.length === filteredScenes.length &&
                            filteredScenes.length > 0
                          }
                        />
                      </th>
                      <th></th>
                      <th className="p-3">Name / Scene ID</th>
                      <th className="p-3">Satellite</th>
                      <th className="p-3">Region</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScenes.map((displayId) => {
                      const state = scenes[displayId];
                      const sceneInfo = parseDisplayId(displayId);
                      const status = getSceneStatus(state);
                      const hasFiles =
                        state && Object.keys(state.donwloadedFiles).length > 0;

                      // Расчет размеров
                      const downloadSizes = getDownloadedSize(state);
                      const outputSize = getOutputFilesSize(state);

                      // Расчет прогрессов
                      const downloadProgress = getAggregatedProgress(state);
                      const calculationProgress =
                        state?.calculations?.find(
                          (calc) => calc.status === "running"
                        )?.progress || 0;

                      // Определение активных процессов
                      const isDownloading = status === "downloading";
                      const isCalculating = status === "calculating";
                      const hasActiveProcess = isDownloading || isCalculating;

                      // Определяем какой прогресс показывать
                      // Ограничиваем прогресс до 100%, чтобы избежать overflow
                      const rawProgress = isCalculating
                        ? calculationProgress
                        : isDownloading
                        ? downloadProgress
                        : downloadProgress; // Если нет активного процесса, показываем прогресс загрузки
                      const activeProgress = Math.min(
                        Math.max(rawProgress, 0),
                        1
                      );

                      // Анимация градиента для нулевого прогресса

                      return (
                        <React.Fragment key={displayId}>
                          <tr
                            className="border-b border-gray-700 hover:backdrop-saturate-150 transition-colors"
                            style={getTrProgressStyle(
                              hasActiveProcess,
                              isCalculating ? "calculate" : "download",
                              activeProgress
                            )}
                          >
                            <style>{`
                              @keyframes gradient-shift {
                                0%, 100% { background-position: 0% 50%; }
                                50% { background-position: 100% 50%; }
                              }
                            `}</style>
                            {/* Визуальный прогресс-бар - используем первую ячейку с псевдоэлементом, который растягивается на всю строку */}
                            <td className="p-3 relative">
                              <div className="relative">
                                <button
                                  onClick={() => toggleExpand(displayId)}
                                  className="text-gray-400 hover:text-gray-200"
                                >
                                  {expandedIds.includes(displayId) ? (
                                    <ChevronUp size={16} />
                                  ) : (
                                    <ChevronDown size={16} />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(displayId)}
                                onChange={() => handleSelect(displayId)}
                              />
                            </td>
                            <td className="p-3">
                              {state?.isRepo ? (
                                <span title="Local source">
                                  <HardDrive
                                    size={16}
                                    className="text-gray-500"
                                  />
                                </span>
                              ) : (
                                <span title="Online source">
                                  <Cloud size={16} className="text-blue-400" />
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {sceneInfo.name}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {sceneInfo.sceneId}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-300">
                              {sceneInfo.satellite}
                            </td>
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
                              {sceneInfo.date}
                            </td>
                            <td className="p-3 relative">
                              <div className="flex flex-col">
                                <div className="text-sm text-gray-200">
                                  {downloadSizes.total > 0
                                    ? downloadSizes.downloaded <
                                      downloadSizes.total
                                      ? `${formatBytes(
                                          downloadSizes.downloaded
                                        )} of ${formatBytes(
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
                                {status === "new" ||
                                status === "downloading cancelled" ? (
                                  <button
                                    onClick={async () => {
                                      // Проверка, не идет ли уже загрузка
                                      if (
                                        downloadingScenes.includes(displayId)
                                      ) {
                                        return;
                                      }

                                      // Проверка авторизации (показываем диалог, если не авторизован)
                                      if (!authorized) {
                                        const result =
                                          await window.ElectronAPI.invoke.openLoginDialog(
                                            {
                                              autoLogin: true,
                                            }
                                          );
                                        if (!result) {
                                          // Пользователь отменил авторизацию
                                          return;
                                        }
                                        // После успешной авторизации состояние обновится автоматически
                                      }

                                      // Добавляем в список загружающихся сцен
                                      dispatch(
                                        mainActions.actions.addDownloadingScene(
                                          displayId
                                        )
                                      );

                                      dispatch(
                                        mainActions.actions.setActionBusy(true)
                                      );
                                      try {
                                        let entityId = state?.entityId;

                                        // Если нет entityId, получаем его через getSceneById
                                        if (!entityId) {
                                          const result = await getSceneById(
                                            displayId
                                          ).unwrap();
                                          if (
                                            result.results &&
                                            result.results.length > 0
                                          ) {
                                            entityId =
                                              result.results[0].entityId;
                                          } else {
                                            throw new Error(
                                              "Scene not found in USGS database"
                                            );
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
                                          throw new Error(
                                            "Entity ID not found"
                                          );
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
                                        // Удаляем из списка загружающихся сцен
                                        dispatch(
                                          mainActions.actions.removeDownloadingScene(
                                            displayId
                                          )
                                        );
                                        dispatch(
                                          mainActions.actions.setActionBusy(
                                            false
                                          )
                                        );
                                      }
                                    }}
                                    disabled={downloadingScenes.includes(
                                      displayId
                                    )}
                                    className="p-1.5 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
                                    title="Continue download"
                                  >
                                    <Download size={16} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      ask({
                                        onStart: async (args) => {
                                          const action = await dispatch(
                                            calculateScene({ displayId, args })
                                          );
                                          if (isFulfilled(action)) {
                                            toast({
                                              title:
                                                "The scene calculation was started",
                                              position: "bottom-left",
                                              description: `If the process fall, run it manually by [> ${action.payload}]`,
                                              duration: 5000,
                                              isClosable: true,
                                            });
                                          }
                                        },
                                      })
                                    }
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

                          {/* Expanded Details */}
                          {expandedIds.includes(displayId) && state && (
                            <tr className="bg-gray-850 border-b border-gray-700">
                              <td colSpan={10} className="p-0">
                                <div className="px-12 py-3 space-y-4">
                                  {/* Downloaded Files - Collapsed View */}
                                  {hasFiles && (
                                    <div className="space-y-1.5">
                                      <button
                                        onClick={() =>
                                          toggleFilesExpand(displayId)
                                        }
                                        className="flex items-center gap-2 text-xs text-gray-400 font-medium hover:text-gray-300 transition-colors"
                                      >
                                        {expandedFilesIds.includes(
                                          displayId
                                        ) ? (
                                          <ChevronUp size={14} />
                                        ) : (
                                          <ChevronDown size={14} />
                                        )}
                                        <span>Downloaded Files</span>
                                        {!expandedFilesIds.includes(
                                          displayId
                                        ) && (
                                          <span className="text-gray-500">
                                            (
                                            {Math.round(
                                              getFilesProgress(state)
                                            )}
                                            %)
                                          </span>
                                        )}
                                      </button>

                                      {expandedFilesIds.includes(displayId) && (
                                        <div className="ml-6 space-y-1.5">
                                          {Object.entries(
                                            state.donwloadedFiles
                                          ).map(([layer, file]) => (
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
                                                    width: `${
                                                      (file.progress || 0) * 100
                                                    }%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="text-gray-500 w-12 text-right">
                                                {Math.round(
                                                  (file.progress || 0) * 100
                                                )}
                                                %
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Calculations */}
                                  {state.calculations &&
                                    state.calculations.length > 0 && (
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
                                                  {new Date(
                                                    calc.startTime
                                                  ).toLocaleString()}
                                                </span>
                                                {calc.status === "error" && (
                                                  <span className="flex items-center gap-1 text-red-400 text-xs">
                                                    <AlertCircle size={12} />
                                                    Error
                                                  </span>
                                                )}
                                                {calc.status === "running" && (
                                                  <span className="text-xs text-purple-400">
                                                    Running
                                                  </span>
                                                )}
                                                {calc.status ===
                                                  "completed" && (
                                                  <span className="text-xs text-green-400">
                                                    Completed
                                                  </span>
                                                )}
                                              </div>
                                              {calc.endTime && (
                                                <span className="text-xs text-gray-500">
                                                  {new Date(
                                                    calc.endTime
                                                  ).toLocaleString()}
                                                </span>
                                              )}
                                            </div>

                                            {calc.status === "running" && (
                                              <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                  <span className="text-gray-400">
                                                    {calc.stage ??
                                                      "Starting..."}
                                                  </span>
                                                  <span className="text-gray-400">
                                                    {Math.round(
                                                      (calc.progress ?? 0) * 100
                                                    )}
                                                    %
                                                  </span>
                                                </div>
                                                <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                  <div
                                                    className="h-full bg-purple-500 transition-all"
                                                    style={{
                                                      width: `${
                                                        (calc.progress ?? 0) *
                                                        100
                                                      }%`,
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            {calc.status === "error" &&
                                              calc.error && (
                                                <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 p-2 rounded">
                                                  <div className="whitespace-pre-wrap break-words">
                                                    {calc.error}
                                                  </div>
                                                  {calc.exitCode !==
                                                    undefined && (
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

                                  {/* Legacy processing status */}
                                  {status === "processing" && (
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-400">
                                          Current Step:{" "}
                                          <strong className="text-gray-300">
                                            Processing
                                          </strong>
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {Math.round(state.calculation * 100)}%
                                        </span>
                                      </div>
                                      <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 transition-all"
                                          style={{
                                            width: `${
                                              state.calculation * 100
                                            }%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </ConfirmDialog>
    );
  } catch (error) {
    console.error("Error in DownloadManager:", error);
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-200">
        <div className="text-center">
          <div className="text-lg mb-2 text-red-400">
            Error loading DownloadManager
          </div>
          <div className="text-sm text-gray-400">
            {error instanceof Error ? error.message : String(error)}
          </div>
        </div>
      </div>
    );
  }
};

const getAggregatedProgress = (state: ISceneState) => {
  let progress = 0;

  const required: USGSLayerType[] = [
    "ST_TRAD",
    "ST_ATRAN",
    "ST_URAD",
    "ST_DRAD",
    "SR_B6",
    "SR_B5",
    "SR_B4",
    "QA_PIXEL",
  ];
  required.forEach((layer) => {
    progress += (state.donwloadedFiles[layer]?.progress || 0) / required.length;
  });
  return progress;
};
// Link component removed - using Chakra UI Link instead
