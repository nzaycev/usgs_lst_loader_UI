const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss'],
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": require.resolve('fs')
    }
  },
};
