const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './apps/src/content.ts',
    popup: './apps/src/popup.ts'
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
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'apps/public/manifest.json', to: 'manifest.json' },
        { from: 'apps/src/popup.html', to: 'popup.html' },
        { from: 'apps/public/icons', to: 'icons' }
      ]
    })
  ],
  mode: 'production'
}; 