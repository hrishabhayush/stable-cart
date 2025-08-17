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

  /**
   * Initialize the gift card handler
   */
  init(): void {
    console.log('🎁 Initializing gift card handler...');
    
    // Listen for automation messages from webapp
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GIFT_CARD_AUTOMATION') {
        console.log('🎁 Gift card automation received:', event.data);
        this.handleAutomation(event.data);
      }
    });

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', (e) => {
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

    console.log('✅ Gift card handler initialized');
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
    return url.includes('amazon.com') && (
      url.includes('/checkout') || 
      url.includes('/cart') ||
      url.includes('/gp/cart')
    );
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
      // Look for gift card input field
      const giftCardInput = document.querySelector('input[name="gift-card-balance"], input[placeholder*="gift"], input[placeholder*="card"]') as HTMLInputElement;
      
      if (!giftCardInput) {
        console.log('⚠️ Gift card input field not found');
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
}

// Export singleton instance
export const giftCardHandler = new GiftCardHandler();
