export type CheckoutSessionStatus = 
  | 'CREATED'      // Session created, waiting for payment
  | 'PENDING'      // Payment sent, waiting for confirmation
  | 'PAID'         // Payment confirmed, processing gift code
  | 'PROCESSING'   // Gift code being applied to Amazon
  | 'FULFILLED'    // Gift code applied, ready for checkout
  | 'COMPLETED'    // Order completed successfully
  | 'EXPIRED'      // Session expired without payment
  | 'FAILED';      // Something went wrong

export interface CreateSessionRequest {
  amazonUrl: string;
  cartTotalCents: number;
  currentBalanceCents: number;
  userId?: string;
}

export interface CheckoutSession {
  id: number;
  sessionId: string;
  userId?: string;
  amazonUrl: string;
  cartTotalCents: number;
  currentBalanceCents: number;
  topUpAmountCents: number;
  status: CheckoutSessionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  metadata?: string;
}

export interface DatabaseSession {
  id: number;
  session_id: string;
  user_id?: string;
  amazon_url: string;
  cart_total_cents: number;
  current_balance_cents: number;
  top_up_amount_cents: number;
  status: CheckoutSessionStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  metadata?: string;
}

export interface SessionUpdateResult {
  success: boolean;
  changes: number;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface SessionQueryOptions {
  status?: CheckoutSessionStatus;
  userId?: string;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
}

export interface SessionStatistics {
  totalSessions: number;
  sessionsByStatus: Record<CheckoutSessionStatus, number>;
  averageTopUpAmount: number;
  totalTopUpAmount: number;
  expiredSessions: number;
}