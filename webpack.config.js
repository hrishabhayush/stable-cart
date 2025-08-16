const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './apps/extension/src/content.ts',
    popup: './apps/extension/src/popup.tsx',
    background: './apps/extension/src/background.ts',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
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
  mode: 'production',
  devtool: 'source-map' // Use source-map instead of eval for CSP compliance
}; 