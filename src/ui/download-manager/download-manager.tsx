import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Switch,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  faCheckCircle,
  faDownload,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isFulfilled } from "@reduxjs/toolkit";
import { noop } from "lodash";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import {
  addExternalFolder,
  addSceneToRepo,
  DisplayId,
  downloadScene,
  EmissionCalcMethod,
  ISceneState,
  RunArgs,
  USGSLayerType,
  watchScenesState,
} from "../../actions/main-actions";
import { useLazyGetSceneByIdQuery } from "../../actions/searchApi";
import { SettingsChema } from "../../backend/settings-store";
import { useAppDispatch, useAppSelector } from "../app";
import { useTypedNavigate } from "../mainWindow";
import {
  AggregatedView,
  DetailsView,
  ExpandTrigger,
  LabelWithProgress,
  ProgressBar,
  SceneList,
  SceneListItem,
} from "./download-manager.styled";
import { FABButton } from "./fab-button";

const ProgressView: React.FC<{ progress: number }> = ({
  children,
  progress,
}) => {
  return (
    <LabelWithProgress>
      <ProgressBar style={{ width: progress * 100 + "%" }} />
      {children}
    </LabelWithProgress>
  );
};

const SceneStateView = ({
  rowIndex,
  state,
  displayId,
  onStart,
}: {
  rowIndex: number;
  state: ISceneState;
  displayId: DisplayId;
  onStart: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const progress = useMemo(() => {
    return getAggregatedProgress(state);
  }, [JSON.stringify(state)]);
  const isLoadRequired =
    state.isRepo &&
    Object.entries(state.donwloadedFiles).find(
      ([, x]) => !x.progress || x.progress < 1
    );

  const isLoadPossible = state.isRepo;

  const mapSceneIdToString = (sceneId: string) => {
    switch (sceneId) {
      case "142021":
        return (
          <>
            Krasnoyarsk<sub>(142)</sub>
          </>
        );
      case "143021":
        return (
          <>
            Krasnoyarsk<sub>(143)</sub>
          </>
        );
      default:
        return (
          <>
            <small>Zone:</small> {sceneId}
          </>
        );
    }
  };

  const parseDisplayId = (displayId: string) => {
    const segments = displayId.split("_");
    const landsatId = segments[0] === "LC08" ? 8 : 9;
    const date = new Date(
      parseInt(segments[3].slice(0, 4)),
      parseInt(segments[3].slice(4, 6)) - 1,
      parseInt(segments[3].slice(6))
    );
    return (
      <>
        {mapSceneIdToString(segments[2])} |{" "}
        <ins>{date.toLocaleDateString()}</ins> | <small>Landsat:</small>{" "}
        <ins>{landsatId}</ins>
      </>
    );
  };
  const [getScene] = useLazyGetSceneByIdQuery();
  const dispatch = useAppDispatch();
  return (
    <SceneListItem>
      <AggregatedView>
        <Flex>
          <span>{rowIndex + 1}</span>
          &nbsp;
          <ExpandTrigger
            expanded={expanded}
            onClick={() => {
              setExpanded((v) => !v);
            }}
          />
          <span style={{ flex: 1 }}>{parseDisplayId(displayId)}</span>
        </Flex>
        <ProgressView progress={progress}>
          <span style={{ width: "100%" }}>
            {!isLoadRequired
              ? "ready"
              : `downloading ${Math.round(progress * 100)}%`}
          </span>
        </ProgressView>
        {isLoadRequired && (
          <ClickableIcon
            icon={faDownload}
            disable={!isLoadPossible}
            onClick={async () => {
              getScene(displayId)
                .unwrap()
                .then((data) => {
                  const { entityId, displayId } = data.results[0];
                  dispatch(addSceneToRepo({ displayId, entityId }));
                });
            }}
          />
        )}
        <Flex alignItems={"center"} justifyContent={"center"}>
          {!isLoadRequired && isLoadPossible && !state.calculated && (
            <ClickableIcon
              icon={faPlay}
              onClick={async () => {
                if (!isLoadPossible) {
                  return;
                }
                onStart();
              }}
            />
          )}
          {state.calculated && <FontAwesomeIcon icon={faCheckCircle} />}
        </Flex>
      </AggregatedView>
      {expanded && (
        <DetailsView>
          <div>
            <h4>Source files</h4>
            <ProgressView
              progress={state.donwloadedFiles["ST_TRAD"]?.progress || 0}
            >
              ST_TRAD{" "}
              {Math.round(
                (state.donwloadedFiles["ST_TRAD"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_ATRAN"]?.progress || 0}
            >
              ST_ATRAN{" "}
              {Math.round(
                (state.donwloadedFiles["ST_ATRAN"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_URAD"]?.progress || 0}
            >
              ST_URAD{" "}
              {Math.round(
                (state.donwloadedFiles["ST_URAD"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_DRAD"]?.progress || 0}
            >
              ST_DRAD{" "}
              {Math.round(
                (state.donwloadedFiles["ST_DRAD"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B6"]?.progress || 0}
            >
              SR_B6{" "}
              {Math.round(
                (state.donwloadedFiles["SR_B6"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B5"]?.progress || 0}
            >
              SR_B5{" "}
              {Math.round(
                (state.donwloadedFiles["SR_B5"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B4"]?.progress || 0}
            >
              SR_B4{" "}
              {Math.round(
                (state.donwloadedFiles["SR_B4"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["QA_PIXEL"]?.progress || 0}
            >
              QA_PIXEL{" "}
              {Math.round(
                (state.donwloadedFiles["QA_PIXEL"]?.progress || 0) * 100
              )}
              %
            </ProgressView>
          </div>
          <div>
            <h4>Calculations</h4>
            No finished calculations yet
          </div>
        </DetailsView>
      )}
    </SceneListItem>
  );
};

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
    setFormState(formState);
    onOpen();
    setOnStart(() => onStart);
  };

  if (!formState) {
    return null;
  }
  return (
    <>
      {children({
        ask: openNewDialog,
      })}
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
                      outLayers: { ...prev.outLayers, BT: !prev.outLayers.BT },
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
                      emissionCalcMethod: e.target.value as EmissionCalcMethod,
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
                >
                  select all
                </Link>
                <Link
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
                >
                  deselect all
                </Link>
              </FormControl>
              <FormControl as={SimpleGrid} marginTop={1} columns={{ base: 2 }}>
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
    </>
  );
};

export const DownloadManager = () => {
  const { scenes } = useAppSelector((state) => state.main);
  const dispatch = useAppDispatch();
  const navigate = useTypedNavigate();
  const [initialFormState] = useFormState();

  useEffect(() => {
    dispatch(watchScenesState());
  }, [dispatch]);
  const toast = useToast();
  const authorized = useAppSelector((state) => state.main.authorized);
  console.log({ scenes });
  console.log({ initialFormState });
  if (!initialFormState) {
    return null;
  }

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
        targetRoute: "/bounds",
      });
      if (result) {
        // Navigation will be handled by login-success message
      }
    }
  };

  return (
    <>
      <Button
        style={{ position: "fixed", bottom: 0, zIndex: 10 }}
        onClick={() => {
          Object.keys(scenes).forEach((displayId) => {
            dispatch(downloadScene({ displayId, args: initialFormState }));
          });
        }}
      >
        run all with default args
      </Button>
      <ConfirmDialog>
        {({ ask }) => (
          <SceneList>
            {Object.keys(scenes).map((displayId, index) => (
              <SceneStateView
                rowIndex={index}
                onStart={() =>
                  ask({
                    onStart: async (args) => {
                      console.log(args);
                      const action = await dispatch(
                        downloadScene({ displayId, args })
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
                  })
                }
                key={displayId}
                state={scenes[displayId]}
                displayId={displayId}
              />
            ))}
          </SceneList>
        )}
      </ConfirmDialog>
      <FABButton
        onCatalogClick={handleAddFromCatalog}
        onExplorerClick={handleFindInUSGS}
      />
    </>
  );
};

const getAggregatedProgress = (state: ISceneState) => {
  let progress = 0;
  // if (!state.stillLoading) {
  //   if (state.calculated) {
  //     return 1;
  //   }
  //   return 0.5 + state.calculation;
  // }

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

const ClickableIcon = styled(FontAwesomeIcon)<{ disable?: boolean }>`
  ${({ disable }) =>
    !disable &&
    css`
      cursor: pointer;
      &:hover {
        color: blue;
      }
    `}
`;

const Link = styled.a`
  text-decoration: underline;
  cursor: pointer;
`;
