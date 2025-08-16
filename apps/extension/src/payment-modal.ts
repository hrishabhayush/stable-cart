// Payment Modal for StableCart Chrome Extension
// Shows wallet connection and payment interface

import { coinbaseWallet, CoinbaseWalletIntegration } from './wallet-integration';

interface ProductInfo {
  title: string;
  price: number;
  image?: string;
  amazonUrl: string;
}

export class PaymentModal {
  private modal: HTMLElement | null = null;
  private isOpen: boolean = false;
  private productInfo: ProductInfo | null = null;
  private readonly MERCHANT_ADDRESS = '0xA9028774695553d62f90fcD21200e69F11678689'; // Your merchant wallet

  /**
   * Show payment modal
   */
  async show(productInfo: ProductInfo): Promise<void> {
    this.productInfo = productInfo;
    
    if (this.modal) {
      this.modal.remove();
    }

    this.createModal();
    this.isOpen = true;

    // Animate in
    setTimeout(() => {
      if (this.modal) {
        this.modal.style.opacity = '1';
      }
    }, 50);
  }

  /**
   * Hide payment modal
   */
  hide(): void {
    if (this.modal) {
      this.modal.style.opacity = '0';
      setTimeout(() => {
        if (this.modal) {
          this.modal.remove();
          this.modal = null;
        }
      }, 300);
    }
    this.isOpen = false;
  }

  /**
   * Create modal DOM structure
   */
  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.id = 'stablecart-payment-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 0;
      max-width: 400px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      position: relative;
    `;

    modalContent.innerHTML = this.getModalHTML();
    this.modal.appendChild(modalContent);

    // Add event listeners
    this.addEventListeners();

    // Append to body
    document.body.appendChild(this.modal);

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
  }

  /**
   * Generate modal HTML
   */
  private getModalHTML(): string {
    const connection = coinbaseWallet.getConnection();
    
    return `
      <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">Pay with Crypto</h2>
          <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
        </div>
      </div>

      <div style="padding: 24px;">
        <!-- Product Info -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${this.productInfo?.image ? `<img src="${this.productInfo.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;" />` : ''}
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #111827;">${this.productInfo?.title || 'Amazon Purchase'}</h3>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">$${this.productInfo?.price.toFixed(2)} USDC</p>
            </div>
          </div>
        </div>

        <!-- Wallet Connection -->
        <div id="wallet-section">
          ${connection ? this.getConnectedWalletHTML(connection) : this.getDisconnectedWalletHTML()}
        </div>

        <!-- Payment Section -->
        <div id="payment-section" style="display: ${connection ? 'block' : 'none'};">
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
            <button id="pay-button" style="
              width: 100%;
              background: #1d4ed8;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 12px 16px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='#1e40af'" onmouseout="this.style.backgroundColor='#1d4ed8'">
              Pay $${this.productInfo?.price.toFixed(2)} USDC
            </button>
            
            <p style="margin-top: 12px; font-size: 12px; color: #6b7280; text-align: center;">
              Payment will be sent to merchant wallet on Base network
            </p>
          </div>
        </div>

        <!-- Status Section -->
        <div id="status-section" style="display: none; text-align: center; padding: 20px;">
          <div id="status-content"></div>
        </div>
      </div>
    `;
  }

  /**
   * HTML for connected wallet state
   */
  private getConnectedWalletHTML(connection: any): string {
    return `
      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 32px; height: 32px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: bold;">₿</span>
          </div>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #065f46;">Coinbase Wallet Connected</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857;">${coinbaseWallet.formatAddress(connection.address)}</p>
          </div>
          <button id="disconnect-wallet" style="background: none; border: 1px solid #10b981; color: #10b981; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">
            Disconnect
          </button>
        </div>
        <div id="balance-info" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #a7f3d0;">
          <p style="margin: 0; font-size: 12px; color: #047857;">USDC Balance: <span id="usdc-balance">Loading...</span></p>
        </div>
      </div>
    `;
  }

  /**
   * HTML for disconnected wallet state
   */
  private getDisconnectedWalletHTML(): string {
    return `
      <div style="text-align: center;">
        <div style="width: 80px; height: 80px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span style="font-size: 32px;">👛</span>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">Connect Your Wallet</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">Connect your Coinbase Wallet to pay with USDC on Base network</p>
        
        <button id="connect-wallet" style="
          width: 100%;
          background: #0052ff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#0040cc'" onmouseout="this.style.backgroundColor='#0052ff'">
          <span>🔵</span>
          Connect Coinbase Wallet
        </button>
        
