import { spawn, type ChildProcess } from "child_process";
import { ipcMain } from "electron-typescript-ipc";
import fs from "fs";
import { isNumber } from "lodash";
import path from "path";
import type { ISceneState, RunArgs } from "../../actions/main-actions";
import type { Api } from "../../tools/ElectronApi";
import { scenePathResolver } from "../scene-path-resolver";

export function setupCalculationHandlers() {
  ipcMain.handle<Api>(
    "calculate",
    async (_, sceneId: string, args: RunArgs) => {
      const publicPath = path.join(
        process.env.APP_DEV ? process.cwd() : process.resourcesPath,
        "public"
      );
      const calculationProcessPath = path.join(
        publicPath,
        "tasks/calculation.exe"
      );

      // Используем утилиту для поиска пути к сцене
      const result = scenePathResolver.findScenePath(sceneId);

      if (!result) {
        throw new Error(`Scene index not found: ${sceneId}`);
      }

      const { scenePath, indexPath, indexState } = result;

      console.log("[calculate] Using scene path:", {
        sceneId,
        scenePath,
        isRepo: result.isRepo,
      });

      // Функция генерации имени папки результатов (как в Python скрипте)
      const generateOutputDirectoryName = (saveDirectory?: string): string => {
        if (saveDirectory) {
          // Если задано кастомное имя, проверяем, содержит ли оно паттерны
          // Паттерны: {date} и {args}
          if (
            saveDirectory.includes("{date}") ||
            saveDirectory.includes("{args}")
          ) {
            // Генерируем значения для подстановки
            const flags: string[] = [];
            if (args.useQAMask) {
              flags.push("withQAMask");
            }
            if (isNumber(args.emission)) {
              flags.push(`emission-${args.emission}`);
            }
            if (args.emissionCalcMethod) {
              flags.push(`emissionCalcMethod-${args.emissionCalcMethod}`);
            }

            // Формат даты как в Python: %Y-%m-%d_%H-%M__%S
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(
              now.getMonth() + 1
            ).padStart(2, "0")}-${String(now.getDate()).padStart(
              2,
              "0"
            )}_${String(now.getHours()).padStart(2, "0")}-${String(
              now.getMinutes()
            ).padStart(2, "0")}__${String(now.getSeconds()).padStart(2, "0")}`;

            const argsStr = flags.join("_");

            // Подставляем значения в паттерн
            return saveDirectory
              .replace(/{date}/g, dateStr)
              .replace(/{args}/g, argsStr);
          }
          // Если паттернов нет, используем как есть
          return saveDirectory;
        }

        // Генерируем имя как в Python: out_{date}-{args}
        const flags: string[] = [];
        if (args.useQAMask) {
          flags.push("withQAMask");
        }
        if (isNumber(args.emission)) {
          flags.push(`emission-${args.emission}`);
        }
        if (args.emissionCalcMethod) {
          flags.push(`emissionCalcMethod-${args.emissionCalcMethod}`);
        }

        // Формат даты как в Python: %Y-%m-%d_%H-%M__%S
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(
          now.getHours()
        ).padStart(2, "0")}-${String(now.getMinutes()).padStart(
          2,
          "0"
        )}__${String(now.getSeconds()).padStart(2, "0")}`;

        const argsStr = flags.length > 0 ? `-${flags.join("_")}` : "";
        return `out_${dateStr}${argsStr}`;
      };

      // Проверяем на дубликаты имен перед запуском
      const outputDirName = generateOutputDirectoryName(args.saveDirectory);
      const absoluteResultsPath = path.resolve(scenePath, outputDirName);

      // Проверяем существующие расчеты на дубликаты
      const existingCalculations = indexState.calculations || [];
      const duplicateCalc = existingCalculations.find((calc) => {
        if (!calc.resultsPath) return false;
        // Нормализуем путь для сравнения
        const calcPath = path.isAbsolute(calc.resultsPath)
          ? calc.resultsPath
          : path.resolve(scenePath, calc.resultsPath.replace(/^\.[/\\]/, ""));
        return path.normalize(calcPath) === path.normalize(absoluteResultsPath);
      });

      if (duplicateCalc) {
        const errorMessage = `Calculation with output directory "${outputDirName}" already exists. Please change the output directory name.`;
        console.error("[calculate] Duplicate calculation detected:", {
          outputDirName,
          absoluteResultsPath,
          existingCalc: duplicateCalc.resultsPath,
        });
        throw new Error(errorMessage);
      }

      // Формируем аргументы без кавычек (spawn сам обрабатывает аргументы)
      const runArgs: string[] = ["--path", scenePath];
      if (args.useQAMask) runArgs.push("--useQAMask");
      if (args.emissionCalcMethod)
        runArgs.push("--emissionCalcMethod", args.emissionCalcMethod);
      if (isNumber(args.emission))
        runArgs.push("--emission", args.emission.toString());
      Object.entries(args.outLayers).forEach(([outLayerKey, required]) => {
        if (required) runArgs.push(`--save${outLayerKey}`);
      });
      // Всегда передаем явное имя папки, чтобы Python не генерировал свое
      runArgs.push("--out", outputDirName);
      if (args.layerNamePattern)
        runArgs.push("--layerPattern", args.layerNamePattern);

      console.log("[calculate] Results path:", {
        scenePath,
        saveDirectory: args.saveDirectory,
        outputDirName,
        absoluteResultsPath,
        isAbsolute: path.isAbsolute(absoluteResultsPath),
      });

      // Создаем запись о новом расчете
      const calculationResult = {
        resultsPath: absoluteResultsPath,
        parameters: {
          useQAMask: args.useQAMask,
          emission: args.emission,
          outLayers: args.outLayers,
          saveDirectory: args.saveDirectory,
          layerNamePattern: args.layerNamePattern,
          emissionCalcMethod: args.emissionCalcMethod,
        },
        startTime: new Date().toISOString(),
        status: "running" as const,
      };

      // Инициализируем массив calculations если его нет
      if (!indexState.calculations) {
        indexState.calculations = [];
      }

      // Добавляем новый расчет
      indexState.calculations.push(calculationResult);

      // Используем spawn для получения PID процесса
      const isWindows = process.platform === "win32";
      let calculationProcess: ChildProcess;

      if (isWindows) {
        // Используем обертку через batch-файл для правильной передачи кода выхода
        // Это необходимо, так как start /wait не всегда правильно передает код выхода
        const escapedPath = calculationProcessPath.replace(/"/g, '""');
        const escapedArgs = runArgs
          .map((arg) => {
            const escaped = arg.replace(/"/g, '""');
            return escaped.includes(" ") ? `"${escaped}"` : escaped;
          })
          .join(" ");

        // Создаем временный batch-файл, который запустит процесс напрямую
        // и вернет его код выхода через errorlevel
        // Используем прямой запуск в batch-файле для правильной передачи кода выхода
        // Устанавливаем кодовую страницу UTF-8 для поддержки Unicode символов
        const batchContent = `@echo off
chcp 65001 >nul
"${escapedPath}" ${escapedArgs}
exit /b %errorlevel%`;

        const batchPath = path.join(
          scenePath,
          `_calc_wrapper_${Date.now()}.bat`
        );
        fs.writeFileSync(batchPath, batchContent);

        // Запускаем batch-файл через cmd
        calculationProcess = spawn(`cmd /c "${batchPath}"`, [], {
          detached: false,
          stdio: ["ignore", "pipe", "pipe"],
          shell: true,
          cwd: scenePath,
          env: {
            ...process.env,
            PYTHONIOENCODING: "utf-8",
            PYTHONLEGACYWINDOWSSTDIO: "1",
            PYTHONUTF8: "1",
          },
        });

        // Удаляем batch-файл после завершения процесса
        const cleanupBatch = () => {
          if (fs.existsSync(batchPath)) {
            try {
              fs.unlinkSync(batchPath);
            } catch (e) {
              // Игнорируем ошибки удаления
            }
          }
        };
        calculationProcess.on("exit", cleanupBatch);
        calculationProcess.on("error", cleanupBatch);
      } else {
        // На других платформах используем обычный spawn
        calculationProcess = spawn(calculationProcessPath, runArgs, {
          detached: false,
          stdio: ["ignore", "pipe", "pipe"],
          shell: false,
          cwd: scenePath,
          env: {
            ...process.env,
          },
        });
      }

      // Логируем stdout для диагностики
      if (calculationProcess.stdout) {
        calculationProcess.stdout.on("data", (data: Buffer) => {
          // Используем UTF-8 для декодирования, чтобы правильно обработать Unicode символы
          try {
            console.log(`[Calculation stdout] ${data.toString("utf-8")}`);
          } catch (e) {
            // Fallback на latin1 если UTF-8 не работает
            console.log(`[Calculation stdout] ${data.toString("latin1")}`);
          }
        });
      }

      // Собираем последние строки stderr для отображения в UI
      const stderrBuffer: string[] = [];
      const MAX_STDERR_LINES = 10; // Сохраняем последние 10 строк

      if (calculationProcess.stderr) {
        calculationProcess.stderr.on("data", (data: Buffer) => {
          // Используем UTF-8 для декодирования, чтобы правильно обработать Unicode символы
          let stderrText: string;
          try {
            stderrText = data.toString("utf-8");
            console.error(`[Calculation stderr] ${stderrText}`);
          } catch (e) {
            // Fallback на latin1 если UTF-8 не работает
            stderrText = data.toString("latin1");
            console.error(`[Calculation stderr] ${stderrText}`);
          }

          // Разбиваем на строки и добавляем в буфер
          const lines = stderrText
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);
          stderrBuffer.push(...lines);

          // Оставляем только последние MAX_STDERR_LINES строк
          if (stderrBuffer.length > MAX_STDERR_LINES) {
            stderrBuffer.splice(0, stderrBuffer.length - MAX_STDERR_LINES);
          }
        });
      }

      // Сохраняем PID в последнем расчете
      const lastCalculation =
        indexState.calculations[indexState.calculations.length - 1];
      lastCalculation.pid = calculationProcess.pid;

      // Обновляем legacy поля для обратной совместимости
      indexState.calculation = 0; // Начало расчета
      indexState.calculated = false;

      // Сохраняем обновленное состояние
      // Убеждаемся, что resultsPath абсолютный перед сохранением
      const lastCalc =
        indexState.calculations[indexState.calculations.length - 1];
      if (lastCalc.resultsPath && !path.isAbsolute(lastCalc.resultsPath)) {
        lastCalc.resultsPath = path.resolve(
          scenePath,
          lastCalc.resultsPath.replace(/^\.[/\\]/, "")
        );
        console.log("[calculate] Normalized resultsPath before saving:", {
          original:
            indexState.calculations[indexState.calculations.length - 1]
              .resultsPath,
          normalized: lastCalc.resultsPath,
        });
      }
      fs.writeFileSync(indexPath, JSON.stringify(indexState, null, 2));
      console.log("[calculate] Saved index.json with calculations:", {
        calculationsCount: indexState.calculations.length,
        lastCalcResultsPath: lastCalc.resultsPath,
        isAbsolute: path.isAbsolute(lastCalc.resultsPath),
      });

      // Возвращаем успешный результат только после того, как процесс запущен
      // Это позволяет диалогу дождаться подтверждения начала расчета
      const resultMessage = `"${calculationProcessPath}" ${runArgs.join(" ")}`;

      calculationProcess.on("exit", (code, signal) => {
        console.log(
          `Calculation process exited with code ${code}${
            signal ? `, signal ${signal}` : ""
          }`
        );

        // Определяем успешность завершения:
        // - код выхода должен быть 0
        // - не должно быть сигнала завершения
        // - код выхода не должен быть null/undefined
        const isSuccess =
          code === 0 && !signal && code !== null && code !== undefined;

        // Обновляем состояние после завершения
        if (fs.existsSync(indexPath)) {
          const updatedState: ISceneState = JSON.parse(
            fs.readFileSync(indexPath).toString()
          );

          console.log(
            "[calculate] Reading updated state for output size calculation:",
            {
              scenePath,
              indexPath,
              calculationsCount: updatedState.calculations?.length || 0,
              lastCalcResultsPath:
                updatedState.calculations?.[
                  updatedState.calculations.length - 1
                ]?.resultsPath,
            }
          );

          // Находим последний расчет и обновляем его статус
          if (
            updatedState.calculations &&
            updatedState.calculations.length > 0
          ) {
            const lastCalc =
              updatedState.calculations[updatedState.calculations.length - 1];
            if (
              lastCalc.status === "running" &&
              lastCalc.pid === calculationProcess.pid
            ) {
              if (isSuccess) {
                lastCalc.status = "completed";

                // Рассчитываем размер выходных файлов
                try {
                  let totalSize = 0;
                  // Нормализуем путь к результатам
                  // resultsPath может быть относительным (например, "out_2025-01-17T10-30-00-000Z")
                  // или абсолютным, или начинаться с "./"
                  let normalizedResultsPath: string;

                  if (path.isAbsolute(lastCalc.resultsPath)) {
                    // Уже абсолютный путь
                    normalizedResultsPath = lastCalc.resultsPath;
                  } else {
                    // Относительный путь - нормализуем относительно scenePath
                    const cleanPath = lastCalc.resultsPath.replace(
                      /^\.[/\\]/,
                      ""
                    );
                    normalizedResultsPath = path.resolve(scenePath, cleanPath);
                  }

                  console.log(
                    "[calculate] Normalizing results path for output size:",
                    {
                      original: lastCalc.resultsPath,
                      scenePath,
                      normalizedResultsPath,
                      isAbsolute: path.isAbsolute(normalizedResultsPath),
                      exists: fs.existsSync(normalizedResultsPath),
                    }
                  );

                  // Обновляем resultsPath на абсолютный путь для будущих использований
                  lastCalc.resultsPath = normalizedResultsPath;

                  if (fs.existsSync(normalizedResultsPath)) {
                    const files = fs.readdirSync(normalizedResultsPath);
                    console.log("[calculate] Files in results directory:", {
                      path: normalizedResultsPath,
                      fileCount: files.length,
                      files: files.slice(0, 10), // Первые 10 файлов для отладки
                    });

                    for (const file of files) {
                      const filePath = path.join(normalizedResultsPath, file);
                      try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                          totalSize += stats.size;
                        }
                      } catch (e) {
                        console.warn(
                          "[calculate] Error reading file:",
                          filePath,
                          e
                        );
                        // Игнорируем ошибки доступа к файлам
                      }
                    }
                  } else {
                    console.warn(
                      "[calculate] Results directory does not exist:",
                      normalizedResultsPath
                    );
                    // Пробуем найти директорию, проверяя возможные варианты
                    const possiblePaths = [
                      path.resolve(scenePath, lastCalc.resultsPath),
                      path.resolve(scenePath, `./${lastCalc.resultsPath}`),
                      lastCalc.resultsPath,
                    ];
                    for (const possiblePath of possiblePaths) {
                      if (fs.existsSync(possiblePath)) {
                        console.log(
                          "[calculate] Found results directory at alternative path:",
                          possiblePath
                        );
                        normalizedResultsPath = possiblePath;
                        lastCalc.resultsPath = normalizedResultsPath;
                        // Пересчитываем размер
                        const files = fs.readdirSync(normalizedResultsPath);
                        for (const file of files) {
                          const filePath = path.join(
                            normalizedResultsPath,
                            file
                          );
                          try {
                            const stats = fs.statSync(filePath);
                            if (stats.isFile()) {
                              totalSize += stats.size;
                            }
                          } catch (e) {
                            // Игнорируем ошибки
                          }
                        }
                        break;
                      }
                    }
                  }
                  lastCalc.outputSize = totalSize;
                  console.log("[calculate] Output size calculated:", {
                    resultsPath: normalizedResultsPath,
                    outputSize: totalSize,
                    outputSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                    exists: fs.existsSync(normalizedResultsPath),
                  });
                } catch (e) {
                  // Игнорируем ошибки расчета размера
                  console.error(
                    "[calculate] Error calculating output size:",
                    e
                  );
                }
              } else {
                lastCalc.status = "error";
                // Формируем сообщение об ошибке с последними строками stderr
                const errorParts: string[] = [];
                if (code !== null && code !== undefined && code !== 0) {
                  errorParts.push(`Exit code: ${code}`);
                }
                if (signal) {
                  errorParts.push(`Signal: ${signal}`);
                }

                // Используем последние строки stderr, если они есть
                if (stderrBuffer.length > 0) {
                  lastCalc.stderrLines = [...stderrBuffer];
                  const stderrText = stderrBuffer.join("\n");
                  if (errorParts.length > 0) {
                    lastCalc.error = `${errorParts.join(
                      ", "
                    )}\n\n${stderrText}`;
                  } else {
                    lastCalc.error = stderrText;
                  }
                } else {
                  // Если stderr пуст, используем стандартное сообщение
                  lastCalc.error =
                    errorParts.length > 0
                      ? errorParts.join(", ")
                      : "Process failed. No error details available.";
                }
                lastCalc.exitCode = code ?? -1;
              }
              lastCalc.endTime = new Date().toISOString();
              delete lastCalc.pid;
            }
          }

          // Обновляем legacy поля для обратной совместимости
          if (isSuccess) {
            updatedState.calculated = true;
            updatedState.calculation = 1;
          } else {
            updatedState.calculation = 0;
          }

          fs.writeFileSync(indexPath, JSON.stringify(updatedState, null, 2));
        }
      });

      // Обрабатываем ошибки процесса
      calculationProcess.on("error", (error) => {
        console.error("Calculation process error:", error);
        console.error("Error details:", {
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          path: (error as any).path,
        });

        if (fs.existsSync(indexPath)) {
          const updatedState: ISceneState = JSON.parse(
            fs.readFileSync(indexPath).toString()
          );

          if (
            updatedState.calculations &&
            updatedState.calculations.length > 0
          ) {
            const lastCalc =
              updatedState.calculations[updatedState.calculations.length - 1];
            if (
              lastCalc.status === "running" &&
              lastCalc.pid === calculationProcess.pid
            ) {
              lastCalc.status = "error";

              // Формируем сообщение об ошибке с последними строками stderr
              const errorMessage = error.message || String(error);
              if (stderrBuffer.length > 0) {
                lastCalc.stderrLines = [...stderrBuffer];
                lastCalc.error = `Process error: ${errorMessage}\n\n${stderrBuffer.join(
                  "\n"
                )}`;
              } else {
                lastCalc.error = `Process error: ${errorMessage}`;
              }

              lastCalc.endTime = new Date().toISOString();
              delete lastCalc.pid;
              fs.writeFileSync(
                indexPath,
                JSON.stringify(updatedState, null, 2)
              );
            }
          }
        }
      });

      return resultMessage;
    }
  );

  ipcMain.handle<Api>(
    "deleteCalculation",
    async (_, sceneId: string, calculationIndex: number) => {
      // Используем утилиту для поиска пути к сцене
      const result = scenePathResolver.findScenePath(sceneId);

      if (!result) {
        throw new Error(`Scene index not found: ${sceneId}`);
      }

      const { scenePath, indexPath, indexState } = result;

      // Проверяем, что индекс валидный
      if (
        !indexState.calculations ||
        calculationIndex < 0 ||
        calculationIndex >= indexState.calculations.length
      ) {
        throw new Error(`Invalid calculation index: ${calculationIndex}`);
      }

      const calc = indexState.calculations[calculationIndex];

      // Удаляем директорию с результатами, если она существует
      if (calc.resultsPath) {
        // Нормализуем путь
        const normalizedPath = path.isAbsolute(calc.resultsPath)
          ? calc.resultsPath
          : path.resolve(scenePath, calc.resultsPath.replace(/^\.[/\\]/, ""));

        if (fs.existsSync(normalizedPath)) {
          try {
            // Рекурсивно удаляем директорию
            fs.rmSync(normalizedPath, { recursive: true, force: true });
            console.log(
              "[deleteCalculation] Deleted results directory:",
              normalizedPath
            );
          } catch (e) {
            console.error("[deleteCalculation] Error deleting directory:", e);
            throw new Error(`Failed to delete results directory: ${e}`);
          }
        }
      }

      // Удаляем запись из массива calculations
      indexState.calculations.splice(calculationIndex, 1);

      // Сохраняем обновленное состояние
      fs.writeFileSync(indexPath, JSON.stringify(indexState, null, 2));

      console.log("[deleteCalculation] Deleted calculation:", {
        sceneId,
        calculationIndex,
        resultsPath: calc.resultsPath,
      });
    }
  );
}
