import express, { Express } from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import { initializeDatabase } from './database';
import { webhookRoutes, setWebhookServices } from './routes/webhooks';
import { checkoutSessionRoutes, setCheckoutSessionService } from './routes/checkoutSessions';
import { giftCodeRoutes, setGiftCodeService } from './routes/admin/giftCodes';
import { CheckoutSessionService } from './services/CheckoutSessionService';
import { GiftCodeInventoryService } from './services/GiftCodeInventoryService';
import path from 'path';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const dbPath = path.join(__dirname, '..', 'stablecart.db');
const db = new Database(dbPath);

// Initialize database tables before starting server
async function startServer() {
  try {
    await initializeDatabase(db);
    
    // Initialize services with database
    const checkoutSessionService = new CheckoutSessionService(db);
    const giftCodeService = new GiftCodeInventoryService(db);
    
    // Set services for routes
    setCheckoutSessionService(checkoutSessionService);
    setGiftCodeService(giftCodeService);
    setWebhookServices(checkoutSessionService, giftCodeService);
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'StableCart Backend',
        version: '1.0.0'
      });
    });

    // API Routes
    app.use('/api/webhooks', webhookRoutes);
    app.use('/api/checkout-sessions', checkoutSessionRoutes);
    app.use('/api/admin/gift-codes', giftCodeRoutes);

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
      console.log(`📡 Webhooks: http://localhost:${PORT}/api/webhooks`);
      console.log(`🛒 Checkout Sessions: http://localhost:${PORT}/api/checkout-sessions`);
      console.log(`🎁 Gift Codes: http://localhost:${PORT}/api/admin/gift-codes`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();

export { app, db };
