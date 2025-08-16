import request from 'supertest';
import { app } from '../../server';
import { CheckoutSessionService } from '../../services/CheckoutSessionService';
import { CheckoutSessionStatus } from '../../types/CheckoutSession';

// Mock the service
jest.mock('../../services/CheckoutSessionService');

const MockCheckoutSessionService = CheckoutSessionService as jest.MockedClass<typeof CheckoutSessionService>;

describe('Checkout Session Routes', () => {
  let mockCheckoutService: jest.Mocked<CheckoutSessionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCheckoutService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateStatus: jest.fn(),
      getSessionsByStatus: jest.fn(),
    } as any;

    MockCheckoutSessionService.mockImplementation(() => mockCheckoutService);
  });

  describe('POST /api/checkout-sessions', () => {
    const validSessionData = {
      amazonUrl: 'https://amazon.com/test-product',
      cartTotalCents: 1811,
      currentBalanceCents: 500
    };

    it('should create a new checkout session successfully', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'session-198b3badb9celf4dfvb',
        amazonUrl: 'https://amazon.com/test-product',
        cartTotalCents: 1811,
        currentBalanceCents: 500,
        topUpAmountCents: 1311,
        status: 'CREATED' as CheckoutSessionStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };

      mockCheckoutService.createSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(validSessionData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        session: mockSession
      });

      expect(mockCheckoutService.createSession).toHaveBeenCalledWith({
        ...validSessionData,
        userId: undefined
      });
    });

    it('should handle missing amazonUrl', async () => {
      const invalidData = { ...validSessionData, amazonUrl: undefined };

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'amazonUrl is required'
      });
    });

    it('should handle missing cartTotalCents', async () => {
      const invalidData = { ...validSessionData, cartTotalCents: undefined };

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'cartTotalCents is required'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutService.createSession.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(validSessionData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('GET /api/checkout-sessions/:sessionId', () => {
    it('should retrieve checkout session by sessionId', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'session-198b3badb9celf4dfvb',
        amazonUrl: 'https://amazon.com/test-product',
        cartTotalCents: 1811,
        currentBalanceCents: 500,
        topUpAmountCents: 1311,
        status: 'CREATED' as CheckoutSessionStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      };

      mockCheckoutService.getSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .get('/api/checkout-sessions/session-198b3badb9celf4dfvb')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        session: mockSession
      });

      expect(mockCheckoutService.getSession).toHaveBeenCalledWith('session-198b3badb9celf4dfvb');
    });

    it('should handle session not found', async () => {
      mockCheckoutService.getSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/checkout-sessions/nonexistent-session')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Checkout session not found'
      });
    });
  });

  describe('PUT /api/checkout-sessions/:sessionId/status', () => {
    const validStatusData = {
      status: 'PAID'
    };

    it('should update checkout session status successfully', async () => {
      mockCheckoutService.updateStatus.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/checkout-sessions/session-198b3badb9celf4dfvb/status')
        .send(validStatusData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Checkout session status updated successfully'
      });

      expect(mockCheckoutService.updateStatus).toHaveBeenCalledWith('session-198b3badb9celf4dfvb', 'PAID');
    });

    it('should handle missing status', async () => {
      const invalidData = {};

      const response = await request(app)
        .put('/api/checkout-sessions/session-198b3badb9celf4dfvb/status')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'status is required'
      });
    });

    it('should handle invalid status values', async () => {
      const invalidData = { status: 'INVALID_STATUS' };

      const response = await request(app)
        .put('/api/checkout-sessions/session-198b3badb9celf4dfvb/status')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid status. Must be one of: CREATED, PAID, FULFILLED, EXPIRED, CANCELLED'
      });
    });
  });

  describe('GET /api/checkout-sessions', () => {
    it('should retrieve all checkout sessions', async () => {
      const mockSessions = [
        {
          id: 1,
          sessionId: 'session-198b3badb9celf4dfvb',
          amazonUrl: 'https://amazon.com/test-product',
          cartTotalCents: 1811,
          currentBalanceCents: 500,
          topUpAmountCents: 1311,
          status: 'CREATED' as CheckoutSessionStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      ];

      mockCheckoutService.getSessionsByStatus.mockResolvedValue(mockSessions);

      const response = await request(app)
        .get('/api/checkout-sessions')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        sessions: mockSessions
      });
    });
  });
});
