import request from 'supertest';
import { app } from '../../server';
import { CheckoutSessionService } from '../../services/CheckoutSessionService';
import { GiftCodeInventoryService } from '../../services/GiftCodeInventoryService';
import { GiftCodeStatus } from '../../types/giftCode';

// Mock the services
jest.mock('../../services/CheckoutSessionService');
jest.mock('../../services/GiftCodeInventoryService');

const MockCheckoutSessionService = CheckoutSessionService as jest.MockedClass<typeof CheckoutSessionService>;
const MockGiftCodeInventoryService = GiftCodeInventoryService as jest.MockedClass<typeof GiftCodeInventoryService>;

describe('Payment Confirmation Webhook', () => {
  let mockCheckoutService: jest.Mocked<CheckoutSessionService>;
  let mockGiftCodeService: jest.Mocked<GiftCodeInventoryService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockCheckoutService = {
      getSession: jest.fn(),
      updateStatus: jest.fn(),
      createSession: jest.fn(),
    } as any;

    mockGiftCodeService = {
      allocateGiftCodes: jest.fn(),
      getInventoryStats: jest.fn(),
    } as any;

    // Mock the static methods
    MockCheckoutSessionService.mockImplementation(() => mockCheckoutService);
    MockGiftCodeInventoryService.mockImplementation(() => mockGiftCodeService);
  });

  describe('POST /api/webhooks/payment-confirmed', () => {
    const validPaymentData = {
      sessionId: 'session-198b3badb9celf4dfvb',
      transactionHash: '0x6a435b2878b97e555a706d7337d308ba5464e157019ec7cac51219f5e1b18d29',
      amount: 1811, // $18.11 in cents
      status: 'confirmed'
    };

    it('should process payment confirmation and allocate gift cards', async () => {
      // Mock successful checkout session retrieval
      mockCheckoutService.getSession.mockResolvedValue({
        id: 1,
        sessionId: 'session-198b3badb9celf4dfvb',
        amazonUrl: 'https://amazon.com/test',
        cartTotalCents: 1811,
        currentBalanceCents: 500,
        topUpAmountCents: 1311,
        status: 'CREATED',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      // Mock successful status update
      mockCheckoutService.updateStatus.mockResolvedValue(true);

      // Mock successful gift card allocation
      mockGiftCodeService.allocateGiftCodes.mockResolvedValue({
        success: true,
        allocatedCodes: [
          { id: 1, code: 'AMAZON-GIFT-CODE-ABC123', denomination: 500, status: GiftCodeStatus.ALLOCATED, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 2, code: 'AMAZON-GIFT-CODE-DEF456', denomination: 500, status: GiftCodeStatus.ALLOCATED, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 3, code: 'AMAZON-GIFT-CODE-GHI789', denomination: 500, status: GiftCodeStatus.ALLOCATED, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        totalAllocated: 1500,
        remainingAmount: 0
      });

      const response = await request(app)
        .post('/api/webhooks/payment-confirmed')
        .send(validPaymentData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Payment confirmed and gift cards allocated successfully',
        sessionId: 'session-198b3badb9celf4dfvb',
        allocatedAmount: 1500,
        remainingAmount: 0
      });

      // Verify service calls
      expect(mockCheckoutService.getSession).toHaveBeenCalledWith('session-198b3badb9celf4dfvb');
      expect(mockCheckoutService.updateStatus).toHaveBeenCalledWith('session-198b3badb9celf4dfvb', 'PAID');
      expect(mockGiftCodeService.allocateGiftCodes).toHaveBeenCalledWith(1311); // topUpAmountCents
    });

    it('should handle missing sessionId', async () => {
      const invalidData = { ...validPaymentData, sessionId: undefined };

      const response = await request(app)
        .post('/api/webhooks/payment-confirmed')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'sessionId is required'
      });
    });

    it('should handle missing transactionHash', async () => {
      const invalidData = { ...validPaymentData, transactionHash: undefined };

      const response = await request(app)
        .post('/api/webhooks/payment-confirmed')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'transactionHash is required'
      });
    });

    it('should handle checkout session not found', async () => {
      mockCheckoutService.getSession.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/webhooks/payment-confirmed')
        .send(validPaymentData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Checkout session not found'
      });
    });

    it('should handle gift card allocation failure', async () => {
      // Mock successful checkout session retrieval
      mockCheckoutService.getSession.mockResolvedValue({
        id: 1,
        sessionId: 'session-198b3badb9celf4dfvb',
        amazonUrl: 'https://amazon.com/test',
        cartTotalCents: 1811,
        currentBalanceCents: 500,
        topUpAmountCents: 1311,
        status: 'CREATED',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      // Mock successful status update
      mockCheckoutService.updateStatus.mockResolvedValue(true);

      // Mock gift card allocation failure
      mockGiftCodeService.allocateGiftCodes.mockResolvedValue({
        success: false,
        error: 'Insufficient gift codes available',
        allocatedCodes: [],
        totalAllocated: 0,
        remainingAmount: 1311
      });

      const response = await request(app)
        .post('/api/webhooks/payment-confirmed')
        .send(validPaymentData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to allocate gift codes: Insufficient gift codes available'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutService.getSession.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/webhooks/payment-confirmed')
        .send(validPaymentData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
    });
  });
});
