const { override, addBabelPreset, addBabelPlugin } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  // Add Babel presets
  addBabelPreset('@babel/preset-env'),
  addBabelPreset(['@babel/preset-react', { runtime: 'automatic' }]),
  addBabelPreset('@babel/preset-typescript'),
  
  // Add Babel plugins
  addBabelPlugin('@babel/plugin-transform-runtime'),
  addBabelPlugin('@babel/plugin-transform-object-rest-spread'),
  addBabelPlugin(['@babel/plugin-proposal-decorators', { legacy: true }]),
  
  // Configure webpack
  (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert/"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "url": require.resolve("url/")
    };
    
    config.plugins = [
      ...config.plugins,
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
    ];
    
    // Enable source maps
    config.devtool = 'source-map';
    
    return config;
  }
); 