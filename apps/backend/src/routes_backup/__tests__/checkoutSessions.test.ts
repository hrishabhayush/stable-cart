import request from 'supertest';
import { app } from '../../server';
import { CheckoutSessionService } from '../../services/CheckoutSessionService';
import { Database } from 'sqlite3';

// Mock the database and service
jest.mock('../../database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../services/CheckoutSessionService');

const mockCheckoutSessionService = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSessionStatus: jest.fn(),
  getAllSessions: jest.fn(),
  cleanupExpiredSessions: jest.fn()
};

(CheckoutSessionService as jest.MockedClass<typeof CheckoutSessionService>).mockImplementation(() => mockCheckoutSessionService as any);

describe('Checkout Session Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/checkout-sessions', () => {
    const validSessionData = {
      amazonUrl: 'https://amazon.com/dp/B08N5WRWNW',
      cartTotalCents: 2500,
      currentBalanceCents: 500,
      userId: 'user123'
    };

    it('should create a new checkout session successfully', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'session-123abc',
        amazonUrl: validSessionData.amazonUrl,
        cartTotalCents: validSessionData.cartTotalCents,
        currentBalanceCents: validSessionData.currentBalanceCents,
        topUpAmountCents: 2000,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString()
      };

      mockCheckoutSessionService.createSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(validSessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toEqual(mockSession);
      expect(mockCheckoutSessionService.createSession).toHaveBeenCalledWith(validSessionData);
    });

    it('should return 400 for invalid amazon URL', async () => {
      const invalidData = {
        ...validSessionData,
        amazonUrl: 'not-an-amazon-url'
      };

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid Amazon URL');
    });

    it('should return 400 for invalid cart total', async () => {
      const invalidData = {
        ...validSessionData,
        cartTotalCents: -100
      };

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cart total must be a positive number');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        amazonUrl: validSessionData.amazonUrl
        // Missing cartTotalCents and userId
      };

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cartTotalCents is required');
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutSessionService.createSession.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/checkout-sessions')
        .send(validSessionData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('GET /api/checkout-sessions/:sessionId', () => {
    it('should return session details successfully', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'session-123abc',
        amazonUrl: 'https://amazon.com/dp/B08N5WRWNW',
        cartTotalCents: 2500,
        currentBalanceCents: 500,
        topUpAmountCents: 2000,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString()
      };

      mockCheckoutSessionService.getSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .get('/api/checkout-sessions/session-123abc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toEqual(mockSession);
      expect(mockCheckoutSessionService.getSession).toHaveBeenCalledWith('session-123abc');
    });

    it('should return 404 for non-existent session', async () => {
      mockCheckoutSessionService.getSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/checkout-sessions/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Session not found');
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutSessionService.getSession.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/checkout-sessions/session-123abc')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('PUT /api/checkout-sessions/:sessionId/status', () => {
    const validStatusUpdate = {
      status: 'PAID',
      metadata: { paymentHash: '0x123...' }
    };

    it('should update session status successfully', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'session-123abc',
        status: 'PAID',
        updatedAt: new Date().toISOString()
      };

      mockCheckoutSessionService.updateSessionStatus.mockResolvedValue(mockSession);

      const response = await request(app)
        .put('/api/checkout-sessions/session-123abc/status')
        .send(validStatusUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toEqual(mockSession);
      expect(mockCheckoutSessionService.updateSessionStatus).toHaveBeenCalledWith(
        'session-123abc',
        'PAID',
        validStatusUpdate.metadata
      );
    });

    it('should return 400 for invalid status', async () => {
      const invalidStatusUpdate = {
        status: 'INVALID_STATUS',
        metadata: {}
      };

      const response = await request(app)
        .put('/api/checkout-sessions/session-123abc/status')
        .send(invalidStatusUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status');
    });

    it('should return 400 for missing status', async () => {
      const invalidStatusUpdate = {
        metadata: {}
      };

      const response = await request(app)
        .put('/api/checkout-sessions/session-123abc/status')
        .send(invalidStatusUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('status is required');
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutSessionService.updateSessionStatus.mockRejectedValue(new Error('Invalid transition'));

      const response = await request(app)
        .put('/api/checkout-sessions/session-123abc/status')
        .send(validStatusUpdate)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid transition');
    });
  });

  describe('GET /api/checkout-sessions/:sessionId/status', () => {
    it('should return session status successfully', async () => {
      const mockSession = {
        id: 1,
        sessionId: 'session-123abc',
        status: 'PAID',
        updatedAt: new Date().toISOString()
      };

      mockCheckoutSessionService.getSession.mockResolvedValue(mockSession);

      const response = await request(app)
        .get('/api/checkout-sessions/session-123abc/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('PAID');
      expect(response.body.sessionId).toBe('session-123abc');
    });

    it('should return 404 for non-existent session', async () => {
      mockCheckoutSessionService.getSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/checkout-sessions/nonexistent/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('GET /api/checkout-sessions', () => {
    it('should return all sessions successfully', async () => {
      const mockSessions = [
        {
          id: 1,
          sessionId: 'session-123abc',
          status: 'CREATED',
          amazonUrl: 'https://amazon.com/dp/B08N5WRWNW',
          cartTotalCents: 2500,
          currentBalanceCents: 500,
          topUpAmountCents: 2000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        },
        {
          id: 2,
          sessionId: 'session-456def',
          status: 'PAID',
          amazonUrl: 'https://amazon.com/dp/B08N5WRWNW',
          cartTotalCents: 1500,
          currentBalanceCents: 1000,
          topUpAmountCents: 500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        }
      ];

      mockCheckoutSessionService.getAllSessions.mockResolvedValue(mockSessions);

      const response = await request(app)
        .get('/api/checkout-sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessions).toEqual(mockSessions);
      expect(mockCheckoutSessionService.getAllSessions).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutSessionService.getAllSessions.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/checkout-sessions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('POST /api/checkout-sessions/cleanup', () => {
    it('should cleanup expired sessions successfully', async () => {
      const cleanupResult = { cleanedCount: 5 };

      mockCheckoutSessionService.cleanupExpiredSessions.mockResolvedValue(cleanupResult.cleanedCount);

      const response = await request(app)
        .post('/api/checkout-sessions/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cleanedCount).toBe(5);
      expect(mockCheckoutSessionService.cleanupExpiredSessions).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockCheckoutSessionService.cleanupExpiredSessions.mockRejectedValue(new Error('Cleanup failed'));

      const response = await request(app)
        .post('/api/checkout-sessions/cleanup')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cleanup failed');
    });
  });
});
