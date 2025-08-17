/**
 * On Ramp API Routes
 * Handles Coinbase On Ramp integration for buying Base ETH
 */

import express from 'express';
import { onrampService } from '../services/OnrampService';

const router = express.Router();

/**
 * POST /api/onramp/quote
 * Generate buy quote for Base ETH
 */
router.post('/quote', async (req, res) => {
  try {
    console.log('🔄 On Ramp quote request received:', req.body);

    const {
      country,
      destinationAddress,
      paymentAmount,
      paymentCurrency,
      paymentMethod,
      purchaseCurrency,
      purchaseNetwork,
      subdivision
    } = req.body;

    // Validate required fields
    if (!country || !paymentAmount || !paymentCurrency || !purchaseCurrency || !purchaseNetwork) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: country, paymentAmount, paymentCurrency, purchaseCurrency, purchaseNetwork'
      });
    }

    // Create quote request
    const quoteRequest = {
      country,
      destinationAddress,
      paymentAmount,
      paymentCurrency,
      paymentMethod: paymentMethod || 'UNSPECIFIED',
      purchaseCurrency,
      purchaseNetwork,
      subdivision
    };

    // Validate request
    const validationErrors = onrampService.validateQuoteRequest(quoteRequest);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Generate quote
    const quote = await onrampService.createBuyQuote(quoteRequest);

    console.log('✅ On Ramp quote generated successfully:', quote);

    res.json({
      success: true,
      data: quote
    });

  } catch (error) {
    console.error('❌ Error generating On Ramp quote:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate quote',
      message: errorMessage
    });
  }
});

/**
 * GET /api/onramp/countries
 * Get supported countries
 */
router.get('/countries', async (req, res) => {
  try {
    console.log('🌍 Getting supported countries...');

    const countries = await onrampService.getSupportedCountries();

    res.json({
      success: true,
      data: countries
    });

  } catch (error) {
    console.error('❌ Error getting supported countries:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get supported countries'
    });
  }
});

/**
 * GET /api/onramp/payment-methods
 * Get supported payment methods for a country
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const { country } = req.query;

    if (!country || typeof country !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Country parameter is required'
      });
    }

    console.log('💳 Getting payment methods for country:', country);

    const paymentMethods = await onrampService.getSupportedPaymentMethods(country);

    res.json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    console.error('❌ Error getting payment methods:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

/**
 * GET /api/onramp/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'On Ramp service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
