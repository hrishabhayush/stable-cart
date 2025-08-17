/**
 * Dynamic Checkout Button Component
 * Shows different buttons based on wallet balance and integrates with On Ramp
 */

import React, { useState, useEffect } from 'react';
import { walletBalanceService } from '../wallet-balance';
import { onrampIntegration } from '../onramp-integration';

interface DynamicCheckoutButtonProps {
  orderAmount: string;
  onCheckout: () => void;
  onError: (error: string) => void;
}

export const DynamicCheckoutButton: React.FC<DynamicCheckoutButtonProps> = ({
  orderAmount,
  onCheckout,
  onError
}) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [showOnramp, setShowOnramp] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      checkBalance();
    }
  }, [isConnected, walletAddress, orderAmount]);

  const checkWalletConnection = async () => {
    try {
      const connection = await walletBalanceService.checkWalletConnection();
      setIsConnected(connection.connected);
      setWalletAddress(connection.address || '');
    } catch (error) {
      console.error('❌ Error checking wallet connection:', error);
    }
  };

  const checkBalance = async () => {
    if (!walletAddress || !orderAmount) return;

    try {
      setIsLoading(true);
      const balance = await walletBalanceService.getBalanceInfo(walletAddress, orderAmount);
      setBalanceInfo(balance);
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      onError('Failed to check wallet balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } else {
        onError('MetaMask not found. Please install MetaMask to continue.');
      }
    } catch (error) {
      console.error('❌ Error connecting wallet:', error);
      onError('Failed to connect wallet');
    }
  };

  const handleCheckout = () => {
    if (balanceInfo?.hasSufficientUSDC && balanceInfo?.hasSufficientETH) {
      onCheckout();
    } else {
      onError('Insufficient funds to complete checkout');
    }
  };

  const handleBuyBaseETH = async () => {
    if (!walletAddress) {
      onError('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      
      // Calculate required ETH amount (order amount + gas fees)
      const requiredAmount = parseFloat(orderAmount) + parseFloat(balanceInfo?.estimatedGasFeeUSD || '0.20');
      
      await onrampIntegration.handleInsufficientBaseEth(
        walletAddress,
        requiredAmount.toString(),
        {
          onSuccess: (quote: any) => {
            console.log('✅ On Ramp quote generated:', quote);
            setShowOnramp(false);
            // After successful funding, recheck balance
            setTimeout(() => checkBalance(), 2000);
          },
          onError: (error: string) => {
            console.error('❌ On Ramp error:', error);
            onError(error);
          },
          onCancel: () => {
            console.log('❌ On Ramp cancelled by user');
            setShowOnramp(false);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error handling insufficient Base ETH:', error);
      onError('Failed to generate funding options');
    } finally {
      setIsLoading(false);
    }
  };

  const renderButton = () => {
    if (!isConnected) {
      return (
        <button
          onClick={handleConnectWallet}
          disabled={isLoading}
          className="connect-wallet-btn"
          style={{
            backgroundColor: '#f7931e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      );
    }

    if (isLoading) {
      return (
        <button
          disabled
          className="loading-btn"
          style={{
            backgroundColor: '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'not-allowed',
            width: '100%'
          }}
        >
          Checking Balance...
        </button>
      );
    }

    if (!balanceInfo) {
      return (
        <button
          onClick={checkBalance}
          className="retry-btn"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Check Balance
        </button>
      );
    }

    if (!balanceInfo.hasSufficientUSDC) {
      return (
        <button
          disabled
          className="insufficient-usdc-btn"
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'not-allowed',
            width: '100%'
          }}
        >
          Insufficient USDC Balance
        </button>
      );
    }

    if (!balanceInfo.hasSufficientETH) {
      return (
        <div style={{ width: '100%' }}>
          <button
            onClick={handleBuyBaseETH}
            disabled={isLoading}
            className="buy-eth-btn"
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '8px'
            }}
          >
            {isLoading ? 'Generating Quote...' : 'Buy Base ETH for Gas Fees'}
          </button>
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            Need ${balanceInfo.estimatedGasFeeUSD} for gas fees
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={handleCheckout}
        className="checkout-btn"
        style={{
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Place Your Order
      </button>
    );
  };

  const renderBalanceInfo = () => {
    if (!isConnected || !balanceInfo) return null;

    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Wallet Balance:</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>USDC:</span>
          <span style={{ color: balanceInfo.hasSufficientUSDC ? '#28a745' : '#dc3545' }}>
            ${balanceInfo.usdcBalanceUSD}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Base ETH:</span>
          <span style={{ color: balanceInfo.hasSufficientETH ? '#28a745' : '#dc3545' }}>
            ${balanceInfo.ethBalanceUSD}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Order Total:</span>
          <span>${orderAmount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Estimated Gas:</span>
          <span>${balanceInfo.estimatedGasFeeUSD}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {renderBalanceInfo()}
      {renderButton()}
    </div>
  );
};
