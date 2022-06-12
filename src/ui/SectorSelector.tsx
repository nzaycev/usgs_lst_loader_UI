import axios from "axios";
import React from "react";
import { useLoader } from "../tools/request";
import { getUrl } from "../tools/urls";
import { MapView } from "./map";
import { INavigation } from "./Router";

const dateFormat = (date: Date) => `
    ${date.getFullYear()}-${(date.getMonth() + 1)
  .toString()
  .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}
`;

const appendDate = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const loader = (startDate: Date, endDate: Date) =>
  axios.post(getUrl("searchScenes"), {
    startDate: dateFormat(startDate),
    endDate: dateFormat(endDate),
  });

export const SectorSelector = ({ navigation }: { navigation: INavigation }) => {
  const startDate = navigation.getData();
  const endDate = appendDate(startDate, 1);
  console.log({
    startDate,
    endDate,
    url: getUrl("searchScenes", dateFormat(startDate), dateFormat(endDate)),
  });
  const { data, isLoading } = useLoader(
    () => loader(startDate, endDate),
    (x) => x.data
  );

  const sectors = data
    ? data.results.map((xx: any, index: number) => ({
        ...xx.spatialBounds,
        properties: { ...xx, id: index },
      }))
    : [];
  return (
    <>
      <MapView
        sectors={sectors}
        startDownloading={(properties) => {
          navigation.go("download", properties);
          // startDownloading({ setLoadingState, ...properties });
        }}
        loading={isLoading}
      />
    </>
  );
};
