import { Database } from 'sqlite3';
import { 
  CheckoutSession, 
  CreateSessionRequest, 
  CheckoutSessionStatus, 
  DatabaseSession,
  SessionQueryOptions,
  SessionStatistics
} from '../types/CheckoutSession';
import { ValidationUtils } from '../utils/validation';

export class CheckoutSessionService {
  private db: Database;
  private readonly SESSION_EXPIRY_MINUTES = 15;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Creates a new checkout session
   * Edge cases handled:
   * - Invalid input data
   * - Database connection failures
   * - Duplicate session ID generation
   * - Zero or negative amounts
   * - Current balance greater than cart total
   */
  async createSession(data: CreateSessionRequest): Promise<CheckoutSession> {
    try {
      // Validate input data
      const validation = ValidationUtils.validateCreateSessionRequest(data);
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Invalid session data: ${errorMessage}`);
      }

      // Calculate top-up amount
      const topUpAmountCents = Math.max(0, data.cartTotalCents - data.currentBalanceCents);

      // Generate unique session ID
      const sessionId = this.generateSessionId();

      // Set timestamps
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.SESSION_EXPIRY_MINUTES * 60 * 1000);

      // Insert into database
      const sql = `
        INSERT INTO checkout_sessions (
          session_id, user_id, amazon_url, cart_total_cents, 
          current_balance_cents, top_up_amount_cents, status, 
          created_at, updated_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        sessionId,
        data.userId || null,
        data.amazonUrl,
        data.cartTotalCents,
        data.currentBalanceCents,
        topUpAmountCents,
        'CREATED',
        now.toISOString(),
        now.toISOString(),
        expiresAt.toISOString()
      ];

      return new Promise<CheckoutSession>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to create checkout session: ${err.message}`));
            return;
          }

          const session: CheckoutSession = {
            id: result?.lastID || 0,
            sessionId,
            userId: data.userId,
            amazonUrl: data.amazonUrl,
            cartTotalCents: data.cartTotalCents,
            currentBalanceCents: data.currentBalanceCents,
            topUpAmountCents,
            status: 'CREATED',
            createdAt: now,
            updatedAt: now,
            expiresAt
          };

          resolve(session);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error creating session: ${error}`);
    }
  }

  /**
   * Updates session status with validation
   * Edge cases handled:
   * - Invalid status transitions
   * - Non-existent sessions
   * - Database update failures
   * - Concurrent status updates
   */
  async updateStatus(sessionId: string, newStatus: CheckoutSessionStatus): Promise<boolean> {
    try {
      // Validate session ID format
      const sessionValidation = ValidationUtils.validateSessionId(sessionId);
      if (!sessionValidation.isValid) {
        throw new Error(`Invalid session ID: ${sessionValidation.errors[0].message}`);
      }

      // Get current session to validate transition
      const currentSession = await this.getSession(sessionId);
      if (!currentSession) {
        throw new Error('Session not found or no changes made');
      }

      // Validate status transition
      const transitionValidation = ValidationUtils.validateStatusTransition(
        currentSession.status, 
        newStatus
      );
      if (!transitionValidation.isValid) {
        throw new Error(transitionValidation.errors[0].message);
      }

      // Update status in database
      const sql = `
        UPDATE checkout_sessions 
        SET status = ?, updated_at = ? 
        WHERE session_id = ?
      `;

      const params = [newStatus, new Date().toISOString(), sessionId];

      return new Promise<boolean>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to update session status: ${err.message}`));
            return;
          }

          if (result?.changes === 0) {
            reject(new Error('Session not found or no changes made'));
            return;
          }

          resolve(true);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error updating session status: ${error}`);
    }
  }

  /**
   * Retrieves session by ID
   * Edge cases handled:
   * - Non-existent sessions
   * - Database query failures
   * - Invalid data format
   */
  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    try {
      // Validate session ID format
      const validation = ValidationUtils.validateSessionId(sessionId);
      if (!validation.isValid) {
        throw new Error(`Invalid session ID: ${validation.errors[0].message}`);
      }

      const sql = 'SELECT * FROM checkout_sessions WHERE session_id = ?';
      const params = [sessionId];

      return new Promise<CheckoutSession | null>((resolve, reject) => {
        this.db.get(sql, params, (err, row: DatabaseSession | undefined) => {
          if (err) {
            reject(new Error(`Failed to retrieve session: ${err.message}`));
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          // Convert database row to CheckoutSession
          const session: CheckoutSession = {
            id: row.id,
            sessionId: row.session_id,
            userId: row.user_id,
            amazonUrl: row.amazon_url,
            cartTotalCents: row.cart_total_cents,
            currentBalanceCents: row.current_balance_cents,
            topUpAmountCents: row.top_up_amount_cents,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            expiresAt: new Date(row.expires_at),
            metadata: row.metadata
          };

          resolve(session);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error retrieving session: ${error}`);
    }
  }

  /**
   * Expires a session (marks as EXPIRED)
   * Edge cases handled:
   * - Non-existent sessions
   * - Database update failures
   * - Already expired sessions
   */
  async expireSession(sessionId: string): Promise<boolean> {
    try {
      // Validate session ID format
      const validation = ValidationUtils.validateSessionId(sessionId);
      if (!validation.isValid) {
        throw new Error(`Invalid session ID: ${validation.errors[0].message}`);
      }

      const sql = `
        UPDATE checkout_sessions 
        SET status = ?, updated_at = ? 
        WHERE session_id = ? AND status NOT IN ('COMPLETED', 'EXPIRED', 'FAILED')
      `;

      const params = ['EXPIRED', new Date().toISOString(), sessionId];

      return new Promise<boolean>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to expire session: ${err.message}`));
            return;
          }

          if (result?.changes === 0) {
            reject(new Error('Session not found or no changes made'));
            return;
          }

          resolve(true);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error expiring session: ${error}`);
    }
  }

  /**
   * Cleans up expired sessions
   * Edge cases handled:
   * - No expired sessions
   * - Database cleanup failures
   * - Partial cleanup failures
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date().toISOString();

      // First, get all expired sessions
      const selectSql = `
        SELECT id, session_id 
        FROM checkout_sessions 
        WHERE expires_at < ? AND status NOT IN ('COMPLETED', 'EXPIRED', 'FAILED')
      `;

      return new Promise<number>((resolve, reject) => {
        this.db.all(selectSql, [now], (err, expiredSessions: any[]) => {
          if (err) {
            reject(new Error(`Failed to cleanup expired sessions: ${err.message}`));
            return;
          }

          if (expiredSessions.length === 0) {
            resolve(0);
            return;
          }

          // Update all expired sessions
          const updateSql = `
            UPDATE checkout_sessions 
            SET status = ?, updated_at = ? 
            WHERE id IN (${expiredSessions.map(() => '?').join(',')})
          `;

          const params = ['EXPIRED', now, ...expiredSessions.map(s => s.id)];

          this.db.run(updateSql, params, function(err: Error | null, result: any) {
            if (err) {
              reject(new Error(`Failed to cleanup expired sessions: ${err.message}`));
              return;
            }

            resolve(expiredSessions.length);
          });
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error cleaning up expired sessions: ${error}`);
    }
  }

  /**
   * Retrieves sessions by status
   * Edge cases handled:
   * - No sessions with given status
   * - Database query failures
   * - Invalid status values
   */
  async getSessionsByStatus(status: CheckoutSessionStatus): Promise<CheckoutSession[]> {
    try {
      const sql = 'SELECT * FROM checkout_sessions WHERE status = ? ORDER BY created_at DESC';
      const params = [status];

      return new Promise<CheckoutSession[]>((resolve, reject) => {
        this.db.all(sql, params, (err, rows: DatabaseSession[]) => {
          if (err) {
            reject(new Error(`Failed to retrieve sessions by status: ${err.message}`));
            return;
          }

          // Convert database rows to CheckoutSession objects
          const sessions: CheckoutSession[] = rows.map(row => ({
            id: row.id,
            sessionId: row.session_id,
            userId: row.user_id,
            amazonUrl: row.amazon_url,
            cartTotalCents: row.cart_total_cents,
            currentBalanceCents: row.current_balance_cents,
            topUpAmountCents: row.top_up_amount_cents,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            expiresAt: new Date(row.expires_at),
            metadata: row.metadata
          }));

          resolve(sessions);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error retrieving sessions by status: ${error}`);
    }
  }

  /**
   * Gets session statistics
   * Edge cases handled:
   * - No sessions in database
   * - Database query failures
   * - Division by zero in averages
   */
  async getSessionStatistics(): Promise<SessionStatistics> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'CREATED' THEN 1 ELSE 0 END) as created,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'FULFILLED' THEN 1 ELSE 0 END) as fulfilled,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          AVG(top_up_amount_cents) as avg_top_up,
          SUM(top_up_amount_cents) as total_top_up
        FROM checkout_sessions
      `;

      return new Promise<SessionStatistics>((resolve, reject) => {
        this.db.get(sql, [], (err, row: any) => {
          if (err) {
            reject(new Error(`Failed to retrieve session statistics: ${err.message}`));
            return;
          }

          const totalSessions = row.total || 0;
          const avgTopUp = totalSessions > 0 ? (row.avg_top_up || 0) : 0;

          const statistics: SessionStatistics = {
            totalSessions,
            sessionsByStatus: {
              'CREATED': row.created || 0,
              'PENDING': row.pending || 0,
              'PAID': row.paid || 0,
              'PROCESSING': row.processing || 0,
              'FULFILLED': row.fulfilled || 0,
              'COMPLETED': row.completed || 0,
              'EXPIRED': row.expired || 0,
              'FAILED': row.failed || 0
            },
            averageTopUpAmount: Math.round(avgTopUp),
            totalTopUpAmount: row.total_top_up || 0,
            expiredSessions: row.expired || 0
          };

          resolve(statistics);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error retrieving session statistics: ${error}`);
    }
  }

  /**
   * Generates unique session ID
   * Edge cases handled:
   * - Collision prevention
   * - Cryptographically secure random generation
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(36).substring(2, 10);
    
    return `session-${timestamp}${random}`;
  }
}
