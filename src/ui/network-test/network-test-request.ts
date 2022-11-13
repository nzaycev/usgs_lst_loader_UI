import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/dist/query";

export const testNetworkApi = createApi({
  baseQuery: fetchBaseQuery({
    cache: "no-store",
    baseUrl: "https://jsonplaceholder.typicode.com",
  }),
  endpoints(build) {
    return {
      test: build.query<unknown, void>({
        query: () => "/todos/1",
        keepUnusedDataFor: 0,
      }),
    };
  },
});
