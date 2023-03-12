import { Button, Heading, Input, toast } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { mainActions } from "../actions/main-actions";
import { SettingsChema } from "../backend/settings-store";
import { checkUserPermissons } from "../backend/usgs-api";
import { useAppDispatch } from "../entry-points/app";

export const LoginView = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [userCreds, setUserCreds] = useState<SettingsChema["userdata"]>();
  useEffect(() => {
    const getCreds = async () => {
      const creds = (await window.ElectronAPI.invoke.getStoreValue(
        "userdata"
      )) as SettingsChema["userdata"];
      console.log({ creds });
      setUserCreds(creds);
      setLoading(false);
    };
    getCreds();
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data } = (await checkUserPermissons(userCreds)) || {};
        console.log({ data });
        if (data?.data?.includes?.("download")) {
          setHasPermissions(true);
          dispatch(mainActions.actions.getAccess());
        }
      } catch (e) {
        toast.notify(() => "something's wrong with creds");
      }
      setCheckingPermissions(false);
    };
    if (userCreds && userCreds.password && userCreds.username) {
      setUsername(userCreds.username);
      setPassword(userCreds.password);
      setCheckingPermissions(true);
      checkPermissions();
    }
  }, [userCreds, dispatch]);

  const login = useCallback(() => {
    const user: SettingsChema["userdata"] = {
      username,
      password,
    };
    window.ElectronAPI.invoke.setStoreValue("userdata", user);
    setUserCreds(user);
  }, [username, password]);

  if (loading) {
    return <Page>checking store</Page>;
  }
  if (checkingPermissions) {
    return <Page>checking permissions</Page>;
  }
  if (hasPermissions) {
    return <Page>redirecting to the main view</Page>;
  }
  return (
    <Page>
      <h4>enter your credentials</h4>
      <Input
        placeholder="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="button" onClick={login}>
        log in
      </Button>
    </Page>
  );
};

const Page = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex-direction: column;
  & > * {
    max-width: 300px;
    margin-top: 8px;
  }
`;
