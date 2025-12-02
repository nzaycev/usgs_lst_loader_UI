import { ChakraProvider, Spinner, useToast } from "@chakra-ui/react";
import { bboxPolygon } from "@turf/turf";
import { ChevronLeft, Database } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapProvider } from "react-map-gl";
import { Provider } from "react-redux";
import { addSceneToRepo } from "../actions/main-actions";
import {
  markSceneAsAdded,
  setInitialScenes,
} from "../actions/search-scene-dialog-slice";
import { useSearchScenesQuery } from "../actions/searchApi";
import { store, useAppDispatch, useAppSelector } from "./app";
import { MapContainer } from "./mapbox/mapContainer";
import { ModalSystemHelper } from "./ModalSystemHelper";
import { darkTheme } from "./theme";

type LngLat = [number, number];

const polygonData: any = (
  startCoordinates?: LngLat,
  endCoordinates?: LngLat
) => ({
  type: "FeatureCollection",
  features:
    startCoordinates && endCoordinates
      ? [
          {
            type: "Feature",
            geometry: bboxPolygon([...startCoordinates, ...endCoordinates])
              .geometry,
          },
        ]
      : [],
});

export interface ISelectionCoordinates {
  start: LngLat;
  end: LngLat;
}

type DialogStep = "bounds" | "date_list";

