import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef, useState } from "react";

mapboxgl.accessToken =
  "pk.eyJ1IjoibnpheWNldiIsImEiOiJjazhudXZnaGMwMmIzM2RvM2N3MDl2dmNwIn0.cNCktRFle2xX3PsaB-l0MQ";

export const MapContainer = React.forwardRef<
  any,
  {
    geoJsonData?: any;
    paint?: any;
    mouseMove?: (e: any) => void;
    layerType?: "fill" | "line";
    onClick?: (e: any) => void;
  }
>((props, ref = React.createRef()) => {
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(92.9);
  const [lat, setLat] = useState(56.05);
  const [zoom, setZoom] = useState(10);

  const map = useRef(null);

  const mapCurrent = () => map.current;

  const setMapData = (data: any) => {
    const map = mapCurrent();
    if (!map) return;
    const source = map.getSource("my-data");
    if (source && source.type === "geojson") {
      source.setData(data);
    }
  };

  React.useImperativeHandle(
    ref,
    () => ({
      setData: (data: any) => setMapData(data),
      getBounds: () => map.current.getBounds(),
      resize: () => map.current?.resize(),
    }),
    []
  );

  const awaitMap = () =>
    new Promise<void>((resolve, reject) => {
      if (!mapCurrent()) {
        reject();
        return;
      }
      if (mapCurrent().loaded()) {
        resolve();
        return;
      }
      mapCurrent().on("load", resolve);
    });

  const setOnClick = async () => {
    try {
      await awaitMap();
      if (!mapCurrent()) return;
      console.log("set onclick");
      mapCurrent().on("click", props.onClick);
    } catch (e) {
      /** noop */
    }
  };

  const setOnMouseMove = async () => {
    try {
      await awaitMap();
      if (!mapCurrent()) return;
      console.log("set mouseMove");
      mapCurrent().on("mousemove", props.mouseMove);
    } catch (e) {
      console.error(e);
    }
  };

  const setData = async (data: any) => {
    try {
      await awaitMap();
      if (!mapCurrent()) return;
      console.log("set data");
      mapCurrent().addSource("my-data", data);
      mapCurrent().addLayer({
        id: "my-data",
        source: "my-data",
        type: props.layerType || "line",
        layout: {},
        paint: {
          "fill-color": "blue",
          "fill-opacity": 0.5,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!props.onClick) return;
    const onClick = props.onClick;
    setOnClick();
    return () => {
      if (!mapCurrent()) return;
      mapCurrent().off("click", onClick);
    };
  }, [props.onClick]);

  useEffect(() => {
    if (!props.mouseMove) return;
    const mouseMove = props.mouseMove;
    setOnMouseMove();
    return () => {
      if (!mapCurrent()) return;
      mapCurrent().off("mousemove", mouseMove);
    };
  }, [props.mouseMove]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: zoom,
      projection: { name: "mercator" },
    });
    map.current.getData = () => map.current.getSource("my-data")._data;
    map.current.setData = (data: any) =>
      map.current.getSource("my-data").setData(data);

    map.current.on("move", () => {
      if (map.current) return;
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });
    if (props.onClick) setOnClick();
    if (props.mouseMove) setOnMouseMove();
    setData({
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }, []);

  useEffect(() => {
    if (!props.geoJsonData) {
      // Clear data if geoJsonData is undefined
      const map = mapCurrent();
      if (map) {
        const source = map.getSource("my-data");
        if (source && source.type === "geojson") {
          source.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      }
      return;
    }
    const updateData = async () => {
      try {
        await awaitMap();
        const map = mapCurrent();
        if (!map) return;
        const source = map.getSource("my-data");
        if (source && source.type === "geojson") {
          source.setData(props.geoJsonData);
        }
      } catch (e) {
        console.error(e);
      }
    };
    updateData();
  }, [props.geoJsonData]);

  return <div ref={mapContainer} className="map-container w-full h-full" />;
});
