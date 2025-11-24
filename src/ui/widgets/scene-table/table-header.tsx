import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
import { useAppDispatch, useAppSelector } from "../../app";
import {
  downloadManagerActions,
  SortField,
} from "../../pages/download-manager-page/download-manager-slice";

interface TableHeaderProps {
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  hasItems: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  onSelectAll,
  allSelected,
  hasItems,
}) => {
  const dispatch = useAppDispatch();
  const { sortField, sortDirection } = useAppSelector(
    (state) => state.downloadManager
  );

  const handleSort = (field: SortField) => {
    dispatch(downloadManagerActions.setSortField(field));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} className="inline ml-1" />
    ) : (
      <ChevronDown size={14} className="inline ml-1" />
    );
  };

  return (
    <thead className="bg-gray-900 sticky top-0 z-10">
      <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
        <th></th>
        {/* временно убрал, т.к. пока нормально не работает */}
        {/* <th className="p-3 w-10">
          <input
            type="checkbox"
            onChange={(e) => onSelectAll(e.target.checked)}
            checked={allSelected && hasItems}
          />
        </th> */}
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none"
          onClick={() => handleSort("additionType")}
        >
          Source
          <SortIcon field="additionType" />
        </th>
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none"
          onClick={() => handleSort("name")}
        >
          Name / Scene ID
          <SortIcon field="name" />
        </th>
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none"
          onClick={() => handleSort("satellite")}
        >
          Satellite
          <SortIcon field="satellite" />
        </th>
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none"
          onClick={() => handleSort("region")}
        >
          Region
          <SortIcon field="region" />
        </th>
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none w-[84px]"
          onClick={() => handleSort("status")}
        >
          Status
          <SortIcon field="status" />
        </th>
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none"
          onClick={() => handleSort("date")}
        >
          Date
          <SortIcon field="date" />
        </th>
        <th
          className="p-3 cursor-pointer hover:text-gray-200 select-none"
          onClick={() => handleSort("size")}
        >
          Size
          <SortIcon field="size" />
        </th>
        <th className="p-3">Actions</th>
      </tr>
    </thead>
  );
};
