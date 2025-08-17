# StableCart Chrome Extension Testing Guide

## Overview
The StableCart Chrome extension now includes a direct integration with the Coinbase Wallet extension, allowing users to connect their wallet and complete crypto payments directly from the popup without redirecting to an external website.

## What's New
- **Direct Wallet Integration**: The popup now directly connects to the Coinbase Wallet extension
- **In-Popup Payment Flow**: Users can complete their entire payment journey within the extension popup
- **Sepolia Testnet Support**: Automatically switches to Sepolia testnet for testing
- **Real-time Connection Status**: Shows wallet connection status and transaction progress

## How to Test

### 1. Build the Extension
```bash
pnpm run build
```
This will generate the extension files in `apps/dist/`

### 2. Load the Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `apps/dist/` folder

### 3. Install Coinbase Wallet Extension
1. Go to the Chrome Web Store
2. Search for "Coinbase Wallet"
3. Install the official Coinbase Wallet extension
4. Set up a wallet (you can use Sepolia testnet for testing)

### 4. Test the Extension
1. Go to any Amazon product page
2. Click the StableCart extension icon in your toolbar
3. The popup should show product information
4. Click "Connect Coinbase Wallet"
5. Approve the connection in your Coinbase Wallet
6. The extension will automatically switch to Sepolia testnet
7. Once connected, you can click "Place Order" to simulate payment

## Features

### Wallet Connection
- Automatically detects Coinbase Wallet extension
- Requests account access
- Switches to Sepolia testnet automatically
- Shows connection status and wallet address

### Product Display
- Shows product title, quantity, and price
- Displays estimated gas fees
- Shows transaction time estimates

### Payment Flow
- Simulates payment processing
- Shows real-time transaction status
- Handles connection errors gracefully

## Technical Details

### Dependencies
- React 18.3.1
- TypeScript
- Webpack with CSS support
- Chrome Extension APIs

### File Structure
```
apps/extension/
├── src/
│   ├── popup.tsx          # Main popup component
│   ├── content.ts         # Content script for Amazon pages
│   └── background.ts      # Background service worker
├── public/
│   ├── popup.html         # Popup HTML template
│   ├── manifest.json      # Extension manifest
│   └── icons/            # Extension icons
└── dist/                 # Built extension files
```

### Key Functions
- `connectCoinbaseWallet()`: Connects to Coinbase Wallet extension
- `disconnectWallet()`: Disconnects wallet
- `handlePayment()`: Simulates payment processing
- Network switching to Sepolia testnet

## Troubleshooting

### Common Issues
1. **"No wallet extension found"**: Make sure Coinbase Wallet is installed
2. **"Please use Coinbase Wallet"**: Ensure you're using the correct wallet extension
3. **Connection fails**: Check if the wallet is unlocked and ready
4. **Network switching fails**: The extension will automatically add Sepolia if not present

### Debug Mode
- Open Chrome DevTools for the popup (right-click popup → Inspect)
- Check console for detailed error messages
- Verify wallet connection status in the console

## Next Steps
- Integrate with real payment processing service
- Add support for other wallet types (MetaMask, Phantom)
- Implement actual USDC/ETH transfers
- Add transaction confirmation and receipt display

## Notes
- This is a test implementation that simulates payments
- Uses Sepolia testnet for safe testing
- Requires Coinbase Wallet extension to be installed
- Built with modern React patterns and TypeScript 