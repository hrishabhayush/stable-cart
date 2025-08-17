import React, { useState, useEffect } from 'react';
import { useConnect, useSendTransaction, useWaitForTransactionReceipt, useAccount, useDisconnect, useSwitchChain, useEstimateGas } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { parseEther } from 'viem';
import { sepolia } from 'wagmi/chains';
import styles from '../styles/Home.module.css';

// Function to notify extension about payment success
const notifyExtensionOfPaymentSuccess = (txHash: string) => {
  try {
    console.log('🚀 Attempting to notify extension of payment success...');
    
    const paymentData = {
      type: 'PAYMENT_SUCCESS',
      transactionHash: txHash,
      timestamp: Date.now(),
      orderId: `order-${Date.now()}`
    };
    
    // Method 1: Store in opener window's localStorage (MOST IMPORTANT)
    // This is the Amazon page where the extension is running
    if (window.opener && window.opener !== window) {
      try {
        // Store payment data in the Amazon page's localStorage
        window.opener.localStorage.setItem('stablecart_payment_success', JSON.stringify(paymentData));
        console.log('✅ Payment data stored in Amazon page localStorage');
        
        // Also try to send a postMessage to the Amazon page
        window.opener.postMessage({
          type: 'PAYMENT_SUCCESS',
          transactionHash: txHash,
          timestamp: Date.now(),
          orderId: paymentData.orderId
        }, '*');
        console.log('✅ Extension notified via opener postMessage');
        
        // Try to trigger a storage event on the Amazon page
        try {
          const storageEvent = new StorageEvent('storage', {
            key: 'stablecart_payment_success',
            newValue: JSON.stringify(paymentData),
            url: window.opener.location.href
          });
          window.opener.dispatchEvent(storageEvent);
          console.log('✅ Storage event dispatched to Amazon page');
        } catch (e) {
          console.log('⚠️ Storage event dispatch failed:', e);
        }
        
      } catch (e) {
        console.log('❌ Failed to communicate with Amazon page:', e);
      }
    } else {
      console.log('⚠️ No opener window found - cannot communicate with Amazon page');
    }

    // Method 2: Store in current tab's localStorage as backup
    localStorage.setItem('stablecart_payment_success', JSON.stringify(paymentData));
    sessionStorage.setItem('stablecart_payment_success', JSON.stringify(paymentData));
    console.log('✅ Payment data stored in current tab storage as backup');
    
    // Method 3: Try to communicate with extension directly via chrome.runtime
    try {
      if (window.opener && window.opener.chrome && window.opener.chrome.runtime) {
        window.opener.chrome.runtime.sendMessage({
          action: 'paymentSuccess',
          data: paymentData
        });
        console.log('✅ Extension notified via chrome.runtime.sendMessage');
      }
    } catch (e) {
      console.log('❌ Chrome runtime message failed:', e);
    }

    // Method 4: Try to send message to parent window (if in iframe)
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'PAYMENT_SUCCESS',
          transactionHash: txHash,
          timestamp: Date.now(),
          orderId: paymentData.orderId
        }, '*');
        console.log('✅ Extension notified via parent postMessage');
      } catch (e) {
        console.log('❌ Parent postMessage failed:', e);
      }
    }

    console.log('✅ Payment success notification completed');
    console.log('📊 Payment data:', paymentData);

  } catch (error) {
    console.error('💥 Failed to notify extension:', error);
  }
};

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
  
  // Add gas estimation hook
  const { data: gasEstimate, isLoading: isEstimatingGas, error: gasError } = useEstimateGas({
    to: merchantAddress,
    value: parseEther(amount.toString()),
    chainId: sepolia.id,
  });

  // Transaction state
  const [txHash, setTxHash] = useState<string>('');

  // Update disabled state based on props and processing state
  useEffect(() => {
    setIsDisabled(disabled || isSending || isConfirming || isEstimatingGas || !gasEstimate);
  }, [disabled, isSending, isConfirming, isEstimatingGas, gasEstimate]);

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
      
      // Notify extension about payment success
      notifyExtensionOfPaymentSuccess(hash);
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
      
      // Check if we have gas estimation
      if (!gasEstimate) {
        throw new Error('Unable to estimate gas fees. Please try again or check your wallet connection.');
      }
      
      // Convert amount to wei (assuming 18 decimals for ETH)
      const amountInWei = parseEther(amount.toString());
      
      console.log(`Initiating payment of ${amount} ETH`);
      console.log(`Transaction will be sent from: ${address} to: ${merchantAddress}`);
      console.log(`Estimated gas: ${gasEstimate.toString()}`);

      // Include gas estimation in transaction
      const txRequest = {
        to: merchantAddress,
        value: amountInWei,
        chainId: sepolia.id,
        gas: gasEstimate, // Add estimated gas
        data: undefined,
      };

      console.log('=== TRANSACTION DETAILS ===');
      console.log('Transaction request (Sepolia):', txRequest);
      console.log('Sepolia chain ID:', sepolia.id);
      console.log('Merchant address (Sepolia):', merchantAddress);
      console.log('Amount in wei:', amountInWei.toString());
      console.log('Amount in ETH:', amount);
      console.log('Sender address:', address);
      console.log('Estimated gas:', gasEstimate.toString());
      console.log('Network: Sepolia Testnet');
      console.log('Transaction type: Simple ETH transfer (no contract interaction)');
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
    if (isEstimatingGas) return 'Estimating fees...';
    if (isSending || isConfirming) return (
      <span>
        Processing
        <span className="loadingDots"></span>
      </span>
    );
    if (!isConnected) return 'Connect to wallet';
    if (gasError) return 'Fee estimation failed';
    return 'Place your order';
  };

  return (
    <div className={className}>
      {/* Disconnect Wallet Button - Only show when connected */}
      {isConnected && (
        <div className={styles.disconnectButtonContainer}>
          <button
            onClick={handleDisconnect}
            className={styles.disconnectWalletButton}
          >
            Disconnect wallet
          </button>
        </div>
      )}
      
      {/* Payment Button */}
      <button 
        onClick={handleButtonClick} 
        disabled={isDisabled} 
        className={`${styles.connectWalletButton} ${(isSending || isConfirming) ? styles.loading : ''}`}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

export default PaymentButton;
