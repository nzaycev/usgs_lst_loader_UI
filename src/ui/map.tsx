import React, { useEffect, useRef, useState } from "react";
import ReactMapboxGl, { Layer, Feature, GeoJSONLayer } from "react-mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AnyShapeCoordinates } from "react-mapbox-gl/lib/util/types";
import { Source } from "react-mapbox-gl/lib/source";

export const Map = ReactMapboxGl({
  pitchWithRotate: false,
  renderWorldCopies: false,
  dragRotate: false,
  accessToken:
    "pk.eyJ1IjoibnpheWNldiIsImEiOiJjazhudXZnaGMwMmIzM2RvM2N3MDl2dmNwIn0.cNCktRFle2xX3PsaB-l0MQ",
});

export interface IFeature {
  coordinates: AnyShapeCoordinates;
  type: string;
  properties: any;
}

interface IMap {
  sectors: IFeature[];
  loading: boolean;
  startDownloading(props: { entityId: string; displayId: string }): void;
}

const useHoverFeature = (
  mapRef: React.MutableRefObject<any>,
  setSectorProperty?: any
) => {
  const onMouseEnter = (e: any) => {
    if (!mapRef.current) {
      return;
    }
    // setSectorProperty("hover", true);

    console.log(e);

    mapRef.current.container.children[1].children[0].style.cursor = "pointer";
  };
  const onMouseLeave = (e: any) => {
    if (!mapRef.current) {
      return;
    }
    // setSectorProperty("hover", false);
    mapRef.current.container.children[1].children[0].style.cursor = "grab";
  };
  return {
    onMouseEnter,
    onMouseLeave,
  };
};

// in render()
export const MapView = ({
  sectors: _sectors,
  startDownloading,
  loading,
}: IMap) => {
  const [sectors, setSectors] = useState(_sectors);
  useEffect(() => {
    setSectors(_sectors);
  }, [_sectors]);
  const setSectorProperty = (id: string) => (key: string, value: any) => {
    setSectors((oldSectors) => {
      const oneSector = oldSectors.find((x) => x.properties.id === id);
      if (!oneSector) return oldSectors;
      oneSector.properties[key] = value;
      console.log(oneSector);
      console.log(map.current.state.map)
      console.log({ source: "fill", id }, { [key]: value })
      const mapData = map.current.state.map.getSource('fill')._data
      map.current.state.map.getSource('fill').setData({...mapData, features: oldSectors});
      return oldSectors;
    });
  };
  const map = useRef(null);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState<[number]>([0]);
  const updatePosition = (map: any, event: any) => {
    if (event.fitboundUpdate) {
      setZoom(map.getZoom());
      setCenter(map.getCenter());
    }
  };
  return (
    <Map
      style="mapbox://styles/mapbox/streets-v11"
      ref={map}
      containerStyle={{
        flex: 1,
      }}
      center={center}
      onMove={updatePosition}
      onZoom={updatePosition}
      zoom={zoom}
    >
      <Layer
        type="fill"
        id="fill"
        paint={{
          "fill-color": "#d9c85d",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            0.5,
          ],
        }}
      >
        {sectors.map((sector, index) => {
          const hover = useHoverFeature(
            map,
            setSectorProperty(sector.properties.id)
          );
          //   console.log("aaa", sector.properties.hover);
          return (
            <Feature
              {...hover}
              key={index + sector.properties.hover}
              //   {...sector}
              coordinates={sector.coordinates}
              properties={sector.properties}
              onClick={(e: any) => {
                console.log(e);
                if (loading) {
                  return;
                }
                startDownloading(e.feature.properties);
              }}
            />
          );
        })}
      </Layer>
      <Layer type="line" id="marker" paint={{ "line-color": "#d9c85d" }}>
        {sectors.map(({ coordinates, ...sector }, index) => (
          <Feature
            key={index}
            {...sector}
            coordinates={coordinates[0] as AnyShapeCoordinates}
          />
        ))}
      </Layer>
    </Map>
  );
};
