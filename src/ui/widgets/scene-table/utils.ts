import { ISceneState } from "../../../actions/main-actions";
import { REQUIRED_LAYERS } from "../../../constants/layers";

export function getTrProgressStyle(
  active: boolean,
  type: "download" | "calculate",
  progress: number
) {
  if (!active && type === "download") {
    return {
      background: `linear-gradient(90deg,transparent 0%, transparent ${
        progress * 100
      }%, rgb(44 50 58) ${progress * 100}%, rgb(44 50 58) 100%)`,
    };
  }
  const bgColor = type === "calculate" ? [69, 34, 197] : [34, 197, 94];
  if (active && progress === 0) {
    return {
      background: `linear-gradient(90deg, rgba(${bgColor.join(
        ", "
      )}, 0.1) 0%, rgba(${bgColor.join(", ")}, 0.05) 50%, transparent 100%)`,
      backgroundSize: "200% 100%",
      animation: "gradient-shift 2s ease-in-out infinite",
    };
  }
  if (active) {
    return {
      background: `linear-gradient(90deg, rgba(${bgColor.join(
        ", "
      )}, 0.1) 0%, rgba(${bgColor.join(", ")}, 0.1) ${
        progress * 100
      }%, transparent ${progress * 100}%, transparent 100%)`,
    };
  }
  return {};
}

export const getFilesProgress = (state: ISceneState | undefined): number => {
  if (!state) return 0;
  const files = Object.values(state.donwloadedFiles);
  if (files.length === 0) return 0;

  // Для !isRepo сцен считаем процент файлов с маппингом
  if (state.isRepo === false) {
    const mappedFiles = files.filter((file) => !!file.filePath);
    return (mappedFiles.length / files.length) * 100;
  }

  // Для isRepo сцен считаем прогресс загрузки
  const totalProgress = files.reduce(
    (sum, file) => sum + (file.progress || 0),
    0
  );
  return (totalProgress / files.length) * 100;
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export const getDownloadedSize = (
  state: ISceneState | undefined
): {
  downloaded: number;
  total: number;
} => {
  if (!state) return { downloaded: 0, total: 0 };

  let downloaded = 0;
  let total = 0;

  // Для !isRepo сцен считаем размер по filePath (если файл существует)
  if (state.isRepo === false) {
    Object.values(state.donwloadedFiles).forEach((file) => {
      if (file.size) {
        total += file.size;
        // Если есть filePath, считаем файл "загруженным" (размер учитывается)
        if (file.filePath) {
          downloaded += file.size;
        }
      }
    });
  } else {
    // Для isRepo сцен считаем по прогрессу загрузки
    Object.values(state.donwloadedFiles).forEach((file) => {
      if (file.size) {
        total += file.size;
        downloaded += file.size * (file.progress || 0);
      }
    });
  }

  return { downloaded, total };
};

export const getOutputFilesSize = (state: ISceneState | undefined): number => {
  if (!state || !state.calculations) return 0;

  return state.calculations.reduce((total, calc) => {
    if (calc.status === "completed" && calc.outputSize) {
      return total + calc.outputSize;
    }
    return total;
  }, 0);
};

export const getAggregatedProgress = (
  state: ISceneState | undefined
): number => {
  if (!state) return 0;
  let progress = 0;

  REQUIRED_LAYERS.forEach((layer) => {
    progress +=
      (state.donwloadedFiles[layer]?.progress || 0) / REQUIRED_LAYERS.length;
  });
  return progress;
};

export const parseDisplayId = (displayId: string, state?: ISceneState) => {
  const segments = displayId.split("_");

  // Используем captureDate из metadata если доступен
  let date: Date;
  if (state?.metadata?.captureDate) {
    const parsedDate = new Date(state.metadata.captureDate);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
    } else {
      // Fallback к парсингу из displayId
      if (segments.length >= 4) {
        date = new Date(
          parseInt(segments[3].slice(0, 4)),
          parseInt(segments[3].slice(4, 6)) - 1,
          parseInt(segments[3].slice(6))
        );
      } else {
        date = new Date(0);
      }
    }
  } else {
    // Парсим из displayId
    if (segments.length >= 4) {
      date = new Date(
        parseInt(segments[3].slice(0, 4)),
        parseInt(segments[3].slice(4, 6)) - 1,
        parseInt(segments[3].slice(6))
      );
    } else {
      date = new Date(0);
    }
  }

  // Используем regionId из metadata если доступен
  let region: string;
  if (state?.metadata?.regionId) {
    region = state.metadata.regionId;
  } else if (segments.length >= 4) {
    region = segments[2];
  } else {
    region = "";
  }

  // Используем satelliteId из metadata если доступен, иначе парсим из displayId
  let satellite: string;
  if (state?.metadata?.satelliteId) {
    // Конвертируем satelliteId в человекочитаемый формат
    const satelliteId = state.metadata.satelliteId;
    satellite =
      satelliteId === "LC08"
        ? "Landsat 8"
        : satelliteId === "LC09"
        ? "Landsat 9"
        : satelliteId;
  } else if (segments.length >= 4) {
    // Fallback к парсингу из displayId
    satellite =
      segments[0] === "LC08"
        ? "Landsat 8"
        : segments[0] === "LC09"
        ? "Landsat 9"
        : segments[0];
  } else {
    satellite = "Unknown";
  }

  return {
    name: displayId,
    sceneId: displayId,
    satellite: satellite,
    region: region,
    date: date,
  };
};

export const getSceneStatus = (state: ISceneState | undefined): string => {
  if (!state) return "error";
  return state.status || "new";
};

export const statusColors: Record<string, string> = {
  new: "bg-gray-700 text-gray-300 border-gray-600",
  downloading: "bg-yellow-900 text-yellow-300 border-yellow-700",
  "not ready": "bg-orange-900 text-orange-300 border-orange-700",
  downloaded: "bg-blue-900 text-blue-300 border-blue-700",
  calculating: "bg-purple-900 text-purple-300 border-purple-700",
  "calculation error": "bg-red-900 text-red-300 border-red-700",
  calculated: "bg-green-900 text-green-300 border-green-700",
  processing: "bg-blue-900 text-blue-300 border-blue-700",
  error: "bg-red-900 text-red-300 border-red-700",
  ready: "bg-green-900 text-green-300 border-green-700",
  unready: "bg-orange-900 text-orange-300 border-orange-700",
};

// Маппинг регионов для humanized отображения
export const regionMapping: Record<string, string> = {
  "142021": "Красноярск (east)",
  "143021": "Красноярск (west)",
};

/**
 * Получает humanized название региона по его ID
 * @param regionId - ID региона (например, "142021")
 * @returns Humanized название региона или null, если не найдено
 */
export const getRegionName = (regionId: string): string | null => {
  return regionMapping[regionId] || null;
};
