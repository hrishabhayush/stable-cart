import { Router } from 'express';
import { CheckoutSessionService } from '../services/CheckoutSessionService';
import { GiftCodeInventoryService } from '../services/GiftCodeInventoryService';

const router = Router();

// Initialize services (will be set by server)
let checkoutSessionService: CheckoutSessionService;
let giftCodeService: GiftCodeInventoryService;

export const setWebhookServices = (checkoutService: CheckoutSessionService, giftService: GiftCodeInventoryService) => {
  checkoutSessionService = checkoutService;
  giftCodeService = giftService;
};

// Payment confirmation webhook
router.post('/payment-confirmed', async (req, res) => {
  try {
    const { sessionId, transactionHash, amount, status } = req.body;

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    if (!transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'transactionHash is required'
      });
    }

    // Get the checkout session
    const checkoutSession = await checkoutSessionService.getSession(sessionId);
    
    if (!checkoutSession) {
      return res.status(404).json({
        success: false,
        error: 'Checkout session not found'
      });
    }

    // Only update status if it's not already PAID
    if (checkoutSession.status !== 'PAID') {
      // Update session status to PENDING first, then to PAID
      const pendingUpdated = await checkoutSessionService.updateStatus(
        sessionId, 
        'PENDING' as any
      );

      if (!pendingUpdated) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update checkout session status to PENDING'
        });
      }

      // Now update to PAID
      const statusUpdated = await checkoutSessionService.updateStatus(
        sessionId, 
        'PAID' as any
      );

      if (!statusUpdated) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update checkout session status to PAID'
        });
      }
    }

    // Allocate gift codes for the top-up amount
    const allocationResult = await giftCodeService.allocateGiftCodes(
      checkoutSession.topUpAmountCents
    );

    if (!allocationResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to allocate gift codes: ${allocationResult.error}`
      });
    }

    // Return success with allocation details
    res.json({
      success: true,
      message: 'Payment confirmed and gift cards allocated successfully',
      sessionId: sessionId,
      allocatedAmount: allocationResult.totalAllocated,
      remainingAmount: allocationResult.remainingAmount || 0,
      allocatedCodes: allocationResult.allocatedCodes
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as webhookRoutes };
