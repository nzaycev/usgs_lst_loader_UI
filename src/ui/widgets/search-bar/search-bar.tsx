import { Search } from "lucide-react";
import React from "react";
import { useAppDispatch, useAppSelector } from "../../app";
import { downloadManagerActions } from "../../pages/download-manager-page/download-manager-slice";

export const SearchBar: React.FC = () => {
  const searchQuery = useAppSelector(
    (state) => state.downloadManager.searchQuery
  );
  const dispatch = useAppDispatch();

  return (
    <div className="flex-1 relative">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
      />
      <input
        type="text"
        placeholder="Search collections..."
        value={searchQuery}
        onChange={(e) =>
          dispatch(downloadManagerActions.setSearchQuery(e.target.value))
        }
        className="w-full bg-gray-800 text-gray-200 pl-10 pr-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
};

