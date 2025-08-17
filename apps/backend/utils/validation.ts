import { CreateSessionRequest, CheckoutSessionStatus, ValidationResult, ValidationError } from '../types/CheckoutSession';

export class ValidationUtils {
  /**
   * Validates session creation request data
   */
  static validateCreateSessionRequest(data: CreateSessionRequest): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate Amazon URL
    if (!data.amazonUrl || data.amazonUrl.trim() === '') {
      errors.push({ field: 'amazonUrl', message: 'Amazon URL is required' });
    } else if (!this.isValidAmazonUrl(data.amazonUrl)) {
      errors.push({ field: 'amazonUrl', message: 'Invalid Amazon URL format' });
    }

    // Validate cart total
    if (typeof data.cartTotalCents !== 'number' || data.cartTotalCents <= 0) {
      errors.push({ field: 'cartTotalCents', message: 'Cart total must be a positive number' });
    } else if (data.cartTotalCents > 1000000) { // $10,000 limit
      errors.push({ field: 'cartTotalCents', message: 'Cart total cannot exceed $10,000' });
    }

    // Validate current balance
    if (typeof data.currentBalanceCents !== 'number' || data.currentBalanceCents < 0) {
      errors.push({ field: 'currentBalanceCents', message: 'Current balance cannot be negative' });
    } else if (data.currentBalanceCents > 1000000) { // $10,000 limit
      errors.push({ field: 'currentBalanceCents', message: 'Current balance cannot exceed $10,000' });
    }

    // Validate user ID if provided
    if (data.userId !== undefined && (typeof data.userId !== 'string' || data.userId.trim() === '')) {
      errors.push({ field: 'userId', message: 'User ID must be a non-empty string if provided' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates status transitions based on current status
   */
  static validateStatusTransition(currentStatus: CheckoutSessionStatus, newStatus: CheckoutSessionStatus): ValidationResult {
    const errors: ValidationError[] = [];

    // Define valid status transitions
    const validTransitions: Record<CheckoutSessionStatus, CheckoutSessionStatus[]> = {
      'CREATED': ['PENDING', 'EXPIRED', 'FAILED'],
      'PENDING': ['PAID', 'EXPIRED', 'FAILED'],
      'PAID': ['PROCESSING', 'FAILED'],
      'PROCESSING': ['FULFILLED', 'FAILED'],
      'FULFILLED': ['COMPLETED', 'FAILED'],
      'COMPLETED': [], // Terminal state
      'EXPIRED': [], // Terminal state
      'FAILED': [] // Terminal state
    };

    const allowedTransitions = validTransitions[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      errors.push({
        field: 'status',
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates session ID format
   */
  static validateSessionId(sessionId: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!sessionId || typeof sessionId !== 'string') {
      errors.push({ field: 'sessionId', message: 'Session ID is required' });
    } else if (!/^session-[a-f0-9]+[a-z0-9]+$/.test(sessionId)) {
      errors.push({ field: 'sessionId', message: 'Invalid session ID format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates amount values (in cents)
   */
  static validateAmount(amount: number, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof amount !== 'number') {
      errors.push({ field: fieldName, message: `${fieldName} must be a number` });
    } else if (amount < 0) {
      errors.push({ field: fieldName, message: `${fieldName} cannot be negative` });
    } else if (amount > 1000000) { // $10,000 limit
      errors.push({ field: fieldName, message: `${fieldName} cannot exceed $10,000` });
    } else if (!Number.isInteger(amount)) {
      errors.push({ field: fieldName, message: `${fieldName} must be a whole number (cents)` });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates Amazon URL format
   */
  private static isValidAmazonUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('amazon.com') || 
             parsedUrl.hostname.includes('amazon.co.uk') ||
             parsedUrl.hostname.includes('amazon.de') ||
             parsedUrl.hostname.includes('amazon.fr') ||
             parsedUrl.hostname.includes('amazon.it') ||
             parsedUrl.hostname.includes('amazon.es') ||
             parsedUrl.hostname.includes('amazon.ca') ||
             parsedUrl.hostname.includes('amazon.com.au') ||
             parsedUrl.hostname.includes('amazon.co.jp');
    } catch {
      return false;
    }
  }

  /**
   * Validates date values
   */
  static validateDate(date: Date, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      errors.push({ field: fieldName, message: `${fieldName} must be a valid date` });
    } else if (date < new Date('2020-01-01')) {
      errors.push({ field: fieldName, message: `${fieldName} cannot be before 2020` });
    } else if (date > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) { // 1 year in future
      errors.push({ field: fieldName, message: `${fieldName} cannot be more than 1 year in the future` });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates metadata JSON string
   */
  static validateMetadata(metadata?: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (metadata !== undefined) {
      if (typeof metadata !== 'string') {
        errors.push({ field: 'metadata', message: 'Metadata must be a string' });
      } else if (metadata.length > 10000) { // 10KB limit
        errors.push({ field: 'metadata', message: 'Metadata cannot exceed 10KB' });
      } else if (metadata.trim() !== '') {
        try {
          JSON.parse(metadata);
        } catch {
          errors.push({ field: 'metadata', message: 'Metadata must be valid JSON' });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Combines multiple validation results
   */
  static combineValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    
    for (const result of results) {
      allErrors.push(...result.errors);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}