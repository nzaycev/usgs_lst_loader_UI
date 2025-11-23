import {
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import React from "react";
import { SceneStatus } from "../../../actions/main-actions";
import { useAppDispatch, useAppSelector } from "../../app";
import { selectUniqueFilterValues } from "../../pages/download-manager-page/download-manager-selectors";
import {
  AdditionType,
  downloadManagerActions,
} from "../../pages/download-manager-page/download-manager-slice";

export const FilterPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.downloadManager.filters);
  const uniqueValues = useAppSelector(selectUniqueFilterValues);

  const handleSatelliteToggle = (satellite: string) => {
    const current = filters.satelliteType || [];
    const newValue = current.includes(satellite)
      ? current.filter((s) => s !== satellite)
      : [...current, satellite];
    dispatch(
      downloadManagerActions.updateFilter({
        key: "satelliteType",
        value: newValue.length > 0 ? newValue : undefined,
      })
    );
  };

  const handleStatusToggle = (status: SceneStatus) => {
    const current = filters.status || [];
    const newValue = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    dispatch(
      downloadManagerActions.updateFilter({
        key: "status",
        value: newValue.length > 0 ? newValue : undefined,
      })
    );
  };

  const handleRegionToggle = (region: string) => {
    const current = filters.region || [];
    const newValue = current.includes(region)
      ? current.filter((r) => r !== region)
      : [...current, region];
    dispatch(
      downloadManagerActions.updateFilter({
        key: "region",
        value: newValue.length > 0 ? newValue : undefined,
      })
    );
  };

  const handleAdditionTypeToggle = (type: AdditionType) => {
    const current = filters.additionType || [];
    const newValue = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    dispatch(
      downloadManagerActions.updateFilter({
        key: "additionType",
        value: newValue.length > 0 ? newValue : undefined,
      })
    );
  };

  const satelliteCount = filters.satelliteType?.length || 0;
  const statusCount = filters.status?.length || 0;
  const regionCount = filters.region?.length || 0;
  const additionTypeCount = filters.additionType?.length || 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3 flex items-center gap-3 flex-wrap justify-between">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Satellite Type Filter */}
        <Menu closeOnSelect={false}>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDown size={16} />}
            size="sm"
            bg="gray.700"
            color="gray.200"
            _hover={{ bg: "gray.600" }}
            _active={{ bg: "gray.500" }}
            _expanded={{ bg: "gray.600" }}
            border="1px"
            borderColor="gray.600"
          >
            Satellite Type
            {satelliteCount > 0 && (
              <Badge ml={2} colorScheme="blue" borderRadius="full">
                {satelliteCount}
              </Badge>
            )}
          </MenuButton>
          <MenuList
            bg="gray.800"
            borderColor="gray.700"
            maxH="64"
            overflowY="auto"
            zIndex={20}
          >
            {uniqueValues.satellites.map((satellite) => (
              <MenuItem
                key={satellite}
                onClick={() => handleSatelliteToggle(satellite)}
                bg={
                  filters.satelliteType?.includes(satellite)
                    ? "gray.700"
                    : "gray.800"
                }
                color="gray.200"
                _hover={{ bg: "gray.700" }}
              >
                <input
                  type="checkbox"
                  checked={filters.satelliteType?.includes(satellite) || false}
                  readOnly
                  className="mr-2"
                  style={{ pointerEvents: "none" }}
                />
                {satellite}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        {/* Status Filter */}
        <Menu closeOnSelect={false}>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDown size={16} />}
            size="sm"
            bg="gray.700"
            color="gray.200"
            _hover={{ bg: "gray.600" }}
            _active={{ bg: "gray.500" }}
            _expanded={{ bg: "gray.600" }}
            border="1px"
            borderColor="gray.600"
          >
            Status
            {statusCount > 0 && (
              <Badge ml={2} colorScheme="blue" borderRadius="full">
                {statusCount}
              </Badge>
            )}
          </MenuButton>
          <MenuList
            bg="gray.800"
            borderColor="gray.700"
            maxH="64"
            overflowY="auto"
            zIndex={20}
          >
            {uniqueValues.statuses.map((status) => (
              <MenuItem
                key={status}
                onClick={() => handleStatusToggle(status)}
                bg={filters.status?.includes(status) ? "gray.700" : "gray.800"}
                color="gray.200"
                _hover={{ bg: "gray.700" }}
              >
                <input
                  type="checkbox"
                  checked={filters.status?.includes(status) || false}
                  readOnly
                  className="mr-2"
                  style={{ pointerEvents: "none" }}
                />
                {status}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        {/* Region Filter */}
        <Menu closeOnSelect={false}>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDown size={16} />}
            size="sm"
            bg="gray.700"
            color="gray.200"
            _hover={{ bg: "gray.600" }}
            _active={{ bg: "gray.500" }}
            _expanded={{ bg: "gray.600" }}
            border="1px"
            borderColor="gray.600"
          >
            Region
            {regionCount > 0 && (
              <Badge ml={2} colorScheme="blue" borderRadius="full">
                {regionCount}
              </Badge>
            )}
          </MenuButton>
          <MenuList
            bg="gray.800"
            borderColor="gray.700"
            maxH="64"
            overflowY="auto"
            zIndex={20}
          >
            {uniqueValues.regions.map((region) => (
              <MenuItem
                key={region}
                onClick={() => handleRegionToggle(region)}
                bg={filters.region?.includes(region) ? "gray.700" : "gray.800"}
                color="gray.200"
                _hover={{ bg: "gray.700" }}
              >
                <input
                  type="checkbox"
                  checked={filters.region?.includes(region) || false}
                  readOnly
                  className="mr-2"
                  style={{ pointerEvents: "none" }}
                />
                {region}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        {/* Addition Type Filter */}
        <Menu closeOnSelect={false}>
          <MenuButton
            as={Button}
            rightIcon={<ChevronDown size={16} />}
            size="sm"
            bg="gray.700"
            color="gray.200"
            _hover={{ bg: "gray.600" }}
            _active={{ bg: "gray.500" }}
            _expanded={{ bg: "gray.600" }}
            border="1px"
            borderColor="gray.600"
          >
            Addition Type
            {additionTypeCount > 0 && (
              <Badge ml={2} colorScheme="blue" borderRadius="full">
                {additionTypeCount}
              </Badge>
            )}
          </MenuButton>
          <MenuList bg="gray.800" borderColor="gray.700" zIndex={1000}>
            {uniqueValues.additionTypes.map((type) => (
              <MenuItem
                key={type}
                onClick={() => handleAdditionTypeToggle(type)}
                bg={
                  filters.additionType?.includes(type) ? "gray.700" : "gray.800"
                }
                color="gray.200"
                _hover={{ bg: "gray.700" }}
              >
                <input
                  type="checkbox"
                  checked={filters.additionType?.includes(type) || false}
                  readOnly
                  className="mr-2"
                  style={{ pointerEvents: "none" }}
                />
                {type === "local" ? "Local" : "Downloaded"}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </div>
      <button
        onClick={() => dispatch(downloadManagerActions.clearFilters())}
        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
      >
        Clear all
      </button>
    </div>
  );
};
