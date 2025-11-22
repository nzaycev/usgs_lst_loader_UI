import { Spinner, useToast } from "@chakra-ui/react";
import { Database } from "lucide-react";
import React, { useEffect } from "react";
import { addSceneToRepo } from "../actions/main-actions";
import { useSearchScenesQuery } from "../actions/searchApi";
import { useAppDispatch, useAppSelector } from "./app";
import { useTypedLocation } from "./mainWindow";
import { useHelperSearch } from "./SystemHelper";

export const DateList = () => {
  const { state: spatial } = useTypedLocation<"/date_list">();
  // const navigate = useTypedNavigate()
  const { isLoading, data, error } = useSearchScenesQuery({
    bounds: {
      lng: [spatial.start[0], spatial.end[0]],
      lat: [spatial.start[1], spatial.end[1]],
    },
  });
  const toast = useToast();

  const dispatch = useAppDispatch();

  const { scenes, wait } = useAppSelector((state) => state.main);

  const { toggle, value } = useHelperSearch();

  useEffect(() => {
    toggle(!isLoading);
    return () => {
      toggle(false);
    };
  }, [isLoading]);

  if (error) {
    return (
      <div className="p-10 whitespace-pre-line">
        {JSON.stringify(error, null, 2)}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <ul
            className={`list-none m-0 flex-shrink-0 p-0 pb-5 max-w-md mx-auto ${
              wait ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {data.results
              .filter((x) => !value || x.displayId.includes(value))
              .map(({ displayId, entityId, temporalCoverage }: any) => {
                const currentScene = scenes[displayId];
                const isCurrentSceneReady = !!currentScene;
                return (
                  <li
                    key={entityId}
                    className={`px-4 py-2 m-0 whitespace-nowrap flex justify-center items-center rounded ${
                      isCurrentSceneReady
                        ? "text-blue-400 cursor-default bg-blue-900/30"
                        : "cursor-pointer hover:bg-gray-700 text-gray-200"
                    }`}
                    onClick={async () => {
                      if (!isCurrentSceneReady) {
                        await dispatch(
                          addSceneToRepo({
                            displayId,
                            entityId,
                          })
                        ).unwrap();
                        toast({
                          title: "The scene was added to main repo",
                          position: "bottom-left",
                          description:
                            "You can go to the home page to start downloading",
                          duration: 5000,
                          isClosable: true,
                        });
                      }
                    }}
                  >
                    <span className="mx-1">
                      {temporalCoverage.startDate.split(" ")[0]}
                    </span>
                    {isCurrentSceneReady && (
                      <Database size={16} className="mx-1" />
                    )}
                    <span className="text-gray-500 text-xs mx-1">
                      {displayId}
                    </span>
                    {/* uncomment when virtualized */}
                    {/* <img src={browse[0].thumbnailPath}/> */}
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
};
