import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Amazon Crypto Checkout',
  projectId: 'amazon-crypto-checkout-extension',
  chains: [
    sepolia, // Prioritize Sepolia for testing
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
  ],
  ssr: true,
});
