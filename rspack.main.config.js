const path = require("path");
const fs = require("fs");

const isDev = process.env.APP_DEV === "true";

module.exports = {
  target: "electron-main",
  mode: isDev ? "development" : "production",
  devtool: isDev ? "source-map" : false,
  entry: "./src/main/index.ts",
  output: {
    path: path.resolve(__dirname, ".vite/main"),
    filename: "index.js",
    clean: true,
    // Flatten output structure - all files in root
    pathinfo: false,
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                },
                target: "es2019",
              },
              module: {
                type: "commonjs",
              },
            },
          },
        ],
      },
    ],
  },
  externals: ["electron"],
  externalsType: "commonjs",
  node: {
    __dirname: false,
    __filename: false,
  },
  plugins: [
    // Plugin to clean up tasks folder and ipc-handlers folder after build
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("CleanupFolders", () => {
          const outputPath = path.resolve(__dirname, ".vite/main");
          const tasksPath = path.join(outputPath, "tasks");
          const ipcHandlersPath = path.join(outputPath, "ipc-handlers");

          // Remove tasks folder if it exists
          if (fs.existsSync(tasksPath)) {
            fs.rmSync(tasksPath, { recursive: true, force: true });
          }

          // Flatten ipc-handlers folder - move all files to root
          if (fs.existsSync(ipcHandlersPath)) {
            const files = fs.readdirSync(ipcHandlersPath);
            files.forEach((file) => {
              const srcPath = path.join(ipcHandlersPath, file);
              const destPath = path.join(outputPath, file);
              if (fs.statSync(srcPath).isFile()) {
                fs.renameSync(srcPath, destPath);
              }
            });
            fs.rmSync(ipcHandlersPath, { recursive: true, force: true });
          }
        });
      },
    },
  ],
};
