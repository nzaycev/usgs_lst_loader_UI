import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button, Flex, FormControl, FormLabel, Input, SimpleGrid, Switch, toast, useDisclosure, useToast } from "@chakra-ui/react";
import {
  faCalculator,
  faCheckCircle,
  faDownload,
  faFolderOpen,
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
          <span style={{ flex: 1 }}>{displayId}</span>
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
              icon={faCalculator}
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

const ConfirmDialog = ({ children }: { children: (props: { ask: OpenDialogFunction }) => ReactNode }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef()

  const [formState, setFormState] = useState<RunArgs>({
    useQAMask: true,
    emission: undefined,
  })
  const [onStart, setOnStart] = useState<OnStartFunction>(noop)

  const openNewDialog: OpenDialogFunction = ({ onStart }) => {
    setFormState({ useQAMask: true, emission: undefined })
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
