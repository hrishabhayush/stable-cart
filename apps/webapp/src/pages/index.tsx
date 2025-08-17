import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { priceConversionService, PriceData } from '../services/priceConversion';
import { getMerchantAddress } from '../config/merchant';
import PaymentButton from '../components/PaymentButton';
import CongratulationPage from '../components/CongratulationPage';
import styles from '../styles/Home.module.css';

const Home = () => {
  const [productPrice, setProductPrice] = useState<number>(29.99);
  const [productTitle, setProductTitle] = useState<string>('Amazon Basics 4K Fire TV Stick');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(30);
  
  // Price state
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  
  // Congratulation page state
  const [showCongratulation, setShowCongratulation] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');
  
  // Wagmi hooks for wallet connection
  const { connect, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Get Sepolia merchant address from config
  const MERCHANT_ADDRESS = getMerchantAddress();

  // Load price conversion when component mounts or price changes
  useEffect(() => {
    const loadPriceConversion = async () => {
      if (productPrice > 0) {
        setIsLoadingPrice(true);
        try {
          const convertedPrice = await priceConversionService.convertUsdToEth(productPrice);
          setPriceData(convertedPrice);
        } catch (error) {
          console.error('Failed to convert price:', error);
        } finally {
          setIsLoadingPrice(false);
        }
      }
    };

    loadPriceConversion();
  }, [productPrice]);

  useEffect(() => {
    // Get price and title from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const price = urlParams.get('price');
    const title = urlParams.get('title');
    
    if (price) {
      const priceNum = parseFloat(price);
      setProductPrice(priceNum);
    }
    
    if (title) {
      setProductTitle(decodeURIComponent(title));
    }

    // Update time every second
    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      }));
    }, 1000);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 60);
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  const connectCoinbaseWallet = () => {
    connect({ connector: coinbaseWallet() });
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handlePaymentSuccess = async (txHash: string) => {
    console.log('Payment successful! Transaction hash:', txHash);
    
    // Create checkout session in backend
    try {
      const sessionData = {
        amazonUrl: window.location.href,
        cartTotalCents: Math.round(productPrice * 100), // Convert to cents
        currentBalanceCents: 0, // User has no current balance
        userId: address || 'anonymous' // Use wallet address as user ID
      };

      const response = await fetch('http://localhost:3001/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        const result = await response.json();
        setCheckoutSessionId(result.session.sessionId);
        
        // Store payment success data for extension
        const paymentData = {
          type: 'PAYMENT_SUCCESS',
          transactionHash: txHash,
          orderId: result.session.sessionId,
          timestamp: Date.now()
        };
        
        localStorage.setItem('stablecart_payment_success', JSON.stringify(paymentData));
        console.log('Payment success data stored:', paymentData);
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const handleShowCongratulation = (txHash: string) => {
    setTransactionHash(txHash);
    setShowCongratulation(true);
  };

  const handleRedirectNow = () => {
    // Redirect back to Amazon or close the window
    window.close();
    // Fallback: redirect to Amazon homepage
    window.location.href = 'https://www.amazon.com';
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
    alert(`Payment failed: ${error.message}`);
  };

  // Update the wallet sender address display when connected
  const getWalletDisplay = () => {
    if (!isConnected || !address) {
      return 'Not connected';
    }
    // Show first 6 and last 4 characters of the address
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format receiver address with ellipses
  const formatReceiverAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Format product name with ellipses like popup
  const formatProductName = (title: string) => {
    return title.length > 15 ? title.substring(0, 15) + '...' : title;
  };

  // Debug logging for wallet connection state
  console.log('Wallet connection state:', { isConnected, address });

  // Show congratulation page if transaction was successful
  if (showCongratulation) {
    return (
      <CongratulationPage
        senderAddress={address || ''}
        receiverAddress={MERCHANT_ADDRESS}
        transactionHash={transactionHash}
        onRedirectNow={handleRedirectNow}
      />
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Stable Cart</title>
        <meta
          content="Connect your wallet to Stable Cart"
          name="description"
        />
      </Head>

      <main className={styles.main}>
        {/* Main Container - Fixed size like popup */}
        <div className={styles.mainContainer}>
          {/* Header Section - Exactly like popup */}
          <div className={styles.header}>
            <div className={styles.logoContainer}>
              <img src="/icons/Amazonbutton.svg" alt="Amazon Logo" className={styles.logo} />
            </div>
            <div className={styles.headerTitle}>Crypto Checkout</div>
          </div>

          {/* Items Breakdown Section - Exactly like popup */}
          <div className={styles.itemsBreakdown}>
            <h2 className={styles.sectionTitle}>Items Breakdown:</h2>
            
            <div className={styles.itemRow}>
              <span className={styles.itemLabel}>{formatProductName(productTitle)}</span>
              <span className={styles.itemValue}>x1</span>
            </div>
            
            <div className={styles.itemRow}>
              <span className={styles.itemLabel}>
                Estimated Gas Fee: 
                <span className={styles.infoIcon}>
                  <img src="/icons/info.svg" alt="Info" />
                </span>
              </span>
              <span className={styles.itemValue}>$0.01</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <div className={styles.itemRow}>
              <span className={styles.itemLabel}>Total:</span>
              <span className={styles.itemValue}>{productPrice} USDC</span>
            </div>
            
            <div className={styles.itemRow}>
              <span className={styles.itemLabel}>Estimated Transaction Time:</span>
              <span className={styles.itemValue}>
                <img src="/icons/time.svg" alt="Time" className={styles.timeIcon} />
                &lt;1m
              </span>
            </div>
          </div>

          {/* Combined Information Container */}
          <div className={styles.infoContainer}>
            {/* Transaction Information Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionSubtitle}>Transaction Information</h3>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Wallet Sender Address:</span>
                <span className={styles.infoValue}>{getWalletDisplay()}</span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Amazon Receiver Address:</span>
                <div className={styles.addressWithIcon}>
                  <span className={styles.externalLink}>
                    <img src="/icons/opennewwindow.svg" alt="External Link" />
                  </span>
                  <span className={styles.infoValue}>{formatReceiverAddress(MERCHANT_ADDRESS)}</span>
                </div>
              </div>
            </div>

            {/* Separator Line */}
            <div className={styles.sectionSeparator}></div>

            {/* Price Information Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionSubtitle}>Price Information</h3>
              
              <div className={styles.timestampInfo}>
                Last updated: {currentTime}, next refresh in {countdown} seconds
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Amazon Listing Price:</span>
                <span className={styles.infoValue}>{productPrice} USD</span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Amount due in crypto:</span>
                <span className={styles.infoValue}>{productPrice} USDC</span>
              </div>
            </div>

            {/* Separator Line */}
            <div className={styles.sectionSeparator}></div>

            {/* Blockchain Information Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionSubtitle}>Blockchain Information</h3>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Chain:</span>
                <span className={styles.infoValue}>Ethereum</span>
              </div>
              
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Token:</span>
                <span className={styles.infoValue}>United States Dollar Coin (USDC)</span>
              </div>
            </div>
          </div>

          {/* Connection Info Footer */}
          <div className={styles.connectionInfo}>
            {isConnected ? (
              // Don't show "Connected to:" text when wallet is connected
              // The disconnect button in PaymentButton already shows connection status
              null
            ) : (
              <>
                <span className={styles.connectionLabel}>Connecting through: </span>
                <span className={styles.connectionValue}>Coinbase Wallet</span>
                <span className={styles.coinbaseIcon}>
                  <img src="/icons/CB.svg" alt="Coinbase Wallet" />
                </span>
              </>
            )}
          </div>
          
          {/* Main Button - Always show at bottom center */}
          <PaymentButton
            amount={priceData?.eth || 0}
            merchantAddress={MERCHANT_ADDRESS}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onShowCongratulation={handleShowCongratulation}
            disabled={isLoadingPrice}
            className={styles.paymentButtonContainer}
          />
        </div>
      </main>
    </div>
  );
};

export default Home;
