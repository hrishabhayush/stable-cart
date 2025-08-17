/**
 * Coinbase On Ramp Service
 * Handles API calls to Coinbase On Ramp for buying Base ETH
 */

export interface OnrampQuoteRequest {
  country: string;
  destinationAddress?: string;
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
  onrampUrl?: string;
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

export class OnrampService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.developer.coinbase.com/onramp';

  constructor() {
    // In production, these would come from environment variables
    this.apiKey = process.env.COINBASE_API_KEY || 'your_api_key_here';
    this.apiSecret = process.env.COINBASE_API_SECRET || 'your_api_secret_here';
  }

  /**
   * Generate JWT token for Coinbase API authentication
   */
  private generateJWT(): string {
    // This is a simplified JWT generation
    // In production, you'd use a proper JWT library
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      iss: this.apiKey,
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      iat: Math.floor(Date.now() / 1000)
    };

    // For demo purposes, return a mock JWT
    // In production, properly sign this with your secret
    return `mock_jwt_${Date.now()}`;
  }

  /**
   * Create buy quote for Base ETH
   */
  async createBuyQuote(request: OnrampQuoteRequest): Promise<OnrampQuoteResponse> {
    try {
      console.log('🔄 Creating buy quote for Base ETH:', request);

      const jwt = this.generateJWT();

      // For demo purposes, return a mock response
      // In production, this would make the actual API call to Coinbase
      if (process.env.NODE_ENV === 'production') {
        const response = await fetch(`${this.baseUrl}/v1/buy/quote`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          throw new Error(`Coinbase API error: ${response.status}`);
        }

        const data = await response.json();
        return data as OnrampQuoteResponse;
      } else {
        // Mock response for development/testing
        return this.generateMockQuote(request);
      }

    } catch (error) {
      console.error('❌ Error creating buy quote:', error);
      throw error;
    }
  }

  /**
   * Generate mock quote for development/testing
   */
  private generateMockQuote(request: OnrampQuoteRequest): OnrampQuoteResponse {
    const paymentAmount = parseFloat(request.paymentAmount);
    const coinbaseFee = paymentAmount * 0.01; // 1% fee
    const networkFee = 0.001; // $0.001 network fee
    const total = paymentAmount + coinbaseFee + networkFee;

    return {
      coinbaseFee: {
        currency: 'USD',
        value: coinbaseFee.toFixed(4)
      },
      networkFee: {
        currency: 'USD',
        value: networkFee.toFixed(4)
      },
      onrampUrl: `https://pay.coinbase.com/buy/quote/${this.generateMockQuoteId()}`,
      paymentSubtotal: {
        currency: 'USD',
        value: paymentAmount.toFixed(2)
      },
      paymentTotal: {
        currency: 'USD',
        value: total.toFixed(4)
      },
      purchaseAmount: {
        currency: 'ETH',
        value: (paymentAmount / 2000).toFixed(6) // Mock ETH price of $2000
      },
      quoteId: this.generateMockQuoteId()
    };
  }

  /**
   * Generate mock quote ID
   */
  private generateMockQuoteId(): string {
    return `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get supported countries
   */
  async getSupportedCountries(): Promise<string[]> {
    // Mock supported countries
    return ['US', 'CA', 'GB', 'EU', 'AU', 'JP', 'SG'];
  }

  /**
   * Get supported payment methods for a country
   */
  async getSupportedPaymentMethods(country: string): Promise<string[]> {
    const baseMethods = ['CARD', 'ACH_BANK_ACCOUNT', 'APPLE_PAY'];
    
    if (country === 'US') {
      return [...baseMethods, 'PAYPAL', 'RTP'];
    } else if (country === 'GB') {
      return [...baseMethods, 'PAYPAL'];
    } else {
      return baseMethods;
    }
  }

  /**
   * Validate quote request
   */
  validateQuoteRequest(request: OnrampQuoteRequest): string[] {
    const errors: string[] = [];

    if (!request.country || request.country.length !== 2) {
      errors.push('Country must be a valid 2-letter ISO code');
    }

    if (!request.paymentAmount || parseFloat(request.paymentAmount) <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (!request.paymentCurrency) {
      errors.push('Payment currency is required');
    }

    if (!request.purchaseCurrency) {
      errors.push('Purchase currency is required');
    }

    if (!request.purchaseNetwork) {
      errors.push('Purchase network is required');
    }

    if (request.country === 'US' && !request.subdivision) {
      errors.push('Subdivision (state) is required for US');
    }

    return errors;
  }
}

// Export singleton instance
export const onrampService = new OnrampService();
