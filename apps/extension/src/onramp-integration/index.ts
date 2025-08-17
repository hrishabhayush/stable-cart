/**
 * Coinbase On Ramp Integration for Extension
 * Handles buying Base ETH when users have insufficient gas fees
 */

export interface OnrampQuoteRequest {
  country: string;
  destinationAddress: string;
  paymentAmount: string;
  paymentCurrency: string;
  paymentMethod: string;
  purchaseCurrency: string;
  purchaseNetwork: string;
  subdivision?: string;
}

export interface OnrampQuoteResponse {
  coinbaseFee: {
    currency: string;
    value: string;
  };
  networkFee: {
    currency: string;
    value: string;
  };
  onrampUrl: string;
  paymentSubtotal: {
    currency: string;
    value: string;
  };
  paymentTotal: {
    currency: string;
    value: string;
  };
  purchaseAmount: {
    currency: string;
    value: string;
  };
  quoteId: string;
}

export interface OnrampConfig {
  onSuccess: (quote: OnrampQuoteResponse) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export class OnrampIntegration {
  private backendBaseUrl: string = 'http://localhost:3001';

  /**
   * Generate On Ramp quote for buying Base ETH
   */
  async generateQuote(
    destinationAddress: string,
    paymentAmount: string,
    country: string = 'US'
  ): Promise<OnrampQuoteResponse> {
    try {
      console.log('🔄 Generating On Ramp quote for Base ETH...', {
        destinationAddress,
        paymentAmount,
        country
      });

      const response = await fetch(`${this.backendBaseUrl}/api/onramp/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country,
          destinationAddress,
          paymentAmount,
          paymentCurrency: 'USD',
          paymentMethod: 'UNSPECIFIED',
          purchaseCurrency: 'ETH',
          purchaseNetwork: 'base',
          subdivision: country === 'US' ? 'CA' : undefined // Default to California for US
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ On Ramp quote generated:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error generating On Ramp quote:', error);
      throw error;
    }
  }

  /**
   * Handle insufficient Base ETH scenario
   * This is called when fee estimation fails due to low ETH balance
   */
  async handleInsufficientBaseEth(
    userAddress: string,
    requiredAmount: string,
    config: OnrampConfig
  ): Promise<void> {
    try {
      console.log('💰 Handling insufficient Base ETH scenario...', {
        userAddress,
        requiredAmount
      });

      // Generate quote for buying Base ETH
      const quote = await this.generateQuote(
        userAddress,
        requiredAmount
      );

      // Show On Ramp popup for user to buy ETH
      this.showOnrampPopup(quote, config);

    } catch (error) {
      console.error('❌ Error handling insufficient Base ETH:', error);
      config.onError('Failed to generate funding options. Please try again.');
    }
  }

  /**
   * Show On Ramp popup for buying Base ETH
   */
  private showOnrampPopup(quote: OnrampQuoteResponse, config: OnrampConfig): void {
    try {
      console.log('🪟 Opening On Ramp popup for Base ETH purchase...');

      // Create popup window
      const popup = window.open(
        quote.onrampUrl,
        'coinbase-onramp',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked by browser');
      }

      // Listen for popup close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          console.log('🪟 On Ramp popup closed');
          config.onCancel();
        }
      }, 1000);

      // Listen for messages from popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== 'https://pay.coinbase.com') {
          return;
        }

        console.log('📨 On Ramp message received:', event.data);

        if (event.data.type === 'onramp_success') {
          clearInterval(checkClosed);
          popup.close();
          config.onSuccess(quote);
        } else if (event.data.type === 'onramp_error') {
          clearInterval(checkClosed);
          popup.close();
          config.onError(event.data.message || 'Funding failed');
        }
      };

      window.addEventListener('message', messageListener);

      // Timeout after 10 minutes
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          config.onError('Funding session timed out');
        }
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error('❌ Error showing On Ramp popup:', error);
      config.onError('Failed to open funding options. Please try again.');
    }
  }

  /**
   * Get supported countries for On Ramp
   */
  async getSupportedCountries(): Promise<string[]> {
    try {
      const response = await fetch(`${this.backendBaseUrl}/api/onramp/countries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data?.data || ['US', 'CA', 'GB', 'EU'];
    } catch (error) {
      console.warn('⚠️ Could not get supported countries, using defaults:', error);
      return ['US', 'CA', 'GB', 'EU'];
    }
  }

  /**
   * Get supported payment methods for a country
   */
  async getSupportedPaymentMethods(country: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.backendBaseUrl}/api/onramp/payment-methods?country=${country}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data?.data || ['CARD', 'ACH_BANK_ACCOUNT', 'APPLE_PAY'];
    } catch (error) {
      console.warn('⚠️ Could not get payment methods, using defaults:', error);
      return ['CARD', 'ACH_BANK_ACCOUNT', 'APPLE_PAY'];
    }
  }
}

// Export singleton instance
export const onrampIntegration = new OnrampIntegration();
