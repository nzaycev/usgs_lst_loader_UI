import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

import {
  faRefresh,
  faFolderOpen,
  faTimes,
  faHouseChimney,
  faWifiStrong,
} from "@fortawesome/free-solid-svg-icons";
import { useTypedNavigate } from "./mainWindow";
import { useDispatch } from "react-redux";
import { networkSettingsSlice } from "./network-settings/network-settings-state";
import styled from "styled-components";
// import { ElectonAPI } from "../tools/ElectronApi";

// const { ipcRenderer } = window.require('electron')

export const SystemHelper = () => {
  const navigate = useTypedNavigate();
  const dispatch = useDispatch();
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
      <DragArea style={{ flex: 1, height: 0 }}></DragArea>
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
