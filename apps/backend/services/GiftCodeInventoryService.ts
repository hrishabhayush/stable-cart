import { Database } from 'sqlite3';
import { GiftCode, GiftCodeStatus, AllocationResult, InventoryStats, RedemptionResult } from '../types/giftCode';
import { encryptGiftCode, decryptGiftCode, generateEncryptionKey } from '../utils/encryption';

export class GiftCodeInventoryService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Validates gift code format
   * @param code - Gift code to validate
   * @returns boolean - True if valid
   */
  validateGiftCode(code: string | null | undefined): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Amazon gift code format: AMAZON-GIFT-CODE-XXXXXX
    const giftCodeRegex = /^AMAZON-GIFT-CODE-[A-Z0-9]{6}$/;
    return giftCodeRegex.test(code);
  }

  /**
   * Adds a new gift code to the inventory
   * @param giftCode - The gift code to add
   * @returns Promise<GiftCode> - The added gift code with ID
   */
  async addGiftCode(giftCode: GiftCode): Promise<GiftCode> {
    try {
      // Validate gift code format
      if (!this.validateGiftCode(giftCode.code)) {
        throw new Error('Invalid gift code format');
      }

      // Check for duplicates
      const existingCode = await this.getGiftCodeByCode(giftCode.code);
      if (existingCode) {
        throw new Error('Gift code already exists');
      }

      // Encrypt the gift code if not already encrypted
      let encryptedCode = giftCode.encryptedCode;
      let encryptionKey = giftCode.encryptionKey;

      if (!encryptedCode || !encryptionKey) {
        encryptionKey = await generateEncryptionKey();
        encryptedCode = await encryptGiftCode(giftCode.code, encryptionKey);
      }

      const sql = `
        INSERT INTO gift_code_inventory (
          code, denomination, status, encrypted_code, encryption_key, 
          created_at, expires_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        giftCode.code,
        giftCode.denomination,
        giftCode.status,
        encryptedCode,
        encryptionKey,
        giftCode.createdAt,
        giftCode.expiresAt,
        JSON.stringify(giftCode.metadata || {})
      ];

      return new Promise<GiftCode>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to add gift code: ${err.message}`));
            return;
          }

          const newGiftCode: GiftCode = {
            ...giftCode,
            id: result?.lastID || 0,
            encryptedCode,
            encryptionKey
          };

          resolve(newGiftCode);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to add gift code: ${error}`);
    }
  }

  /**
   * Allocates gift codes for a target amount
   * @param targetAmount - Target amount in cents
   * @returns Promise<AllocationResult> - Allocation result
   */
  async allocateGiftCodes(targetAmount: number): Promise<AllocationResult> {
    try {
      // Get available codes sorted by denomination (largest first)
      const availableCodes = await this.getAvailableCodes();
      
      if (availableCodes.length === 0) {
        return {
          success: false,
          allocatedCodes: [],
          totalAllocated: 0,
          remainingAmount: targetAmount,
          error: 'No gift codes available'
        };
      }

      // Sort by denomination (largest first) to minimize waste
      availableCodes.sort((a, b) => b.denomination - a.denomination);

      const allocatedCodes: GiftCode[] = [];
      let remainingAmount = targetAmount;
      let totalAllocated = 0;

      // Try to allocate codes to reach target amount
      for (const code of availableCodes) {
        if (remainingAmount <= 0) break;
        
        if (code.denomination <= remainingAmount) {
          // Try to allocate this code
          const success = await this.allocateCode(code.id);
          if (success) {
            allocatedCodes.push(code);
            totalAllocated += code.denomination;
            remainingAmount -= code.denomination;
          }
        }
      }

      // Check if we have sufficient allocation
      if (totalAllocated < targetAmount && availableCodes.length > 0) {
        return {
          success: false,
          allocatedCodes,
          totalAllocated,
          remainingAmount: targetAmount - totalAllocated,
          error: 'Insufficient gift codes available'
        };
      }

      return {
        success: true,
        allocatedCodes,
        totalAllocated,
        remainingAmount: Math.max(0, remainingAmount)
      };
    } catch (error) {
      throw new Error(`Failed to allocate gift codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Redeems a gift code for an order
   * @param giftCodeId - ID of the gift code to redeem
   * @param orderId - ID of the order
   * @returns Promise<RedemptionResult> - Redemption result
   */
  async redeemGiftCode(giftCodeId: number, orderId: string): Promise<RedemptionResult> {
    try {
      const giftCode = await this.getGiftCodeById(giftCodeId);
      
      if (!giftCode) {
        throw new Error('Gift code not found');
      }

      // Validate status
      if (giftCode.status !== GiftCodeStatus.ALLOCATED) {
        throw new Error(`Cannot redeem gift code: Invalid status ${giftCode.status}`);
      }

      // Check expiration
      if (new Date(giftCode.expiresAt) < new Date()) {
        throw new Error('Cannot redeem gift code: Code expired');
      }

      // Decrypt the gift code
      const decryptedCode = await decryptGiftCode(giftCode.encryptedCode, giftCode.encryptionKey);

      // Update status to REDEEMED
      const success = await this.updateGiftCodeStatus(giftCodeId, GiftCodeStatus.REDEEMED);
      if (!success) {
        throw new Error('Failed to update gift code status');
      }

      // Update metadata with order ID
      const metadata = { ...giftCode.metadata, orderId, redeemedAt: new Date().toISOString() };
      await this.updateGiftCodeMetadata(giftCodeId, metadata);

      const redeemedCode: GiftCode = {
        ...giftCode,
        status: GiftCodeStatus.REDEEMED,
        metadata
      };

      return {
        success: true,
        redeemedCode
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to redeem gift code: ${error}`);
    }
  }

  /**
   * Gets inventory statistics
   * @returns Promise<InventoryStats> - Inventory statistics
   */
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'ALLOCATED' THEN 1 ELSE 0 END) as allocated,
          SUM(CASE WHEN status = 'REDEEMED' THEN 1 ELSE 0 END) as redeemed,
          SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
          SUM(denomination) as total_value,
          SUM(CASE WHEN status = 'AVAILABLE' THEN denomination ELSE 0 END) as available_value
        FROM gift_code_inventory
      `;

      return new Promise<InventoryStats>((resolve, reject) => {
        this.db.get(sql, [], async (err: Error | null, row: any) => {
          if (err) {
            reject(new Error(`Failed to get inventory stats: ${err.message}`));
            return;
          }

          if (!row) {
            resolve({
              totalCodes: 0,
              availableCodes: 0,
              allocatedCodes: 0,
              redeemedCodes: 0,
              expiredCodes: 0,
              totalValue: 0,
              availableValue: 0,
              denominations: {}
            });
            return;
          }

          // Get denomination breakdown separately
          const denominationSql = `
            SELECT denomination, COUNT(*) as count
            FROM gift_code_inventory
            GROUP BY denomination
            ORDER BY denomination
          `;

          try {
            const denominations = await new Promise<Record<string, number>>((resolveDenom, rejectDenom) => {
              this.db.all(denominationSql, [], (denomErr: Error | null, denomRows: any[]) => {
                if (denomErr) {
                  rejectDenom(denomErr);
                  return;
                }

                const denomMap: Record<string, number> = {};
                denomRows.forEach(denomRow => {
                  denomMap[denomRow.denomination.toString()] = denomRow.count;
                });
                resolveDenom(denomMap);
              });
            });

            resolve({
              totalCodes: row.total || 0,
              availableCodes: row.available || 0,
              allocatedCodes: row.allocated || 0,
              redeemedCodes: row.redeemed || 0,
              expiredCodes: row.expired || 0,
              totalValue: row.total_value || 0,
              availableValue: row.available_value || 0,
              denominations
            });
          } catch (denomError) {
            // If denomination query fails, return stats without denominations
            resolve({
              totalCodes: row.total || 0,
              availableCodes: row.available || 0,
              allocatedCodes: row.allocated || 0,
              redeemedCodes: row.redeemed || 0,
              expiredCodes: row.expired || 0,
              totalValue: row.total_value || 0,
              availableValue: row.available_value || 0,
              denominations: {}
            });
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to get inventory stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleans up expired gift codes
   * @returns Promise<number> - Number of codes cleaned up
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      // Get expired codes
      const expiredCodes = await this.getExpiredCodes();
      
      if (expiredCodes.length === 0) {
        return 0;
      }

      // Update status to EXPIRED
      const sql = `
        UPDATE gift_code_inventory 
        SET status = ?, updated_at = ? 
        WHERE id IN (${expiredCodes.map(() => '?').join(',')})
      `;

      const params = ['EXPIRED', new Date().toISOString(), ...expiredCodes.map(c => c.id)];

      return new Promise<number>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to cleanup expired codes: ${err.message}`));
            return;
          }

          resolve(expiredCodes.length);
        });
      });
    } catch (error) {
      throw new Error(`Failed to cleanup expired codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a gift code by ID
   * @param id - Gift code ID
   * @returns Promise<GiftCode | null> - Gift code or null
   */
  async getGiftCodeById(id: number): Promise<GiftCode | null> {
    try {
      const sql = 'SELECT * FROM gift_code_inventory WHERE id = ?';
      
      return new Promise<GiftCode | null>((resolve, reject) => {
        this.db.get(sql, [id], (err: Error | null, row: any) => {
          if (err) {
            reject(new Error(`Failed to get gift code: ${err.message}`));
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          const giftCode: GiftCode = {
            id: row.id,
            code: row.code,
            denomination: row.denomination,
            status: row.status as GiftCodeStatus,
            encryptedCode: row.encrypted_code,
            encryptionKey: row.encryption_key,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          };

          resolve(giftCode);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get gift code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates gift code status
   * @param id - Gift code ID
   * @param newStatus - New status
   * @returns Promise<boolean> - Success status
   */
  async updateGiftCodeStatus(id: number, newStatus: GiftCodeStatus): Promise<boolean> {
    try {
      const sql = 'UPDATE gift_code_inventory SET status = ?, updated_at = ? WHERE id = ?';
      const params = [newStatus, new Date().toISOString(), id];

      return new Promise<boolean>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to update gift code status: ${err.message}`));
            return;
          }

          if (result?.changes === 0) {
            reject(new Error('Gift code not found or no changes made'));
            return;
          }

          resolve(true);
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to update gift code status: ${error}`);
    }
  }

  // Private helper methods

  private async getGiftCodeByCode(code: string): Promise<GiftCode | null> {
    try {
      const sql = 'SELECT * FROM gift_code_inventory WHERE code = ?';
      
      return new Promise<GiftCode | null>((resolve, reject) => {
        this.db.get(sql, [code], (err: Error | null, row: any) => {
          if (err) {
            reject(new Error(`Failed to get gift code by code: ${err.message}`));
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          const giftCode: GiftCode = {
            id: row.id,
            code: row.code,
            denomination: row.denomination,
            status: row.status as GiftCodeStatus,
            encryptedCode: row.encrypted_code,
            encryptionKey: row.encryption_key,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          };

          resolve(giftCode);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get gift code by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getAvailableCodes(): Promise<GiftCode[]> {
    try {
      const sql = 'SELECT * FROM gift_code_inventory WHERE status = ? AND expires_at > ?';
      const params = [GiftCodeStatus.AVAILABLE, new Date().toISOString()];

      return new Promise<GiftCode[]>((resolve, reject) => {
        this.db.all(sql, params, (err: Error | null, rows: any[]) => {
          if (err) {
            reject(new Error(`Failed to get available codes: ${err.message}`));
            return;
          }

          const giftCodes: GiftCode[] = rows.map(row => ({
            id: row.id,
            code: row.code,
            denomination: row.denomination,
            status: row.status as GiftCodeStatus,
            encryptedCode: row.encrypted_code,
            encryptionKey: row.encryption_key,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          }));

          resolve(giftCodes);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get available codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async allocateCode(id: number): Promise<boolean> {
    try {
      const sql = 'UPDATE gift_code_inventory SET status = ?, updated_at = ? WHERE id = ? AND status = ?';
      const params = [GiftCodeStatus.ALLOCATED, new Date().toISOString(), id, GiftCodeStatus.AVAILABLE];

      return new Promise<boolean>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null, result: any) {
          if (err) {
            reject(new Error(`Failed to allocate code: ${err.message}`));
            return;
          }

          resolve(result?.changes === 1);
        });
      });
    } catch (error) {
      throw new Error(`Failed to allocate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getExpiredCodes(): Promise<GiftCode[]> {
    try {
      const sql = 'SELECT * FROM gift_code_inventory WHERE expires_at <= ? AND status != ?';
      const params = [new Date().toISOString(), GiftCodeStatus.EXPIRED];

      return new Promise<GiftCode[]>((resolve, reject) => {
        this.db.all(sql, params, (err: Error | null, rows: any[]) => {
          if (err) {
            reject(new Error(`Failed to get expired codes: ${err.message}`));
            return;
          }

          const giftCodes: GiftCode[] = rows.map(row => ({
            id: row.id,
            code: row.code,
            denomination: row.denomination,
            status: row.status as GiftCodeStatus,
            encryptedCode: row.encrypted_code,
            encryptionKey: row.encryption_key,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          }));

          resolve(giftCodes);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get expired codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateGiftCodeMetadata(id: number, metadata: Record<string, any>): Promise<void> {
    try {
      const sql = 'UPDATE gift_code_inventory SET metadata = ? WHERE id = ?';
      const params = [JSON.stringify(metadata), id];

      return new Promise<void>((resolve, reject) => {
        this.db.run(sql, params, function(err: Error | null) {
          if (err) {
            reject(new Error(`Failed to update gift code metadata: ${err.message}`));
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      throw new Error(`Failed to update gift code metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all gift codes (admin function)
   * @returns Promise<GiftCode[]> - All gift codes
   */
  async getAllGiftCodes(): Promise<GiftCode[]> {
    try {
      const sql = "SELECT * FROM gift_code_inventory ORDER BY created_at DESC";
      
      return new Promise<GiftCode[]>((resolve, reject) => {
        this.db.all(sql, [], (err: Error | null, rows: any[]) => {
          if (err) {
            reject(new Error(`Failed to get all gift codes: ${err.message}`));
            return;
          }

          const giftCodes: GiftCode[] = rows.map(row => ({
            id: row.id,
            code: row.code,
            denomination: row.denomination,
            status: row.status as GiftCodeStatus,
            encryptedCode: row.encrypted_code,
            encryptionKey: row.encryption_key,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          }));

          resolve(giftCodes);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get all gift codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}