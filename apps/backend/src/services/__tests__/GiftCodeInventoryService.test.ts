import { GiftCodeInventoryService } from '../GiftCodeInventoryService';
import { Database } from 'sqlite3';
import { GiftCode, GiftCodeStatus, AllocationResult, InventoryStats } from '../../types/giftCode';

// Mock database for testing
const mockDb = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  close: jest.fn()
} as unknown as Database;

// Mock encryption utilities
jest.mock('../../utils/encryption', () => ({
  encryptGiftCode: jest.fn(),
  decryptGiftCode: jest.fn(),
  generateEncryptionKey: jest.fn()
}));

import { encryptGiftCode, decryptGiftCode, generateEncryptionKey } from '../../utils/encryption';

describe('GiftCodeInventoryService', () => {
  let service: GiftCodeInventoryService;
  let mockEncryptGiftCode: jest.MockedFunction<typeof encryptGiftCode>;
  let mockDecryptGiftCode: jest.MockedFunction<typeof decryptGiftCode>;
  let mockGenerateKey: jest.MockedFunction<typeof generateEncryptionKey>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock encryption functions
    mockEncryptGiftCode = encryptGiftCode as jest.MockedFunction<typeof encryptGiftCode>;
    mockDecryptGiftCode = decryptGiftCode as jest.MockedFunction<typeof decryptGiftCode>;
    mockGenerateKey = generateEncryptionKey as jest.MockedFunction<typeof generateEncryptionKey>;
    
    // Default successful encryption mocks
    mockEncryptGiftCode.mockResolvedValue('encrypted-code-123');
    mockDecryptGiftCode.mockResolvedValue('AMAZON-GIFT-CODE-ABC123');
    mockGenerateKey.mockResolvedValue('test-encryption-key-32-chars');
    
    service = new GiftCodeInventoryService(mockDb);
  });

  describe('validateGiftCode', () => {
    it('should validate correct Amazon gift code format', () => {
      const validCodes = [
        'AMAZON-GIFT-CODE-ABC123',
        'AMAZON-GIFT-CODE-XYZ789',
        'AMAZON-GIFT-CODE-123456'
      ];

      validCodes.forEach(code => {
        expect(service.validateGiftCode(code)).toBe(true);
      });
    });

    it('should reject invalid gift code formats', () => {
      const invalidCodes = [
        'INVALID-CODE',
        'AMAZON-GIFT-CODE',
        'GIFT-CODE-ABC123',
        'AMAZON-GIFT-CODE-ABC',
        'AMAZON-GIFT-CODE-ABC123456789',
        ''
      ];

      invalidCodes.forEach(code => {
        expect(service.validateGiftCode(code)).toBe(false);
      });
    });

    it('should handle null and undefined inputs', () => {
      expect(service.validateGiftCode(null as any)).toBe(false);
      expect(service.validateGiftCode(undefined as any)).toBe(false);
    });
  });

  describe('addGiftCode', () => {
    const validGiftCode: GiftCode = {
      id: 0,
      code: 'AMAZON-GIFT-CODE-ABC123',
      denomination: 2500, // $25.00
      status: GiftCodeStatus.AVAILABLE,
      encryptedCode: 'encrypted-code-123',
      encryptionKey: 'test-key',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      metadata: { source: 'bulk-purchase' }
    };

    it('should successfully add a new gift code', async () => {
      const mockInsertId = 1;
      
      // Mock that no duplicate exists
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, null);
      });
      
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { lastID: mockInsertId });
      });

      const result = await service.addGiftCode(validGiftCode);

      expect(result).toEqual({
        ...validGiftCode,
        id: mockInsertId
      });
    });

    it('should validate gift code format before adding', async () => {
      const invalidCode = { ...validGiftCode, code: 'INVALID-CODE' };

      await expect(service.addGiftCode(invalidCode))
        .rejects.toThrow('Invalid gift code format');
    });

    it('should prevent duplicate gift codes', async () => {
      // Mock that code already exists
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { id: 1, code: validGiftCode.code });
      });

      await expect(service.addGiftCode(validGiftCode))
        .rejects.toThrow('Gift code already exists');
    });

    it('should handle database errors during insertion', async () => {
      const dbError = new Error('Database connection failed');
      
      // Mock that no duplicate exists
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, null);
      });
      
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(dbError, null);
      });

      await expect(service.addGiftCode(validGiftCode))
        .rejects.toThrow('Failed to add gift code: Database connection failed');
    });
  });

  describe('allocateGiftCodes', () => {
    const availableCodes = [
      { id: 1, denomination: 2500, status: GiftCodeStatus.AVAILABLE }, // $25
      { id: 2, denomination: 1000, status: GiftCodeStatus.AVAILABLE }, // $10
      { id: 3, denomination: 500, status: GiftCodeStatus.AVAILABLE },  // $5
      { id: 4, denomination: 2500, status: GiftCodeStatus.AVAILABLE }  // $25
    ];

    beforeEach(() => {
      // Mock available codes query
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, availableCodes);
      });
    });

    it('should allocate optimal combination for exact amount', async () => {
      const targetAmount = 3500; // $35.00
      
      // Mock successful allocation updates
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.allocateGiftCodes(targetAmount);

      expect(result.success).toBe(true);
      expect(result.allocatedCodes).toHaveLength(2);
      expect(result.totalAllocated).toBe(3500);
      expect(result.remainingAmount).toBe(0);
    });

    it('should prioritize larger denominations to minimize waste', async () => {
      const targetAmount = 3000; // $30.00
      
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.allocateGiftCodes(targetAmount);

      expect(result.success).toBe(true);
      // Should use $25 + $5 instead of $10 + $10 + $10
      expect(result.allocatedCodes).toHaveLength(2);
      expect(result.totalAllocated).toBe(3000);
    });

    it('should fail gracefully when insufficient codes available', async () => {
      const targetAmount = 10000; // $100.00
      
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.allocateGiftCodes(targetAmount);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient gift codes available');
      expect(result.totalAllocated).toBe(6500); // $25 + $10 + $5 + $25
    });

    it('should handle concurrent allocation attempts', async () => {
      const targetAmount = 2500; // $25.00
      
      // Mock database to simulate concurrent allocation scenario
      let allocationCount = 0;
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        allocationCount++;
        // First allocation succeeds, all subsequent allocations fail (codes already allocated)
        if (allocationCount <= 1) {
          callback(null, { changes: 1 });
        } else {
          callback(null, { changes: 0 });
        }
      });

      const result1 = await service.allocateGiftCodes(targetAmount);
      const result2 = await service.allocateGiftCodes(targetAmount);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Insufficient gift codes available');
    });

    it('should handle database errors during allocation', async () => {
      const targetAmount = 2500;
      
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(new Error('Allocation failed'), null);
      });

      await expect(service.allocateGiftCodes(targetAmount))
        .rejects.toThrow('Failed to allocate gift codes: Failed to allocate code: Allocation failed');
    });
  });

  describe('redeemGiftCode', () => {
    const mockGiftCode = {
      id: 1,
      code: 'AMAZON-GIFT-CODE-ABC123',
      denomination: 2500,
      status: GiftCodeStatus.ALLOCATED,
      encrypted_code: 'encrypted-code-123',
      encryption_key: 'test-key',
      created_at: '2024-01-01T00:00:00.000Z',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day in future
      metadata: JSON.stringify({ orderId: 'order-123' })
    };

    it('should successfully redeem an allocated gift code', async () => {
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockGiftCode);
      });

      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.redeemGiftCode(1, 'order-123');

      expect(result.success).toBe(true);
      expect(result.redeemedCode).toMatchObject({
        id: 1,
        code: 'AMAZON-GIFT-CODE-ABC123',
        denomination: 2500,
        status: GiftCodeStatus.REDEEMED,
        encryptedCode: 'encrypted-code-123',
        encryptionKey: 'test-key',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: mockGiftCode.expires_at,
        metadata: { orderId: 'order-123' }
      });
      // Check that redeemedAt was added
      expect(result.redeemedCode.metadata).toHaveProperty('redeemedAt');
    });

    it('should reject redemption of non-allocated codes', async () => {
      const unallocatedCode = { ...mockGiftCode, status: GiftCodeStatus.AVAILABLE };
      
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, unallocatedCode);
      });

      await expect(service.redeemGiftCode(1, 'order-123'))
        .rejects.toThrow('Cannot redeem gift code: Invalid status AVAILABLE');
    });

    it('should reject redemption of expired codes', async () => {
      const expiredCode = { 
        ...mockGiftCode, 
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      };
      
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, expiredCode);
      });

      await expect(service.redeemGiftCode(1, 'order-123'))
        .rejects.toThrow('Cannot redeem gift code: Code expired');
    });

    it('should handle decryption failures during redemption', async () => {
      mockDecryptGiftCode.mockRejectedValue(new Error('Decryption failed'));
      
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockGiftCode);
      });

      await expect(service.redeemGiftCode(1, 'order-123'))
        .rejects.toThrow('Decryption failed');
    });
  });

  describe('getInventoryStats', () => {
    it('should return comprehensive inventory statistics', async () => {
      const mockStats = {
        total: 100,
        available: 75,
        allocated: 20,
        redeemed: 3,
        expired: 2,
        total_value: 250000, // $2,500.00
        available_value: 187500 // $1,875.00
      };

      const mockDenominations = [
        { denomination: 500, count: 20 },
        { denomination: 1000, count: 30 },
        { denomination: 2500, count: 25 }
      ];

      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockStats);
      });

      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockDenominations);
      });

      const result = await service.getInventoryStats();

      expect(result).toEqual({
        totalCodes: 100,
        availableCodes: 75,
        allocatedCodes: 20,
        redeemedCodes: 3,
        expiredCodes: 2,
        totalValue: 250000,
        availableValue: 187500,
        denominations: { '500': 20, '1000': 30, '2500': 25 }
      });
    });

    it('should handle empty inventory gracefully', async () => {
      const mockStats = {
        total: 0,
        available: 0,
        allocated: 0,
        redeemed: 0,
        expired: 0,
        total_value: 0,
        available_value: 0
      };

      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockStats);
      });

      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, []);
      });

      const result = await service.getInventoryStats();

      expect(result.totalCodes).toBe(0);
      expect(result.availableValue).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(new Error('Stats query failed'), null);
      });

      await expect(service.getInventoryStats())
        .rejects.toThrow('Failed to get inventory stats: Stats query failed');
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should cleanup expired gift codes', async () => {
      const expiredCodes = [
        { id: 1, denomination: 1000 },
        { id: 2, denomination: 2500 }
      ];

      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, expiredCodes);
      });

      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 2 });
      });

      const result = await service.cleanupExpiredCodes();

      expect(result).toBe(2);
    });

    it('should handle no expired codes gracefully', async () => {
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, []);
      });

      const result = await service.cleanupExpiredCodes();

      expect(result).toBe(0);
    });

    it('should handle database errors during cleanup', async () => {
      (mockDb.all as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(new Error('Cleanup failed'), null);
      });

      await expect(service.cleanupExpiredCodes())
        .rejects.toThrow('Failed to cleanup expired codes: Failed to get expired codes: Cleanup failed');
    });
  });

  describe('getGiftCodeById', () => {
    it('should retrieve gift code by ID', async () => {
      const mockCode = {
        id: 1,
        code: 'AMAZON-GIFT-CODE-ABC123',
        denomination: 2500,
        status: GiftCodeStatus.AVAILABLE,
        encrypted_code: 'encrypted-code-123',
        encryption_key: 'test-key',
        created_at: '2024-01-01T00:00:00.000Z',
        expires_at: '2025-01-01T00:00:00.000Z',
        metadata: JSON.stringify({ source: 'bulk-purchase' })
      };

      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, mockCode);
      });

      const result = await service.getGiftCodeById(1);

      expect(result).toEqual({
        id: 1,
        code: 'AMAZON-GIFT-CODE-ABC123',
        denomination: 2500,
        status: GiftCodeStatus.AVAILABLE,
        encryptedCode: 'encrypted-code-123',
        encryptionKey: 'test-key',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2025-01-01T00:00:00.000Z',
        metadata: { source: 'bulk-purchase' }
      });
    });

    it('should return null for non-existent gift code', async () => {
      (mockDb.get as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, null);
      });

      const result = await service.getGiftCodeById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateGiftCodeStatus', () => {
    it('should successfully update gift code status', async () => {
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 1 });
      });

      const result = await service.updateGiftCodeStatus(1, GiftCodeStatus.ALLOCATED);

      expect(result).toBe(true);
    });

    it('should handle non-existent gift codes', async () => {
      (mockDb.run as jest.Mock).mockImplementation((sql: string, params: any, callback: any) => {
        callback(null, { changes: 0 });
      });

      await expect(service.updateGiftCodeStatus(999, GiftCodeStatus.ALLOCATED))
        .rejects.toThrow('Gift code not found or no changes made');
    });
  });
});
