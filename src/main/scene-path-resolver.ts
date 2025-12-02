import { app } from "electron";
import fs from "fs";
import path from "path";
import type { ISceneState } from "../actions/main-actions";
import type { FsWatcher } from "./fs-watcher";

export interface ScenePathResult {
  scenePath: string;
  indexPath: string;
  indexState: ISceneState;
  isRepo: boolean;
}

/**
 * Утилита для поиска путей к сценам (repo и external)
 */
export class ScenePathResolver {
  private appdataPath: string;
  private globalIndexPath: string;

  constructor() {
    this.appdataPath = path.join(app.getPath("userData"), "localStorage");
    this.globalIndexPath = path.join(this.appdataPath, "index.json");
  }

  /**
   * Находит путь к сцене по displayId/sceneId
   * @param sceneId - displayId или sceneId сцены
   * @param fsWatcher - опциональный fsWatcher для поиска в state
   * @returns ScenePathResult или null, если сцена не найдена
   */
  findScenePath(
    sceneId: string,
    fsWatcher?: FsWatcher
  ): ScenePathResult | null {
    // 1. Пробуем найти в state (если fsWatcher доступен)
    if (fsWatcher) {
      const scenesState = fsWatcher.getState();
      for (const key in scenesState) {
        if (scenesState[key].displayId === sceneId) {
          const sceneState = scenesState[key];
          if (sceneState.scenePath) {
            const indexPath = path.join(sceneState.scenePath, "index.json");
            return {
              scenePath: sceneState.scenePath,
              indexPath,
              indexState: sceneState,
              isRepo: sceneState.isRepo ?? true,
            };
          }
        }
      }
    }

    // 2. Пробуем найти в repo paths
    const repoScenePath = path.join(this.appdataPath, sceneId);
    const repoIndexPath = path.join(repoScenePath, "index.json");

    if (fs.existsSync(repoIndexPath)) {
      try {
        const indexState = JSON.parse(
          fs.readFileSync(repoIndexPath, "utf-8")
        ) as ISceneState;
        return {
          scenePath: repoScenePath,
          indexPath: repoIndexPath,
          indexState,
          isRepo: true,
        };
      } catch (e) {
        console.error(
          `[ScenePathResolver] Error reading repo index.json:`,
          repoIndexPath,
          e
        );
      }
    }

    // 3. Пробуем найти в external paths
    if (fs.existsSync(this.globalIndexPath)) {
      try {
        const globalIndex = JSON.parse(
          fs.readFileSync(this.globalIndexPath, "utf-8")
        );
        const externalPaths: string[] = globalIndex.externalPaths || [];

        for (const externalPath of externalPaths) {
          // 3.1. Проверяем по имени папки (самый быстрый способ)
          const folderName = path.basename(externalPath);
          if (folderName === sceneId) {
            const externalIndexPath = path.join(externalPath, "index.json");
            if (fs.existsSync(externalIndexPath)) {
              try {
                const indexState = JSON.parse(
                  fs.readFileSync(externalIndexPath, "utf-8")
                ) as ISceneState;
                return {
                  scenePath: indexState.scenePath || externalPath,
                  indexPath: externalIndexPath,
                  indexState,
                  isRepo: false,
                };
              } catch (e) {
                console.error(
                  `[ScenePathResolver] Error reading external index.json:`,
                  externalIndexPath,
                  e
                );
              }
            } else {
              // Если index.json нет, но имя папки совпадает, используем путь папки
              // Это не должно происходить для правильно настроенных external сцен
              console.warn(
                `[ScenePathResolver] Folder name matches but no index.json:`,
                { sceneId, folderName, externalPath }
              );
            }
          }

          // 3.2. Проверяем по displayId и scenePath в index.json
          const externalIndexPath = path.join(externalPath, "index.json");
          if (fs.existsSync(externalIndexPath)) {
            try {
              const externalState = JSON.parse(
                fs.readFileSync(externalIndexPath, "utf-8")
              ) as ISceneState;

              // Проверяем по displayId или по scenePath
              if (
                externalState.displayId === sceneId ||
                (externalState.scenePath &&
                  path.basename(externalState.scenePath) === sceneId)
              ) {
                return {
                  scenePath: externalState.scenePath || externalPath,
                  indexPath: externalIndexPath,
                  indexState: externalState,
                  isRepo: false,
                };
              }
            } catch (e) {
              console.error(
                `[ScenePathResolver] Error reading external index.json:`,
                externalIndexPath,
                e
              );
            }
          }
        }
      } catch (e) {
        console.error(
          `[ScenePathResolver] Error reading global index:`,
          this.globalIndexPath,
          e
        );
      }
    }

    return null;
  }

  /**
   * Получает путь к директории localStorage
   */
  getAppdataPath(): string {
    return this.appdataPath;
  }
}

// Singleton instance
export const scenePathResolver = new ScenePathResolver();
