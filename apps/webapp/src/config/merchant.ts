// Merchant Configuration
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

// Helper function to get merchant address
export const getMerchantAddress = (): `0x${string}` => {
  return MERCHANT_CONFIG.WALLET_ADDRESS;
};

// Helper function to get network info
export const getNetworkInfo = () => {
  return MERCHANT_CONFIG.NETWORK;
};

// Helper function to get payment settings
export const getPaymentSettings = () => {
  return MERCHANT_CONFIG.PAYMENT;
}; 