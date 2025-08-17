/**
 * Simple Gift Card Handler for Extension
 * Receives automation triggers from frontend and applies gift cards
 */

export interface GiftCardData {
  sessionId: string;
  amazonUrl: string;
  giftCodes: Array<{
    code: string;
    denomination: number;
    status: string;
  }>;
  totalAmount: number;
  transactionHash: string;
}

export class GiftCardHandler {
  private isProcessing: boolean = false;
  private pollingInterval: number | null = null;
  private lastCheckedTimestamp: number = 0;

  /**
   * Initialize the gift card handler
   */
  init(): void {
    console.log('🎁 Initializing gift card handler...');
    console.log('📍 Current page URL:', window.location.href);
    console.log('🌐 Page domain:', window.location.hostname);
    
    // Listen for ALL window messages to debug
    window.addEventListener('message', (event) => {
      console.log('📨 Window message received:', event.data);
      if (event.data && event.data.type === 'GIFT_CARD_AUTOMATION') {
        console.log('🎁 Gift card automation received via postMessage:', event.data);
        this.handleAutomation(event.data);
      }
    });

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', (e) => {
      console.log('💾 Storage change detected:', e.key, e.newValue);
      if (e.key === 'stablecart_gift_card_automation') {
        try {
          const automationData = JSON.parse(e.newValue || '{}');
          if (automationData.type === 'GIFT_CARD_AUTOMATION') {
            console.log('🎁 Gift card automation received via storage:', automationData);
            this.handleAutomation(automationData);
          }
        } catch (error) {
          console.error('❌ Error parsing automation data:', error);
        }
      }
    });

    // Listen for custom events too
    window.addEventListener('giftCardAutomation', (event: any) => {
      console.log('🎯 Custom event received:', event.detail);
      if (event.detail) {
        this.handleAutomation(event.detail);
      }
    });

    // Also check localStorage on init in case data is already there
    try {
      const existingData = localStorage.getItem('stablecart_gift_card_automation');
      if (existingData) {
        console.log('💾 Found existing automation data in localStorage:', existingData);
        const automationData = JSON.parse(existingData);
        if (automationData.type === 'GIFT_CARD_AUTOMATION') {
          // Check if it's recent (within last 5 minutes)
          const now = Date.now();
          const dataAge = now - (automationData.timestamp || 0);
          if (dataAge < 5 * 60 * 1000) { // 5 minutes
            console.log('🎁 Processing existing automation data');
            this.handleAutomation(automationData);
          } else {
            console.log('⏰ Automation data is too old, ignoring');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking existing automation data:', error);
    }

    console.log('✅ Gift card handler initialized with enhanced debugging');
    
    // 🔄 NEW: Start polling for automation data every 2 seconds on Amazon pages
    if (window.location.hostname.includes('amazon')) {
      console.log('🔄 Starting active polling for automation data on Amazon page...');
      this.startPolling();
    }
  }

  /**
   * Handle automation trigger
   */
  private async handleAutomation(data: GiftCardData): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Already processing gift cards, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🎁 Starting gift card automation for session:', data.sessionId);

    try {
      // Check if we're on Amazon checkout page
      if (!this.isAmazonCheckoutPage()) {
        console.log('⚠️ Not on Amazon checkout page, redirecting...');
        window.location.href = data.amazonUrl;
        return;
      }

      // Apply gift codes
      const result = await this.applyGiftCards(data.giftCodes);
      
      if (result.success) {
        console.log('✅ Gift cards applied successfully:', result);
        
        // Place order
        const orderResult = await this.placeOrder();
        result.orderPlaced = orderResult;
        
        // Notify backend of completion
        await this.notifyCompletion(data.sessionId, result);
        
        console.log('🎉 Gift card automation completed successfully!');
        
        // Show success message
        this.showSuccessMessage('Gift cards applied and order placed successfully!');
      } else {
        throw new Error(result.error || 'Failed to apply gift cards');
      }

    } catch (error) {
      console.error('❌ Gift card automation failed:', error);
      this.showErrorMessage(`Automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Notify backend of failure
      await this.notifyCompletion(data.sessionId, {
        success: false,
        giftCodesApplied: 0,
        totalApplied: 0,
        orderPlaced: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if we're on Amazon checkout page
   */
  private isAmazonCheckoutPage(): boolean {
    const url = window.location.href;
    const isAmazon = url.includes('amazon.com');
    const isCheckout = url.includes('/checkout') || url.includes('/cart') || url.includes('/gp/cart');
    
    console.log('🔍 Checking if Amazon checkout page:');
    console.log('  📍 URL:', url);
    console.log('  🌐 Is Amazon:', isAmazon);
    console.log('  🛒 Is Checkout/Cart:', isCheckout);
    console.log('  ✅ Result:', isAmazon && isCheckout);
    
    return isAmazon && isCheckout;
  }

  /**
   * Apply gift codes to Amazon cart
   */
  private async applyGiftCards(giftCodes: Array<{code: string; denomination: number}>): Promise<any> {
    console.log('🎁 Applying gift codes:', giftCodes.length);
    
    let appliedCount = 0;
    let totalApplied = 0;

    for (const giftCode of giftCodes) {
      try {
        const applied = await this.applySingleGiftCode(giftCode.code);
        if (applied) {
          appliedCount++;
          totalApplied += giftCode.denomination;
          console.log(`✅ Applied gift code: ${giftCode.code} ($${giftCode.denomination})`);
          
          // Wait between applications
          await this.delay(1000);
        } else {
          console.log(`⚠️ Failed to apply gift code: ${giftCode.code}`);
        }
      } catch (error) {
        console.error(`❌ Error applying gift code ${giftCode.code}:`, error);
      }
    }

    return {
      success: appliedCount > 0,
      giftCodesApplied: appliedCount,
      totalApplied: totalApplied / 100, // Convert cents to dollars
      orderPlaced: false
    };
  }

  /**
   * Apply a single gift code
   */
  private async applySingleGiftCode(code: string): Promise<boolean> {
    try {
      // Look for gift card input field with more selectors
      const giftCardSelectors = [
        'input[name="gift-card-balance"]',
        'input[placeholder*="gift"]',
        'input[placeholder*="card"]',
        'input[placeholder*="Gift"]',
        'input[placeholder*="Card"]',
        'input[name*="gift"]',
        'input[name*="card"]',
        'input[id*="gift"]',
        'input[id*="card"]',
        'input[data-testid*="gift"]',
        'input[aria-label*="gift"]',
        'input[aria-label*="card"]',
        '.gift-card input',
        '.giftcard input',
        '#gift-card input',
        '#giftcard input',
        'input[type="text"][placeholder=""]', // Sometimes Amazon uses empty placeholder
        'input[type="text"]:not([name]):not([id]):not([placeholder])', // Generic text input
      ];
      
      let giftCardInput: HTMLInputElement | null = null;
      
      for (const selector of giftCardSelectors) {
        giftCardInput = document.querySelector(selector) as HTMLInputElement;
        if (giftCardInput) {
          console.log(`✅ Found gift card input with selector: ${selector}`);
          break;
        }
      }
      
      if (!giftCardInput) {
        console.log('⚠️ Gift card input field not found with any selector');
        console.log('🔍 Available input fields on page:');
        const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
        allInputs.forEach((input, index) => {
          const element = input as HTMLInputElement;
          console.log(`  ${index + 1}. Name: "${element.name}", ID: "${element.id}", Placeholder: "${element.placeholder}", Class: "${element.className}"`);
        });
        return false;
      }

      // Clear and fill the input
      giftCardInput.value = code;
      giftCardInput.dispatchEvent(new Event('input', { bubbles: true }));
      giftCardInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Look for apply button
      const applyButton = document.querySelector('button[type="submit"], input[type="submit"], .apply-gift-card, .redeem-gift-card') as HTMLButtonElement;
      
      if (!applyButton) {
        console.log('⚠️ Apply button not found');
        return false;
      }

      // Click the apply button
      applyButton.click();
      
      // Wait for application to complete
      await this.delay(2000);
      
      // Check if application was successful
      const successIndicator = document.querySelector('.success-message, .gift-card-applied, .balance-updated');
      return !!successIndicator;

    } catch (error) {
      console.error('❌ Error applying gift code:', error);
      return false;
    }
  }

  /**
   * Place the order
   */
  private async placeOrder(): Promise<boolean> {
    try {
      console.log('🛒 Placing order...');
      
      // Look for place order button
      const placeOrderButton = document.querySelector('button[name="place-order"], .place-order, .checkout-button') as HTMLButtonElement;
      
      if (!placeOrderButton) {
        console.log('⚠️ Place order button not found');
        return false;
      }

      // Click the place order button
      placeOrderButton.click();
      
      // Wait for order placement
      await this.delay(3000);
      
      // Check if order was placed successfully
      const orderConfirmation = document.querySelector('.order-confirmation, .order-success, .thank-you');
      return !!orderConfirmation;

    } catch (error) {
      console.error('❌ Error placing order:', error);
      return false;
    }
  }

  /**
   * Notify backend of completion
   */
  private async notifyCompletion(sessionId: string, result: any): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/webhooks/gift-card-applied', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          amazonUrl: window.location.href,
          giftCodesApplied: result.giftCodesApplied,
          totalApplied: result.totalApplied,
          orderPlaced: result.orderPlaced
        })
      });

      if (response.ok) {
        console.log('✅ Backend notified of completion');
      } else {
        console.error('❌ Failed to notify backend:', response.status);
      }
    } catch (error) {
      console.error('❌ Error notifying backend:', error);
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  /**
   * Utility function to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🔄 NEW: Start polling for automation data
   */
  private startPolling(): void {
    console.log('🔄 Starting automation data polling...');
    
    // Poll every 2 seconds
    this.pollingInterval = setInterval(() => {
      this.checkForAutomationData();
    }, 2000);

    // Also check immediately
    this.checkForAutomationData();
  }

  /**
   * 🔄 NEW: Check for new automation data
   */
  private checkForAutomationData(): void {
    try {
      const existingData = localStorage.getItem('stablecart_gift_card_automation');
      if (!existingData) return;

      const automationData = JSON.parse(existingData);
      if (!automationData.type || automationData.type !== 'GIFT_CARD_AUTOMATION') return;

      // Check if this is newer than what we've processed
      const dataTimestamp = automationData.timestamp || 0;
      if (dataTimestamp <= this.lastCheckedTimestamp) return;

      // Check if data is recent (within last 10 minutes)
      const now = Date.now();
      const dataAge = now - dataTimestamp;
      if (dataAge > 10 * 60 * 1000) {
        console.log('⏰ Automation data is too old, ignoring');
        return;
      }

      console.log('🎁 Found new automation data via polling:', automationData);
      this.lastCheckedTimestamp = dataTimestamp;
      
      // Process the automation
      this.handleAutomation(automationData);

    } catch (error) {
      console.error('❌ Error checking automation data during polling:', error);
    }
  }

  /**
   * 🔄 NEW: Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ Stopped automation data polling');
    }
  }
}

// Export singleton instance
export const giftCardHandler = new GiftCardHandler();
