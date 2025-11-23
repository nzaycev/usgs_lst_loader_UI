import { Badge } from "@chakra-ui/react";
import { Filter } from "lucide-react";
import React from "react";
import { useAppDispatch, useAppSelector } from "../../app";
import { selectActiveFiltersCount } from "../../pages/download-manager-page/download-manager-selectors";
import { downloadManagerActions } from "../../pages/download-manager-page/download-manager-slice";

export const FilterButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const isFilterPanelOpen = useAppSelector(
    (state) => state.downloadManager.isFilterPanelOpen
  );
  const activeFiltersCount = useAppSelector(selectActiveFiltersCount);

  return (
    <button
      onClick={() =>
        dispatch(downloadManagerActions.setFilterPanelOpen(!isFilterPanelOpen))
      }
      className={`p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors border border-gray-700 relative ${
        isFilterPanelOpen ? "bg-gray-700" : ""
      }`}
    >
      <Filter size={18} />
      {activeFiltersCount > 0 && (
        <Badge
          colorScheme="blue"
          bg="blue.600"
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1"
        >
          {activeFiltersCount}
        </Badge>
      )}
    </button>
  );
};
