const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './apps/extension/src/content.ts',
    popup: './apps/extension/src/popup.ts',
    background: './apps/extension/src/background.ts'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'apps/dist')
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'apps/extension/public/manifest.json', to: 'manifest.json' },
        { from: 'apps/extension/src/popup.html', to: 'popup.html' },
        { from: 'apps/extension/public/icons', to: 'icons' }
      ]
    })
  ],
  mode: 'production'
}; 