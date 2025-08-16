import express, { Express } from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import { initializeDatabase } from './database';
import { giftCodeRoutes, setGiftCodeService } from './routes/admin/giftCodes';
import { GiftCodeInventoryService } from './services/GiftCodeInventoryService';
import checkoutSessionRoutes, { setCheckoutSessionService } from './routes/checkoutSessions';
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

