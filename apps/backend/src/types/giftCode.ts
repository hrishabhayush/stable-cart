export enum GiftCodeStatus {
  AVAILABLE = 'AVAILABLE',
  ALLOCATED = 'ALLOCATED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED'
}

export interface GiftCode {
  id: number;
  code: string;
  denomination: number; // Amount in cents
  status: GiftCodeStatus;
  encryptedCode: string;
  encryptionKey: string;
  createdAt: string;
  expiresAt: string;
  metadata: Record<string, any> | null;
}

export interface AllocationResult {
  success: boolean;
  allocatedCodes: GiftCode[];
  totalAllocated: number;
  remainingAmount: number;
  error?: string;
}

export interface InventoryStats {
  totalCodes: number;
  availableCodes: number;
  allocatedCodes: number;
  redeemedCodes: number;
  expiredCodes: number;
  totalValue: number;
  availableValue: number;
  denominations: Record<string, number>;
}

export interface RedemptionResult {
  success: boolean;
  redeemedCode: GiftCode;
  error?: string;
}
