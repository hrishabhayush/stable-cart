import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

import { config } from '../wagmi';

const client = new QueryClient();

// Custom RainbowKit theme to prevent overriding your custom styling
const customTheme = lightTheme({
  accentColor: '#f093fb',
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider
          theme={customTheme}
          locale="en-US"
          showRecentTransactions={false}
          initialChain={sepolia}
          // Disable default styling that might interfere with your custom components
          modalSize="compact"
        >
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
