const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = [
    new ForkTsCheckerWebpackPlugin(),
    // new MiniCssExtractPlugin({
    //     filename: 'out.[contenthash].css',
    //     chunkFilename: 'chunk.[contenthash].css',
    // })
];
