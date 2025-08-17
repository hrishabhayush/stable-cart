import React, { useState, useEffect } from 'react';
import { useConnect, useSendTransaction, useWaitForTransactionReceipt, useAccount, useDisconnect, useSwitchChain, useEstimateGas, useWriteContract } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { parseUnits, encodeFunctionData } from 'viem';
import { base } from 'wagmi/chains';
import styles from '../styles/Home.module.css';

// USDC contract address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// ERC20 ABI for transfer function
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }
] as const;

interface PaymentButtonProps {
  // amount: number; // Commented out - using fixed $0.01 for now
  merchantAddress: `0x${string}`;
  onPaymentSuccess?: (txHash: string) => void;
  onPaymentError?: (error: Error) => void;
  onShowCongratulation?: (txHash: string) => void;
  disabled?: boolean;
  className?: string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  // amount, // Commented out - using fixed $0.01 for now
  merchantAddress,
  onPaymentSuccess,
  onPaymentError,
  onShowCongratulation,
  disabled = false,
  className = ''
}) => {
  // Fixed amount: $0.01 in USDC (0.01 USDC = $0.01)
  const fixedAmountUSDC = 0.01;
  const [isDisabled, setIsDisabled] = useState(disabled);
  const [error, setError] = useState<Error | null>(null);
  
  // Wagmi hooks
  const { connect, isPending: isConnecting } = useConnect();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending: isSending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  // Gas estimation for USDC transfer with fallback
  const usdcAmount = parseUnits(fixedAmountUSDC.toString(), 6); // USDC has 6 decimals
  const { data: gasEstimate, isLoading: isEstimatingGas, error: gasError } = useEstimateGas({
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [merchantAddress, usdcAmount]
    }),
    chainId: base.id,
  });

  // Fallback gas limit for Base network (ERC20 transfer typically uses ~65000 gas)
  const fallbackGasLimit = BigInt(80000);

  // Transaction state
  const [txHash, setTxHash] = useState<string>('');
  const [isPostVerificationProcessing, setIsPostVerificationProcessing] = useState(false);

  // Update disabled state based on props and processing state (with fallback gas)
  useEffect(() => {
    setIsDisabled(disabled || isSending || isConfirming || isPostVerificationProcessing || (isConnected && isEstimatingGas));
  }, [disabled, isSending, isConfirming, isPostVerificationProcessing, isEstimatingGas, isConnected]);

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
    // Force connection to Base
    connect({ 
      connector: coinbaseWallet(),
      chainId: base.id 
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
      
      console.log(`Initiating USDC payment of ${fixedAmountUSDC} USDC (fixed $0.01)`);
      console.log(`Transaction will be sent from: ${address} to: ${merchantAddress}`);
      console.log(`USDC amount: ${usdcAmount.toString()} (${fixedAmountUSDC} USDC)`);

      console.log('=== TRANSACTION DETAILS ===');
      console.log('USDC contract address:', USDC_ADDRESS);
      console.log('Base chain ID:', base.id);
      console.log('Merchant address (Base):', merchantAddress);
      console.log('Amount in USDC units:', usdcAmount.toString());
      console.log('Amount in USDC:', fixedAmountUSDC);
      console.log('Sender address:', address);
      console.log('Network: Base Mainnet');
      console.log('Transaction type: USDC transfer (fixed $0.01)');
      console.log('========================');

      await writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [merchantAddress, usdcAmount],
        chainId: base.id,
      });

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
    if (chainId !== base.id) {
      console.log('=== CHAIN SWITCH REQUIRED ===');
      console.log('Current chain ID:', chainId);
      console.log('Target chain ID:', base.id);
      console.log('Switching to Base...');
      try {
        await switchChain({ chainId: base.id });
        console.log('Successfully switched to Base');
      } catch (error) {
        console.error('Failed to switch to Base:', error);
        setError(new Error('Please switch to Base network in your wallet'));
        return;
      }
    } else {
      console.log('Already on Base network');
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
    return 'Pay $0.01 USDC on Base';
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
