const babelJest = require('babel-jest').default;

const customTransformer = {
  process(src, filename, config, options) {
    const babelConfig = {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current',
          },
        }],
        ['@babel/preset-react', {
          runtime: 'automatic',
        }],
      ],
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-syntax-jsx',
        '@babel/plugin-transform-runtime',
      ],
      babelrc: false,
      configFile: false,
    };

    return babelJest.createTransformer(babelConfig).process(src, filename, config, options);
  },
};

module.exports = customTransformer; 