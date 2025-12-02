const path = require("path");
const rspack = require("@rspack/core");
const fs = require("fs");

const isDev = process.env.APP_DEV === "true";

module.exports = {
  target: "electron-preload",
  mode: isDev ? "development" : "production",
  devtool: isDev ? "source-map" : false,
  entry: "./preload.ts",
  output: {
    path: path.resolve(__dirname, ".vite/preload"),
    filename: "preload.js",
    clean: true,
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
  externals: {
    electron: "commonjs electron",
  },
  externalsType: "commonjs",
  node: {
    __dirname: false,
    __filename: false,
  },
  plugins: [
    // Plugin to clean up tasks folder after build
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("CleanupTasksFolder", () => {
          const outputPath = path.resolve(__dirname, ".vite/preload");
          const tasksPath = path.join(outputPath, "tasks");

          // Remove tasks folder if it exists
          if (fs.existsSync(tasksPath)) {
            fs.rmSync(tasksPath, { recursive: true, force: true });
          }
        });
      },
    },
  ],
};
