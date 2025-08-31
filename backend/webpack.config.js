const path = require('path');

module.exports = {
  target: 'node',
  mode: 'development',
  externals: {
    bcrypt: 'commonjs bcrypt',
    '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        type: 'asset/resource',
      },
    ],
  },
};
