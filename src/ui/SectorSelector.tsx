import React from "react";
import { useSearchScenesQuery } from "../actions/searchApi";
import ReactMapboxGl, { Layer, Source, GeolocateControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Feature, FeatureCollection, Geometry, GeometryCollection } from "@turf/turf";
import { useTypedLocation } from "./mainWindow";

const dateFormat = (date: Date) => `
    ${date.getFullYear()}-${(date.getMonth() + 1)
  .toString()
  .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}
`;

const appendDate = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const SectorSelector = () => {
  const {state: {date: startDate}} = useTypedLocation<'/map'>()
  const [mapState, setMapState] = React.useState({
    longitude: -100,
    latitude: 40,
    zoom: 3.5
  });
  
  const endDate = appendDate(startDate, 1);

  const {isLoading, data} = useSearchScenesQuery({
    startDate: dateFormat(startDate),
    endDate: dateFormat(endDate),
  })
  

  const sectors: Feature<GeoJSON.Geometry, any>[] = data
    ? data.results.map((xx, index: number) => ({
        type: 'Feature',
        geometry: {
          ...xx.spatialBounds
        },
        properties: { ...xx, id: index }
      }))
    : []

  return (
    <ReactMapboxGl
      {...mapState}
      mapboxAccessToken={window.mapboxToken}
      onMove={evt => setMapState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      style={{
        flex: 1,
      }}
    >
        <Source id="my-data" type="geojson" data={{
            type: 'FeatureCollection',
            features: sectors
        }}>
            <Layer 
                id="my-data-layer"
                type="fill"
                paint={{
                    "fill-color": "#d9c85d",
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        1,
                        0.5,
                    ],
                }}
                source={'my-data'}
            />
        </Source>
    </ReactMapboxGl>
  );
};
