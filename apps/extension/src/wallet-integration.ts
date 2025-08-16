// Coinbase Wallet Integration for StableCart Chrome Extension
// Handles wallet connection, USDC balance checks, and payment transactions

interface WalletConnection {
  address: string;
  connected: boolean;
  chainId: number;
}

interface PaymentRequest {
  amount: number; // USDC amount
  merchantAddress: string;
  orderId: string;
  productInfo?: {
    title: string;
    price: number;
    image?: string;
  };
}

interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class CoinbaseWalletIntegration {
  private ethereum: any;
  private connection: WalletConnection | null = null;
  private readonly USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
  private readonly BASE_CHAIN_ID = 8453; // Base mainnet

  constructor() {
    this.ethereum = (window as any).ethereum;
  }

  /**
   * Check if Coinbase Wallet is available
   */
  isWalletAvailable(): boolean {
    return !!(this.ethereum && this.ethereum.isCoinbaseWallet);
  }

  /**
   * Connect to Coinbase Wallet
   */
  async connectWallet(): Promise<WalletConnection | null> {
    try {
      if (!this.isWalletAvailable()) {
        throw new Error('Coinbase Wallet not found. Please install Coinbase Wallet extension.');
      }

      console.log('Connecting to Coinbase Wallet...');

      // Request account access
      const accounts = await this.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get current chain ID
      const chainId = await this.ethereum.request({
        method: 'eth_chainId'
      });

      this.connection = {
        address: accounts[0],
        connected: true,
        chainId: parseInt(chainId, 16)
      };

      console.log('Wallet connected:', this.connection);

      // Switch to Base network if not already
      await this.ensureBaseNetwork();

      return this.connection;

    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Ensure user is on Base network
   */
  async ensureBaseNetwork(): Promise<void> {
    if (!this.connection) {
      throw new Error('Wallet not connected');
    }

    if (this.connection.chainId !== this.BASE_CHAIN_ID) {
      try {
        // Try to switch to Base network
        await this.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base mainnet
        });

        this.connection.chainId = this.BASE_CHAIN_ID;
        console.log('Switched to Base network');

      } catch (switchError: any) {
        // If Base network is not added, add it
        if (switchError.code === 4902) {
          await this.addBaseNetwork();
        } else {
          throw switchError;
        }
      }
    }
  }

  /**
   * Add Base network to wallet
   */
  async addBaseNetwork(): Promise<void> {
    try {
      await this.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x2105',
          chainName: 'Base',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      });

      this.connection!.chainId = this.BASE_CHAIN_ID;
      console.log('Base network added and switched');

    } catch (error) {
      console.error('Failed to add Base network:', error);
      throw error;
    }
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(): Promise<number> {
    if (!this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // USDC balance check using eth_call
      const balanceHex = await this.ethereum.request({
        method: 'eth_call',
        params: [{
          to: this.USDC_CONTRACT_ADDRESS,
          data: '0x70a08231000000000000000000000000' + this.connection.address.slice(2) // balanceOf(address)
        }, 'latest']
      });

      // Convert hex to decimal and format (USDC has 6 decimals)
      const balanceWei = parseInt(balanceHex, 16);
      const balance = balanceWei / Math.pow(10, 6);

      console.log('USDC Balance:', balance);
      return balance;

    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return 0;
    }
  }

  /**
   * Send USDC payment
   */
  async sendPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    if (!this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('Initiating USDC payment:', paymentRequest);

      // Check balance first
      const balance = await this.getUSDCBalance();
      if (balance < paymentRequest.amount) {
        throw new Error(`Insufficient USDC balance. Required: ${paymentRequest.amount}, Available: ${balance}`);
      }

      // Prepare USDC transfer transaction
      const amountWei = Math.floor(paymentRequest.amount * Math.pow(10, 6)); // Convert to 6 decimal places
      const amountHex = '0x' + amountWei.toString(16);

      // ERC20 transfer function signature + merchant address + amount
      const transferData = '0xa9059cbb' + // transfer(address,uint256)
        paymentRequest.merchantAddress.slice(2).padStart(64, '0') + // to address
        amountHex.slice(2).padStart(64, '0'); // amount

      // Send transaction
      const txHash = await this.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.connection.address,
          to: this.USDC_CONTRACT_ADDRESS,
          data: transferData,
          value: '0x0' // No ETH value for ERC20 transfer
        }]
      });

      console.log('Transaction sent:', txHash);

      // Wait for transaction confirmation (optional)
      await this.waitForTransaction(txHash);

      return {
        success: true,
        transactionHash: txHash
      };

    } catch (error: any) {
      console.error('Payment failed:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, maxWaitTime: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const receipt = await this.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        });

        if (receipt && receipt.status === '0x1') {
          console.log('Transaction confirmed:', txHash);
          return;
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
    }

    console.warn('Transaction confirmation timeout:', txHash);
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.connection = null;
    console.log('Wallet disconnected');
  }

  /**
   * Get current connection status
   */
  getConnection(): WalletConnection | null {
    return this.connection;
  }

  /**
   * Format address for display
   */
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (accounts: string[]) => void): void {
    if (this.ethereum) {
      this.ethereum.on('accountsChanged', callback);
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChange(callback: (chainId: string) => void): void {
    if (this.ethereum) {
      this.ethereum.on('chainChanged', callback);
    }
  }
}

// Export singleton instance
export const coinbaseWallet = new CoinbaseWalletIntegration();
