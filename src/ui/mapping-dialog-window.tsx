import {
  Box,
  Button,
  ChakraProvider,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Text,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { USGSLayerType } from "../actions/main-actions";
import { ModalSystemHelper } from "./ModalSystemHelper";
import { darkTheme } from "./theme";

interface MappingDialogWindowProps {
  toast: ReturnType<typeof useToast>;
}

const MappingDialogWindow: React.FC<MappingDialogWindowProps> = ({ toast }) => {
  const [folderPath, setFolderPath] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  // Структура маппинга: Record<USGSLayerType, string> - для каждого обязательного слоя выбирается файл
  const [fileMappings, setFileMappings] = useState<
    Record<USGSLayerType, string>
  >({
    ST_TRAD: "",
    ST_ATRAN: "",
    ST_URAD: "",
    ST_DRAD: "",
    SR_B6: "",
    SR_B5: "",
    SR_B4: "",
    QA_PIXEL: "",
  });

  const [displayId, setDisplayId] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [regionId, setRegionId] = useState("");
  const [satelliteId, setSatelliteId] = useState("");

  const layerTypes: USGSLayerType[] = [
    "ST_TRAD",
    "ST_ATRAN",
    "ST_URAD",
    "ST_DRAD",
    "SR_B6",
    "SR_B5",
    "SR_B4",
    "QA_PIXEL",
  ];

  // Получаем данные из hash при загрузке
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#mapping-dialog:")) {
      try {
        const dataStr = decodeURIComponent(
          hash.substring("#mapping-dialog:".length)
        );
        const data = JSON.parse(dataStr) as {
          folderPath: string;
          files: string[];
          suggestedMapping?: Record<string, USGSLayerType>;
          existingMapping?: Record<string, USGSLayerType>;
          existingMetadata?: {
            displayId: string;
            captureDate?: string;
            regionId?: string;
            satelliteId?: string;
          };
        };
        setFolderPath(data.folderPath);
        setFiles(data.files);

        // Инициализируем маппинги
        const initialMappings: Record<USGSLayerType, string> = {
          ST_TRAD: "",
          ST_ATRAN: "",
          ST_URAD: "",
          ST_DRAD: "",
          SR_B6: "",
          SR_B5: "",
          SR_B4: "",
          QA_PIXEL: "",
        };

        // Если есть существующий маппинг, загружаем его
        if (
          data.existingMapping &&
          Object.keys(data.existingMapping).length > 0
        ) {
          Object.entries(data.existingMapping).forEach(
            ([fileName, layerType]) => {
              // Если путь относительный, делаем его абсолютным
              let filePath: string;
              if (fileName.startsWith(data.folderPath.replace(/\\/g, "/"))) {
                filePath = fileName;
              } else {
                filePath = `${data.folderPath.replace(
                  /\\/g,
                  "/"
                )}/${fileName}`.replace(/\/+/g, "/");
              }
              initialMappings[layerType] = filePath;
            }
          );
        } else if (
          data.suggestedMapping &&
          Object.keys(data.suggestedMapping).length > 0
        ) {
          Object.entries(data.suggestedMapping).forEach(
            ([fileName, layerType]) => {
              const filePath = `${data.folderPath.replace(
                /\\/g,
                "/"
              )}/${fileName}`.replace(/\/+/g, "/");
              initialMappings[layerType] = filePath;
            }
          );
        }
        setFileMappings(initialMappings);

        // Загружаем существующие метаданные если есть
        if (data.existingMetadata) {
          setDisplayId(data.existingMetadata.displayId || "");
          setCaptureDate(data.existingMetadata.captureDate || "");
          setRegionId(data.existingMetadata.regionId || "");
          setSatelliteId(data.existingMetadata.satelliteId || "");
        }

        // Автозаполнение displayId и captureDate (только если нет существующих метаданных)
        if (!data.existingMetadata && data.files.length > 0) {
          const firstFile = data.files[0];
          const extractDisplayId = (fileName: string): string => {
            const withoutExt = fileName.replace(/\.(TIF|tif)$/, "");
            let cleaned = withoutExt.replace(/_T1_[A-Z_]+$/, "");
            cleaned = cleaned.replace(
              /_(ST_TRAD|ST_ATRAN|ST_URAD|ST_DRAD|SR_B6|SR_B5|SR_B4|QA_PIXEL)$/,
              ""
            );
            const parts = cleaned.split("_");
            if (parts.length >= 4) {
              return parts.slice(0, 4).join("_");
            }
            return cleaned;
          };

          const extractDate = (fileName: string): string => {
            const dateMatch = fileName.match(/(\d{8})/);
            if (dateMatch) {
              const dateStr = dateMatch[1];
              return `${dateStr.slice(0, 4)}-${dateStr.slice(
                4,
                6
              )}-${dateStr.slice(6, 8)}`;
            }
            return "";
          };

          const extractRegionId = (displayId: string): string => {
            const segments = displayId.split("_");
            if (segments.length >= 3) {
              return segments[2];
            }
            return "";
          };

          const extractSatelliteId = (displayId: string): string => {
            const segments = displayId.split("_");
            if (segments.length >= 1) {
              return segments[0];
            }
            return "";
          };

          const extractedDisplayId = extractDisplayId(firstFile);
          if (extractedDisplayId) {
            setDisplayId(extractedDisplayId);
            const extractedRegionId = extractRegionId(extractedDisplayId);
            if (extractedRegionId) {
              setRegionId(extractedRegionId);
            }
            const extractedSatelliteId = extractSatelliteId(extractedDisplayId);
            if (extractedSatelliteId) {
              setSatelliteId(extractedSatelliteId);
            }
          } else {
            const folderName = data.folderPath.split(/[/\\]/).pop() || "";
            setDisplayId(folderName);
            const extractedRegionId = extractRegionId(folderName);
            if (extractedRegionId) {
              setRegionId(extractedRegionId);
            }
            const extractedSatelliteId = extractSatelliteId(folderName);
            if (extractedSatelliteId) {
              setSatelliteId(extractedSatelliteId);
            }
          }

          const extractedDate = extractDate(firstFile);
          if (extractedDate) {
            setCaptureDate(extractedDate);
          }
        }
      } catch (e) {
        console.error("Error parsing mapping dialog data:", e);
      }
    }
  }, []);

  // Получаем список файлов из папки для дропдауна
  const folderFiles = files.map((file) => ({
    label: file,
    value: `${folderPath.replace(/\\/g, "/")}/${file}`.replace(/\/+/g, "/"),
  }));

  const handleSave = () => {
    // Валидация обязательных полей
    if (!displayId.trim()) {
      toast({
        title: "Error",
        description: "Display ID is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!captureDate.trim()) {
      toast({
        title: "Error",
        description: "Capture Date is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Преобразуем маппинги в формат Record<string, USGSLayerType>
    const fileMapping: Record<string, USGSLayerType> = {};
    const unmappedLayers: USGSLayerType[] = [];

    layerTypes.forEach((layerType) => {
      const filePath = fileMappings[layerType];
      if (!filePath) {
        unmappedLayers.push(layerType);
        return;
      }

      let key: string;
      const normalizedFolderPath = folderPath.replace(/\\/g, "/");
      const normalizedFilePath = filePath.replace(/\\/g, "/");
      if (normalizedFilePath.startsWith(normalizedFolderPath)) {
        const relativePath = normalizedFilePath
          .substring(normalizedFolderPath.length)
          .replace(/^\/+/, "");
        key = relativePath;
      } else {
        key = normalizedFilePath;
      }

      fileMapping[key] = layerType;
    });

    if (unmappedLayers.length > 0) {
      toast({
        title: "Error",
        description: `All required layers must be mapped. Missing: ${unmappedLayers.join(
          ", "
        )}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Отправляем результат обратно через IPC
    window.ElectronAPI.invoke.sendMappingDialogResult({
      fileMapping,
      metadata: {
        displayId: displayId.trim(),
        captureDate: captureDate.trim(),
        regionId: regionId.trim() ? regionId.trim() : undefined,
        satelliteId: satelliteId.trim() ? satelliteId.trim() : undefined,
      },
    });
  };

  const handleCancel = () => {
    window.ElectronAPI.invoke.sendMappingDialogResult(null);
  };

  return (
    <Box
      height="100vh"
      display="flex"
      flexDirection="column"
      bg="gray.900"
      width="100%"
      color="gray.200"
    >
      <ModalSystemHelper
        title="Map Files and Add Metadata"
        onClose={handleCancel}
      />
      <Box padding="20px" flex={1} overflow="auto" minHeight={0} width="100%">
        <FormControl marginBottom={4}>
          <FormLabel>Folder Path</FormLabel>
          <Input value={folderPath} isReadOnly size="sm" />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>Display ID *</FormLabel>
          <Input
            placeholder="e.g., LC08_L2SP_142021_20220915"
            value={displayId}
            onChange={(e) => setDisplayId(e.target.value)}
            size="sm"
          />
        </FormControl>

        <Box marginBottom="16px">
          <FormLabel
            as="div"
            marginBottom={2}
            fontSize="sm"
            fontWeight="medium"
          >
            File Mapping (Required Layers)
          </FormLabel>
          <Box maxHeight="400px" overflowY="auto">
            {layerTypes.map((layerType) => {
              const selectedFile = fileMappings[layerType];
              const isFromFolder =
                selectedFile && selectedFile.startsWith(folderPath);

              return (
                <FormControl key={layerType} marginBottom={2}>
                  <SimpleGrid
                    columns={{ base: 2 }}
                    spacing={2}
                    alignItems="center"
                  >
                    <FormLabel fontSize="sm" margin={0} fontWeight="medium">
                      {layerType} *
                    </FormLabel>
                    <Flex gap={1} alignItems="center" flex={1}>
                      <Select
                        placeholder="Select file"
                        value={selectedFile ?? ""}
                        onChange={(e) => {
                          setFileMappings({
                            ...fileMappings,
                            [layerType]: e.target.value,
                          });
                        }}
                        size="xs"
                        flex={1}
                        maxW="200px"
                      >
                        <option value="">-- Select --</option>
                        {folderFiles.map((file) => (
                          <option key={file.value} value={file.value}>
                            {file.label}
                          </option>
                        ))}
                      </Select>
                    </Flex>
                  </SimpleGrid>
                  {selectedFile && !isFromFolder && (
                    <Text
                      fontSize="9px"
                      color="gray.400"
                      marginTop="2px"
                      display="block"
                      wordBreak="break-all"
                      fontStyle="italic"
                    >
                      {selectedFile}
                    </Text>
                  )}
                </FormControl>
              );
            })}
          </Box>
        </Box>

        <FormControl marginBottom={4}>
          <FormLabel>Capture Date *</FormLabel>
          <Input
            type="date"
            value={captureDate}
            onChange={(e) => setCaptureDate(e.target.value)}
            size="sm"
            required
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>Region ID</FormLabel>
          <Input
            placeholder="e.g., 142021"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            size="sm"
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>Satellite ID</FormLabel>
          <Input
            placeholder="e.g., LC08, LC09"
            value={satelliteId}
            onChange={(e) => setSatelliteId(e.target.value)}
            size="sm"
          />
        </FormControl>

        <Flex gap={2} justifyContent="flex-end" marginTop={4}>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button colorScheme="green" onClick={handleSave}>
            Add Folder
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export const MappingDialogWindowApp = () => {
  return (
    <ChakraProvider theme={darkTheme}>
      <MappingDialogWindowWithToast />
    </ChakraProvider>
  );
};

const MappingDialogWindowWithToast = () => {
  const toast = useToast();

  // Always render, even if there's an error
  try {
    return <MappingDialogWindow toast={toast} />;
  } catch (error) {
    console.error("Error rendering MappingDialogWindow:", error);
    return (
      <div style={{ padding: "20px", height: "100vh" }}>
        <h2>Error loading mapping dialog</h2>
        <p>{String(error)}</p>
      </div>
    );
  }
};
