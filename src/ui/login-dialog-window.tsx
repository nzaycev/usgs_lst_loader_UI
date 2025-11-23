import {
  Button,
  ChakraProvider,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { darkTheme } from "./theme";
import React, { useEffect, useState } from "react";
import { SettingsChema } from "../main/settings-store";
import { ModalSystemHelper } from "./ModalSystemHelper";

type UsgsApiStatus = {
  auth: "guest" | "authorizing" | "authorized";
  username?: string;
};

const LoginDialogWindow = () => {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [, setAutoLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [status, setStatus] = useState<UsgsApiStatus | null>(null);

  const checkPermissions = async (
    creds: SettingsChema["userdata"],
    onSuccess: () => void
  ) => {
    setCheckingPermissions(true);
    try {
      const result = await window.ElectronAPI.invoke.usgsCheckUserPermissions(
        creds
      );
      const data = result?.data;
      if (data?.data?.includes?.("download")) {
        // Успешная авторизация
        onSuccess();
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
    } catch (e: unknown) {
      console.error("Login error:", e);
      setCheckingPermissions(false);
      const errorMessage =
        e instanceof Error ? e.message : "Unable to verify your credentials";
      toast({
        title: "Login failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAutoLogin = async (user: string, pass: string) => {
    const creds: SettingsChema["userdata"] = {
      username: user,
      token: pass,
    };
    await checkPermissions(creds, () => {
      window.ElectronAPI.invoke.sendLoginDialogResult({
        username: user,
        token: pass,
      });
    });
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
  }, []);

  // Load initial status and listen for status changes
  useEffect(() => {
    const loadStatus = async () => {
      const currentStatus = await window.ElectronAPI.invoke.usgsGetStatus();
      setStatus(currentStatus);
    };
    loadStatus();

    const handleStatusChange = (_event: unknown, newStatus: UsgsApiStatus) => {
      setStatus(newStatus);
    };

    window.ElectronAPI.on.usgsApiStatusChange(handleStatusChange);

    return () => {
      // Cleanup listener if needed
    };
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

    const creds: SettingsChema["userdata"] = {
      username: username.trim(),
      token: token.trim(),
    };
    await checkPermissions(creds, async () => {
      // Сохраняем креды
      await window.ElectronAPI.invoke.setStoreValue("userdata", creds);
      // Успешная авторизация
      window.ElectronAPI.invoke.sendLoginDialogResult({
        username: username.trim(),
        token: token.trim(),
      });
    });
  };

  const handleCancel = () => {
    window.ElectronAPI.invoke.sendLoginDialogResult(null);
  };

  if (loading || checkingPermissions) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <ModalSystemHelper title="USGS Authentication" onClose={handleCancel} />
        <div className="p-5 flex-1 flex items-center justify-center">
          <Spinner size="xl" />
          <span className="ml-4 text-gray-200">
            {loading ? "Loading..." : "Checking permissions..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <ModalSystemHelper title="USGS Authentication" onClose={handleCancel} />
      <div className="p-5 flex-1 overflow-auto">
        <FormControl marginBottom={4}>
          <FormLabel className="text-gray-200">Username *</FormLabel>
          <Input
            placeholder="Enter your USGS username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="sm"
            isDisabled={checkingPermissions}
            className="bg-gray-800 text-gray-200 border-gray-700"
            _placeholder={{ color: "gray.500" }}
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel className="text-gray-200">Password/Token *</FormLabel>
          <Input
            type="password"
            placeholder="Enter your password or token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            size="sm"
            isDisabled={checkingPermissions}
            className="bg-gray-800 text-gray-200 border-gray-700"
            _placeholder={{ color: "gray.500" }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
        </FormControl>

        {status && (
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <Text fontSize="sm" className="text-gray-300">
              Auth:{" "}
              <span
                className={
                  status.auth === "authorized"
                    ? "text-green-400"
                    : status.auth === "authorizing"
                    ? "text-yellow-400"
                    : "text-gray-400"
                }
              >
                {status.auth === "authorized" && status.username
                  ? `authorized (${status.username})`
                  : status.auth}
              </span>
            </Text>
          </div>
        )}

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
    <ChakraProvider theme={darkTheme}>
      <LoginDialogWindow />
    </ChakraProvider>
  );
};
