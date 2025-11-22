import { CloseButton, Link, Spinner } from "@chakra-ui/react";
import { Wifi, WifiOff } from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app";
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
        network state <Wifi size={18} className="inline" />
      </>
    ),
    message: "network state is ok",
  });

  const renderError = renderMessage({
    title: (
      <>
        network state <WifiOff size={18} className="inline" />
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

  const colorMap: Record<NetworkState, string> = {
    [NetworkState.Stable]: "bg-green-600",
    [NetworkState.Unstable]: "bg-red-600",
    [NetworkState.Unknown]: "bg-gray-600",
  };

  return (
    <>
      {children}
      <div
        className={`animate-[slideUp_0.5s] shadow-[0px_10px_10px_10px_rgba(0,0,0,0.63)] p-4 fixed bottom-0 w-full text-center flex flex-col transition-all duration-500 text-white ${
          colorMap[networkState]
        } ${opened ? "translate-y-0" : "translate-y-full"}`}
      >
        <CloseButton
          onClick={() => setOpened(false)}
          className="absolute right-3"
        />
        {networkState === NetworkState.Unstable && renderError}
        {networkState === NetworkState.Stable && renderSuccess}
        {networkState === NetworkState.Unknown && renderDefault}
      </div>
      <style>{`
        @keyframes slideUp {
          0% {
            transform: translateY(100%);
          }
          100% {
            transform: translateY(0%);
          }
        }
      `}</style>
    </>
  );
};
