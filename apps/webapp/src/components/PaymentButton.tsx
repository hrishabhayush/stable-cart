import React, { useState, useEffect } from 'react';
import { useConnect, useSendTransaction, useWaitForTransactionReceipt, useAccount, useDisconnect, useSwitchChain, useEstimateGas } from 'wagmi';
import { parseEther } from 'viem';
import { sepolia } from 'wagmi/chains';
import styles from '../styles/Home.module.css';

interface PaymentButtonProps {
  amount: number;
  merchantAddress: `0x${string}`;
  onPaymentSuccess?: (txHash: string) => void;
  onPaymentError?: (error: Error) => void;
  onShowCongratulation?: (txHash: string) => void;
  disabled?: boolean;
  className?: string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  merchantAddress,
  onPaymentSuccess,
  onPaymentError,
  onShowCongratulation,
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
  const [isPostVerificationProcessing, setIsPostVerificationProcessing] = useState(false);

  // Update disabled state based on props and processing state
  useEffect(() => {
    setIsDisabled(disabled || isSending || isConfirming || isPostVerificationProcessing || (isConnected && isEstimatingGas) || (isConnected && !gasEstimate));
  }, [disabled, isSending, isConfirming, isPostVerificationProcessing, isEstimatingGas, gasEstimate, isConnected]);

  // Update transaction hash when available
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
    }
  }, [hash]);

  // Check for send transaction errors
  useEffect(() => {
    if (hash) {
      console.log('Transaction hash:', hash);
      onPaymentSuccess?.(hash);
    }
  }, [hash, onPaymentSuccess]);

  // Check for transaction confirmation and show congratulation page
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('Transaction confirmed!');
      setIsPostVerificationProcessing(true);
      
      // Show processing state for 1.5 seconds, then show congratulation page
      setTimeout(() => {
        onShowCongratulation?.(hash);
      }, 1500);
    }
  }, [isSuccess, hash, onShowCongratulation]);



  // Check for transaction errors
  useEffect(() => {
    if (isSending && !hash) {
      // Transaction failed to send
      setError(new Error('Failed to send transaction'));
    }
  }, [isSending, hash]);

  const connectCoinbaseWallet = () => {
    // For now, just show an alert to connect wallet manually
    // This will be fixed when the wallet connection is properly configured
    alert('Please connect your wallet manually. The automatic connection is being configured.');
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
    if (isSending || isConfirming || isPostVerificationProcessing) return 'Processing';
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
      
      {/* Payment Button Container */}
      <div className={styles.buttonContainer}>
        <button 
          onClick={handleButtonClick} 
          disabled={isDisabled} 
          className={`${styles.connectWalletButton} ${(isSending || isConfirming || isPostVerificationProcessing) ? styles.loading : ''}`}
        >
          {getButtonText()}
        </button>
        

      </div>
    </div>
  );
};

export default PaymentButton;
