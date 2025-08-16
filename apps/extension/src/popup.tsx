import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MetaMaskProvider, useSDK } from '@metamask/sdk-react';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
    coinbaseWalletExtension?: any;
  }
}

interface ProductInfo {
  title: string;
  price: number;
  image?: string;
  amazonUrl: string;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  chain: string;
  available: boolean;
}

const CryptoCheckoutPopupContent: React.FC = () => {
  const [selectedWallet, setSelectedWallet] = useState<string>('coinbase');
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [coinbaseSDK, setCoinbaseSDK] = useState<CoinbaseWalletSDK | null>(null);
  
  const { sdk, connected, connecting, account } = useSDK();

  const walletOptions: WalletOption[] = [
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '□',
      iconBg: '#0052FF',
      chain: 'Ethereum Chain',
      available: true
    },
    {
      id: 'metamask',
      name: 'Metamask Wallet',
      icon: '🦊',
      iconBg: '#F6851B',
      chain: 'Ethereum Chain',
      available: true
    },
    {
      id: 'phantom',
      name: 'Phantom Wallet',
      icon: '👻',
      iconBg: '#AB9DF2',
      chain: 'Ethereum Chain',
      available: true
    }
  ];

  useEffect(() => {
    // Check if we have product info from the checkout button click
    chrome.storage.local.get(['stablecart_product_info'], function(result) {
      if (result.stablecart_product_info) {
        setProductInfo(result.stablecart_product_info);
        // Clear the stored product info after displaying it
        chrome.storage.local.remove(['stablecart_product_info']);
      }
    });

    // Initialize Coinbase Wallet SDK
    initializeCoinbaseSDK();
    
    // Check wallet availability on component load
    checkWalletAvailability();
  }, []);

  const initializeCoinbaseSDK = () => {
    try {
      const sdk = new CoinbaseWalletSDK({
        appName: 'Amazon Crypto Checkout',
        appLogoUrl: 'https://example.com/logo.png'
      });
      setCoinbaseSDK(sdk);
      console.log('✅ Coinbase Wallet SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Coinbase Wallet SDK:', error);
    }
  };

  const checkWalletAvailability = () => {
    // Check MetaMask
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setConnectionStatus('MetaMask detected and unlocked. Ready to connect!');
          } else {
            setConnectionStatus('MetaMask detected but locked. Please unlock to connect.');
          }
        })
        .catch((error: any) => {
          setConnectionStatus('MetaMask detected but locked. Please unlock to connect.');
        });
    }
    // Check Coinbase Wallet
    else if (typeof window.coinbaseWalletExtension !== 'undefined') {
      setConnectionStatus('Coinbase Wallet extension detected. Ready to connect!');
    } else {
      setConnectionStatus('No wallet extensions detected. Please install MetaMask or Coinbase Wallet.');
    }
  };

  const handleWalletSelect = (walletId: string) => {
    setSelectedWallet(walletId);
    setConnectionStatus('');
    console.log('Selected wallet:', walletId);
    
    // Update status based on selected wallet
    if (walletId === 'metamask') {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              setConnectionStatus('MetaMask detected and unlocked. Ready to connect!');
            } else {
              setConnectionStatus('MetaMask detected but locked. Please unlock to connect.');
            }
          })
          .catch(() => {
            setConnectionStatus('MetaMask detected but locked. Please unlock to connect.');
          });
      } else {
        setConnectionStatus('MetaMask extension not detected. Please install MetaMask.');
      }
    } else if (walletId === 'coinbase') {
      if (typeof window.coinbaseWalletExtension !== 'undefined') {
        setConnectionStatus('Coinbase Wallet extension detected. Ready to connect!');
      } else {
        setConnectionStatus('Coinbase Wallet extension not detected. Please install Coinbase Wallet.');
      }
    } else {
      setConnectionStatus('Wallet connection not implemented for this wallet yet.');
    }
  };

  const handleProceedToPayment = async () => {
    if (selectedWallet === 'metamask') {
      await connectMetaMask();
    } else if (selectedWallet === 'coinbase') {
      await connectCoinbaseWallet();
    } else {
      setConnectionStatus('Wallet connection not implemented for this wallet yet.');
    }
  };

  const connectCoinbaseWallet = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('Connecting to Coinbase Wallet...');
      
      if (!coinbaseSDK) {
        setConnectionStatus('Coinbase Wallet SDK not available. Please try again.');
        return;
      }

      // Check if Coinbase Wallet extension is installed
      if (typeof window.coinbaseWalletExtension === 'undefined') {
        setConnectionStatus('Coinbase Wallet extension not found. Please install Coinbase Wallet extension.');
        return;
      }

      setConnectionStatus('Requesting connection to Coinbase Wallet...');
      
      // Connect to Coinbase Wallet using the extension directly
      try {
        const accounts = await window.coinbaseWalletExtension.request({ method: 'eth_requestAccounts' });
        
        if (accounts && accounts.length > 0) {
          const account = accounts[0];
          setConnectionStatus(`Connected! Account: ${account.slice(0, 6)}...${account.slice(-4)}`);
          
          // Get network info
          let networkName = 'Unknown Network';
          try {
            const chainId = await window.coinbaseWalletExtension.request({ method: 'eth_chainId' });
            const chainIdNum = parseInt(chainId, 16);
            networkName = chainIdNum === 1 ? 'Ethereum Mainnet' : 
                         chainIdNum === 137 ? 'Polygon' : 
                         chainIdNum === 10 ? 'Optimism' : 
                         chainIdNum === 42161 ? 'Arbitrum' :
                         `Chain ID: ${chainIdNum}`;
          } catch (error) {
            console.log('Could not get network info:', error);
          }
          
          // Store connection info for payment processing
          chrome.storage.local.set({
            wallet_connected: true,
            wallet_type: 'coinbase',
            account_address: account,
            network: networkName,
            product_info: productInfo
          });
          
          console.log('Coinbase Wallet connected successfully:', {
            account: account,
            network: networkName,
            productInfo: productInfo
          });
          
          // Show success message for a few seconds
          setTimeout(() => {
            setConnectionStatus(`Ready to process payment on ${networkName}!`);
          }, 2000);
        } else {
          setConnectionStatus('Failed to connect to Coinbase Wallet. Please try again.');
        }
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error('Coinbase Wallet connection error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('User denied')) {
          setConnectionStatus('Connection rejected by user. Please try again.');
        } else if (error.message.includes('Already processing') || error.message.includes('Request already pending')) {
          setConnectionStatus('Coinbase Wallet is already processing a request. Please wait.');
        } else if (error.message.includes('No provider')) {
          setConnectionStatus('Coinbase Wallet provider not found. Please refresh and try again.');
        } else {
          setConnectionStatus(`Connection failed: ${error.message}`);
        }
      } else {
        setConnectionStatus('Connection failed: Unknown error occurred');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMetaMask = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('Connecting to MetaMask...');
      
      // Check if MetaMask is installed
      if (!sdk) {
        setConnectionStatus('MetaMask SDK not available. Please install MetaMask extension.');
        return;
      }

      // Check if MetaMask extension is available
      if (typeof window.ethereum === 'undefined') {
        setConnectionStatus('MetaMask extension not found. Please install MetaMask from metamask.io');
        return;
      }

      // Connect to MetaMask
      const accounts = await sdk.connect();
      
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        setConnectionStatus(`Connected! Account: ${account.slice(0, 6)}...${account.slice(-4)}`);
        
        // Store connection info for payment processing
        chrome.storage.local.set({
          wallet_connected: true,
          wallet_type: 'metamask',
          account_address: account,
          product_info: productInfo
        });
        
        console.log('MetaMask connected successfully:', account);
        
        // Show success message for a few seconds
        setTimeout(() => {
          setConnectionStatus('Ready to process payment with MetaMask!');
        }, 2000);
      } else {
        setConnectionStatus('Failed to connect to MetaMask. Please try again.');
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          setConnectionStatus('Connection cancelled by user. Please try again.');
        } else if (error.message.includes('Already processing')) {
          setConnectionStatus('MetaMask is already processing a request. Please wait.');
        } else {
          setConnectionStatus(`Connection failed: ${error.message}`);
        }
      } else {
        setConnectionStatus('Connection failed: Unknown error occurred');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNetworkSelect = () => {
    console.log('Network selection clicked');
    // Add network selection functionality here
  };

  const formatProductName = (title: string) => {
    return title.length > 20 ? title.substring(0, 20) + '...' : title;
  };

  const getButtonText = () => {
    if (isConnecting) {
      return 'Connecting...';
    }
    if ((selectedWallet === 'metamask' && connected) || 
        (selectedWallet === 'coinbase' && connectionStatus.includes('Connected'))) {
      return 'Payment Connected ✓';
    }
    return 'Proceed to Payment';
  };

  const getButtonStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      bottom: '20px',
      left: '20px',
      right: '20px',
      height: '48px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 700,
      cursor: 'pointer' as const,
      transition: 'background-color 0.2s'
    };

    if ((selectedWallet === 'metamask' && connected) || 
        (selectedWallet === 'coinbase' && connectionStatus.includes('Connected'))) {
      return {
        ...baseStyle,
        background: '#10B981',
        color: '#FFFFFF'
      };
    }

    if (isConnecting) {
      return {
        ...baseStyle,
        background: '#6B7280',
        color: '#FFFFFF',
        cursor: 'not-allowed' as const
      };
    }

    return {
      ...baseStyle,
      background: '#FCD34D',
      color: '#111827'
    };
  };

  return (
    <div style={{
      width: '400px',
      height: '600px',
      margin: 0,
      padding: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#FFFFFF',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Header Section */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '400px',
        height: '80px',
        background: '#232F3E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#FFFFFF',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#232F3E',
            fontSize: '18px'
          }}>
            a$
          </div>
          <div style={{
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 700
          }}>
            Checkout with crypto
          </div>
        </div>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onClick={handleNetworkSelect}
        >
          <div style={{
            width: '20px',
            height: '20px',
            background: '#FFFFFF',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#232F3E'
          }}>
            Ξ
          </div>
          <span>▼</span>
          <button
            onClick={checkWalletAvailability}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              color: 'inherit',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
            title="Refresh wallet status"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Items Breakdown Section */}
      <div style={{
        position: 'absolute',
        top: '100px',
        left: '20px',
        right: '20px',
        background: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        height: '200px'
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#111827',
          margin: '0 0 12px 0'
        }}>
          Items Breakdown:
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: 1.5,
          margin: '0 0 16px 0'
        }}>
          Review your shopping cart and connect to your wallet to purchase with stable coins on the <strong>Ethereum</strong> chain. The prices are displayed in <strong>USDC</strong>.
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#374151'
        }}>
          <span>{productInfo ? formatProductName(productInfo.title) : 'Bioré Aqua Mois...:'}</span>
          <span>x1</span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#374151'
        }}>
          <span>
            Estimated Gas Fee: 
            <span style={{
              width: '16px',
              height: '16px',
              background: '#6B7280',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '10px',
              marginLeft: '4px'
            }}>
              i
            </span>
          </span>
          <span>$0.01</span>
        </div>
        
        <div style={{
          borderTop: '1px dotted #D1D5DB',
          margin: '12px 0'
        }}></div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#111827'
        }}>
          <span>Total:</span>
          <span>{productInfo ? `$${productInfo.price.toFixed(2)} USDC` : '$13.65 USDC'}</span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: '#374151'
        }}>
          <span>
            <span style={{
              width: '16px',
              height: '16px',
              background: '#6B7280',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '10px',
              marginRight: '6px'
            }}>
              ⏰
            </span>
            Estimated Transaction Time:
          </span>
          <span>&lt;1m</span>
        </div>
      </div>

      {/* Wallet Selection Section */}
      <div style={{
        position: 'absolute',
        top: '320px',
        left: '20px',
        right: '20px',
        background: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        height: '200px'
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#111827',
          margin: '0 0 12px 0'
        }}>
          Select a Wallet to Continue
        </h2>
        
        {walletOptions.map((wallet) => (
          <div 
            key={wallet.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 0',
              borderBottom: wallet.id !== 'phantom' ? '1px solid #F3F4F6' : 'none'
            }}
          >
            <div 
              style={{
                width: '18px',
                height: '18px',
                border: `2px solid ${selectedWallet === wallet.id ? '#232F3E' : '#D1D5DB'}`,
                borderRadius: '50%',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => handleWalletSelect(wallet.id)}
            >
              {selectedWallet === wallet.id && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '8px',
                  height: '8px',
                  background: '#232F3E',
                  borderRadius: '50%'
                }}></div>
              )}
            </div>
            
            <div style={{
              width: '32px',
              height: '32px',
              background: wallet.iconBg,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#FFFFFF'
            }}>
              {wallet.icon}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#111827',
                margin: 0
              }}>
                {wallet.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '2px 0 0 0'
              }}>
                {wallet.chain}
              </div>
            </div>
            
            <div style={{
              background: '#F3F4F6',
              color: '#374151',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: 500
            }}>
              {wallet.available ? 'Available' : 'Unavailable'}
            </div>
          </div>
        ))}
      </div>

      {/* Connection Status */}
      {connectionStatus && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '20px',
          right: '20px',
          padding: '12px',
          background: connectionStatus.includes('Connected') ? '#D1FAE5' : '#FEE2E2',
          color: connectionStatus.includes('Connected') ? '#065F46' : '#991B1B',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center' as const,
          border: `1px solid ${connectionStatus.includes('Connected') ? '#A7F3D0' : '#FECACA'}`
        }}>
          {connectionStatus}
        </div>
      )}

      {/* Proceed to Payment Button */}
      <button 
        style={getButtonStyle()}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (!isConnecting && selectedWallet !== 'metamask') {
            e.currentTarget.style.background = '#F59E0B';
          }
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (!isConnecting && selectedWallet !== 'metamask') {
            e.currentTarget.style.background = '#FCD34D';
          }
        }}
        onClick={handleProceedToPayment}
        disabled={isConnecting}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

const CryptoCheckoutPopup: React.FC = () => {
  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: "Amazon Crypto Checkout",
          url: window.location.href,
        }
      }}
    >
      <CryptoCheckoutPopupContent />
    </MetaMaskProvider>
  );
};

// Render the React component
document.addEventListener('DOMContentLoaded', function() {
  const popupContent = document.getElementById('popup-content');
  if (popupContent) {
    const root = createRoot(popupContent);
    root.render(<CryptoCheckoutPopup />);
  }
});

export default CryptoCheckoutPopup; 