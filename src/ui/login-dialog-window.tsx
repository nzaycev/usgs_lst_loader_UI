import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { SettingsChema } from "../backend/settings-store";
import { checkUserPermissons } from "../backend/usgs-api";
import { DialogHeader } from "./dialog-header";

const LoginDialogWindow = () => {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [autoLogin, setAutoLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  const handleAutoLogin = async (user: string, pass: string) => {
    setCheckingPermissions(true);
    try {
      const creds: SettingsChema["userdata"] = {
        username: user,
        token: pass,
      };
      const { data } = (await checkUserPermissons(creds)) || {};
      if (data?.data?.includes?.("download")) {
        // Успешная авторизация
        window.ElectronAPI.invoke.sendLoginDialogResult({
          username: user,
          token: pass,
        });
      } else {
        // Нет прав доступа
        setCheckingPermissions(false);
        toast({
          title: "Permission denied",
          description: "Your credentials don't have download permissions",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (e) {
      console.error("Auto login error:", e);
      setCheckingPermissions(false);
      toast({
        title: "Login failed",
        description: "Unable to verify your credentials",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Получаем данные из hash при загрузке
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#login-dialog:")) {
      try {
        const dataStr = decodeURIComponent(
          hash.substring("#login-dialog:".length)
        );
        const data = JSON.parse(dataStr) as {
          username?: string;
          token?: string;
          autoLogin?: boolean;
        };
        setUsername(data.username || "");
        setToken(data.token || "");
        setAutoLogin(data.autoLogin ?? true);
        setLoading(false);

        // Если autoLogin=true и есть креды, пытаемся автоматически залогиниться
        if (data.autoLogin && data.username && data.token) {
          handleAutoLogin(data.username, data.token);
        }
      } catch (e) {
        console.error("Error parsing login dialog data:", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !token.trim()) {
      toast({
        title: "Error",
        description: "Username and password are required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setCheckingPermissions(true);
    try {
      const creds: SettingsChema["userdata"] = {
        username: username.trim(),
        token: token.trim(),
      };
      const { data } = (await checkUserPermissons(creds)) || {};
      if (data?.data?.includes?.("download")) {
        // Сохраняем креды
        await window.ElectronAPI.invoke.setStoreValue("userdata", creds);
        // Успешная авторизация
        window.ElectronAPI.invoke.sendLoginDialogResult({
          username: username.trim(),
          token: token.trim(),
        });
      } else {
        setCheckingPermissions(false);
        toast({
          title: "Permission denied",
          description: "Your credentials don't have download permissions",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (e) {
      console.error("Login error:", e);
      setCheckingPermissions(false);
      toast({
        title: "Login failed",
        description: "Unable to verify your credentials",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCancel = () => {
    window.ElectronAPI.invoke.sendLoginDialogResult(null);
  };

  if (loading || checkingPermissions) {
    return (
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <DialogHeader title="USGS Authentication" onClose={handleCancel} />
        <div
          style={{
            padding: "20px",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spinner size="xl" />
          <span style={{ marginLeft: "16px" }}>
            {loading ? "Loading..." : "Checking permissions..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <DialogHeader title="USGS Authentication" onClose={handleCancel} />
      <div style={{ padding: "20px", flex: 1, overflow: "auto" }}>
        <FormControl marginBottom={4}>
          <FormLabel>Username *</FormLabel>
          <Input
            placeholder="Enter your USGS username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="sm"
            isDisabled={checkingPermissions}
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>Password/Token *</FormLabel>
          <Input
            type="password"
            placeholder="Enter your password or token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            size="sm"
            isDisabled={checkingPermissions}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
        </FormControl>

        <Flex gap={2} justifyContent="flex-end" marginTop={4}>
          <Button onClick={handleCancel} isDisabled={checkingPermissions}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleLogin}
            isDisabled={checkingPermissions}
          >
            Log In
          </Button>
        </Flex>
      </div>
    </div>
  );
};

export const LoginDialogWindowApp = () => {
  return (
    <ChakraProvider>
      <LoginDialogWindow />
    </ChakraProvider>
  );
};
