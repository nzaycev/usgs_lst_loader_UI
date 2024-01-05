import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button, Flex, FormControl, FormLabel, Input, SimpleGrid, Switch, toast, useDisclosure, useToast } from "@chakra-ui/react";
import {
  faCalculator,
  faCheckCircle,
  faDownload,
  faFolderOpen,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isFulfilled } from "@reduxjs/toolkit";
import { isNumber, noop } from "lodash";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { justTry } from "../../tools/just-try";
import {
  DisplayId,
  downloadScene,
  ISceneState,
  OutLayer,
  RunArgs,
  USGSLayerType,
  watchScenesState,
} from "../../actions/main-actions";
import { selectDownloadUrls } from "../../actions/selectors";
import { useAppDispatch, useAppSelector } from "../../entry-points/app";
import { useTypedNavigate } from "../mainWindow";
import {
  AddButton,
  AggregatedView,
  DetailsView,
  ExpandTrigger,
  LabelWithProgress,
  ProgressBar,
  SceneList,
  SceneListItem,
} from "./download-manager.styled";

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
  state,
  displayId,
  onStart
}: {
  state: ISceneState;
  displayId: DisplayId;
  onStart: () => void
}) => {
  const [expanded, setExpanded] = useState(false);

  const urls = useAppSelector((state) => selectDownloadUrls(state, displayId));
  const progress = useMemo(() => {
    return getAggregatedProgress(state);
  }, [JSON.stringify(state)]);
  const isLoadRequired =
    state.isRepo &&
    Object.entries(state.donwloadedFiles).find(
      ([_, x]) => !x.progress || x.progress < 1
    );
  const isLoadPossible = state.isRepo;

  const mapSceneIdToString = (sceneId: string) => {
    switch (sceneId) {
      case '142021':
        return <>Krasnoyarsk<sub>(142)</sub></>
      case '143021':
        return <>Krasnoyarsk<sub>(143)</sub></>
      default:
        return <><small>Zone:</small> {sceneId}</>
    }
  }

  const parseDisplayId = (displayId: string) => {
    const segments = displayId.split('_')
    const landsatId = segments[0] === 'LC08' ? 8 : 9
    const date = new Date(parseInt(segments[3].slice(0, 4)), parseInt(segments[3].slice(4, 6)) - 1, parseInt(segments[3].slice(6)))
    return <>{mapSceneIdToString(segments[2])} | <ins>{date.toLocaleDateString()}</ins> | <small>Landsat:</small> <ins>{landsatId}</ins></>
  }

  return (
    <SceneListItem>
      <AggregatedView>
        <Flex>
          <ExpandTrigger
            expanded={expanded}
            onClick={() => {
              setExpanded((v) => !v);
            }}
          />
          <span style={{ flex: 1 }}>{parseDisplayId(displayId)}</span>
        </Flex>
        <ProgressView progress={progress}>
          <span style={{ width: '100%' }}>{!isLoadRequired ? 'ready' : `downloading ${Math.round(progress * 100)}%`}</span>
        </ProgressView>
        {isLoadRequired && (
          <ClickableIcon
            icon={faDownload}
            disable={isLoadPossible}
            onClick={async () => {
              urls.forEach((url) => {
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.target = "_blank";
                anchor.download = "";
                anchor.click();
              });
            }}
          />
        )}
        <Flex alignItems={'center'} justifyContent={'center'}>
          {!isLoadRequired && isLoadPossible && !state.calculated && (
            <ClickableIcon
              icon={faPlay}
              onClick={async () => {
                if (!isLoadPossible) {
                  return;
                }
                onStart()
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
              ST_TRAD {Math.round((state.donwloadedFiles["ST_TRAD"]?.progress || 0) * 100)}%
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_ATRAN"]?.progress || 0}
            >
              ST_ATRAN {Math.round((state.donwloadedFiles["ST_ATRAN"]?.progress || 0) * 100)}%
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_URAD"]?.progress || 0}
            >
              ST_URAD {Math.round((state.donwloadedFiles["ST_URAD"]?.progress || 0) * 100)}%
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_DRAD"]?.progress || 0}
            >
              ST_DRAD {Math.round((state.donwloadedFiles["ST_DRAD"]?.progress || 0) * 100)}%
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B5"]?.progress || 0}
            >
              SR_B5 {Math.round((state.donwloadedFiles["SR_B5"]?.progress || 0) * 100)}%
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B4"]?.progress || 0}
            >
              SR_B4 {Math.round((state.donwloadedFiles["SR_B4"]?.progress || 0) * 100)}%
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["QA_PIXEL"]?.progress || 0}
            >
              QA_PIXEL {Math.round((state.donwloadedFiles["QA_PIXEL"]?.progress || 0) * 100)}%
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

type OnStartFunction = (args: RunArgs) => void
type OpenDialogFunction = (args: { onStart: OnStartFunction }) => void

const initialFormState: RunArgs = {
  useQAMask: true, emission: undefined, outLayers: {
    [OutLayer.LST]: true,
    [OutLayer.BT]: false,
    [OutLayer.Emission]: false,
    [OutLayer.NDVI]: false,
    [OutLayer.Radiance]: false,
    [OutLayer.SurfRad]: false,
    [OutLayer.VegProp]: false
  }
}

const ConfirmDialog = ({ children }: { children: (props: { ask: OpenDialogFunction }) => ReactNode }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef()

  const [formState, setFormState] = useState<RunArgs>(initialFormState)
  const [onStart, setOnStart] = useState<OnStartFunction>(noop)

  const openNewDialog: OpenDialogFunction = ({ onStart }) => {
    setFormState(initialFormState)
    onOpen()
    setOnStart(() => onStart)
  }

  return (
    <>
      {children({
        ask: openNewDialog
      })}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Preparing for calculation
            </AlertDialogHeader>

            <AlertDialogBody>
              <FormControl as={SimpleGrid} columns={{ base: 2 }}>
                <FormLabel>
                  Enable QA mask?
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.useQAMask} onChange={() => setFormState(prev => ({ ...prev, useQAMask: !formState.useQAMask }))} />
              </FormControl>
              <FormControl as={SimpleGrid} columns={{ base: 2 }}>
                <FormLabel>
                  Custom emission value:
                </FormLabel>
                <Input placeholder="default" value={formState.emission} type="number" size={"xs"}
                  onChange={e => setFormState(prev => ({ ...prev, emission: e.target.value !== '' ? parseFloat(e.target.value) : undefined }))} />
              </FormControl>
              <FormLabel>
                Layers to be saved on finish:
              </FormLabel>
              <FormControl as={SimpleGrid} columns={{ base: 4 }} alignItems={'center'} spacing={1}>
                <FormLabel color='gray.400' margin={0}>
                  LST:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.LST} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, LST: !prev.outLayers.LST } }))} />
                <FormLabel color='gray.400' margin={0}>
                  NDVI:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.NDVI} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, NDVI: !prev.outLayers.NDVI } }))} />
                <FormLabel color='gray.400' margin={0}>
                  Emission:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.Emission} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, Emission: !prev.outLayers.Emission } }))} />
                <FormLabel color='gray.400' margin={0}>
                  BT:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.BT} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, BT: !prev.outLayers.BT } }))} />
                <FormLabel color='gray.400' margin={0}>
                  VegProp:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.VegProp} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, VegProp: !prev.outLayers.VegProp } }))} />
                <FormLabel color='gray.400' margin={0}>
                  Radiance:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.Radiance} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, Radiance: !prev.outLayers.Radiance } }))} />
                <FormLabel color='gray.400' margin={0}>
                  SurfRad:
                </FormLabel>
                <Switch size={"sm"} isChecked={formState.outLayers.SurfRad} onChange={() => setFormState(prev => ({ ...prev, outLayers: { ...prev.outLayers, SurfRad: !prev.outLayers.SurfRad } }))} />
                <Link onClick={() => { setFormState(prev => ({ ...prev, outLayers: { BT: true, Emission: true, LST: true, NDVI: true, Radiance: true, SurfRad: true, VegProp: true } })) }}>select all</Link>
                <Link onClick={() => { setFormState(prev => ({ ...prev, outLayers: { BT: false, Emission: false, LST: false, NDVI: false, Radiance: false, SurfRad: false, VegProp: false } })) }}>deselect all</Link>
              </FormControl>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme='green' onClick={() => {
                onClose();
                onStart(formState);
              }} ml={3}>
                Run
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}

