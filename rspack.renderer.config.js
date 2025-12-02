const path = require("path");
const rspack = require("@rspack/core");

const isDev = process.env.APP_DEV === "true";

module.exports = {
  target: "electron-renderer",
  mode: isDev ? "development" : "production",
  devtool: isDev ? "source-map" : false,
  entry: "./src/main/renderer.ts",
  output: {
    path: path.resolve(__dirname, ".vite/renderer"),
    filename: "assets/[name]-[contenthash].js",
    clean: true,
  },
  experiments: {
    css: true,
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json", ".css"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: "classic",
                  },
                },
                target: "es2019",
              },
              module: {
                type: "es6",
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, "postcss.config.js"),
              },
            },
          },
        ],
        type: "css",
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: path.resolve(__dirname, "src/ui/index.html"),
    }),
    new rspack.DefinePlugin({
      "process.env.APP_DEV": JSON.stringify(process.env.APP_DEV || "false"),
    }),
    new rspack.ProvidePlugin({
      global: "globalThis",
    }),
  ],
  devServer: isDev
    ? {
        port: 5173,
        hot: true,
      }
    : undefined,
  node: {
    __dirname: false,
    __filename: false,
  },
};
