import { toast, useToast } from "@chakra-ui/react";
import {
  faCalculator,
  faCheckCircle,
  faDownload,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isFulfilled } from "@reduxjs/toolkit";

import React, { useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import {
  DisplayId,
  downloadScene,
  ISceneState,
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
}: {
  state: ISceneState;
  displayId: DisplayId;
}) => {
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();

  const dispatch = useAppDispatch();
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
      <ProgressView progress={progress}>
        <AggregatedView>
          <ExpandTrigger
            expanded={expanded}
            onClick={() => {
              setExpanded((v) => !v);
            }}
          />
          <span style={{ flex: 1 }}>{displayId}</span>
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
          {/* {state.stillLoading && <FontAwesomeIcon icon={faCircleDown} />} */}
          {!isLoadRequired && isLoadPossible && !state.calculated && (
            <ClickableIcon
              icon={faCalculator}
              onClick={async () => {
                if (!isLoadPossible) {
                  return;
                }
                const action = await dispatch(downloadScene({ displayId }));
                if (isFulfilled(action)) {
                  toast({
                    title: "The scene calculation was started",
                    position: "bottom-left",
                    description: `If the process fall, run it manually by [> ${action.payload}]`,
                    duration: 5000,
                    isClosable: true,
                  });
                }
              }}
            />
          )}
          {state.calculated && <FontAwesomeIcon icon={faCheckCircle} />}
          {/* {state.calculated && (
            <FontAwesomeIcon
              onClick={() => {
                dispatch(downloadScene({ displayId }));
              }}
              style={{ cursor: "pointer" }}
              icon={faFolderOpen}
            />
          )} */}
        </AggregatedView>
      </ProgressView>
      {expanded && (
        <DetailsView>
          <div>
            <h4>source files</h4>
            <ProgressView
              progress={state.donwloadedFiles["ST_TRAD"]?.progress || 0}
            >
              ST_TRAD
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_ATRAN"]?.progress || 0}
            >
              ST_ATRAN
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_URAD"]?.progress || 0}
            >
              ST_URAD
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["ST_DRAD"]?.progress || 0}
            >
              ST_DRAD
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B5"]?.progress || 0}
            >
              SR_B5
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["SR_B4"]?.progress || 0}
            >
              SR_B4
            </ProgressView>
            <ProgressView
              progress={state.donwloadedFiles["QA_PIXEL"]?.progress || 0}
            >
              QA_PIXEL
            </ProgressView>
          </div>
          <div>
            <h4>calculation</h4>
            <ProgressView progress={state.calculation}>
              calculation
            </ProgressView>
          </div>
        </DetailsView>
      )}
    </SceneListItem>
  );
};

export const DownloadManager = () => {
  const { scenes, loading } = useAppSelector((state) => state.main);
  const dispatch = useAppDispatch();
  const navigate = useTypedNavigate();
  useEffect(() => {
    dispatch(watchScenesState());
  }, [dispatch]);

  return (
    <>
      <SceneList>
        {Object.keys(scenes).map((displayId) => (
          <SceneStateView
            key={displayId}
            state={scenes[displayId]}
            displayId={displayId}
          />
        ))}
      </SceneList>
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
      (state.donwloadedFiles[layer]?.progress || 0) / 2 / required.length;
  });
  return progress + (state.calculation || 0) / 2;
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
