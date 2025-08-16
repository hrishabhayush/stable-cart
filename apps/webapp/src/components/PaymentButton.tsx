import React, { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { getMerchantAddress, getNetworkInfo, getPaymentSettings } from '../config/merchant';
import { priceConversionService, PriceData } from '../services/priceConversion';

interface PaymentButtonProps {
  price: number; // This is now USD price
  className?: string;
  style?: React.CSSProperties;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ 
  price, 
  className, 
  style 
}) => {
  const { address, isConnected } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // Get merchant address and network info from config
  const MERCHANT_ADDRESS = getMerchantAddress();
  const NETWORK_INFO = getNetworkInfo();
  const PAYMENT_SETTINGS = getPaymentSettings();
  
  const { 
    data: hash, 
    sendTransaction, 
    isPending, 
    error 
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Load price conversion when component mounts or price changes
  useEffect(() => {
    const loadPriceConversion = async () => {
      if (price > 0) {
        setIsLoadingPrice(true);
        try {
          const convertedPrice = await priceConversionService.convertUsdToEth(price);
          setPriceData(convertedPrice);
        } catch (error) {
          console.error('Failed to convert price:', error);
        } finally {
          setIsLoadingPrice(false);
        }
      }
    };

    loadPriceConversion();
  }, [price]);

  const makePayment = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!address) {
      alert('No wallet address found!');
      return;
    }

    if (!priceData) {
      alert('Price conversion not available. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setTxHash('');

      // Convert ETH amount to Wei (18 decimals)
      const ethAmount = priceData.eth;
      const priceInWei = parseEther(ethAmount.toString());

      console.log(`Initiating payment of ${priceData.usd} USD (${ethAmount} ETH) to merchant: ${MERCHANT_ADDRESS}`);
      console.log(`Transaction will be sent from: ${address} to: ${MERCHANT_ADDRESS}`);
      console.log(`Network: ${NETWORK_INFO.NAME} (Chain ID: ${NETWORK_INFO.CHAIN_ID})`);
      console.log(`Current ETH price: $${priceData.ethUsdPrice}`);

      // Send ETH directly to merchant address
      await sendTransaction({
        to: MERCHANT_ADDRESS,
        value: priceInWei,
        chainId: NETWORK_INFO.CHAIN_ID,
      });

    } catch (err) {
      console.error('Payment failed:', err);
      alert(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update transaction hash when available
  React.useEffect(() => {
    if (hash) {
      setTxHash(hash);
      console.log('Transaction hash:', hash);
    }
  }, [hash]);

  // Handle transaction success
  React.useEffect(() => {
    if (isSuccess && txHash) {
      console.log('Payment successful! Transaction hash:', txHash);
      alert(`Payment successful! Transaction hash: ${txHash}`);
    }
  }, [isSuccess, txHash]);

  const getButtonText = () => {
    if (isPending || isConfirming) return 'Processing...';
    if (isProcessing) return 'Preparing...';
    if (isLoadingPrice) return 'Loading Price...';
    if (!priceData) return 'Price Unavailable';
    return `Pay ${priceData.usd} USD`;
  };

  const isDisabled = !isConnected || isPending || isConfirming || isProcessing || isLoadingPrice || !priceData;

  return (
    <div className={className} style={style}>
      {/* Price Display */}
      {priceData && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          fontSize: '16px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0c4a6e' }}>
            💱 Price Conversion
          </div>
          <div style={{ color: '#0c4a6e', lineHeight: '1.6' }}>
            <div><strong>Amazon Price:</strong> ${priceData.usd.toFixed(2)} USD</div>
            <div><strong>ETH Amount:</strong> {priceConversionService.formatEthAmount(priceData.eth)}</div>
            <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
              ETH Price: ${priceData.ethUsdPrice.toFixed(2)} USD
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.6 }}>
              Last updated: {priceData.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={makePayment}
        disabled={isDisabled}
        className="payment-button"
        style={{
          background: isDisabled 
            ? '#cccccc' 
            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '600',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minWidth: '200px',
          textAlign: 'center',
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {getButtonText()}
      </button>
      
      {/* Merchant Address Display */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: '#f0fdf4',
        border: '1px solid #22c55e',
        borderRadius: '8px',
        fontSize: '14px',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#166534' }}>
          💰 Payment Destination:
        </div>
        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          wordBreak: 'break-all',
          color: '#166534',
          background: '#dcfce7',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '5px'
        }}>
          {MERCHANT_ADDRESS}
        </div>
      </div>
      
      {/* Transaction Status */}
      {txHash && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Transaction Status:
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
            Hash: {txHash}
          </div>
          <div style={{ marginTop: '5px' }}>
            {isConfirming ? '⏳ Confirming...' : isSuccess ? '✅ Confirmed!' : '⏳ Pending...'}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#0369a1' }}>
            <a 
              href={`${NETWORK_INFO.EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0369a1', textDecoration: 'underline' }}
            >
              View on Etherscan →
            </a>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center',
          color: '#dc2626'
        }}>
          Error: {error.message}
        </div>
      )}
    </div>
  );
};

export default PaymentButton; 