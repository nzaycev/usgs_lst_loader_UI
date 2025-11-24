import {
  Button,
  ChakraProvider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Switch,
  VStack,
} from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useState } from "react";
import { EmissionCalcMethod, RunArgs } from "../../../actions/main-actions";
import { SettingsChema } from "../../../main/settings-store";
import { ModalSystemHelper } from "../../ModalSystemHelper";
import { darkTheme } from "../../theme";

const LAYER_OPTIONS = [
  { key: "LST", label: "LST" },
  { key: "NDVI", label: "NDVI" },
  { key: "Emission", label: "Emission" },
  { key: "BT", label: "BT" },
  { key: "VegProp", label: "VegProp" },
  { key: "Radiance", label: "Radiance" },
  { key: "SurfRad", label: "SurfRad" },
  { key: "NDMI", label: "NDMI" },
] as const;

const CalculationDialogWindow = () => {
  const [formState, setFormState] = useState<RunArgs | null>(null);
  const [loading, setLoading] = useState(true);
  const [emissionError, setEmissionError] = useState<string>("");
  const [emissionInputValue, setEmissionInputValue] = useState<string>("");
  const [saveDirectoryError, setSaveDirectoryError] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [displayId, setDisplayId] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const hash = window.location.hash;
        if (hash.startsWith("#calculation-dialog:")) {
          const data = decodeURIComponent(hash.split(":")[1]);
          const dialogData = JSON.parse(data);

          // Сохраняем displayId из dialogData
          if (dialogData.displayId) {
            setDisplayId(dialogData.displayId);
          }

          if (dialogData.initialSettings) {
            setFormState(dialogData.initialSettings);
            setEmissionInputValue(
              dialogData.initialSettings.emission?.toString() || ""
            );
          } else {
            const initialState = (await window.ElectronAPI.invoke.getStoreValue(
              "calculationSettings"
            )) as SettingsChema["calculationSettings"];
            setFormState(initialState);
            setEmissionInputValue(initialState?.emission?.toString() || "");
          }
        } else {
          const initialState = (await window.ElectronAPI.invoke.getStoreValue(
            "calculationSettings"
          )) as SettingsChema["calculationSettings"];
          setFormState(initialState);
          setEmissionInputValue(initialState?.emission?.toString() || "");
        }
      } catch (error) {
        console.error("Error loading calculation settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, []);

  const handleCancel = () => {
    window.ElectronAPI.invoke.sendCalculationDialogResult(null);
  };

  const handleRun = async () => {
    if (!formState || emissionError) {
      return;
    }

    setIsRunning(true);
    setSaveDirectoryError("");

    try {
      // Вызываем calculate - он проверит дубликаты и запустит процесс
      try {
        await window.ElectronAPI.invoke.calculate(displayId, formState);

        // Если успешно (процесс запущен) - сохраняем настройки и закрываем диалог
        // Отправляем null, чтобы download-manager-page не запускал calculateScene повторно
        window.ElectronAPI.invoke.saveCalculationSettings({
          args: formState,
        });
        window.ElectronAPI.invoke.sendCalculationDialogResult(null);
      } catch (error: any) {
        // Если ошибка связана с дубликатом - показываем в поле
        const errorMessage = error?.message || String(error);

        if (
          errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate")
        ) {
          setSaveDirectoryError(errorMessage);
          // НЕ закрываем диалог - не вызываем sendCalculationDialogResult
        } else {
          // Другие ошибки - показываем alert и закрываем диалог
          alert(`Error: ${errorMessage}`);
          window.ElectronAPI.invoke.sendCalculationDialogResult(null);
        }
      }
    } catch (error) {
      console.error("[handleRun] Unexpected error:", error);
      alert(`Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEmissionChange = (value: string) => {
    // Update input value immediately for better UX
    setEmissionInputValue(value);

    if (value === "" || value.trim() === "") {
      setFormState((prev) => ({
        ...prev!,
        emission: undefined,
      }));
      setEmissionError("");
      return;
    }

    const trimmedValue = value.trim();

    // Try to parse as number (supports: negative, decimal, scientific notation like -1, 0.1, 1e-10)
    const numValue = Number(trimmedValue);

    // Check if it's a valid number
    if (!isNaN(numValue) && isFinite(numValue)) {
      // Valid number - update form state
      setEmissionError("");
      setFormState((prev) => ({
        ...prev!,
        emission: numValue,
      }));
    } else {
      // Check if it's a partial input that could become valid (e.g., "-", "0.", "1e-")
      // Allow these patterns while user is typing
      const partialPattern =
        /^-?$|^-?\.?$|^-?\d+\.?$|^-?\d*\.\d*$|^-?\d+[eE]?$|^-?\d+[eE]-?$|^-?\d+[eE]-?\d*$/;
      if (partialPattern.test(trimmedValue)) {
        // Partial input - allow it but don't update formState or show error
        setEmissionError("");
      } else {
        // Invalid input
        setEmissionError("Must be a valid number");
      }
    }
  };

  const totalLayersCount = LAYER_OPTIONS.length;
  const selectedLayersCount = formState
    ? Object.values(formState.outLayers).filter(Boolean).length
    : 0;

  const allLayersSelected =
    formState &&
    Object.values(formState.outLayers).every((value) => value === true);

  const getLayersButtonText = () => {
    if (!formState) return "Select layers";
    if (selectedLayersCount === 0) return "No";
    if (allLayersSelected) return "All";
    return `${selectedLayersCount} of ${totalLayersCount}`;
  };

  const handleToggleAllLayers = () => {
    if (!formState) return;
    const newValue = !allLayersSelected;
    setFormState((prev) => ({
      ...prev!,
      outLayers: {
        BT: newValue,
        Emission: newValue,
        LST: newValue,
        NDVI: newValue,
        NDMI: newValue,
        Radiance: newValue,
        SurfRad: newValue,
        VegProp: newValue,
      },
    }));
  };

  const handleToggleLayer = (key: keyof RunArgs["outLayers"]) => {
    setFormState((prev) => ({
      ...prev!,
      outLayers: {
        ...prev!.outLayers,
        [key]: !prev!.outLayers[key],
      },
    }));
  };

  if (loading || !formState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-200">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <ModalSystemHelper
        title="Preparing for calculation"
        onClose={handleCancel}
      />
      <div className="p-5 flex-1 overflow-auto">
        <VStack spacing={4} align="stretch">
          {/* Enable QA mask */}
          <FormControl
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <FormLabel mb={0} color="gray.200">
              Enable QA mask?
            </FormLabel>
            <Switch
              size="md"
              isChecked={formState.useQAMask}
              onChange={() =>
                setFormState((prev) => ({
                  ...prev!,
                  useQAMask: !prev!.useQAMask,
                }))
              }
              colorScheme="blue"
            />
          </FormControl>

          {/* Custom emission value */}
          <FormControl isInvalid={!!emissionError}>
            <FormLabel color="gray.200">Custom emission value</FormLabel>
            <Input
              placeholder="default"
              value={emissionInputValue}
              size="sm"
              bg="gray.800"
              borderColor="gray.700"
              color="gray.200"
              borderRadius="md"
              fontWeight="normal"
              _hover={{ borderColor: "gray.600" }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px #3182ce",
              }}
              _invalid={{
                borderColor: "red.500",
                boxShadow: "0 0 0 1px #e53e3e",
              }}
              onChange={(e) => handleEmissionChange(e.target.value)}
            />
            {emissionError && (
              <FormErrorMessage>{emissionError}</FormErrorMessage>
            )}
          </FormControl>

          {/* Emission calculation method */}
          <FormControl>
            <FormLabel color="gray.200">Emission calculation method</FormLabel>
            <Menu
              placement="bottom"
              strategy="fixed"
              flip={true}
              gutter={4}
              matchWidth
            >
              <MenuButton
                as={Button}
                rightIcon={<ChevronDown size={16} />}
                size="sm"
                w="full"
                bg="gray.800"
                borderColor="gray.700"
                color="gray.200"
                borderRadius="md"
                fontWeight="normal"
                _hover={{ bg: "gray.700", borderColor: "gray.600" }}
                _active={{ bg: "gray.600" }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px #3182ce",
                }}
                border="1px"
                textAlign="left"
                justifyContent="space-between"
              >
                {formState.emissionCalcMethod || EmissionCalcMethod.ndmi}
              </MenuButton>
              <MenuList
                bg="gray.800"
                borderColor="gray.700"
                maxH="200px"
                overflowY="auto"
                overflowX="hidden"
                zIndex={1000}
                w="full"
              >
                {Object.values(EmissionCalcMethod).map((method) => (
                  <MenuItem
                    key={method}
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev!,
                        emissionCalcMethod: method,
                      }))
                    }
                    bg={
                      formState.emissionCalcMethod === method
                        ? "gray.700"
                        : "gray.800"
                    }
                    color="gray.200"
                    _hover={{ bg: "gray.700" }}
                  >
                    {method}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </FormControl>

          {/* Layers to be saved */}
          <FormControl>
            <FormLabel color="gray.200">Layers to be saved on finish</FormLabel>
            <Menu
              closeOnSelect={false}
              placement="bottom"
              strategy="fixed"
              flip={true}
              gutter={4}
              matchWidth
            >
              <MenuButton
                as={Button}
                rightIcon={<ChevronDown size={16} />}
                size="sm"
                w="full"
                bg="gray.800"
                borderColor="gray.700"
                color="gray.200"
                borderRadius="md"
                fontWeight="normal"
                _hover={{ bg: "gray.700", borderColor: "gray.600" }}
                _active={{ bg: "gray.600" }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px #3182ce",
                }}
                border="1px"
                textAlign="left"
                justifyContent="space-between"
              >
                {getLayersButtonText()} layers selected
              </MenuButton>
              <MenuList
                bg="gray.800"
                borderColor="gray.700"
                maxH="200px"
                overflowY="auto"
                overflowX="hidden"
                zIndex={1000}
                w="full"
              >
                <MenuItem
                  onClick={handleToggleAllLayers}
                  bg="gray.800"
                  color="blue.400"
                  _hover={{ bg: "gray.700" }}
                  className="border-b border-gray-700"
                  textAlign="left"
                >
                  {allLayersSelected ? "Deselect all" : "Select all"}
                </MenuItem>
                {LAYER_OPTIONS.map((layer) => (
                  <MenuItem
                    key={layer.key}
                    onClick={() =>
                      handleToggleLayer(layer.key as keyof RunArgs["outLayers"])
                    }
                    bg={
                      formState?.outLayers[
                        layer.key as keyof RunArgs["outLayers"]
                      ]
                        ? "gray.700"
                        : "gray.800"
                    }
                    color="gray.200"
                    _hover={{ bg: "gray.700" }}
                    closeOnSelect={false}
                    textAlign="left"
                  >
                    <input
                      type="checkbox"
                      checked={
                        formState?.outLayers[
                          layer.key as keyof RunArgs["outLayers"]
                        ] || false
                      }
                      readOnly
                      className="mr-2"
                      style={{ pointerEvents: "none" }}
                    />
                    <span style={{ textAlign: "left" }}>{layer.label}</span>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </FormControl>

          {/* Save directory */}
          <FormControl isInvalid={!!saveDirectoryError}>
            <FormLabel color="gray.200">Save directory</FormLabel>
            <Input
              placeholder="./out_{date}-{args}"
              value={formState.saveDirectory || ""}
              size="sm"
              bg="gray.800"
              borderColor={saveDirectoryError ? "red.500" : "gray.700"}
              color="gray.200"
              borderRadius="md"
              fontWeight="normal"
              _hover={{
                borderColor: saveDirectoryError ? "red.400" : "gray.600",
              }}
              _focus={{
                borderColor: saveDirectoryError ? "red.500" : "blue.500",
                boxShadow: saveDirectoryError
                  ? "0 0 0 1px #fc8181"
                  : "0 0 0 1px #3182ce",
              }}
              onChange={(e) => {
                setSaveDirectoryError(""); // Очищаем ошибку при изменении
                setFormState((prev) => ({
                  ...prev!,
                  saveDirectory: e.target.value || undefined,
                }));
              }}
            />
            {saveDirectoryError && (
              <FormErrorMessage color="red.400">
                {saveDirectoryError}
              </FormErrorMessage>
            )}
          </FormControl>

          {/* Layer name pattern */}
          <FormControl>
            <FormLabel color="gray.200">Layer name pattern</FormLabel>
            <Input
              placeholder="{name}"
              value={formState.layerNamePattern || ""}
              size="sm"
              bg="gray.800"
              borderColor="gray.700"
              color="gray.200"
              borderRadius="md"
              fontWeight="normal"
              _hover={{ borderColor: "gray.600" }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px #3182ce",
              }}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev!,
                  layerNamePattern: e.target.value || undefined,
                }))
              }
            />
          </FormControl>
        </VStack>
      </div>

      <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
        <Button
          onClick={handleCancel}
          size="sm"
          bg="gray.700"
          color="gray.200"
          _hover={{ bg: "gray.600" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleRun}
          size="sm"
          bg="green.600"
          color="white"
          _hover={{ bg: "green.700" }}
          isDisabled={!!emissionError || isRunning}
          isLoading={isRunning}
          loadingText="Running..."
        >
          Run
        </Button>
      </div>
    </div>
  );
};

export const CalculationDialogWindowApp = () => {
  return (
    <ChakraProvider theme={darkTheme}>
      <CalculationDialogWindow />
    </ChakraProvider>
  );
};