        <p style="margin-top: 12px; font-size: 12px; color: #6b7280;">
          Don't have Coinbase Wallet? <a href="https://www.coinbase.com/wallet" target="_blank" style="color: #0052ff;">Download here</a>
        </p>
      </div>
    `;
  }

  /**
   * Add event listeners
   */
  private addEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Connect wallet button
    const connectBtn = document.getElementById('connect-wallet');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleWalletConnect());
    }

    // Disconnect wallet button
    const disconnectBtn = document.getElementById('disconnect-wallet');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.handleWalletDisconnect());
    }

    // Pay button
    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
      payBtn.addEventListener('click', () => this.handlePayment());
    }

    // Load USDC balance if wallet is connected
    const connection = coinbaseWallet.getConnection();
    if (connection) {
      this.loadUSDCBalance();
    }
  }

  /**
   * Handle wallet connection
   */
  private async handleWalletConnect(): Promise<void> {
    try {
      this.showStatus('Connecting to Coinbase Wallet...', 'loading');
      
      if (!coinbaseWallet.isWalletAvailable()) {
        throw new Error('Coinbase Wallet not found. Please install the Coinbase Wallet extension.');
      }

      const connection = await coinbaseWallet.connectWallet();
      
      if (connection) {
        this.showStatus('Wallet connected successfully!', 'success');
        setTimeout(() => {
          this.refreshModal();
        }, 1500);
      }

    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      this.showStatus(error.message, 'error');
    }
  }

  /**
   * Handle wallet disconnection
   */
  private handleWalletDisconnect(): void {
    coinbaseWallet.disconnect();
    this.refreshModal();
  }

  /**
   * Handle payment
   */
  private async handlePayment(): Promise<void> {
    if (!this.productInfo) return;

    try {
      this.showStatus('Initiating payment...', 'loading');

      const result = await coinbaseWallet.sendPayment({
        amount: this.productInfo.price,
        merchantAddress: this.MERCHANT_ADDRESS,
        orderId: `order_${Date.now()}`,
        productInfo: this.productInfo
      });

      if (result.success) {
        this.showStatus(
          `Payment successful!<br/><small>Transaction: ${result.transactionHash}</small><br/><br/>Processing your Amazon gift card...`,
          'success'
        );
        
        // TODO: Notify backend about successful payment
        setTimeout(() => {
          this.hide();
          alert('Payment completed! Your Amazon gift card is being processed.');
        }, 3000);

      } else {
        throw new Error(result.error || 'Payment failed');
      }

    } catch (error: any) {
      console.error('Payment failed:', error);
      this.showStatus(error.message, 'error');
    }
  }

  /**
   * Load USDC balance
   */
  private async loadUSDCBalance(): Promise<void> {
    try {
      const balance = await coinbaseWallet.getUSDCBalance();
      const balanceEl = document.getElementById('usdc-balance');
      if (balanceEl) {
        balanceEl.textContent = `${balance.toFixed(2)} USDC`;
      }
    } catch (error) {
      console.error('Failed to load USDC balance:', error);
      const balanceEl = document.getElementById('usdc-balance');
      if (balanceEl) {
        balanceEl.textContent = 'Error loading balance';
      }
    }
  }

  /**
   * Show status message
   */
  private showStatus(message: string, type: 'loading' | 'success' | 'error'): void {
    const statusSection = document.getElementById('status-section');
    const statusContent = document.getElementById('status-content');
    const walletSection = document.getElementById('wallet-section');
    const paymentSection = document.getElementById('payment-section');

    if (!statusSection || !statusContent) return;

    const icons = {
      loading: '⏳',
      success: '✅',
      error: '❌'
    };

    const colors = {
      loading: '#3b82f6',
      success: '#10b981',
      error: '#ef4444'
    };

    statusContent.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">${icons[type]}</div>
      <p style="margin: 0; font-size: 16px; color: ${colors[type]}; font-weight: 600;">${message}</p>
    `;

    if (walletSection) walletSection.style.display = 'none';
    if (paymentSection) paymentSection.style.display = 'none';
    statusSection.style.display = 'block';

    // Auto-hide error messages after 5 seconds
    if (type === 'error') {
      setTimeout(() => {
        this.hideStatus();
      }, 5000);
    }
  }

  /**
   * Hide status and show main content
   */
  private hideStatus(): void {
    const statusSection = document.getElementById('status-section');
    const walletSection = document.getElementById('wallet-section');
    const paymentSection = document.getElementById('payment-section');

    if (statusSection) statusSection.style.display = 'none';
    if (walletSection) walletSection.style.display = 'block';
    
    const connection = coinbaseWallet.getConnection();
    if (paymentSection && connection) {
      paymentSection.style.display = 'block';
    }
  }

  /**
   * Refresh modal content
   */
  private refreshModal(): void {
    if (this.modal && this.productInfo) {
      const modalContent = this.modal.querySelector('div');
      if (modalContent) {
        modalContent.innerHTML = this.getModalHTML();
        this.addEventListeners();
      }
    }
  }

  /**
   * Check if modal is open
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }
}

// Export singleton instance
export const paymentModal = new PaymentModal();
