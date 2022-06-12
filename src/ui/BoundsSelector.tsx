import React, { createRef, Ref, useEffect, useRef, useState } from "react";
import { MapContainer } from "./mapbox/mapContainer";
import { INavigation } from "./Router";
import { bboxPolygon } from "@turf/turf";
import debounce from "lodash.debounce";
import { Map } from "./map";
import { Feature, Layer } from "react-mapbox-gl";
import styled from "styled-components";

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

export const BoundsSelector = ({ navigation }: { navigation: INavigation }) => {
  const [selectionCoordinates, setSelectionCoordinates] = useState<{
    start: LngLat;
    end: LngLat;
  }>(null);
  const [readySelection, setReadySelection] = useState(false);
  const mapRef = useRef(null);

  const geoJsonData = polygonData(
    selectionCoordinates?.start,
    selectionCoordinates?.end
  );

  // const updateEnd = (end: )

  console.log("aaaa", mapRef.current);

  return (
    <div className="bounds-selector">
      <MapContainer
        ref={mapRef}
        geoJsonData={geoJsonData}
        layerType={"fill"}
        mouseMove={(e) => {
          console.log("move");
          if (!readySelection && selectionCoordinates?.start) {
            // const data = mapRef.current.getData()
            mapRef.current.setData(
              polygonData(selectionCoordinates.start, [
                e.lngLat.lng,
                e.lngLat.lat,
              ])
            );
            // setSelectionCoordinates((old) => ({
            //   ...old,
            //   end: [e.lngLat.lng, e.lngLat.lat],
            // }));
          }
        }}
        onClick={(e) => {
          console.log(e, selectionCoordinates);
          if (!selectionCoordinates?.start) {
            setSelectionCoordinates({
              start: [e.lngLat.lng, e.lngLat.lat],
              end: [e.lngLat.lng, e.lngLat.lat],
            });
            setReadySelection(false);
          } else {
            setSelectionCoordinates((old) => ({
              ...old,
              end: [e.lngLat.lng, e.lngLat.lat],
            }));
            setReadySelection(true);
          }
        }}
      />
      <Tip>
        {!readySelection ? (
          "Поставьте 2 точки на карте"
        ) : (
          <>
            <Button
              onClick={() => {
                setReadySelection(false);
                setSelectionCoordinates(null);
              }}
            >
              Изменить область
            </Button>
            <Button
              onClick={() => {
                navigation.go("date_list", selectionCoordinates);
              }}
            >
              Далее
            </Button>
          </>
        )}
      </Tip>
    </div>
  );
};

const Tip = styled.div`
  position: fixed;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.2);
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 20px;
`;

const Button = styled.button`
  background-color: blue;
  padding: 8px 16px;
  margin: 0 8px;
  border-radius: 4px;
  border: none;
  color: white;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    filter: brightness(0.7);
  }
`;
