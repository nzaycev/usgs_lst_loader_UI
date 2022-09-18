import axios from "axios";
import React from "react";
import styled from "styled-components";
import { useLoader } from "../tools/request";
import { getUrl } from "../tools/urls";
import { useSearchScenesQuery } from "../actions/searchApi";
import { useTypedLocation, useTypedNavigate } from "./mainWindow";

export const DateList = () => {
  const {state: spatial} = useTypedLocation<'/date_list'>()
  // const navigate = useTypedNavigate()
  const { isLoading, data } = useSearchScenesQuery({
    bounds: {
      lng: [spatial.start[0], spatial.end[0]],
      lat: [spatial.start[1], spatial.end[1]],
    }
  })

  console.log('aaa', {data, isLoading})

  return (
    <div style={{ width: "100%", padding: "16px 0" }}>
      {isLoading ? (
        <p>...</p>
      ) : (
        <List>
          {data.results.map(
            ({ displayId, entityId, temporalCoverage }: any) => {
              return (
                <ListItem
                  key={entityId}
                  onClick={() => {
                    // navigation.go("download", { displayId, entityId, spatial });
                  }}
                >
                  {temporalCoverage.startDate.split(" ")[0]}
                </ListItem>
              );
            }
          )}
        </List>
      )}
    </div>
  );
};

const List = styled.ul`
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 400px;
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
