import {
  Button,
  ChakraProvider,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { USGSLayerType } from "../actions/main-actions";
import { ModalSystemHelper } from "./ModalSystemHelper";

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
  const [entityId, setEntityId] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [source, setSource] = useState("");
  const [city, setCity] = useState("");
  const [displayName, setDisplayName] = useState("");

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

        if (
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

        // Автозаполнение displayId и captureDate
        if (data.files.length > 0) {
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

          const extractedDisplayId = extractDisplayId(firstFile);
          if (extractedDisplayId) {
            setDisplayId(extractedDisplayId);
          } else {
            const folderName = data.folderPath.split(/[/\\]/).pop() || "";
            setDisplayId(folderName);
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

  const handleFileSelect = async (
    layerType: USGSLayerType,
    useDialog: boolean
  ) => {
    if (useDialog) {
      const selectedPath = await window.ElectronAPI.invoke.selectFile();
      if (selectedPath) {
        setFileMappings({
          ...fileMappings,
          [layerType]: selectedPath,
        });
      }
    }
  };

  const handleSave = () => {
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
        title: "Warning",
        description: `Some required layers are not mapped: ${unmappedLayers.join(
          ", "
        )}`,
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    }

    // Отправляем результат обратно через IPC
    window.ElectronAPI.invoke.sendMappingDialogResult({
      fileMapping,
      metadata: {
        displayId: displayId.trim(),
        entityId: entityId.trim() || undefined,
        captureDate: captureDate.trim() || undefined,
        source: source.trim() || undefined,
        city: city.trim() || undefined,
        displayName: displayName.trim() || undefined,
      },
    });
  };

  const handleCancel = () => {
    window.ElectronAPI.invoke.sendMappingDialogResult(null);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        width: "100%",
      }}
    >
      <ModalSystemHelper title="Map Files and Add Metadata" onClose={handleCancel} />
      <div
        style={{
          padding: "20px",
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          width: "100%",
        }}
      >
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

        <FormControl marginBottom={4}>
          <FormLabel>Entity ID</FormLabel>
          <Input
            placeholder="Auto-generated if empty"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            size="sm"
          />
        </FormControl>

        <div style={{ marginBottom: "16px" }}>
          <FormLabel
            as="div"
            marginBottom={2}
            fontSize="sm"
            fontWeight="medium"
          >
            File Mapping (Required Layers)
          </FormLabel>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {layerTypes.map((layerType) => {
              const selectedFile = fileMappings[layerType];
              const isFromFolder =
                selectedFile && selectedFile.startsWith(folderPath);
              const displayFileName = isFromFolder
                ? folderFiles.find((f) => f.value === selectedFile)?.label ||
                  selectedFile.split(/[/\\]/).pop() ||
                  ""
                : selectedFile
                ? selectedFile.split(/[/\\]/).pop() || selectedFile
                : "";

              return (
                <FormControl key={layerType} marginBottom={2}>
                  <SimpleGrid
                    columns={{ base: 3 }}
                    spacing={2}
                    alignItems="center"
                  >
                    <FormLabel fontSize="sm" margin={0} fontWeight="medium">
                      {layerType} *
                    </FormLabel>
                    <Flex gap={1} alignItems="center" flex={1}>
                      <Select
                        placeholder="Select file"
                        value={isFromFolder ? selectedFile : ""}
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
                      <Button
                        size="xs"
                        onClick={() => handleFileSelect(layerType, true)}
                        title="Select file from another folder"
                      >
                        ...
                      </Button>
                    </Flex>
                    {displayFileName && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "500",
                          color: "#2D3748",
                          padding: "4px 8px",
                          backgroundColor: "#E2E8F0",
                          borderRadius: "4px",
                          wordBreak: "break-all",
                          display: "block",
                        }}
                        title={selectedFile}
                      >
                        {displayFileName}
                      </span>
                    )}
                  </SimpleGrid>
                  {selectedFile && !isFromFolder && (
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#718096",
                        marginTop: "2px",
                        display: "block",
                        wordBreak: "break-all",
                        fontStyle: "italic",
                      }}
                    >
                      {selectedFile}
                    </span>
                  )}
                </FormControl>
              );
            })}
          </div>
        </div>

        <FormControl marginBottom={4}>
          <FormLabel>Capture Date</FormLabel>
          <Input
            type="date"
            value={captureDate}
            onChange={(e) => setCaptureDate(e.target.value)}
            size="sm"
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>Source</FormLabel>
          <Input
            placeholder="Data source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            size="sm"
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>City</FormLabel>
          <Input
            placeholder="City name"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            size="sm"
          />
        </FormControl>

        <FormControl marginBottom={4}>
          <FormLabel>Display Name</FormLabel>
          <Input
            placeholder="Additional display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            size="sm"
          />
        </FormControl>

        <Flex gap={2} justifyContent="flex-end" marginTop={4}>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button colorScheme="green" onClick={handleSave}>
            Add Folder
          </Button>
        </Flex>
      </div>
    </div>
  );
};

export const MappingDialogWindowApp = () => {
  return (
    <ChakraProvider>
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
