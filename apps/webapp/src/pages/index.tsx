import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useConnect, useAccount, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { parseEther } from 'viem';
import { priceConversionService, PriceData } from '../services/priceConversion';
import styles from '../styles/Home.module.css';

const Home = () => {
  const [productPrice, setProductPrice] = useState<number>(29.99);
  const [productTitle, setProductTitle] = useState<string>('Amazon Basics 4K Fire TV Stick');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(30);
  
  // Payment state
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  
  // Transaction hooks
  const { 
    data: hash, 
    sendTransaction, 
    isPending, 
    error 
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  
  // Wagmi hooks for wallet connection
  const { connect, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Valid merchant address (Amazon's address - replace with actual address)
  const MERCHANT_ADDRESS = '0xD880E96C35B217B9E220B69234A12AcFC175f92B';
  
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

  const handlePayment = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!priceData) {
      alert('Price conversion not available. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setTxHash('');

      // Use real-time ETH amount from price conversion service
      const ethAmount = priceData.eth;
      const priceInWei = parseEther(ethAmount.toString());

      console.log(`Initiating payment of ${priceData.usd} USD (${ethAmount} ETH)`);
      console.log(`Current ETH price: $${priceData.ethUsdPrice}`);
      console.log(`Transaction will be sent from: ${address} to: ${MERCHANT_ADDRESS}`);

      // Send ETH directly to merchant address
      await sendTransaction({
        to: MERCHANT_ADDRESS,
        value: priceInWei,
      });

    } catch (err) {
      console.error('Payment failed:', err);
      alert(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update transaction hash when available
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      console.log('Transaction hash:', hash);
    }
  }, [hash]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && txHash) {
      console.log('Payment successful! Transaction hash:', txHash);
      alert(`Payment successful! Transaction hash: ${txHash}`);
    }
  }, [isSuccess, txHash]);

  // Update the wallet sender address display when connected
  const getWalletDisplay = () => {
    if (!isConnected || !address) {
      return 'Not connected';
    }
    // Show first 6 and last 4 characters of the address
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format product name with ellipses like popup
  const formatProductName = (title: string) => {
    return title.length > 15 ? title.substring(0, 15) + '...' : title;
  };

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
        {/* Main Container - Fixed size like Figma */}
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
                  <span className={styles.infoValue}>{MERCHANT_ADDRESS}</span>
                </div>
              </div>
            </div>

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
              <span className={styles.connectionLabel}>Connected to: </span>
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
          
            {/* Price Display Section */}
            {isConnected && priceData && (
              <div className={styles.priceDisplay}>
                <div className={styles.priceTitle}>💱 Price Conversion</div>
                <div className={styles.priceDetails}>
                  <div><strong>Amazon Price:</strong> {priceConversionService.formatUsdAmount(priceData.usd)}</div>
                  <div><strong>ETH Amount:</strong> {priceConversionService.formatEthAmount(priceData.eth)}</div>
                  <div className={styles.ethPrice}>ETH Price: {priceConversionService.formatUsdAmount(priceData.ethUsdPrice)}</div>
                  <div className={styles.lastUpdated}>Last updated: {priceData.lastUpdated.toLocaleTimeString()}</div>
                </div>
              </div>
            )}
            
            {/* Disconnect Wallet Button - Only show when connected */}
            {isConnected && (
              <button 
                className={styles.disconnectWalletLink}
                onClick={handleDisconnect}
                style={{ marginBottom: '15px' }}
              >
                Disconnect Wallet
              </button>
            )}
          
          {/* Main Button - Changes based on connection state */}
          <button 
            className={`${styles.connectWalletButton} ${isConnected ? styles.connectedButton : ''}`}
            onClick={isConnected ? handlePayment : connectCoinbaseWallet}
            disabled={isConnecting || isPending || isProcessing || (isConnected && isLoadingPrice)}
          >
            {(() => {
              if (isConnecting) return 'Connecting...';
              if (isPending || isProcessing) return 'Processing...';
              if (isConnected && isLoadingPrice) return 'Loading Price...';
              if (isConnected && !priceData) return 'Price Unavailable';
              if (isConnected) return 'Place your order';
              return 'Connect Wallet';
            })()}
          </button>
            
            {/* Transaction Status Display */}
            {txHash && (
              <div className={styles.transactionStatus}>
                <div className={styles.statusTitle}>Transaction Status:</div>
                <div className={styles.txHash}>Hash: {txHash}</div>
                <div className={styles.statusIndicator}>
                  {isConfirming ? '⏳ Confirming...' : isSuccess ? '✅ Confirmed!' : '⏳ Pending...'}
                </div>
              </div>
            )}
            
            {/* Error Display */}
            {error && (
              <div className={styles.errorDisplay}>
                Error: {error.message}
              </div>
            )}
          </div>
      </main>
    </div>
  );
};

export default Home;
