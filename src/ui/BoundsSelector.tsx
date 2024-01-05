import React, { useRef, useState } from "react";
import { MapContainer } from "./mapbox/mapContainer";
import { bboxPolygon } from "@turf/turf";
// import { Map } from "./map";
// import { Feature, Layer } from "react-mapbox-gl";
import styled from "styled-components";
import { useTypedNavigate } from "./mainWindow";

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

export const BoundsSelector = () => {
  const [selectionCoordinates, setSelectionCoordinates] = useState<ISelectionCoordinates>(null);
  const [readySelection, setReadySelection] = useState(false);
  const mapRef = useRef(null);
  const navigate = useTypedNavigate()

  const geoJsonData = polygonData(
    selectionCoordinates?.start,
    selectionCoordinates?.end
  );


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
            mapRef.current
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
        {!readySelection ? <div>
          <p>Поставьте 2 точки на карте</p>
          <p>или{' '}
            <a href='#'
              onClick={(e) => {
                e.preventDefault()
                navigate("/date_list", {
                  state: {
                    start: [mapRef.current.getBounds()._ne.lng, mapRef.current.getBounds()._ne.lat],
                    end: [mapRef.current.getBounds()._sw.lng, mapRef.current.getBounds()._sw.lat],
                  }
                });
              }}
            >
              используйте границы карты
            </a>
          </p>
        </div> : (
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
                navigate("/date_list", { state: selectionCoordinates });
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
  text-align: center;
  a {
    text-decoration: underline;
  }
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
