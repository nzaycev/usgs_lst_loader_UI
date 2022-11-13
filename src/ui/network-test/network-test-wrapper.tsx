import { Box, CloseButton, Link, Spinner, useToast } from "@chakra-ui/react";
import { faBan, faWifi } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useAppDispatch, useAppSelector } from "../../entry-points/app";
import { networkSettingsSlice } from "../network-settings/network-settings-state";
import { NetworkState, testNetwork } from "./network-state";

export const NetworkTestWrapper: React.FC = ({ children }) => {
  const { networkState } = useAppSelector((state) => state.network);
  const dispatch = useAppDispatch();
  const [opened, setOpened] = useState(true);

  const renderMessage = ({
    title,
    message,
  }: {
    title: ReactNode | string;
    message: ReactNode | string;
  }) => {
    return (
      <>
        <h4>{title}</h4>
        <h5>{message}</h5>
      </>
    );
  };

  const renderDefault = renderMessage({
    title: (
      <>
        network state <Spinner />
      </>
    ),
    message: "network state is checking",
  });

  const renderSuccess = renderMessage({
    title: (
      <>
        network state <FontAwesomeIcon icon={faWifi} />
      </>
    ),
    message: "network state is ok",
  });

  const renderError = renderMessage({
    title: (
      <>
        network state <FontAwesomeIcon icon={faBan} />
      </>
    ),
    message: (
      <>
        <span>Connection is unstable. Please check the </span>
        <Link
          onClick={() => dispatch(networkSettingsSlice.actions.openSettings())}
        >
          settings
        </Link>
      </>
    ),
  });

  useEffect(() => {
    dispatch(testNetwork());
  }, [dispatch]);

  useEffect(() => {
    setOpened(true);
    if (networkState === NetworkState.Stable) {
      setTimeout(() => setOpened(false), 3000);
    }
  }, [networkState]);

  return (
    <>
      {children}
      <ToastContainer state={networkState} opened={opened}>
        <CloseButton
          onClick={() => setOpened(false)}
          pos="absolute"
          right={12}
        />
        {networkState === NetworkState.Unstable && renderError}
        {networkState === NetworkState.Stable && renderSuccess}
        {networkState === NetworkState.Unknown && renderDefault}
      </ToastContainer>
    </>
  );
};

const slideUp = keyframes`
  0% {
    transform: translateY(100%);
  }
  100% {
    transform: translateX(0%);
  }
`;

const colorMap: Record<NetworkState, string> = {
  [NetworkState.Stable]: "green",
  [NetworkState.Unstable]: "red",
  [NetworkState.Unknown]: "gray",
};

const ToastContainer = styled.div<{ state: NetworkState; opened: boolean }>`
  animation: ${slideUp} 0.5s;
  box-shadow: 0px 10px 10px 10px #000000a1;
  padding: 16px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  background-color: ${({ state }) => colorMap[state]};
  transition: all 0.5s;
  transform: ${({ opened }) =>
    opened ? "translateY(0%)" : "translateY(100%)"};
  color: white;
  h4 {
    font-weight: 500;
  }
`;
