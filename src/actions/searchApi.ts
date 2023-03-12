import { createApi } from "@reduxjs/toolkit/query/react";
import { Polygon } from "@turf/turf";
import { transform } from "lodash";
import { searchScenes } from "../backend/usgs-api";
import { ISearchScenesFilter, RequestApi } from "../tools/ElectronApi";

async function baseQuery({
  type,
  args,
}: {
  type: keyof RequestApi;
  args: any;
}) {
  try {
    const data = await searchScenes(args);
    return data;
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
  }),
});
export const { useSearchScenesQuery } = searchApi;

export { searchApi };
