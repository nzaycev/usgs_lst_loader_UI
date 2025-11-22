import {
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import { isEqual } from "lodash";
import React, { useEffect, useState } from "react";
import { SettingsChema } from "../../backend/settings-store";
import { useAppDispatch, useAppSelector } from "../app";
import { testNetwork } from "../network-test/network-state";
import {
  INetworkSettings,
  networkSettingsSlice,
  readSettings,
  writeSettings,
} from "./network-settings-state";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export const NetworkSettingsWrapper: React.FC = ({ children }) => {
  const { settingsOpened, loading, saving } = useAppSelector(
    (state) => state.networkSettings
  );
  const settings = useAppSelector((state) => state.networkSettings.settings);
  const authorized = useAppSelector((state) => state.main.authorized);
  const toast = useToast();
  const [tempSettings, setTempSettings] =
    useState<DeepPartial<INetworkSettings>>(settings);
  const [userCreds, setUserCreds] = useState<SettingsChema["userdata"]>();

  const hasUnsaved = isEqual(settings, tempSettings);

  const dispatch = useAppDispatch();

  console.log({ tempSettings, settings });

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  useEffect(() => {
    dispatch(readSettings());
  }, [dispatch]);

  useEffect(() => {
    const loadUserCreds = async () => {
      const creds = (await window.ElectronAPI.invoke.getStoreValue(
        "userdata"
      )) as SettingsChema["userdata"];
      setUserCreds(creds);
    };
    if (settingsOpened) {
      loadUserCreds();
    }
  }, [settingsOpened]);

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
    }
  };

  return (
    <>
      {children}
      <Modal
        isOpen={settingsOpened}
        onClose={() => {
          setTempSettings(settings);
          dispatch(networkSettingsSlice.actions.justCloseSettings());
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Network settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loading ? (
              <Spinner />
            ) : (
              <>
                <SettingsBlockTitle>
                  <h2 className="text-lg font-medium">Proxy settings</h2>
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
                  />
                </SettingsBlockTitle>
                <Divider />
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
                      <Radio value="http">HTTP</Radio>
                      <Radio value="sock5">SOCK5</Radio>
                    </Stack>
                  </RadioGroup>
                </FormControl>
                <FormControl isRequired isDisabled={!tempSettings.proxy}>
                  <FormLabel htmlFor="proxy-host" mt={4}>
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
                    type="proxy-host"
                  />
                  <FormHelperText>
                    e.g. 172.0.0.1 or org.proxy.com
                  </FormHelperText>
                </FormControl>
                <FormControl isRequired isDisabled={!tempSettings.proxy}>
                  <FormLabel htmlFor="proxy-port" mt={4}>
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
                  />
                  <FormHelperText mt={4}>e.g. 8080</FormHelperText>
                </FormControl>
                <div style={{ display: "flex", marginTop: 4 }}>
                  <div>
                    <FormControl isDisabled={!tempSettings.proxy}>
                      <FormLabel htmlFor="proxy-user">username</FormLabel>
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
                        type="username"
                      />
                    </FormControl>
                  </div>
                  <div style={{ marginLeft: 8 }}>
                    <FormControl isRequired isDisabled={!tempSettings.proxy}>
                      <FormLabel htmlFor="proxy-password">password</FormLabel>
                      <Input
                        isRequired={!tempSettings.proxy?.auth}
                        value={tempSettings.proxy?.auth?.password || ""}
                        id="proxy-user"
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
                      />
                    </FormControl>
                  </div>
                </div>
                <Divider mt={6} mb={4} />
                <SettingsBlockTitle>
                  <h2 className="text-lg font-medium">USGS Authentication</h2>
                </SettingsBlockTitle>
                <FormControl mt={4}>
                  <FormLabel>Status</FormLabel>
                  <Text fontSize="sm" mb={2}>
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
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme={"blue"}
              disabled={hasUnsaved}
              onClick={async () => {
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
                await dispatch(writeSettings(tempSettings as INetworkSettings));
                dispatch(testNetwork());
              }}
            >
              Save and close {saving && <Spinner />}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
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
