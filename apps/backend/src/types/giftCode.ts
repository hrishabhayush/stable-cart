export enum GiftCodeStatus {
  AVAILABLE = 'AVAILABLE',
  ALLOCATED = 'ALLOCATED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface GiftCode {
  id?: number;
  code: string;
  denomination: number; // Amount in cents
  status: GiftCodeStatus;
  encryptedCode?: string;
  encryptionKey?: string;
  createdAt?: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface AllocationResult {
  success: boolean;
  allocatedCodes?: GiftCode[];
  totalAllocated?: number;
  remainingAmount?: number;
  error?: string;
}

export interface InventoryStats {
  totalCodes: number;
  availableCodes: number;
  allocatedCodes: number;
  redeemedCodes: number;
  expiredCodes: number;
  totalValue: number; // Total value in cents
  availableValue: number; // Available value in cents
}

export interface RedemptionResult {
  success: boolean;
  redeemedCode?: GiftCode;
  error?: string;
}

export interface GiftCodeValidation {
  isValid: boolean;
  errors: string[];
}

export interface BulkGiftCodeData {
  codes: string[];
  denomination: number;
  expiresAt: string;
}

export interface GiftCodeSearchFilters {
  status?: GiftCodeStatus;
  denomination?: number;
  expiresAfter?: string;
  expiresBefore?: string;
}
