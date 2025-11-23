import { Badge, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app";
import {
  downloadManagerActions,
  SortField,
} from "../../pages/download-manager-page/download-manager-slice";

const sortFieldLabels: Record<SortField, string> = {
  date: "Date",
  name: "Name",
  satellite: "Satellite",
  region: "Region",
  status: "Status",
  size: "Size",
  additionType: "Source",
};

const sortFieldShortLabels: Record<SortField, string> = {
  date: "Date",
  name: "Name",
  satellite: "Sat",
  region: "Reg",
  status: "Stat",
  size: "Size",
  additionType: "Src",
};

export const SortButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sortField, sortDirection } = useAppSelector(
    (state) => state.downloadManager
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSortFieldSelect = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      dispatch(
        downloadManagerActions.setSortDirection(
          sortDirection === "asc" ? "desc" : "asc"
        )
      );
    } else {
      dispatch(downloadManagerActions.setSortField(field));
    }
    setIsMenuOpen(false);
  };

  const handleResetSort = () => {
    dispatch(downloadManagerActions.setSortField("date"));
    dispatch(downloadManagerActions.setSortDirection("desc"));
    setIsMenuOpen(false);
  };

  const hasCustomSort = sortField !== "date" || sortDirection !== "desc";

  return (
    <div className="flex items-center gap-2">
      <Menu
        isOpen={isMenuOpen}
        onOpen={() => setIsMenuOpen(true)}
        onClose={() => setIsMenuOpen(false)}
        placement="bottom-end"
        matchWidth={false}
        offset={[0, 4]}
        flip={true}
        gutter={0}
      >
        <MenuButton
          as="button"
          className={`p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors border border-gray-700 relative flex items-center gap-1 ${
            isMenuOpen ? "bg-gray-700" : ""
          }`}
        >
          {sortDirection === "asc" ? (
            <ArrowUpNarrowWide size={18} />
          ) : (
            <ArrowDownWideNarrow size={18} />
          )}
          {hasCustomSort && (
            <>
              <Badge
                colorScheme="blue"
                bg="blue.600"
                className="absolute -top-1 -right-1 min-w-fit h-[16px] flex items-center justify-center text-[9px] px-1"
                title={`${sortFieldLabels[sortField]} (${
                  sortDirection === "asc" ? "ascending" : "descending"
                })`}
              >
                {sortFieldShortLabels[sortField]}
              </Badge>
            </>
          )}
        </MenuButton>
        <MenuList
          bg="gray.800"
          borderColor="gray.700"
          zIndex={20}
          minW="160px"
          w="auto"
        >
          {Object.entries(sortFieldLabels).map(([field, label]) => {
            const isSelected = sortField === field;
            return (
              <MenuItem
                key={field}
                onClick={() => handleSortFieldSelect(field as SortField)}
                bg={isSelected ? "gray.700" : "gray.800"}
                color="gray.200"
                _hover={{ bg: "gray.700" }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span>{label}</span>
                  {isSelected && (
                    <span className="ml-auto">
                      {sortDirection === "asc" ? (
                        <ArrowUpNarrowWide size={14} />
                      ) : (
                        <ArrowDownWideNarrow size={14} />
                      )}
                    </span>
                  )}
                </div>
              </MenuItem>
            );
          })}
          {hasCustomSort && (
            <>
              <MenuItem
                onClick={handleResetSort}
                bg="gray.800"
                color="blue.400"
                _hover={{ bg: "gray.700" }}
                className="border-t border-gray-700 mt-1"
              >
                Reset to default
              </MenuItem>
            </>
          )}
        </MenuList>
      </Menu>
    </div>
  );
};
