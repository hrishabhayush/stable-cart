// BackendService for StableCart Chrome Extension
// Handles communication with the local backend for gift card allocation

interface CheckoutSessionRequest {
  amazonUrl: string;
  cartTotalCents: number;
  currentBalanceCents: number;
  topUpAmountCents: number;
}

interface CheckoutSession {
  id: number;
  sessionId: string;
  amazonUrl: string;
  cartTotalCents: number;
  currentBalanceCents: number;
  topUpAmountCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface GiftCardAllocationRequest {
  sessionId: string;
  transactionHash: string;
  amount: number;
  status: string;
}

interface GiftCardAllocationResult {
  success: boolean;
  message: string;
  sessionId: string;
  allocatedAmount: number;
  remainingAmount: number;
  allocatedCodes: Array<{
    id: number;
    code: string;
    denomination: number;
    status: string;
  }>;
}

export class BackendService {
  private baseUrl = 'http://localhost:3001';

  /**
   * Create a new checkout session
   */
  async createCheckoutSession(data: CheckoutSessionRequest): Promise<CheckoutSession> {
    try {
      const response = await fetch(`${this.baseUrl}/api/checkout-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      return result.session;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Allocate gift cards for a payment
   */
  async allocateGiftCards(data: GiftCardAllocationRequest): Promise<GiftCardAllocationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/payment-confirmed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to allocate gift cards');
      }

      return result;
    } catch (error) {
      console.error('Failed to allocate gift cards:', error);
      throw error;
    }
  }

  /**
   * Get checkout session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/checkout-sessions/${sessionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        return null;
      }

      return result.session;
    } catch (error) {
      console.error('Failed to get checkout session:', error);
      return null;
    }
  }

  /**
   * Update checkout session status
   */
  async updateSessionStatus(sessionId: string, status: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/checkout-sessions/${sessionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to update session status:', error);
      return false;
    }
  }
}
