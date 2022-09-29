import React, { useEffect } from "react";
import styled, { css, keyframes } from "styled-components";
import { useSearchScenesQuery } from "../actions/searchApi";
import { useTypedLocation } from "./mainWindow";
import { useAppDispatch, useAppSelector } from "../entry-points/app";
import { donwloadScene, watchScenesState } from "../actions/main-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";

export const DateList = () => {
  const {state: spatial} = useTypedLocation<'/date_list'>()
  // const navigate = useTypedNavigate()
  const { isLoading, data } = useSearchScenesQuery({
    bounds: {
      lng: [spatial.start[0], spatial.end[0]],
      lat: [spatial.start[1], spatial.end[1]],
    }
  })

  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(watchScenesState())
  }, [dispatch])

  const {scenes, loading, wait} = useAppSelector(state => state.main)

  console.log('aaa', {data, scenes, isLoading})

  return (
    <div style={{ width: "100%", padding: "16px 0" }}>
      {isLoading || loading ? (
        <p>...</p>
      ) : (
        <List wait={wait}>
          {data.results.map(
            ({ displayId, entityId, temporalCoverage }: any) => {
              const currentScene = scenes[displayId]
              const isCurrentSceneLoading = currentScene?.stillLoading || (currentScene && !currentScene.calculated)
              const isCurrentSceneReady = currentScene?.calculated
              return (
                <ListItem
                  key={entityId}
                  onClick={() => {
                    if (!currentScene) {
                      dispatch(donwloadScene({
                        displayId,
                        entityId,
                      }))
                    }
                    // navigation.go("download", { displayId, entityId, spatial });
                  }}
                >
                  {temporalCoverage.startDate.split(" ")[0]}
                  {isCurrentSceneReady && <FontAwesomeIcon icon={faCircleCheck}/>}
                  {isCurrentSceneLoading && <Spinner />}
                </ListItem>
              );
            }
          )}
        </List>
      )}
    </div>
  );
};

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`

const Spinner = styled(FontAwesomeIcon).attrs({icon: faSpinner})`
  animation: 1s ${spin} linear infinite;
`

const List = styled.ul<{wait: boolean}>`
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 400px;
  ${({wait}) => wait && css`
    opacity: 0.5;
    pointer-events: none;
  `}
`;

const ListItem = styled.li`
  padding: 8px 16px;
  margin: 0;
  cursor: pointer;
  &:hover {
    background-color: gainsboro;
  }
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
`;
