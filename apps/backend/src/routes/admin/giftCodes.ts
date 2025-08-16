import { Router } from 'express';
import { GiftCodeInventoryService } from '../../services/GiftCodeInventoryService';
import { Database } from 'sqlite3';
import { GiftCode, GiftCodeStatus } from '../../types/giftCode';

const router = Router();

// Initialize service (can be overridden for testing)
let giftCodeService: GiftCodeInventoryService;

// Function to set service (for testing)
export const setGiftCodeService = (service: GiftCodeInventoryService) => {
  giftCodeService = service;
};

// Default service initialization - will be set by the server
giftCodeService = null as any;

// Validation middleware
const validateGiftCode = (req: any, res: any, next: any) => {
  const { code, denomination, expiresAt } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'code is required'
    });
  }

  if (!denomination || typeof denomination !== 'number' || denomination <= 0) {
    return res.status(400).json({
      success: false,
      error: 'denomination must be a positive number'
    });
  }

  if (!expiresAt) {
    return res.status(400).json({
      success: false,
      error: 'expiresAt is required'
    });
  }

  // Validate gift code format
  if (!giftCodeService.validateGiftCode(code)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid gift code format'
    });
  }

  next();
};

const validateBulkGiftCodes = (req: any, res: any, next: any) => {
  const { codes, denomination, expiresAt } = req.body;

  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'codes array cannot be empty'
    });
  }

  if (!denomination || typeof denomination !== 'number' || denomination <= 0) {
    return res.status(400).json({
      success: false,
      error: 'denomination must be a positive number'
    });
  }

  if (!expiresAt) {
    return res.status(400).json({
      success: false,
      error: 'expiresAt is required'
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

    const giftCode: GiftCode = {
      id: 0,
      code,
      denomination,
      status: GiftCodeStatus.AVAILABLE,
      encryptedCode: '',
      encryptionKey: '',
      createdAt: new Date().toISOString(),
      expiresAt,
      metadata: { source: 'admin-import' }
    };

    const result = await giftCodeService.addGiftCode(giftCode);

    res.status(201).json({
      success: true,
      giftCode: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/gift-codes/bulk - Add multiple gift codes
router.post('/bulk', validateBulkGiftCodes, async (req, res) => {
  try {
    const { codes, denomination, expiresAt } = req.body;

    const giftCodes: GiftCode[] = codes.map((code: string) => ({
      id: 0,
      code,
      denomination,
      status: GiftCodeStatus.AVAILABLE,
      encryptedCode: '',
      encryptionKey: '',
      createdAt: new Date().toISOString(),
      expiresAt,
      metadata: { source: 'admin-bulk-import' }
    }));

    const results = [];
    for (const giftCode of giftCodes) {
      const result = await giftCodeService.addGiftCode(giftCode);
      results.push(result);
    }

    res.status(201).json({
      success: true,
      giftCodes: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/gift-codes - List all gift codes
router.get('/', async (req, res) => {
  try {
    // For now, we'll need to add a method to get all codes
    // This is a placeholder - you can implement getAllGiftCodes in the service
    res.status(200).json({
      success: true,
      giftCodes: await giftCodeService.getAllGiftCodes(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/gift-codes/stats - Get inventory statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await giftCodeService.getInventoryStats();

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as giftCodeRoutes };
