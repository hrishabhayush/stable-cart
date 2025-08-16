import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

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

const CryptoCheckoutPopup: React.FC = () => {
  const [selectedWallet, setSelectedWallet] = useState<string>('coinbase');
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

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
  }, []);

  const handleWalletSelect = (walletId: string) => {
    setSelectedWallet(walletId);
    setConnectionStatus('');
    console.log('Selected wallet:', walletId);
  };

  const handleProceedToPayment = () => {
    if (selectedWallet === 'coinbase') {
      // Open the payment website for Coinbase with price information
      const price = productInfo?.price || 0;
      const productTitle = productInfo?.title || 'Amazon Product';
      
      // Store the price and product info for the website to access
      chrome.storage.local.set({
        amazon_product_price: price,
        amazon_product_title: productTitle,
        amazon_product_info: productInfo
      });
      
      // Open the Vercel website with price as URL parameter
      const websiteUrl = `https://webapp-gamma-one.vercel.app?price=${price}&title=${encodeURIComponent(productTitle)}`;
      chrome.tabs.create({ url: websiteUrl });
      
      setConnectionStatus(`Opening payment website with price: $${price.toFixed(2)}`);
    } else {
      setConnectionStatus('Wallet connection not implemented for this wallet yet.');
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
    return 'Proceed to Payment';
  };

  const getButtonStyle = () => {
    return {
      position: 'absolute' as const,
      bottom: '20px',
      left: '20px',
      right: '20px',
      height: '48px',
      background: '#FCD34D',
      color: '#111827',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 700,
      cursor: 'pointer' as const,
      transition: 'background-color 0.2s'
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
          <img src="icons/Amazonbutton.svg" alt="Amazon Logo" style={{ width: '32px', height: '32px' }} />
          <div style={{
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 400,
            alignSelf: 'center'
          }}>
            Crypto Checkout
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
          background: '#DBEAFE',
          color: '#1E40AF',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center' as const,
          border: '1px solid #BFDBFE'
        }}>
          {connectionStatus}
        </div>
      )}

      {/* Proceed to Payment Button */}
      <button 
        style={getButtonStyle()}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.background = '#F59E0B';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.background = '#FCD34D';
        }}
        onClick={handleProceedToPayment}
      >
        {getButtonText()}
      </button>
    </div>
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