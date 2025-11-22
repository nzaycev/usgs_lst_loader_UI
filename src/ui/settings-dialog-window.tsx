import {
  Button,
  ChakraProvider,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ModalSystemHelper } from "./ModalSystemHelper";
import { isEqual } from "lodash";
import React, { useEffect, useState } from "react";
import { SettingsChema } from "../main/settings-store";
import { INetworkSettings } from "./network-settings/network-settings-state";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

const SettingsDialogWindow: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<INetworkSettings>({});
  const [tempSettings, setTempSettings] =
    useState<DeepPartial<INetworkSettings>>({});
  const [userCreds, setUserCreds] = useState<SettingsChema["userdata"]>();
  const [authorized, setAuthorized] = useState(false);

  const hasUnsaved = isEqual(settings, tempSettings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await window.ElectronAPI.invoke.watchNetworkSettings();
        setSettings(loadedSettings);
        setTempSettings(loadedSettings);
        setLoading(false);
      } catch (e) {
        console.error("Error loading settings:", e);
        setLoading(false);
      }
    };

    const loadUserCreds = async () => {
      const creds = (await window.ElectronAPI.invoke.getStoreValue(
        "userdata"
      )) as SettingsChema["userdata"];
      setUserCreds(creds);
      // Check if authorized by checking if we have valid credentials
      setAuthorized(!!(creds?.username && creds?.token));
    };

    loadSettings();
    loadUserCreds();
  }, []);

  const handleOpenAuth = async () => {
    const result = await window.ElectronAPI.invoke.openLoginDialog({
      username: userCreds?.username,
      token: userCreds?.token,
      autoLogin: false,
    });
    if (result) {
      // Reload credentials
      const creds = (await window.ElectronAPI.invoke.getStoreValue(
        "userdata"
      )) as SettingsChema["userdata"];
      setUserCreds(creds);
      setAuthorized(!!(creds?.username && creds?.token));
    }
  };

  const handleClose = () => {
    setTempSettings(settings);
    window.ElectronAPI.invoke.sendSettingsDialogResult(null);
  };

  const handleSave = async () => {
    if (tempSettings.proxy) {
      if (
        !tempSettings.proxy.host ||
        !tempSettings.proxy.port ||
        !tempSettings.proxy.protocol
      ) {
        toast({
          title: "warning",
          status: "warning",
          description: "one of required properties is empty",
          isClosable: true,
          duration: 2000,
        });
        return;
      }
      if (
        tempSettings.proxy.auth &&
        !tempSettings.proxy.auth.password
      ) {
        toast({
          title: "warning",
          status: "warning",
          description: "password is not specified",
          isClosable: true,
          duration: 2000,
        });
        return;
      }
    }

    setSaving(true);
    try {
      await window.ElectronAPI.invoke.saveNetworkSettings(
        tempSettings as INetworkSettings
      );
      setSettings(tempSettings as INetworkSettings);
      window.ElectronAPI.invoke.sendSettingsDialogResult(true);
    } catch (e) {
      console.error("Error saving settings:", e);
      toast({
        title: "Error",
        description: "Failed to save settings",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 w-full">
      <ModalSystemHelper title="Network Settings" onClose={handleClose} />
      <div className="p-5 flex-1 overflow-auto min-h-0 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <>
            <SettingsBlockTitle>
              <h2 className="text-lg font-medium text-gray-200">
                Proxy settings
              </h2>
              <Switch
                isChecked={!!tempSettings.proxy}
                onChange={(v) => {
                  setTempSettings((_settings) => {
                    const settings = { ..._settings };
                    if (!v.target.checked) {
                      delete settings.proxy;
                    } else {
                      settings.proxy = {
                        protocol: "http",
                      };
                    }
                    return settings;
                  });
                }}
                colorScheme="blue"
              />
            </SettingsBlockTitle>
            <Divider className="my-4" borderColor="gray.700" />
            <FormControl isRequired isDisabled={!tempSettings.proxy}>
              <RadioGroup
                mt={4}
                onChange={(v) =>
                  setTempSettings((settings) => ({
                    ...settings,
                    proxy: {
                      ...settings.proxy,
                      protocol: v,
                    },
                  }))
                }
                value={tempSettings.proxy?.protocol || null}
              >
                <Stack direction="row">
                  <Radio value="http" className="text-gray-200">
                    HTTP
                  </Radio>
                  <Radio value="sock5" className="text-gray-200">
                    SOCK5
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
            <FormControl isRequired isDisabled={!tempSettings.proxy}>
              <FormLabel htmlFor="proxy-host" mt={4} className="text-gray-200">
                host address
              </FormLabel>
              <Input
                value={tempSettings.proxy?.host || ""}
                onChange={(v) =>
                  setTempSettings((settings) => ({
                    ...settings,
                    proxy: {
                      ...settings.proxy,
                      host: v.target.value,
                    },
                  }))
                }
                id="proxy-host"
                type="text"
                className="bg-gray-800 text-gray-200 border-gray-700"
              />
              <FormHelperText className="text-gray-400">
                e.g. 172.0.0.1 or org.proxy.com
              </FormHelperText>
            </FormControl>
            <FormControl isRequired isDisabled={!tempSettings.proxy}>
              <FormLabel htmlFor="proxy-port" mt={4} className="text-gray-200">
                port
              </FormLabel>
              <Input
                value={tempSettings.proxy?.port || ""}
                id="proxy-port"
                isRequired
                onChange={(v) =>
                  setTempSettings((settings) => ({
                    ...settings,
                    proxy: {
                      ...settings.proxy,
                      port: parseInt(v.target.value) || undefined,
                    },
                  }))
                }
                type="number"
                className="bg-gray-800 text-gray-200 border-gray-700"
              />
              <FormHelperText mt={4} className="text-gray-400">
                e.g. 8080
              </FormHelperText>
            </FormControl>
            <div className="flex mt-1">
              <div>
                <FormControl isDisabled={!tempSettings.proxy}>
                  <FormLabel htmlFor="proxy-user" className="text-gray-200">
                    username
                  </FormLabel>
                  <Input
                    value={tempSettings.proxy?.auth?.login || ""}
                    id="proxy-user"
                    placeholder="anonimous"
                    onChange={(v) =>
                      setTempSettings((_settings) => {
                        const settings = { ..._settings };
                        if (v.target.value) {
                          settings.proxy.auth = {
                            login: v.target.value,
                          };
                        } else {
                          delete settings.proxy.auth;
                        }
                        return settings;
                      })
                    }
                    type="text"
                    className="bg-gray-800 text-gray-200 border-gray-700"
                  />
                </FormControl>
              </div>
              <div className="ml-2">
                <FormControl isRequired isDisabled={!tempSettings.proxy}>
                  <FormLabel htmlFor="proxy-password" className="text-gray-200">
                    password
                  </FormLabel>
                  <Input
                    isRequired={!tempSettings.proxy?.auth}
                    value={tempSettings.proxy?.auth?.password || ""}
                    id="proxy-password"
                    disabled={!tempSettings.proxy?.auth}
                    onChange={(v) =>
                      setTempSettings((settings) => ({
                        ...settings,
                        proxy: {
                          ...settings.proxy,
                          auth: {
                            ...(settings.proxy.auth || {}),
                            password: v.target.value,
                          },
                        },
                      }))
                    }
                    type="password"
                    className="bg-gray-800 text-gray-200 border-gray-700"
                  />
                </FormControl>
              </div>
            </div>
            <Divider mt={6} mb={4} borderColor="gray.700" />
            <SettingsBlockTitle>
              <h2 className="text-lg font-medium text-gray-200">
                USGS Authentication
              </h2>
            </SettingsBlockTitle>
            <FormControl mt={4}>
              <FormLabel className="text-gray-200">Status</FormLabel>
              <Text fontSize="sm" mb={2} className="text-gray-300">
                {authorized && userCreds?.username
                  ? `Logged in as: ${userCreds.username}`
                  : "Not authenticated"}
              </Text>
              <Button
                size="sm"
                colorScheme={authorized ? "green" : "blue"}
                onClick={handleOpenAuth}
              >
                {authorized ? "Edit Credentials" : "Log In"}
              </Button>
            </FormControl>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                colorScheme={"blue"}
                disabled={hasUnsaved || saving}
                onClick={handleSave}
              >
                Save and close {saving && <Spinner size="sm" ml={2} />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SettingsBlockTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <label className={`flex py-1 justify-between items-center ${className}`}>
    {children}
  </label>
);

export const SettingsDialogWindowApp = () => {
  return (
    <ChakraProvider>
      <div className="bg-gray-900 min-h-screen">
        <SettingsDialogWindow />
      </div>
    </ChakraProvider>
  );
};

