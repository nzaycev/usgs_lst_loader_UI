module.exports = [
  // Add support for native node modules
  {
    // We're specifying native_modules in the test because the asset relocator loader generates a
    // "fake" .node file which is really a cjs file.
    test: /native_modules\/.+\.node$/,
    use: 'node-loader',
  },
  {
    test: /\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  },
  // {
  //   test: /\.m\.s?css$/,
  //   use: [
  //     // MiniCssExtractPlugin.loader,
  //     { loader: 'style-loader' },
  //     {
  //       loader: 'css-loader',
  //       options: {
  //         importLoaders: 1,
  //         modules: {
  //           mode: 'local',
  //           localIdentName: '[path][name]__[local]'
  //         }
  //       }
  //     },
  //     // MiniCssExtractPlugin.loader,
  //   ],
  // },
  {
    test: /\.css$/,
    // exclude: /\.m\.s?css$/,
    use: [
      // MiniCssExtractPlugin.loader,
      { loader: 'style-loader' }, { loader: 'css-loader' },
    ],
  }
];