const SearchSceneDialogWindow: React.FC = () => {
  const [step, setStep] = useState<DialogStep>("bounds");
  const [selectionCoordinates, setSelectionCoordinates] =
    useState<ISelectionCoordinates | null>(null);
  const [readySelection, setReadySelection] = useState(false);
  const mapRef = useRef(null);
  const dispatch = useAppDispatch();
  const { scenes } = useAppSelector((state) => state.main);
  const toast = useToast();
  const [processingScenes, setProcessingScenes] = useState<
    Record<string, true>
  >({});
  const addedScenes = useAppSelector(
    (state) => state.searchSceneDialog.addedScenes
  );

  // Get initial displayIds from URL hash when dialog opens
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#search-scene-dialog:")) {
      try {
        const dataStr = decodeURIComponent(
          hash.substring("#search-scene-dialog:".length)
        );
        const data = JSON.parse(dataStr) as { displayIds?: string[] };
        if (data.displayIds) {
          dispatch(setInitialScenes(data.displayIds));
        }
      } catch (e) {
        console.error("Error parsing search scene dialog data:", e);
      }
    }
  }, [dispatch]);

  // Fix map size on mount and when step changes to bounds
  useEffect(() => {
    if (step === "bounds") {
      // Use setTimeout to ensure the container has rendered
      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Combine addedScenes from slice with current scenes from Redux
  // This ensures we show scenes that were added before dialog opened
  // and also update when new scenes are added
  const existingDisplayIds = useMemo(() => {
    const allIds: Record<string, true> = { ...addedScenes };
    Object.keys(scenes).forEach((id) => {
      allIds[id] = true;
    });
    return allIds;
  }, [scenes, addedScenes]);

  // Use geoJsonData for final state (when readySelection is true)
  // During selection, we update via mouseMove handler to avoid conflicts
  const geoJsonData = useMemo(() => {
    if (selectionCoordinates) {
      return polygonData(selectionCoordinates.start, selectionCoordinates.end);
    }
    return polygonData(undefined, undefined);
  }, [selectionCoordinates]);

  const { isLoading, data, error } = useSearchScenesQuery(
    {
      bounds: selectionCoordinates
        ? {
            lng: [selectionCoordinates.start[0], selectionCoordinates.end[0]],
            lat: [selectionCoordinates.start[1], selectionCoordinates.end[1]],
          }
        : undefined,
    },
    { skip: !selectionCoordinates || step !== "date_list" }
  );

  const handleClose = () => {
    window.ElectronAPI.invoke.sendSearchSceneDialogResult(null);
  };

  const handleNext = () => {
    if (selectionCoordinates) {
      setStep("date_list");
    }
  };

  const handleBack = () => {
    setStep("bounds");
  };

  const handleUseMapBounds = useCallback(() => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      const coordinates: ISelectionCoordinates = {
        start: [bounds._ne.lng, bounds._ne.lat],
        end: [bounds._sw.lng, bounds._sw.lat],
      };
      setSelectionCoordinates(coordinates);
      setReadySelection(true);
    }
  }, []);

  // Memoize mouseMove handler to prevent unnecessary re-registrations
  const handleMouseMove = useCallback(
    (e: any) => {
      // Only update during active selection (not ready yet)
      if (!readySelection && selectionCoordinates?.start && mapRef.current) {
        mapRef.current.setData(
          polygonData(selectionCoordinates.start, [e.lngLat.lng, e.lngLat.lat])
        );
      }
    },
    [readySelection, selectionCoordinates]
  );

  // Memoize onClick handler
  const handleMapClick = useCallback(
    (e: any) => {
      if (!selectionCoordinates?.start) {
        // First click - set start point
        setSelectionCoordinates({
          start: [e.lngLat.lng, e.lngLat.lat],
          end: [e.lngLat.lng, e.lngLat.lat],
        });
        setReadySelection(false);
      } else if (!readySelection) {
        // Second click - set end point and complete selection
        setSelectionCoordinates((old) => ({
          ...old!,
          end: [e.lngLat.lng, e.lngLat.lat],
        }));
        setReadySelection(true);
      }
    },
    [selectionCoordinates, readySelection]
  );

  const handleSceneClick = async (displayId: string, entityId: string) => {
    // Prevent multiple clicks
    if (processingScenes[displayId]) {
      return;
    }

    const currentScene = scenes[displayId];
    if (!currentScene) {
      // Set busy state
      setProcessingScenes((prev) => ({ ...prev, [displayId]: true }));
      try {
        await dispatch(
          addSceneToRepo({
            displayId,
            entityId,
          })
        ).unwrap();
        // Mark scene as added in Redux slice
        dispatch(markSceneAsAdded(displayId));
        toast({
          title: "The scene was added to main repo",
          position: "bottom-left",
          description: "You can go to the home page to start downloading",
          duration: 5000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add scene to repository",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        // Clear busy state
        setProcessingScenes((prev) => {
          const next = { ...prev };
          delete next[displayId];
          return next;
        });
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 w-full">
      <ModalSystemHelper
        title={step === "bounds" ? "Select Bounds" : "Select Scene"}
        onClose={handleClose}
      />
      {step === "bounds" ? (
        <>
          <div className="flex-1 relative overflow-hidden">
            <MapContainer
              ref={mapRef}
              geoJsonData={geoJsonData}
              layerType={"fill"}
              mouseMove={!readySelection ? handleMouseMove : undefined}
              onClick={handleMapClick}
            />
            {/* Coordinates display in bottom-right corner */}
            {selectionCoordinates && (
              <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded border border-gray-700 text-xs font-mono">
                <div className="text-gray-300 space-y-1">
                  <div>
                    <span className="text-gray-400">Start: </span>
                    <span className="text-blue-400">
                      {selectionCoordinates.start[0].toFixed(4)},{" "}
                      {selectionCoordinates.start[1].toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">End: </span>
                    <span className="text-blue-400">
                      {selectionCoordinates.end[0].toFixed(4)},{" "}
                      {selectionCoordinates.end[1].toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-gray-800/90 backdrop-blur-sm w-full h-[60px] flex items-center justify-center px-4 text-center border-t border-gray-700">
            {!readySelection ? (
              <div>
                <p className="text-gray-200">Add 2 points on the map</p>
                <p className="text-gray-400">
                  or{" "}
                  <a
                    href="#"
                    className="underline text-blue-400 hover:text-blue-300"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUseMapBounds();
                    }}
                  >
                    use current map bounds
                  </a>
                </p>
              </div>
            ) : (
              <>
                <button
                  className="bg-blue-600 px-4 py-2 mx-2 rounded border-none text-white font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setReadySelection(false);
                    setSelectionCoordinates(null);
                  }}
                >
                  Reset bounds
                </button>
                <button
                  className="bg-blue-600 px-4 py-2 mx-2 rounded border-none text-white font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                  onClick={handleNext}
                >
                  Apply
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <button
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
              onClick={handleBack}
            >
              <ChevronLeft size={16} />
              <span>Back to map</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="xl" />
              </div>
            ) : error ? (
              <div className="p-10 whitespace-pre-line text-red-400 bg-red-900/20 rounded border border-red-800">
                <p className="font-semibold mb-2">Ошибка загрузки сцен:</p>
                <pre className="text-xs">{JSON.stringify(error, null, 2)}</pre>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                {data?.results && data.results.length > 0 ? (
                  <ul className="list-none m-0 p-0 space-y-1">
                    {data.results.map(
                      ({ displayId, entityId, temporalCoverage }: any) => {
                        // Check both Redux store and initial displayIds
                        const isCurrentSceneReady =
                          !!scenes[displayId] ||
                          !!existingDisplayIds[displayId];
                        const isProcessing = !!processingScenes[displayId];
                        const isClickable =
                          !isCurrentSceneReady && !isProcessing;
                        return (
                          <li
                            key={entityId}
                            className={`px-4 py-3 rounded transition-colors ${
                              isCurrentSceneReady
                                ? "text-blue-400 bg-blue-900/30 border border-blue-800/50"
                                : isProcessing
                                ? "text-gray-400 bg-gray-800/30 border border-gray-700 cursor-wait opacity-60"
                                : "text-gray-200 bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (isClickable) {
                                handleSceneClick(displayId, entityId);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isProcessing ? (
                                  <>
                                    <Spinner size="sm" />
                                    <span className="font-medium text-gray-400">
                                      {temporalCoverage.startDate.split(" ")[0]}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Adding...
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium">
                                      {temporalCoverage.startDate.split(" ")[0]}
                                    </span>
                                    {isCurrentSceneReady && (
                                      <Database
                                        size={16}
                                        className="text-blue-400"
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                              <span className="text-gray-400 text-xs font-mono">
                                {displayId}
                              </span>
                            </div>
                          </li>
                        );
                      }
                    )}
                  </ul>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <p>Сцены не найдены для выбранной области</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchSceneDialogWindowApp = () => {
  return (
    <Provider store={store}>
      <ChakraProvider theme={darkTheme}>
        <MapProvider>
          <SearchSceneDialogWindow />
        </MapProvider>
      </ChakraProvider>
    </Provider>
  );
};
