import { Router } from 'express';
import { GiftCodeInventoryService } from '../../services/GiftCodeInventoryService';
import { GiftCode, GiftCodeStatus } from '../../types/giftCode';

const router = Router();

// Initialize service (will be set by server)
let giftCodeService: GiftCodeInventoryService;

export const setGiftCodeService = (service: GiftCodeInventoryService) => {
  giftCodeService = service;
};

// Validation middleware
const validateGiftCode = (req: any, res: any, next: any) => {
  const { code, denomination, expiresAt } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'code is required'
    });
  }

  if (!denomination) {
    return res.status(400).json({
      success: false,
      error: 'denomination is required'
    });
  }

  if (denomination <= 0) {
    return res.status(400).json({
      success: false,
      error: 'denomination must be a positive number'
    });
  }

  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return res.status(400).json({
      success: false,
      error: 'expiresAt must be in the future'
    });
  }

  next();
};

const validateBulkGiftCodes = (req: any, res: any, next: any) => {
  const { codes, denomination, expiresAt } = req.body;

  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'codes array is required and must not be empty'
    });
  }

  if (!denomination || denomination <= 0) {
    return res.status(400).json({
      success: false,
      error: 'denomination is required and must be a positive number'
    });
  }

  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return res.status(400).json({
      success: false,
      error: 'expiresAt must be in the future'
    });
  }

  // Validate all gift code formats
  for (const code of codes) {
    if (!giftCodeService.validateGiftCode(code)) {
      return res.status(400).json({
        success: false,
        error: `Invalid gift code format: ${code}`
      });
    }
  }

  next();
};

// POST /api/admin/gift-codes - Add single gift code
router.post('/', validateGiftCode, async (req, res) => {
  try {
    const { code, denomination, expiresAt } = req.body;

    // Validate gift code format
    if (!giftCodeService.validateGiftCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gift code format'
      });
    }

    const giftCode: GiftCode = {
      code,
      denomination,
      status: GiftCodeStatus.AVAILABLE,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Default 1 year
      metadata: {}
    };

    const result = await giftCodeService.addGiftCode(giftCode);

    res.status(201).json({
      success: true,
      message: 'Gift code added successfully',
      giftCode: result
    });

  } catch (error) {
    console.error('Error adding gift code:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Gift code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/admin/gift-codes/bulk - Add multiple gift codes
router.post('/bulk', validateBulkGiftCodes, async (req, res) => {
  try {
    const { codes, denomination, expiresAt } = req.body;

    const giftCodes: GiftCode[] = codes.map((code: string) => ({
      code,
      denomination,
      status: GiftCodeStatus.AVAILABLE,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {}
    }));

    const results = [];
    const errors = [];

    for (const giftCode of giftCodes) {
      try {
        const result = await giftCodeService.addGiftCode(giftCode);
        results.push(result);
      } catch (error) {
        errors.push({
          code: giftCode.code,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: 'Some gift codes were added successfully',
        giftCodes: results,
        errors: errors
      });
    }

    res.status(201).json({
      success: true,
      message: 'All gift codes added successfully',
      giftCodes: results
    });

  } catch (error) {
    console.error('Error adding bulk gift codes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin/gift-codes - List all gift codes
router.get('/', async (req, res) => {
  try {
    const giftCodes = await giftCodeService.getAllGiftCodes();

    res.json({
      success: true,
      giftCodes: giftCodes
    });

  } catch (error) {
    console.error('Error retrieving gift codes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin/gift-codes/stats - Get inventory statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await giftCodeService.getInventoryStats();

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error retrieving inventory stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/admin/gift-codes/:id/status - Update gift code status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    // Validate status value
    const validStatuses = ['AVAILABLE', 'ALLOCATED', 'REDEEMED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const success = await giftCodeService.updateGiftCodeStatus(parseInt(id), status as any);

    if (success) {
      res.json({
        success: true,
        message: 'Gift code status updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update gift code status'
      });
    }

  } catch (error) {
    console.error('Error updating gift code status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as giftCodeRoutes };
