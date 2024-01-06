import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useMemo } from "react";

import {
  faRefresh,
  faFolderOpen,
  faTimes,
  faHouseChimney,
  faWifiStrong,
  faCircleDown,
  faSearch,
  faCross,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useTypedNavigate } from "./mainWindow";
import { useDispatch } from "react-redux";
import { networkSettingsSlice } from "./network-settings/network-settings-state";
import styled from "styled-components";
import { useAppDispatch, useAppSelector } from "../entry-points/app";
import {
  Flex,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
} from "@chakra-ui/react";
import { mainActions } from "../actions/main-actions";
// import { ElectonAPI } from "../tools/ElectronApi";

// const { ipcRenderer } = window.require('electron')

const useIsLoading = () => {
  const scenes = useAppSelector((state) => state.main.scenes);
  return useMemo(() => {
    for (const i in scenes) {
      const scene = scenes[i];
      for (const fileId in scene.donwloadedFiles) {
        if (
          scene.donwloadedFiles[fileId as keyof typeof scene.donwloadedFiles]
            .progress !== 1
        ) {
          return true;
        }
      }
    }
    return false;
  }, [scenes]);
};

export const useHelperSearch = () => {
  const searchEnabled = useAppSelector((state) => state.main.searchEnabled);
  const value = useAppSelector((state) => state.main.searchValue);
  const dispatch = useAppDispatch();
  const setValue = (value: string) =>
    dispatch(mainActions.actions.setSearch(value));
  const toggle = (value: boolean) =>
    dispatch(mainActions.actions.toggleSearch(value));
  return {
    searchEnabled,
    value,
    setValue,
    toggle,
  };
};

export const SystemHelper = () => {
  const navigate = useTypedNavigate();
  const dispatch = useDispatch();
  const { value, setValue, searchEnabled } = useHelperSearch();
  return (
    <StyledHelper>
      <span
        title="Close app"
        onClick={() => {
          console.log("aaa", window as any);
          window.close();
          // ;(window as any).api.send('message', {data: 123})

          // ipcRenderer.emit('message', {data: 123})
        }}
      >
        <FontAwesomeIcon icon={faTimes} />
      </span>
      <span title="Reload page" onClick={() => location.reload()}>
        <FontAwesomeIcon icon={faRefresh} />
      </span>
      <span
        title="Open out folder"
        onClick={() => window.ElectronAPI.invoke.openExplorer("")}
      >
        <FontAwesomeIcon icon={faFolderOpen} />
      </span>

      <span
        title="Settings"
        onClick={() => dispatch(networkSettingsSlice.actions.openSettings())}
      >
        <FontAwesomeIcon icon={faWifiStrong} />
      </span>
      <DragArea style={{ flex: 1, height: 0 }} />
      {searchEnabled && (
        <Flex
          style={{ direction: "ltr" }}
          position="absolute"
          width={"100%"}
          pointerEvents={"none"}
          height={"100%"}
          alignItems={"center"}
          justifyContent={"center"}
        >
          <InputGroup height={6} pointerEvents={"all"} width={"30%"}>
            <InputLeftElement height={6}>
              <FontAwesomeIcon icon={faSearch} />
            </InputLeftElement>
            <Input
              height={6}
              placeholder={"search"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <InputRightElement height={6}>
              <FontAwesomeIcon
                onClick={() => {
                  setValue("");
                }}
                icon={faTimesCircle}
              />
            </InputRightElement>
          </InputGroup>
        </Flex>
      )}
      <span title="Loading State" style={{ cursor: "default" }}>
        <FontAwesomeIcon
          icon={faCircleDown}
          style={{ color: useIsLoading() ? "green" : "inherit" }}
        />
      </span>
      <span title="Home" onClick={() => navigate("/")}>
        <FontAwesomeIcon icon={faHouseChimney} />
      </span>
    </StyledHelper>
  );
};

const DragArea = styled.div`
  -webkit-app-region: drag !important;
  user-select: none;
`;

const StyledHelper = styled(DragArea)`
  position: fixed;
  display: flex;
  width: 100%;
  direction: rtl;
  align-items: center;
  padding: 0 4px;
  height: 40px;
  color: gainsboro;
  right: 0;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgb(233, 233, 233);
  background-color: rgba(62, 62, 62, 0.071);
  & > * {
    -webkit-app-region: no-drag;
    padding: 0.5em 0.5em;
    cursor: pointer;
    mix-blend-mode: color-burn;
  }

  & > .close-btn {
    position: relative;
    height: 100%;
    color: rgb(144, 144, 144);
    display: block;
    &:hover {
      color: gray;
    }
    &::after {
      --rotate: -45deg;
    }
    &::before {
      --rotate: 45deg;
    }
    &::after,
    &::before {
      content: "";
      display: block;
      position: absolute;
      width: 0.7em;
      height: 2px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(var(--rotate));
      background-color: currentColor;
    }
  }
`;
