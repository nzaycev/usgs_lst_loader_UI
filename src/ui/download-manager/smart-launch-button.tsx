import { ChevronDown, FolderOpen, Play, Search, Square, Trash2, X, LucideIcon } from "lucide-react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app";
import { mainActions } from "../../actions/main-actions";
import { useTypedNavigate } from "../mainWindow";
import { ISceneState } from "../../actions/main-actions";

type ActionType =
  | "addFromCatalog"
  | "findInUSGS"
  | "startDownloading"
  | "stopDownloading"
  | "startCalculation"
  | "openDirectory"
  | "delete"
  | "stopCalculation";

interface Action {
  type: ActionType;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  disabled?: boolean;
}

interface SmartLaunchButtonProps {
  onAddFromCatalog: () => Promise<void>;
  onFindInUSGS: () => Promise<void>;
  onStartCalculation: (displayIds: string[]) => void;
  onStartDownloading: (displayIds: string[]) => void;
  onStopDownloading: (displayIds: string[]) => void;
  onStopCalculation: (displayIds: string[]) => void;
  onOpenDirectory: (displayIds: string[]) => void;
  onDelete: (displayIds: string[]) => void;
}

const getSceneStatus = (state: ISceneState | undefined): string => {
  if (!state) return "error";
  
  // Если идет расчет
  if (state.calculation > 0 && state.calculation < 1) {
    return "calculation";
  }
  
  // Если расчет завершен
  if (state.calculated) {
    return "ready";
  }
  
  // Если это репозиторий (локальные файлы)
  if (state.isRepo) {
    // Проверяем, есть ли незагруженные файлы
    const hasIncompleteFiles = Object.entries(state.donwloadedFiles).some(
      ([, x]) => !x.progress || x.progress < 1
    );
    
    if (hasIncompleteFiles) {
      return "downloading";
    }
    
    // Все файлы загружены, но расчет не выполнен
    return "downloaded";
  }
  
  // Если это онлайн источник
  // Проверяем, есть ли загруженные файлы
  const hasDownloadedFiles = Object.keys(state.donwloadedFiles).length > 0;
  const hasIncompleteFiles = Object.entries(state.donwloadedFiles).some(
    ([, x]) => !x.progress || x.progress < 1
  );
  
  if (hasIncompleteFiles) {
    return "downloading";
  }
  
  if (hasDownloadedFiles) {
    // Файлы загружены, но расчет не выполнен
    return "downloaded";
  }
  
  // Нет файлов - новый статус
  return "new";
};

