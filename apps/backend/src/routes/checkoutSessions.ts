import { Router } from 'express';
import { CheckoutSessionService } from '../services/CheckoutSessionService';
import { Database } from 'sqlite3';

const router = Router();

// Initialize service with database (will be set by server)
let checkoutSessionService: CheckoutSessionService;

export const setCheckoutSessionService = (service: CheckoutSessionService) => {
  checkoutSessionService = service;
};

// Create a new checkout session
router.post('/', async (req, res) => {
  try {
    const { amazonUrl, cartTotalCents, currentBalanceCents } = req.body;

    // Validate required fields
    if (!amazonUrl) {
      return res.status(400).json({
        success: false,
        error: 'amazonUrl is required'
      });
    }

    if (!cartTotalCents) {
      return res.status(400).json({
        success: false,
        error: 'cartTotalCents is required'
      });
    }

    if (cartTotalCents <= 0) {
      return res.status(400).json({
        success: false,
        error: 'cartTotalCents must be a positive number'
      });
    }

    // Create the checkout session
    const session = await checkoutSessionService.createSession({
      amazonUrl,
      cartTotalCents,
      currentBalanceCents: currentBalanceCents || 0,
      userId: undefined // Optional for now
    });

    res.status(201).json({
      success: true,
      session: session
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get checkout session by sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await checkoutSessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Checkout session not found'
      });
    }

    res.json({
      success: true,
      session: session
    });

  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update checkout session status
router.put('/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    // Validate status values
    const validStatuses = ['CREATED', 'PAID', 'FULFILLED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update the status
    const updated = await checkoutSessionService.updateStatus(sessionId, status as any);

    if (!updated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update checkout session status'
      });
    }

    res.json({
      success: true,
      message: 'Checkout session status updated successfully'
    });

  } catch (error) {
    console.error('Error updating checkout session status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all checkout sessions
router.get('/', async (req, res) => {
  try {
    // For now, get sessions by status 'CREATED' to show active sessions
    const sessions = await checkoutSessionService.getSessionsByStatus('CREATED' as any);

    res.json({
      success: true,
      sessions: sessions
    });

  } catch (error) {
    console.error('Error retrieving checkout sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as checkoutSessionRoutes };
