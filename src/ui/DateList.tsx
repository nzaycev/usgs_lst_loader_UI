import React, { useEffect } from "react";
import styled, { css } from "styled-components";
import { useSearchScenesQuery } from "../actions/searchApi";
import { useTypedLocation } from "./mainWindow";
import { useAppDispatch, useAppSelector } from "../entry-points/app";
import { addSceneToRepo, watchScenesState } from "../actions/main-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faDatabase,
  faStore,
} from "@fortawesome/free-solid-svg-icons";
import { Code, Spinner, useToast } from "@chakra-ui/react";

export const DateList = () => {
  const { state: spatial } = useTypedLocation<"/date_list">();
  // const navigate = useTypedNavigate()
  const { isLoading, data, error } = useSearchScenesQuery({
    bounds: {
      lng: [spatial.start[0], spatial.end[0]],
      lat: [spatial.start[1], spatial.end[1]],
    },
  });
  const toast = useToast();

  const dispatch = useAppDispatch();

  const { scenes, wait } = useAppSelector((state) => state.main);

  console.log("aaa", { data, scenes, isLoading });

  if (error) {
    return (
      <div style={{ padding: 40, whiteSpace: "pre-line" }}>
        {JSON.stringify(error, null, 2)}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        paddingTop: 40,
      }}
    >
      {isLoading ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spinner />
        </div>
      ) : (
        <List wait={wait}>
          {data.results.map(
            ({ displayId, entityId, temporalCoverage }: any) => {
              const currentScene = scenes[displayId];
              console.log({ scenes, displayId });
              const isCurrentSceneReady = !!currentScene;
              return (
                <ListItem
                  disabled={isCurrentSceneReady}
                  key={entityId}
                  onClick={async () => {
                    if (!isCurrentSceneReady) {
                      await dispatch(
                        addSceneToRepo({
                          displayId,
                          entityId,
                        })
                      );
                      toast({
                        title: "The scene was added to main repo",
                        position: "bottom-left",
                        description:
                          "You can go to the home page to start downloading",
                        duration: 5000,
                        isClosable: true,
                      });
                    }
                  }}
                >
                  {temporalCoverage.startDate.split(" ")[0]}
                  {isCurrentSceneReady && <FontAwesomeIcon icon={faDatabase} />}
                </ListItem>
              );
            }
          )}
        </List>
      )}
    </div>
  );
};

const List = styled.ul<{ wait: boolean }>`
  list-style: none;
  margin: 0 auto;
  flex-shrink: 0;
  padding: 0;
  padding-bottom: 20px;
  max-width: 400px;
  ${({ wait }) =>
    wait &&
    css`
      opacity: 0.5;
      pointer-events: none;
    `}
`;

const ListItem = styled.li<{ disabled: boolean }>`
  padding: 8px 16px;
  margin: 0;
  * {
    margin: 0 4px;
  }
  ${({ disabled }) =>
    !disabled
      ? css`
          cursor: pointer;
          &:hover {
            background-color: gainsboro;
          }
        `
      : css`
          color: #000069;
          cursor: default;
        `}
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
`;
