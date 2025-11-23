import { ISceneState, USGSLayerType } from "../../../actions/main-actions";

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

  Object.values(state.donwloadedFiles).forEach((file) => {
    if (file.size) {
      total += file.size;
      downloaded += file.size * (file.progress || 0);
    }
  });

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

export const getAggregatedProgress = (state: ISceneState | undefined): number => {
  if (!state) return 0;
  let progress = 0;

  const required: USGSLayerType[] = [
    "ST_TRAD",
    "ST_ATRAN",
    "ST_URAD",
    "ST_DRAD",
    "SR_B6",
    "SR_B5",
    "SR_B4",
    "QA_PIXEL",
  ];
  required.forEach((layer) => {
    progress += (state.donwloadedFiles[layer]?.progress || 0) / required.length;
  });
  return progress;
};

export const parseDisplayId = (displayId: string) => {
  const segments = displayId.split("_");
  if (segments.length < 4)
    return {
      name: displayId,
      sceneId: displayId,
      satellite: "Unknown",
      region: "",
      date: new Date(0),
    };
  const landsatId =
    segments[0] === "LC08"
      ? "Landsat 8"
      : segments[0] === "LC09"
      ? "Landsat 9"
      : segments[0];
  const date = new Date(
    parseInt(segments[3].slice(0, 4)),
    parseInt(segments[3].slice(4, 6)) - 1,
    parseInt(segments[3].slice(6))
  );
  const region = segments[2];
  return {
    name: displayId,
    sceneId: displayId,
    satellite: landsatId,
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
  "downloading cancelled":
    "bg-orange-900 text-orange-300 border-orange-700",
  downloaded: "bg-blue-900 text-blue-300 border-blue-700",
  calculating: "bg-purple-900 text-purple-300 border-purple-700",
  "calculation error": "bg-red-900 text-red-300 border-red-700",
  calculated: "bg-green-900 text-green-300 border-green-700",
  processing: "bg-blue-900 text-blue-300 border-blue-700",
  error: "bg-red-900 text-red-300 border-red-700",
};

