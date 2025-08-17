import express, { Express } from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import { initializeDatabase } from './database';
import { giftCodeRoutes, setGiftCodeService } from './routes_backup/admin/giftCodes';
import { GiftCodeInventoryService } from './services/GiftCodeInventoryService';
import checkoutSessionRoutes, { setCheckoutSessionService } from './routes_backup/checkoutSessions';
import { CheckoutSessionService } from './services/CheckoutSessionService';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const db = new Database('./stablecart.db');

// Initialize database tables before starting server
async function startServer() {
  try {
    await initializeDatabase(db);
    console.log('✅ Database initialized, creating service...');
    
    // Initialize the gift code service with our database
    const giftCodeService = new GiftCodeInventoryService(db);
    console.log('✅ Service created, setting service...');
    setGiftCodeService(giftCodeService);
    
    // Initialize the checkout session service with our database
    const checkoutSessionService = new CheckoutSessionService(db);
    console.log('✅ Checkout session service created, setting service...');
    setCheckoutSessionService(checkoutSessionService);
    
    console.log('✅ Services set, adding routes...');
    
    // Admin routes
    app.use('/api/admin/gift-codes', giftCodeRoutes);
    
    // Checkout session routes
    app.use('/api/checkout-sessions', checkoutSessionRoutes);
    
    console.log('✅ Routes added, setting up endpoints...');

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'StableCart Backend',
        version: '1.0.0'
      });
    });

    // Webhook endpoint for payment notifications
    app.post('/api/webhook/payment', (req, res) => {
      try {
        console.log('🔔 Webhook received:', req.body);
        
        const { transactionHash, orderId, amount, from, to } = req.body;
        
        // Validate required fields
        if (!transactionHash || !orderId) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: transactionHash and orderId'
          });
        }

        // Process the payment notification
        console.log('💰 Processing payment webhook:');
        console.log('  Transaction Hash:', transactionHash);
        console.log('  Order ID:', orderId);
        console.log('  Amount:', amount);
        console.log('  From:', from);
        console.log('  To:', to);

        // Here you can add logic to:
        // 1. Update order status in database
        // 2. Trigger gift card automation
        // 3. Send notifications
        // 4. Log the transaction

        // For now, just acknowledge receipt
        res.json({
          success: true,
          message: 'Payment webhook processed successfully',
          timestamp: new Date().toISOString(),
          orderId: orderId,
          transactionHash: transactionHash
        });

      } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process webhook'
        });
      }
    });

    // GET endpoint for webhook testing
    app.get('/api/webhook/test', (req, res) => {
      res.json({
        success: true,
        message: 'Webhook endpoint is working!',
        timestamp: new Date().toISOString(),
        usage: 'Send POST requests to /api/webhook/payment with payment data'
      });
    });

    // Basic error handling
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    app.listen(PORT, () => {
      console.log(`🚀 StableCart Backend running on http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();

export { app, db };

