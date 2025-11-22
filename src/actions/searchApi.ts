import { createApi } from "@reduxjs/toolkit/query/react";
import { Polygon } from "@turf/turf";
import { ISearchScenesFilter } from "../tools/ElectronApi";

async function baseQuery({
  type,
  args,
}: {
  type: "getScene" | "searchScene";
  args: any;
}) {
  try {
    if (type === "getScene") {
      const data = await window.ElectronAPI.invoke.usgsReindexScene(
        args.displayId
      );
      return data;
    } else {
      const data = await window.ElectronAPI.invoke.usgsSearchScenes(args);
      return data;
    }
  } catch (e) {
    throw new Error(e);
  }
}

interface IBrowse {
  browseName: string;
  browsePath: string;
  id: string;
  overlayPath: string;
  overlayType: string;
  thumbnailPath: string;
}

interface ISearchResponseItem {
  browse: IBrowse[];
  cloudCover: string;
  displayId: string;
  entityId: string;
  options: {
    bulk: boolean;
    download: boolean;
    order: boolean;
    secondary: boolean;
  };
  publishDate: string;
  selected: { bulk: boolean; compare: boolean; order: boolean };
  spatialBounds: Polygon;
  spatialCoverage: Polygon;
  temporalCoverage: {
    startDate: string;
    endDate: string;
  };
}

interface ISearchResponse {
  isCustomized: boolean;
  nextRecord: number;
  numExcluded: number;
  recordsReturned: number;
  startingNumber: number;
  totalHits: number;
  totalHitsAccuracy: "string";
  results: ISearchResponseItem[];
}

const searchApi = createApi({
  reducerPath: "searchApi",
  baseQuery,
  endpoints: (builder) => ({
    searchScenes: builder.query<ISearchResponse, ISearchScenesFilter>({
      // @ts-ignore
      query: (args) => {
        return {
          type: "searchScenes",
          args: args,
        };
      },
    }),
    getSceneById: builder.query<ISearchResponse, string>({
      query: (displayId) => {
        return {
          type: "getScene",
          args: { displayId },
        };
      },
    }),
  }),
});
export const { useSearchScenesQuery, useLazyGetSceneByIdQuery } = searchApi;

export { searchApi };