export const DownloadManager = () => {
  const { scenes, loading } = useAppSelector((state) => state.main);
  const dispatch = useAppDispatch();
  const navigate = useTypedNavigate();
  useEffect(() => {
    dispatch(watchScenesState());
  }, [dispatch]);
  const toast = useToast();

  return (
    <>
      <ConfirmDialog>
        {({ ask }) =>
          <SceneList>
            {Object.keys(scenes).map((displayId) => (
              <SceneStateView
                onStart={() => ask({
                  onStart: async (args) => {
                    console.log(args)
                    const action = await dispatch(downloadScene({ displayId, args }));
                    if (isFulfilled(action)) {
                      toast({
                        title: "The scene calculation was started",
                        position: "bottom-left",
                        description: `If the process fall, run it manually by [> ${action.payload}]`,
                        duration: 5000,
                        isClosable: true,
                      });
                    }
                  }
                })}
                key={displayId}
                state={scenes[displayId]}
                displayId={displayId}
              />
            ))}
          </SceneList>
        }
      </ConfirmDialog>
      <AddButton
        onClick={() => {
          navigate("/bounds");
        }}
      >
        +
      </AddButton>
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
    "SR_B5",
    "SR_B4",
    "QA_PIXEL",
  ];
  required.forEach((layer) => {
    progress +=
      (state.donwloadedFiles[layer]?.progress || 0) / required.length;
  });
  return progress;
};

const ClickableIcon = styled(FontAwesomeIcon) <{ disable?: boolean }>`
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
`