import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface CustomConnectButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

const CustomConnectButton: React.FC<CustomConnectButtonProps> = ({ 
  className, 
  style 
}) => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      openConnectModal?.();
    }
  };

  const buttonText = isConnected 
    ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
    : 'Connect Wallet';

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
      type="button"
    >
      {buttonText}
    </button>
  );
};

export default CustomConnectButton; 