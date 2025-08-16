import React, { useState, useEffect } from 'react';
import { useConnect, useSendTransaction, useWaitForTransactionReceipt, useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { parseEther } from 'viem';
import { sepolia } from 'wagmi/chains';

interface PaymentButtonProps {
  amount: number;
  merchantAddress: `0x${string}`;
  onPaymentSuccess?: (txHash: string) => void;
  onPaymentError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
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
  const { connect, isPending: isConnecting } = useConnect();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: hash, sendTransaction, isPending: isSending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Transaction state
  const [txHash, setTxHash] = useState<string>('');

  // Update disabled state based on connection and props
  useEffect(() => {
    setIsDisabled(disabled || (isConnected && !address));
  }, [disabled, isConnected, address]);

  // Update transaction hash when available
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      console.log('Transaction hash:', hash);
    }
  }, [hash]);

  // Check for send transaction errors
  useEffect(() => {
    if (hash) {
      console.log('Transaction hash:', hash);
      onPaymentSuccess?.(hash);
    }
  }, [hash, onPaymentSuccess]);

  // Check for transaction confirmation
  useEffect(() => {
    if (isSuccess) {
      console.log('Transaction confirmed!');
    }
  }, [isSuccess]);

  // Check for transaction errors
  useEffect(() => {
    if (isSending && !hash) {
      // Transaction failed to send
      setError(new Error('Failed to send transaction'));
    }
  }, [isSending, hash]);

  const connectCoinbaseWallet = () => {
    // Force connection to Sepolia
    connect({ 
      connector: coinbaseWallet(),
      chainId: sepolia.id 
    });
  };

  const handleDisconnect = () => {
    disconnect();
  };

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

      // ABSOLUTE MINIMUM TRANSACTION - Force simple ETH transfer
      // Only include the essential fields: to, value
      // Let wagmi handle everything else automatically
      const txRequest = {
        to: merchantAddress,
        value: amountInWei,
        chainId: sepolia.id, // Force transaction on Sepolia
        data: undefined, // Explicitly set to undefined to ensure simple ETH transfer
      };

      console.log('=== TRANSACTION DETAILS ===');
      console.log('Transaction request (Sepolia):', txRequest);
      console.log('Sepolia chain ID:', sepolia.id);
      console.log('Merchant address (Sepolia):', merchantAddress);
      console.log('Amount in wei:', amountInWei.toString());
      console.log('Amount in ETH:', amount);
      console.log('Sender address:', address);
      console.log('Network: Sepolia Testnet');
      console.log('Transaction type: Simple ETH transfer (no contract interaction)');
      console.log('Data field: undefined (ensures simple ETH transfer)');
      console.log('========================');

      await sendTransaction(txRequest);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      console.error('Payment failed:', error);
      setError(error);
      onPaymentError?.(error);
    }
  };

  const handleButtonClick = async () => {
    if (!isConnected) {
      connectCoinbaseWallet();
      return;
    }

    // Check if we're on the right chain
    if (chainId !== sepolia.id) {
      console.log('=== CHAIN SWITCH REQUIRED ===');
      console.log('Current chain ID:', chainId);
      console.log('Target chain ID:', sepolia.id);
      console.log('Switching to Sepolia...');
      try {
        await switchChain({ chainId: sepolia.id });
        console.log('Successfully switched to Sepolia');
      } catch (error) {
        console.error('Failed to switch to Sepolia:', error);
        setError(new Error('Please switch to Sepolia testnet in your wallet'));
        return;
      }
    } else {
      console.log('Already on Sepolia testnet');
    }

    // Now make the payment
    makePayment();
  };

  const getButtonText = () => {
    if (isConnecting) return 'Connecting...';
    if (isSending || isConfirming) return 'Processing...';
    if (!isConnected) return 'Connect to wallet';
    return 'Place your order';
  };

  return (
    <div className={className}>
      {/* Disconnect Wallet Button - Only show when connected */}
      {isConnected && (
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <button
            onClick={handleDisconnect}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0066cc',
              textDecoration: 'underline',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Amazon Ember Display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Disconnect wallet
          </button>
        </div>
      )}
      
      {/* Payment Button */}
      <button
        onClick={handleButtonClick}
        disabled={isDisabled || isConnecting}
        className="payment-button"
        style={{
          background: isDisabled || isConnecting
            ? '#cccccc' 
            : 'linear-gradient(135deg, #FFD812 0%, #F4C800 100%)',
          color: '#000000',
          border: 'none',
          padding: '12px 32px',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '400',
          cursor: isDisabled || isConnecting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          fontFamily: 'Amazon Ember Display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minWidth: '200px',
          textAlign: 'center',
          opacity: isDisabled || isConnecting ? 0.6 : 1,
        }}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

export default PaymentButton;
