import React, { useState, useEffect } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';

interface PaymentButtonProps {
  amount: number;
  merchantAddress: string;
  onPaymentSuccess?: (txHash: string) => void;
  onPaymentError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

interface NetworkInfo {
  EXPLORER_URL: string;
  CHAIN_NAME: string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  merchantAddress,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = ''
}) => {
  const [isDisabled, setIsDisabled] = useState(disabled);
  const [error, setError] = useState<Error | null>(null);
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { 
    data: hash, 
    sendTransaction, 
    isPending, 
    error: sendError 
  } = useSendTransaction();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Transaction state
  const [txHash, setTxHash] = useState<string>('');

  // Network configuration - default to Base network
  const NETWORK_INFO: NetworkInfo = {
    EXPLORER_URL: 'https://basescan.org',
    CHAIN_NAME: 'Base'
  };

  // Update disabled state based on connection and props
  useEffect(() => {
    setIsDisabled(disabled || !isConnected || !address);
  }, [disabled, isConnected, address]);

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
      onPaymentSuccess?.(txHash);
    }
  }, [isSuccess, txHash, onPaymentSuccess]);

  // Handle send errors
  useEffect(() => {
    if (sendError) {
      const error = new Error(sendError.message);
      setError(error);
      onPaymentError?.(error);
    }
  }, [sendError, onPaymentError]);

  const makePayment = async () => {
    if (!isConnected || !address) {
      setError(new Error('Please connect your wallet first!'));
      return;
    }

    try {
      setError(null);
      
      // Convert amount to wei (assuming 18 decimals for ETH)
      const amountInWei = parseEther(amount.toString());
      
      console.log(`Initiating payment of ${amount} ETH`);
      console.log(`Transaction will be sent from: ${address} to: ${merchantAddress}`);

      // Send ETH directly to merchant address
      await sendTransaction({
        to: merchantAddress,
        value: amountInWei,
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      console.error('Payment failed:', error);
      setError(error);
      onPaymentError?.(error);
    }
  };

  const getButtonText = () => {
    if (isPending || isConfirming) return 'Processing...';
    if (!isConnected) return 'Connect Wallet';
    return `Pay ${amount} ETH`;
  };

  return (
    <div className={className}>
      {/* Payment Button */}
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
          {merchantAddress}
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
              View on {NETWORK_INFO.CHAIN_NAME}scan →
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
