import { REQUIRED_LAYERS } from "../../../constants/layers";

// Re-export для обратной совместимости
export { REQUIRED_LAYERS };

/**
 * Обработчик клика для открытия директории сцены по displayId
 * Использует scenePathResolver для поиска пути к сцене
 */
export const handleOpenExplorer = (displayId: string) => {
  window.ElectronAPI.invoke.openExplorer(displayId);
};

/**
 * Обработчик клика для открытия директории по прямому пути
 */
export const handleOpenDirectory = (directoryPath: string) => {
  window.ElectronAPI.invoke.openDirectory(directoryPath);
};

/**
 * Обработчик клика для открытия файла нативным обработчиком
 */
export const handleOpenFile = (filePath: string) => {
  window.ElectronAPI.invoke.openFile(filePath);
};

/**
 * Обработчик drag and drop для директории (перетаскивает все TIF файлы)
 */
export const handleDragDirectory = (directoryPath: string) => {
  window.ElectronAPI.invoke.startDrag(directoryPath);
};

/**
 * Обработчик drag and drop для директории с фильтрацией по required layers
 */
export const handleDragRequiredLayers = (displayId: string) => {
  window.ElectronAPI.invoke.startDragRequiredLayers(displayId);
};

/**
 * Обработчик drag and drop для одного файла
 */
export const handleDragFile = (filePath: string) => {
  window.ElectronAPI.invoke.startDragFile(filePath);
};

/**
 * Получает путь к файлу слоя
 */
export const getLayerFilePath = (
  displayId: string,
  layer: string,
  scenePath: string,
  isRepo: boolean,
  filePath?: string
): string | null => {
  if (!isRepo && filePath) {
    // Для !isRepo используем путь из маппинга
    // Если путь абсолютный, используем как есть
    // Если относительный, объединяем с scenePath
    if (
      filePath.includes(":") ||
      filePath.startsWith("/") ||
      filePath.startsWith("\\")
    ) {
      // Абсолютный путь
      return filePath;
    } else {
      // Относительный путь - объединяем с scenePath
      const separator = scenePath.includes("\\") ? "\\" : "/";
      return `${scenePath}${separator}${filePath}`;
    }
  } else if (isRepo && scenePath) {
    // Для isRepo формируем путь: scenePath/displayId_layer.TIF
    // Нужно использовать path.join, но в браузере нет path модуля
    // Используем простую конкатенацию с правильными разделителями
    const separator = scenePath.includes("\\") ? "\\" : "/";
    return `${scenePath}${separator}${displayId}_${layer}.TIF`;
  }
  return null;
};
