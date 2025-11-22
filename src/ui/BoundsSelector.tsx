import React, { useRef, useState } from "react";
import { MapContainer } from "./mapbox/mapContainer";
import { bboxPolygon } from "@turf/turf";
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
  const [selectionCoordinates, setSelectionCoordinates] = useState<ISelectionCoordinates | null>(null);
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
              ...old!,
              end: [e.lngLat.lng, e.lngLat.lat],
            }));
            setReadySelection(true);
          }
        }}
      />
      <div className="fixed bottom-0 bg-gray-800/90 backdrop-blur-sm w-full h-[60px] flex items-center justify-center pb-5 text-center border-t border-gray-700">
        {!readySelection ? (
          <div>
            <p>Поставьте 2 точки на карте</p>
            <p>
              или{' '}
              <a
                href="#"
                className="underline"
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
          </div>
        ) : (
          <>
            <button
              className="bg-blue-600 px-4 py-2 mx-2 rounded border-none text-white font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              onClick={() => {
                setReadySelection(false);
                setSelectionCoordinates(null);
              }}
            >
              Изменить область
            </button>
            <button
              className="bg-blue-600 px-4 py-2 mx-2 rounded border-none text-white font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              onClick={() => {
                navigate("/date_list", { state: selectionCoordinates });
              }}
            >
              Далее
            </button>
          </>
        )}
      </div>
    </div>
  );
};
