# 🏪 Merchant Wallet Setup

## Quick Setup

To change the merchant wallet address where payments will be sent, edit this file:

**File**: `src/config/merchant.ts`

**Current Configuration**:
```typescript
export const MERCHANT_CONFIG = {
  // Your merchant wallet address - replace with your actual wallet address
  WALLET_ADDRESS: '0xD880E96C35B217B9E220B69234A12AcFC175f92B' as `0x${string}`,
  
  // Network configuration
  NETWORK: {
    CHAIN_ID: 11155111, // Sepolia testnet
    NAME: 'Sepolia Testnet',
    EXPLORER_URL: 'https://sepolia.etherscan.io'
  },
  
  // Payment settings
  PAYMENT: {
    CURRENCY: 'ETH',
    DECIMALS: 18,
    PRICE_CURRENCY: 'USD', // Amazon prices are in USD
    ETH_PRICE_USD: 3000, // Fallback ETH price in USD (will be updated dynamically)
    MIN_ETH_AMOUNT: 0.001, // Minimum ETH amount to accept
    MAX_ETH_AMOUNT: 10 // Maximum ETH amount to accept
  }
};
```

## 🔧 How to Change Merchant Address

1. **Replace the wallet address** in `WALLET_ADDRESS` with your actual wallet address
2. **Run the build command** to deploy the changes:
   ```bash
   pnpm build
   ```

## 🌐 Supported Networks

Currently configured for **Sepolia Testnet**:
- **Chain ID**: 11155111
- **Network**: Sepolia Testnet
- **Explorer**: https://sepolia.etherscan.io

## 💰 How Payments Work

1. **User clicks "Checkout with Crypto"** on Amazon checkout page
2. **Extension opens popup** and user selects Coinbase wallet
3. **User clicks "Proceed to Payment"**
4. **Webapp opens** with Amazon product price in USD
5. **Price conversion happens** automatically using real-time ETH/USD rates
6. **User connects wallet** and sees converted ETH amount
7. **User clicks "Pay X USD"** button
8. **Transaction executes** sending the converted ETH amount to your merchant address
9. **Payment confirmed** on Sepolia testnet

## 🔄 Price Conversion System

- **Real-time Rates**: Uses CoinGecko API for live ETH/USD prices
- **Automatic Conversion**: USD prices are automatically converted to ETH
- **Price Display**: Shows both USD and ETH amounts clearly
- **Cache System**: Prices are cached for 5 minutes to reduce API calls
- **Fallback Pricing**: Uses fallback price if API is unavailable

## 🧪 Testing

- **Get free test ETH** from: https://sepoliafaucet.com
- **Test transactions** on Sepolia testnet (no real money)
- **Verify price conversion** accuracy
- **Test with different USD amounts**

## 🚀 Production Deployment

When ready for mainnet:
1. Change `CHAIN_ID` to `1` (Ethereum mainnet)
2. Change `EXPLORER_URL` to `https://etherscan.io`
3. Change `NAME` to `Ethereum Mainnet`
4. **Ensure you have real ETH** in your merchant wallet
5. **Verify price conversion** works with real ETH prices

## 📱 Features

- ✅ **USD to ETH Conversion** using real-time rates
- ✅ **Direct ETH Transfer** to your wallet
- ✅ **Real-time Transaction Status**
- ✅ **Etherscan Integration**
- ✅ **Price Display** showing both USD and ETH amounts
- ✅ **Responsive Design**
- ✅ **Error Handling**
- ✅ **Loading States**

## 🔒 Security Notes

- **Never share your private keys**
- **Use hardware wallets** for large amounts
- **Test thoroughly** on testnet first
- **Monitor transactions** regularly
- **Verify price conversions** are accurate

## 📊 Example Payment Flow

**Amazon Product**: $29.99 USD
**ETH Price**: $3,000 USD
**ETH Amount**: 0.009997 ETH
**Transaction**: Sends 0.009997 ETH to your merchant address

## 🌐 API Dependencies

- **CoinGecko API**: For real-time ETH/USD prices
- **Fallback Price**: $3,000 USD if API is unavailable
- **Cache Duration**: 5 minutes to reduce API calls 