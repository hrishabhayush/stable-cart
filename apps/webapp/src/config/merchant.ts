// Merchant Configuration
export const MERCHANT_CONFIG = {
  // Sepolia testnet merchant wallet address
  WALLET_ADDRESS: '0xD880E96C35B217B9E220B69234A12AcFC175f92B' as `0x${string}`,
  
  // Network configuration
  NETWORK: {
    CHAIN_ID: 11155111, // Sepolia testnet
    NAME: 'Sepolia Testnet',
    EXPLORER_URL: 'https://sepolia.etherscan.io'
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