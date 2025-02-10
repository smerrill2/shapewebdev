const path = require('path');
const webpack = require('webpack');

module.exports = {
  // ... other webpack config
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": false,
      "os": false,
      "util": false,
      "assert": false,
      "stream": false,
      "constants": false,
      "module": false,
      "crypto": false,
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser")
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ]
}; 