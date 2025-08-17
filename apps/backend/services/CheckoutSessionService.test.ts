import { CheckoutSessionService } from './CheckoutSessionService';
import { Database } from 'sqlite3';

// Mock database for testing
const mockDb = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  close: jest.fn()
} as unknown as Database;

describe('CheckoutSessionService', () => {
  let service: CheckoutSessionService;

  beforeEach(() => {
    service = new CheckoutSessionService(mockDb);
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    const validSessionData = {
      amazonUrl: 'https://amazon.com/checkout',
      cartTotalCents: 3750, // $37.50
      currentBalanceCents: 500, // $5.00
      userId: 'user123'
    };

    it('should create a new session with valid data', async () => {
      const mockSessionId = 'session-123';
      const mockInsertId = 1;
      
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { lastID: mockInsertId });
      });

      const result = await service.createSession(validSessionData);

      expect(result).toEqual({
        id: mockInsertId,
        sessionId: expect.stringMatching(/^session-[a-f0-9]+[a-z0-9]+$/),
        amazonUrl: validSessionData.amazonUrl,
        cartTotalCents: validSessionData.cartTotalCents,
        currentBalanceCents: validSessionData.currentBalanceCents,
        topUpAmountCents: 3250, // $37.50 - $5.00
        status: 'CREATED',
        userId: validSessionData.userId,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        expiresAt: expect.any(Date)
      });

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checkout_sessions'),
        expect.arrayContaining([
          expect.stringMatching(/^session-[a-f0-9]+[a-z0-9]+$/),
          validSessionData.userId,
          validSessionData.amazonUrl,
          validSessionData.cartTotalCents,
          validSessionData.currentBalanceCents,
          3250, // topUpAmountCents
          'CREATED'
        ]),
        expect.any(Function)
      );
    });

    it('should generate unique session IDs for each request', async () => {
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { lastID: 1 });
      });

      const session1 = await service.createSession(validSessionData);
      const session2 = await service.createSession(validSessionData);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should set expiration time to 15 minutes from creation', async () => {
      const now = new Date();
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { lastID: 1 });
      });

      const result = await service.createSession(validSessionData);
      
      const expectedExpiry = new Date(now.getTime() + 15 * 60 * 1000);
      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.createSession(validSessionData))
        .rejects.toThrow('Failed to create checkout session: Database connection failed');
    });

    it('should validate input data before creating session', async () => {
      const invalidData = {
        amazonUrl: 'not-an-amazon-url',
        cartTotalCents: -100,
        currentBalanceCents: 1000,
        userId: ''
      };

      await expect(service.createSession(invalidData))
        .rejects.toThrow();
    });

    it('should handle zero current balance', async () => {
      const zeroBalanceData = {
        ...validSessionData,
        currentBalanceCents: 0
      };

      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { lastID: 1 });
      });

      const result = await service.createSession(zeroBalanceData);
      expect(result.topUpAmountCents).toBe(validSessionData.cartTotalCents);
    });

    it('should handle high current balance', async () => {
      const highBalanceData = {
        ...validSessionData,
        currentBalanceCents: 10000 // $100.00
      };

      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { lastID: 1 });
      });

      const result = await service.createSession(highBalanceData);
      expect(result.topUpAmountCents).toBe(0);
    });
  });

  describe('updateStatus', () => {
    const sessionId = 'session-12345678abcdef';

    it('should successfully update session status', async () => {
      // Mock getSession to return a valid session
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, {
          id: 1,
          session_id: sessionId,
          user_id: 'user123',
          amazon_url: 'https://amazon.com/checkout',
          cart_total_cents: 3750,
          current_balance_cents: 500,
          top_up_amount_cents: 3250,
          status: 'CREATED',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          expires_at: '2024-01-01T00:15:00.000Z',
          metadata: null
        });
      });

      // Mock the update operation
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.updateStatus(sessionId, 'PENDING');
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE checkout_sessions'),
        expect.arrayContaining(['PENDING', sessionId]),
        expect.any(Function)
      );
    });

    it('should reject invalid status transitions', async () => {
      // Test CREATED -> COMPLETED (invalid)
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, {
          id: 1,
          session_id: sessionId,
          user_id: 'user123',
          amazon_url: 'https://amazon.com/checkout',
          cart_total_cents: 3750,
          current_balance_cents: 500,
          top_up_amount_cents: 3250,
          status: 'CREATED',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          expires_at: '2024-01-01T00:15:00.000Z',
          metadata: null
        });
      });

      await expect(service.updateStatus(sessionId, 'COMPLETED'))
        .rejects.toThrow('Invalid status transition from CREATED to COMPLETED');
    });

    it('should handle non-existent sessions', async () => {
      // Mock getSession to return null (session not found)
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, null);
      });

      await expect(service.updateStatus(sessionId, 'PENDING'))
        .rejects.toThrow('Session not found or no changes made');
    });

    it('should handle database errors', async () => {
      // Mock getSession to return a valid session
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, {
          id: 1,
          session_id: sessionId,
          user_id: 'user123',
          amazon_url: 'https://amazon.com/checkout',
          cart_total_cents: 3750,
          current_balance_cents: 500,
          top_up_amount_cents: 3250,
          status: 'CREATED',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          expires_at: '2024-01-01T00:15:00.000Z',
          metadata: null
        });
      });

      // Mock the update operation to fail
      const dbError = new Error('Update failed');
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.updateStatus(sessionId, 'PENDING'))
        .rejects.toThrow('Failed to update session status: Update failed');
    });
  });

  describe('getSession', () => {
    const sessionId = 'session-12345678abcdef';
    const mockSessionData = {
      id: 1,
      session_id: 'session-12345678abcdef',
      user_id: 'user123',
      amazon_url: 'https://amazon.com/checkout',
      cart_total_cents: 3750,
      current_balance_cents: 500,
      top_up_amount_cents: 3250,
      status: 'CREATED',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      expires_at: '2024-01-01T00:15:00.000Z',
      metadata: null
    };

    it('should retrieve session by ID', async () => {
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockSessionData);
      });

      const result = await service.getSession(sessionId);
      expect(result).toEqual({
        id: mockSessionData.id,
        sessionId: mockSessionData.session_id,
        userId: mockSessionData.user_id,
        amazonUrl: mockSessionData.amazon_url,
        cartTotalCents: mockSessionData.cart_total_cents,
        currentBalanceCents: mockSessionData.current_balance_cents,
        topUpAmountCents: mockSessionData.top_up_amount_cents,
        status: mockSessionData.status,
        createdAt: new Date(mockSessionData.created_at),
        updatedAt: new Date(mockSessionData.updated_at),
        expiresAt: new Date(mockSessionData.expires_at),
        metadata: mockSessionData.metadata
      });
    });

    it('should return null for non-existent sessions', async () => {
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, null);
      });

      const result = await service.getSession('session-99999999abcdef');
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.getSession(sessionId))
        .rejects.toThrow('Failed to retrieve session: Query failed');
    });
  });

  describe('expireSession', () => {
    const sessionId = 'session-12345678abcdef';

    it('should successfully expire a session', async () => {
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.expireSession(sessionId);
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE checkout_sessions'),
        expect.arrayContaining(['EXPIRED', sessionId]),
        expect.any(Function)
      );
    });

    it('should handle non-existent sessions', async () => {
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 0 });
      });

      await expect(service.expireSession(sessionId))
        .rejects.toThrow('Session not found or no changes made');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Expire failed');
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.expireSession(sessionId))
        .rejects.toThrow('Failed to expire session: Expire failed');
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Mock the select query to return expired sessions
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, [
          { id: 1, session_id: 'session-1' },
          { id: 2, session_id: 'session-2' },
          { id: 3, session_id: 'session-3' }
        ]);
      });

      // Mock the update operation
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 3 });
      });

      const result = await service.cleanupExpiredSessions();
      expect(result).toBe(3);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE checkout_sessions'),
        expect.arrayContaining(['EXPIRED']),
        expect.any(Function)
      );
    });

    it('should handle no expired sessions', async () => {
      // Mock the select query to return no expired sessions
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, []);
      });

      const result = await service.cleanupExpiredSessions();
      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      // Mock the select query to fail
      const dbError = new Error('Cleanup failed');
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.cleanupExpiredSessions())
        .rejects.toThrow('Failed to cleanup expired sessions: Cleanup failed');
    });
  });

  describe('getSessionsByStatus', () => {
    const mockSessions = [
      {
        id: 1,
        session_id: 'session-12345678',
        user_id: 'user1',
        amazon_url: 'https://amazon.com/checkout1',
        cart_total_cents: 1000,
        current_balance_cents: 0,
        top_up_amount_cents: 1000,
        status: 'CREATED',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        expires_at: '2024-01-01T00:15:00.000Z',
        metadata: null
      }
    ];

    it('should retrieve sessions by status', async () => {
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockSessions);
      });

      const result = await service.getSessionsByStatus('CREATED');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('CREATED');
    });

    it('should return empty array for status with no sessions', async () => {
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, []);
      });

      const result = await service.getSessionsByStatus('COMPLETED');
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.getSessionsByStatus('CREATED'))
        .rejects.toThrow('Failed to retrieve sessions by status: Query failed');
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics', async () => {
      const mockStats = {
        total: 20,
        created: 5,
        pending: 3,
        paid: 0,
        processing: 0,
        fulfilled: 0,
        completed: 10,
        expired: 2,
        failed: 0,
        avg_top_up: 1500,
        total_top_up: 30000
      };

      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockStats);
      });

      const result = await service.getSessionStatistics();
      expect(result).toEqual({
        totalSessions: 20,
        sessionsByStatus: {
          'CREATED': 5,
          'PENDING': 3,
          'PAID': 0,
          'PROCESSING': 0,
          'FULFILLED': 0,
          'COMPLETED': 10,
          'EXPIRED': 2,
          'FAILED': 0
        },
        averageTopUpAmount: 1500,
        totalTopUpAmount: 30000,
        expiredSessions: 2
      });
    });

    it('should handle empty database', async () => {
      const mockStats = {
        total: 0,
        created: 0,
        pending: 0,
        paid: 0,
        processing: 0,
        fulfilled: 0,
        completed: 0,
        expired: 0,
        failed: 0,
        avg_top_up: 0,
        total_top_up: 0
      };

      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockStats);
      });

      const result = await service.getSessionStatistics();
      expect(result).toEqual({
        totalSessions: 0,
        sessionsByStatus: {
          'CREATED': 0,
          'PENDING': 0,
          'PAID': 0,
          'PROCESSING': 0,
          'FULFILLED': 0,
          'COMPLETED': 0,
          'EXPIRED': 0,
          'FAILED': 0
        },
        averageTopUpAmount: 0,
        totalTopUpAmount: 0,
        expiredSessions: 0
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Stats failed');
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.getSessionStatistics())
        .rejects.toThrow('Failed to retrieve session statistics: Stats failed');
    });
  });
});