export const SmartLaunchButton: React.FC<SmartLaunchButtonProps> = ({
  onAddFromCatalog,
  onFindInUSGS,
  onStartCalculation,
  onStartDownloading,
  onStopDownloading,
  onStopCalculation,
  onOpenDirectory,
  onDelete,
}) => {
  const { selectedIds, scenes, isActionBusy } = useAppSelector((state) => state.main);
  const dispatch = useAppDispatch();
  const navigate = useTypedNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Определяем статусы выбранных элементов
  const selectedStatuses = useMemo(() => {
    return selectedIds.map((id) => getSceneStatus(scenes[id]));
  }, [selectedIds, scenes]);

  // Определяем умные действия на основе выбранных элементов
  const actions = useMemo((): Action[] => {
    const allActions: Action[] = [];
    
    if (selectedIds.length === 0) {
      // Пустое выделение - предлагаем добавление коллекции
      return [
        {
          type: "addFromCatalog",
          label: "Add from Catalog",
          icon: FolderOpen,
          primary: true,
        },
        {
          type: "findInUSGS",
          label: "Find in USGS Explorer",
          icon: Search,
        },
      ];
    }
    
    // Всегда добавляем опцию "открыть папку с ресурсами" если есть выделение
    allActions.push({
      type: "openDirectory",
      label: "Open Resources Folder",
      icon: FolderOpen,
    });

    // Анализируем статусы выбранных элементов
    const hasDownloading = selectedStatuses.includes("downloading");
    const hasNew = selectedStatuses.includes("new");
    const hasDownloaded = selectedStatuses.includes("downloaded");
    const hasCalculated = selectedStatuses.includes("calculated");
    const hasCalculating = selectedStatuses.includes("calculating");
    const hasError = selectedStatuses.includes("error");
    const hasCancelled = selectedStatuses.includes("downloading cancelled");

    let primaryAction: Action | null = null;
    const secondaryActions: Action[] = [];

    // Приоритет действий (по порядку проверки - только одно primary):
    
    // 1. Если есть calculating - предлагаем stop calculation (высший приоритет)
    if (hasCalculating) {
      primaryAction = {
        type: "stopCalculation",
        label: "Stop Calculation",
        icon: Square,
        primary: true,
      };
    }
    // 2. Если есть downloading - предлагаем stop downloading
    else if (hasDownloading) {
      primaryAction = {
        type: "stopDownloading",
        label: "Stop Downloading",
        icon: X,
        primary: true,
      };
    }
    // 3. Если есть new или cancelled - предлагаем start downloading
    else if (hasNew || hasCancelled) {
      primaryAction = {
        type: "startDownloading",
        label: "Start Downloading",
        icon: Play,
        primary: true,
      };
      secondaryActions.push({
        type: "delete",
        label: "Delete",
        icon: Trash2,
      });
    }
    // 4. Если есть downloaded - предлагаем start calculation
    else if (hasDownloaded) {
      primaryAction = {
        type: "startCalculation",
        label: "Start Calculation",
        icon: Play,
        primary: true,
      };
      secondaryActions.push({
        type: "delete",
        label: "Delete",
        icon: Trash2,
      });
    }
    // 5. Если есть calculated - предлагаем open directory
    else if (hasCalculated) {
      primaryAction = {
        type: "openDirectory",
        label: "Open Directory",
        icon: FolderOpen,
        primary: true,
      };
      secondaryActions.push(
        {
          type: "delete",
          label: "Delete",
          icon: Trash2,
        },
        {
          type: "startCalculation",
          label: "Start New Calculation",
          icon: Play,
        }
      );
    }

    // Объединяем все действия, убирая дубликаты
    const resultActions: Action[] = [];
    if (primaryAction) {
      resultActions.push(primaryAction);
    }
    
    // Добавляем secondary actions, исключая те, что уже есть в allActions или primary
    secondaryActions.forEach((action) => {
      if (
        !resultActions.some((a) => a.type === action.type) &&
        !allActions.some((a) => a.type === action.type)
      ) {
        resultActions.push(action);
      }
    });
    
    // Добавляем allActions (включая "Open Resources Folder"), исключая дубликаты
    allActions.forEach((action) => {
      if (!resultActions.some((a) => a.type === action.type)) {
        resultActions.push(action);
      }
    });

    return resultActions;
  }, [selectedIds, selectedStatuses]);

  const primaryAction = actions.find((a) => a.primary);
  const secondaryActions = actions.filter((a) => !a.primary);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handlePrimaryAction = async () => {
    if (!primaryAction) {
      // Если нет основного действия, открываем dropdown
      setIsDropdownOpen(!isDropdownOpen);
      return;
    }

    dispatch(mainActions.actions.setActionBusy(true));
    try {
      switch (primaryAction.type) {
        case "addFromCatalog":
          await onAddFromCatalog();
          break;
        case "findInUSGS":
          await onFindInUSGS();
          break;
        case "startDownloading":
          onStartDownloading(selectedIds);
          break;
        case "stopDownloading":
          onStopDownloading(selectedIds);
          break;
        case "startCalculation":
          onStartCalculation(selectedIds);
          break;
        case "openDirectory":
          onOpenDirectory(selectedIds);
          break;
        case "stopCalculation":
          onStopCalculation(selectedIds);
          break;
      }
    } finally {
      dispatch(mainActions.actions.setActionBusy(false));
    }
  };

  const handleSecondaryAction = async (action: Action) => {
    dispatch(mainActions.actions.setActionBusy(true));
    setIsDropdownOpen(false);
    try {
      switch (action.type) {
        case "addFromCatalog":
          await onAddFromCatalog();
          break;
        case "findInUSGS":
          await onFindInUSGS();
          break;
        case "startDownloading":
          onStartDownloading(selectedIds);
          break;
        case "stopDownloading":
          onStopDownloading(selectedIds);
          break;
        case "startCalculation":
          onStartCalculation(selectedIds);
          break;
        case "openDirectory":
          onOpenDirectory(selectedIds);
          break;
        case "delete":
          onDelete(selectedIds);
          break;
        case "stopCalculation":
          onStopCalculation(selectedIds);
          break;
      }
    } finally {
      dispatch(mainActions.actions.setActionBusy(false));
    }
  };

  const PrimaryIcon = primaryAction?.icon || Play;
  const isDisabled = isActionBusy || (selectedIds.length === 0 && !primaryAction);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        {/* Основная кнопка */}
        <button
          onClick={handlePrimaryAction}
          disabled={isDisabled}
          className={`px-4 py-2 bg-blue-600 text-white rounded-l hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
            isActionBusy ? "cursor-wait" : ""
          }`}
        >
          {isActionBusy ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <PrimaryIcon size={16} />
          )}
          <span>
            {primaryAction?.label || "Add Collection"}
            {selectedIds.length > 0 && ` (${selectedIds.length})`}
          </span>
        </button>

        {/* Кнопка dropdown */}
        {(secondaryActions.length > 0 || !primaryAction) && (
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isDisabled}
            className="px-2 py-2 bg-blue-600 text-white rounded-r border-l border-blue-700 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Dropdown меню */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[200px]">
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.type}
                onClick={() => handleSecondaryAction(action)}
                disabled={isActionBusy}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
          {secondaryActions.length === 0 && !primaryAction && (
            <>
              <button
                onClick={() => handleSecondaryAction({ type: "addFromCatalog", label: "Add from Catalog", icon: FolderOpen })}
                disabled={isActionBusy}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderOpen size={16} />
                Add from Catalog
              </button>
              <button
                onClick={() => handleSecondaryAction({ type: "findInUSGS", label: "Find in USGS Explorer", icon: Search })}
                disabled={isActionBusy}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search size={16} />
                Find in USGS Explorer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

