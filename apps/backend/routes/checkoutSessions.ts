import { Router, Request, Response } from 'express';
import { Database } from 'sqlite3';
import { CheckoutSessionService } from '../services/CheckoutSessionService';
import { ValidationUtils } from '../utils/validation';
import { CheckoutSessionStatus, CreateSessionRequest } from '../types/CheckoutSession';

const router: Router = Router();
// We'll get the database from the server and pass it here
let checkoutSessionService: CheckoutSessionService;

export const setCheckoutSessionService = (service: CheckoutSessionService) => {
  checkoutSessionService = service;
};

export const setDatabase = (database: Database) => {
  // Database is already available globally, this is just for compatibility
};

/**
 * POST /api/checkout-sessions
 * Create a new checkout session
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const sessionData: CreateSessionRequest = req.body;

    // Validate required fields
    if (!sessionData.amazonUrl) {
      return res.status(400).json({
        success: false,
        error: 'amazonUrl is required'
      });
    }

    if (typeof sessionData.cartTotalCents !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'cartTotalCents is required'
      });
    }

    if (typeof sessionData.currentBalanceCents !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'currentBalanceCents is required'
      });
    }

    // Validate the data using our validation utilities
    const validation = ValidationUtils.validateCreateSessionRequest(sessionData);
    if (!validation.isValid) {
      const firstError = validation.errors[0];
      return res.status(400).json({
        success: false,
        error: firstError.message
      });
    }

    // Create the session
    const session = await checkoutSessionService.createSession(sessionData);

    return res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/checkout-sessions/:sessionId
 * Get a specific checkout session by session ID
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const session = await checkoutSessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    return res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/checkout-sessions/:sessionId/status
 * Update the status of a checkout session
 */
router.put('/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status, metadata } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    // Validate status is a valid CheckoutSessionStatus
    const validStatuses: CheckoutSessionStatus[] = [
      'CREATED', 'PENDING', 'PAID', 'PROCESSING', 
      'FULFILLED', 'COMPLETED', 'EXPIRED', 'FAILED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Validate metadata if provided
    if (metadata !== undefined) {
      const metadataValidation = ValidationUtils.validateMetadata(
        typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
      );
      if (!metadataValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: metadataValidation.errors[0].message
        });
      }
    }

    const updatedSession = await checkoutSessionService.updateSessionStatus(
      sessionId,
      status,
      metadata
    );

    return res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error updating checkout session status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/checkout-sessions/:sessionId/status
 * Get just the status of a checkout session
 */
router.get('/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const session = await checkoutSessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    return res.json({
      success: true,
      sessionId: session.sessionId,
      status: session.status,
      updatedAt: session.updatedAt
    });
  } catch (error) {
    console.error('Error retrieving checkout session status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/checkout-sessions
 * Get all checkout sessions (with optional filtering)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, userId, limit, offset, includeExpired } = req.query;

    const options = {
      status: status as CheckoutSessionStatus | undefined,
      userId: userId as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      includeExpired: includeExpired === 'true'
    };

    const sessions = await checkoutSessionService.getAllSessions(options);

    return res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error retrieving checkout sessions:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/checkout-sessions/cleanup
 * Clean up expired checkout sessions
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const cleanedCount = await checkoutSessionService.cleanupExpiredSessions();

    return res.json({
      success: true,
      cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
