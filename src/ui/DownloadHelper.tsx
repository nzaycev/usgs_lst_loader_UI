import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ElectonAPI } from "../tools/ElectronApi";
import { INavigation } from "./Router";
import "./SidePanel.m.css";

const ENDPOINT = "http://127.0.0.1:5000";
const socket = io(ENDPOINT);

enum DOWNLOAD_STEPS {
  PREPARE_DOWNLOADING,
  DOWNLOADING = "DOWNLOADING",
  CALCULATING = "CALCULATING",
  SAVING = "SAVING",
  READY = "READY",
}

enum CALCULATING_STEPS {
  LOAD_TO_RAM = "LOAD_TO_RAM",
  CALC_SURF_RAD = "CALC_SURF_RAD",
  CALC_NDVI = "CALC_NDVI",
  CALC_VEG_PROP = "CALC_VEG_PROP",
  CALC_EMISSION = "CALC_EMISSION",
  CALC_RADIANCE = "CALC_RADIANCE",
  CALC_BT = "CALC_BT",
  CALC_LST = "CALC_LST",
  vectorize = "vectorize",
}

type DownloadingProps = {
  step: DOWNLOAD_STEPS;
  calculate: null | CALCULATING_STEPS;
  fileSize: null | number;
  downloadedSize: null | number;
  fileCount: number;
  fileName: null | string;
  progress: null | number;
};

type loadingStateProps = {
  found: boolean;
  searching: boolean;
  downloading: null | DownloadingProps;
};
type strFun = (props: any) => string;

const downloadTitles: Record<DOWNLOAD_STEPS, string | strFun> = {
  [DOWNLOAD_STEPS.PREPARE_DOWNLOADING]: "Подготовка сцен к загрузке",
  [DOWNLOAD_STEPS.DOWNLOADING]: (props: Partial<DownloadingProps>) => {
    const main = `Загрузка сцены ${props.fileCount}/7 "${
      props.fileName || "..."
    }": `;
    const secondary =
      props.downloadedSize === null
        ? `подготовка`
        : `${(
            Math.min(props.downloadedSize, props.fileSize) /
            1024 /
            1024
          ).toFixed(1)} of ${(props.fileSize / 1024 / 1024).toFixed(1)} MB`;
    return `${main}${secondary}`;
  },
  [DOWNLOAD_STEPS.CALCULATING]: (props: Partial<DownloadingProps>) =>
    `Расчет LST: ${calculateTitles[props.calculate]}`,
  [DOWNLOAD_STEPS.SAVING]: "Сохранение слоев на диск",
  [DOWNLOAD_STEPS.READY]: "Готово",
};

const calculateTitles: Record<CALCULATING_STEPS, string> = {
  [CALCULATING_STEPS.LOAD_TO_RAM]: "Загрузка слоев в RAM",
  [CALCULATING_STEPS.CALC_SURF_RAD]: "1/7 surfRad",
  [CALCULATING_STEPS.CALC_NDVI]: "2/7 NDVI",
  [CALCULATING_STEPS.CALC_VEG_PROP]: "3/7 VegProp",
  [CALCULATING_STEPS.CALC_EMISSION]: "4/7 Emission",
  [CALCULATING_STEPS.CALC_RADIANCE]: "5/7 Radiance",
  [CALCULATING_STEPS.CALC_BT]: "6/7 BT",
  [CALCULATING_STEPS.CALC_LST]: "7/7 LST",
  [CALCULATING_STEPS.vectorize]: "Векторизация. Может занять длительное время",
};

const stopDownloading = (
  dirPath: string,
  setLoadingState: (
    callback: (oldState: loadingStateProps) => loadingStateProps
  ) => void
) => {
  socket.disconnect();
  setLoadingState((loadingState) => ({
    ...loadingState,
    downloading: null,
  }));
};

const startDownloading = ({
  setLoadingState,
  ...props
}: {
  entityId: string;
  displayId: string;
  setLoadingState(
    callback: (oldState: loadingStateProps) => loadingStateProps
  ): void;
}) => {
  setLoadingState((loadingState) => ({
    ...loadingState,
    downloading: {
      step: DOWNLOAD_STEPS.PREPARE_DOWNLOADING,
      fileSize: null,
      downloadedSize: null,
      fileName: null,
      fileCount: 0,
      calculate: null,
      progress: null,
    },
  }));
  socket.on("set_download_state", (data: Partial<DownloadingProps>) => {
    console.log("on_socket", data);
    setLoadingState((loadingState) => {
      if (data.step === DOWNLOAD_STEPS.READY) {
        ElectonAPI.openExplorer(data.fileName)
        stopDownloading(null, setLoadingState);
      }
      return {
        ...loadingState,
        downloading: { ...loadingState.downloading, ...data },
      };
    });
  });
  fetch(
    `http://127.0.0.1:5000/download_scene?entityId=${props.entityId}&displayId=${props.displayId}`
  )
    .then((x) => x.json())
    .then((x) => {
      console.log(x);
    });
};

export const DownloadHelper = ({ navigation }: { navigation: INavigation }) => {
  const [loadingState, setLoadingState] = useState<loadingStateProps>({
    found: false,
    searching: false,
    downloading: null,
  });
  const props = navigation.getData();
  useEffect(() => {
    startDownloading({ setLoadingState, ...props });
  }, []);
  return (
    <div>
      {loadingState.downloading && (
        <LoadingPlaceholder
          title={
            typeof downloadTitles[loadingState.downloading.step] === "function"
              ? (downloadTitles[loadingState.downloading.step] as strFun)(
                  loadingState.downloading
                )
              : (downloadTitles[loadingState.downloading.step] as string)
          }
          value={
            loadingState.downloading.progress ||
            Math.min(
              loadingState.downloading.downloadedSize /
                loadingState.downloading.fileSize,
              1
            )
          }
        />
      )}
    </div>
  );
};

const LoadingPlaceholder = ({
  title,
  value,
}: {
  title: string;
  value?: number;
}) => {
  return (
    <div className="loading-placeholder">
      <div className="lds-ellipsis">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div>{title}</div>
      <br />
      {value !== undefined && (
        <div className="meter">
          <span style={{ width: `${value * 100}%` }}></span>
        </div>
      )}
    </div>
  );
};
