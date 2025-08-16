import { Database } from 'sqlite3';
import { GiftCode, GiftCodeStatus, AllocationResult, InventoryStats, RedemptionResult } from '../types/giftCode';

export class GiftCodeInventoryService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
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

      // For now, we'll skip encryption to simplify testing
      const sql = `
        INSERT INTO gift_code_inventory (
          code, denomination, status, created_at, expires_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        giftCode.code,
        giftCode.denomination,
        giftCode.status,
        giftCode.createdAt || new Date().toISOString(),
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
            createdAt: giftCode.createdAt || new Date().toISOString()
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
        console.log(`🔍 Processing code ${code.id}: denomination=${code.denomination}, remainingAmount=${remainingAmount}`);
        
        if (remainingAmount <= 0) {
          console.log(`⏹️ Remaining amount is 0, stopping allocation`);
          break;
        }
        
        if (code.denomination <= remainingAmount) {
          console.log(`✅ Code ${code.id} fits, attempting allocation...`);
          // Try to allocate this code
          const success = await this.allocateCode(code.id!);
          console.log(`📊 Allocation result for code ${code.id}: ${success}`);
          
          if (success) {
            allocatedCodes.push(code);
            totalAllocated += code.denomination;
            remainingAmount -= code.denomination;
            console.log(`🎯 Code ${code.id} allocated successfully. totalAllocated=${totalAllocated}, remainingAmount=${remainingAmount}`);
          } else {
            console.log(`❌ Code ${code.id} allocation failed`);
          }
        } else {
          console.log(`❌ Code ${code.id} denomination ${code.denomination} > remainingAmount ${remainingAmount}, skipping`);
        }
      }

      console.log(`📈 Final allocation result: totalAllocated=${totalAllocated}, targetAmount=${targetAmount}`);

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
   * Gets comprehensive inventory statistics
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
        this.db.get(sql, [], (err: Error | null, row: any) => {
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
              availableValue: 0
            });
            return;
          }

          resolve({
            totalCodes: row.total || 0,
            availableCodes: row.available || 0,
            allocatedCodes: row.allocated || 0,
            redeemedCodes: row.redeemed || 0,
            expiredCodes: row.expired || 0,
            totalValue: row.total_value || 0,
            availableValue: row.available_value || 0
          });
        });
      });
    } catch (error) {
      throw new Error(`Failed to get inventory stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all gift codes (for admin purposes)
   * @returns Promise<GiftCode[]> - All gift codes
   */
  async getAllGiftCodes(): Promise<GiftCode[]> {
    try {
      const sql = 'SELECT * FROM gift_code_inventory ORDER BY created_at DESC';

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
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
          }));

          resolve(giftCodes);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get all gift codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
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
      const sql = 'UPDATE gift_code_inventory SET status = ? WHERE id = ?';
      const params = [newStatus, id];

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
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
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
      const sql = 'SELECT * FROM gift_code_inventory WHERE status = ?';
      const params = [GiftCodeStatus.AVAILABLE];

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
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
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
      console.log(`🔧 Attempting to allocate code with ID: ${id}`);
      
      const sql = 'UPDATE gift_code_inventory SET status = ? WHERE id = ?';
      const params = [GiftCodeStatus.ALLOCATED, id];
      
      console.log(`📝 SQL: ${sql} with params: [${params.join(', ')}]`);

      return new Promise<boolean>((resolve, reject) => {
        this.db.run(sql, params, function(this: any, err: Error | null, result: any) {
          if (err) {
            console.error(`❌ Database error: ${err.message}`);
            reject(new Error(`Failed to allocate code: ${err.message}`));
            return;
          }

          console.log(`📊 Database result: changes=${this?.changes}, lastID=${this?.lastID}`);
          const success = this?.changes === 1;
          console.log(`✅ Allocation success: ${success}`);
          resolve(success);
        });
      });
    } catch (error) {
      console.error(`💥 Exception in allocateCode: ${error}`);
      throw new Error(`Failed to allocate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
