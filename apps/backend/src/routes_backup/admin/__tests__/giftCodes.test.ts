import request from 'supertest';
import express from 'express';
import { giftCodeRoutes, setGiftCodeService } from '../giftCodes';
import { GiftCodeStatus } from '../../../types/giftCode';

// Mock the entire service module
jest.mock('../../../services/GiftCodeInventoryService', () => ({
  GiftCodeInventoryService: jest.fn().mockImplementation(() => ({
    addGiftCode: jest.fn(),
    getInventoryStats: jest.fn(),
    getAllGiftCodes: jest.fn(),
    validateGiftCode: jest.fn()
  }))
}));

// Import after mocking
import { GiftCodeInventoryService } from '../../../services/GiftCodeInventoryService';

const app = express();
app.use(express.json());
app.use('/api/admin/gift-codes', giftCodeRoutes);

// Get the mocked service instance and cast to jest.Mocked
const mockGiftCodeService = new GiftCodeInventoryService({} as any) as jest.Mocked<GiftCodeInventoryService>;

// Set the mocked service for testing
setGiftCodeService(mockGiftCodeService);

describe('Admin Gift Code Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock behavior
    mockGiftCodeService.validateGiftCode.mockReturnValue(true);
  });

  describe('POST /api/admin/gift-codes', () => {
    const validGiftCode = {
      code: 'AMAZON-GIFT-CODE-ABC123',
      denomination: 2500,
      expiresAt: '2025-12-31T23:59:59.000Z'
    };

    it('should add a single gift code successfully', async () => {
      const mockResult = {
        id: 1,
        ...validGiftCode,
        status: GiftCodeStatus.AVAILABLE,
        encryptedCode: 'encrypted-code',
        encryptionKey: 'key',
        createdAt: '2024-08-16T00:00:00.000Z',
        metadata: null
      };

      mockGiftCodeService.addGiftCode.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/admin/gift-codes')
        .send(validGiftCode);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        giftCode: mockResult
      });
      // The route adds additional fields, so we need to check the actual call
      expect(mockGiftCodeService.addGiftCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: validGiftCode.code,
          denomination: validGiftCode.denomination,
          expiresAt: validGiftCode.expiresAt,
          status: GiftCodeStatus.AVAILABLE
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidGiftCode = { denomination: 2500 }; // Missing code

      const response = await request(app)
        .post('/api/admin/gift-codes')
        .send(invalidGiftCode)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('code is required');
    });

    it('should validate gift code format', async () => {
      const invalidGiftCode = {
        ...validGiftCode,
        code: 'INVALID-CODE'
      };

      // Mock validateGiftCode to return false for invalid codes
      mockGiftCodeService.validateGiftCode.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/admin/gift-codes')
        .send(invalidGiftCode)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid gift code format');
    });

    it('should handle service errors gracefully', async () => {
      mockGiftCodeService.addGiftCode.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/admin/gift-codes')
        .send(validGiftCode)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('POST /api/admin/gift-codes/bulk', () => {
    const validBulkData = {
      codes: ['AMAZON-GIFT-CODE-ABC123', 'AMAZON-GIFT-CODE-XYZ789'],
      denomination: 2500,
      expiresAt: '2025-12-31T23:59:59.000Z'
    };

    it('should add multiple gift codes successfully', async () => {
      const mockResults = validBulkData.codes.map((code, index) => ({
        id: index + 1,
        code,
        denomination: 2500,
        status: GiftCodeStatus.AVAILABLE,
        encryptedCode: 'encrypted-code',
        encryptionKey: 'key',
        createdAt: '2024-08-16T00:00:00.000Z',
        expiresAt: '2025-12-31T23:59:59.000Z',
        metadata: null
      }));

      mockGiftCodeService.addGiftCode
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const response = await request(app)
        .post('/api/admin/gift-codes/bulk')
        .send(validBulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.giftCodes).toHaveLength(2);
      // Check that addGiftCode was called for each code
      expect(mockGiftCodeService.addGiftCode).toHaveBeenCalledTimes(2);
      expect(mockGiftCodeService.addGiftCode).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({
          code: validBulkData.codes[0],
          denomination: validBulkData.denomination,
          expiresAt: validBulkData.expiresAt
        })
      );
      expect(mockGiftCodeService.addGiftCode).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({
          code: validBulkData.codes[1],
          denomination: validBulkData.denomination,
          expiresAt: validBulkData.expiresAt
        })
      );
    });

    it('should validate bulk input data', async () => {
      const invalidBulkData = {
        codes: [],
        denomination: 2500
      };

      const response = await request(app)
        .post('/api/admin/gift-codes/bulk')
        .send(invalidBulkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('codes array cannot be empty');
    });
  });

  describe('GET /api/admin/gift-codes', () => {
    it('should return all gift codes', async () => {
      const mockCodes = [
        {
          id: 1,
          code: 'AMAZON-GIFT-CODE-ABC123',
          denomination: 2500,
          status: GiftCodeStatus.AVAILABLE,
          encryptedCode: 'encrypted-code',
          encryptionKey: 'key',
          createdAt: '2024-08-16T00:00:00.000Z',
          expiresAt: '2025-12-31T23:59:59.000Z',
          metadata: null
        }
      ];

      mockGiftCodeService.getAllGiftCodes.mockResolvedValue(mockCodes);

      const response = await request(app)
        .get('/api/admin/gift-codes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.giftCodes).toEqual(mockCodes);
    });

    it('should handle service errors gracefully', async () => {
      mockGiftCodeService.getAllGiftCodes.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/gift-codes')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('GET /api/admin/gift-codes/stats', () => {
    it('should return inventory statistics', async () => {
      const mockStats = {
        totalCodes: 100,
        availableCodes: 75,
        allocatedCodes: 20,
        redeemedCodes: 3,
        expiredCodes: 2,
        totalValue: 250000,
        availableValue: 187500,
        denominations: { '500': 20, '1000': 30, '2500': 25 }
      };

      mockGiftCodeService.getInventoryStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/admin/gift-codes/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual(mockStats);
    });
  });
});
