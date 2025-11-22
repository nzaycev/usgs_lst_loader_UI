import { spawn, type ChildProcess } from "child_process";
import { app } from "electron";
import { ipcMain } from "electron-typescript-ipc";
import fs from "fs";
import { isNumber } from "lodash";
import path from "path";
import type { ISceneState, RunArgs } from "../../actions/main-actions";
import type { Api } from "../../tools/ElectronApi";

export function setupCalculationHandlers() {
  ipcMain.handle<Api>(
    "calculate",
    async (_, sceneId: string, args: RunArgs) => {
      const publicPath = path.join(
        process.env.APP_DEV ? process.cwd() : process.resourcesPath,
        "public"
      );
      const appdataPath = path.join(app.getPath("userData"), "localStorage");
      const scenePath = path.join(appdataPath, sceneId);
      const calculationProcessPath = path.join(
        publicPath,
        "tasks/calculation.exe"
      );

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
      if (args.saveDirectory) runArgs.push("--out", args.saveDirectory);
      if (args.layerNamePattern)
        runArgs.push("--layerPattern", args.layerNamePattern);

      // Сохраняем информацию о расчете
      const indexPath = path.join(scenePath, "index.json");
      let indexState: ISceneState | null = null;

      if (fs.existsSync(indexPath)) {
        indexState = JSON.parse(fs.readFileSync(indexPath).toString());
      }

      if (!indexState) {
        throw new Error(`Scene index not found: ${sceneId}`);
      }

      // Определяем путь к результатам расчетов
      const defaultOutDir = `./out_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}`;
      const resultsPath = args.saveDirectory
        ? path.resolve(scenePath, args.saveDirectory)
        : path.resolve(scenePath, defaultOutDir);

      // Создаем запись о новом расчете
      const calculationResult = {
        resultsPath,
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
      fs.writeFileSync(indexPath, JSON.stringify(indexState, null, 2));

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
                  if (fs.existsSync(lastCalc.resultsPath)) {
                    const files = fs.readdirSync(lastCalc.resultsPath);
                    for (const file of files) {
                      const filePath = path.join(lastCalc.resultsPath, file);
                      try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                          totalSize += stats.size;
                        }
                      } catch (e) {
                        // Игнорируем ошибки доступа к файлам
                      }
                    }
                  }
                  lastCalc.outputSize = totalSize;
                } catch (e) {
                  // Игнорируем ошибки расчета размера
                  console.error("Error calculating output size:", e);
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

      return `"${calculationProcessPath}" ${runArgs.join(" ")}`;
    }
  );
}
