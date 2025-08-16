# StableCart Backend

## Overview
This is the backend service for StableCart, handling order management, Amazon integration, and gift code inventory. Built with Express.js, TypeScript, and SQLite.

## Features
- Order Management: Complete checkout session lifecycle
- Gift Code Inventory: Encrypted storage and allocation
- Real-time Updates: Server-Sent Events for extension communication
- Webhook Processing: Payment confirmation handling
- RESTful API: Clean endpoints for all operations

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test Health Endpoint
Visit: http://localhost:3001/api/health

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run db:init` - Initialize database tables

## Project Structure

```
src/
├── server.ts          # Main Express server
├── database.ts        # Database initialization
├── services/          # Business logic services
│   ├── CheckoutSessionService.ts
│   ├── GiftCodeInventoryService.ts
│   └── QuoteService.ts
├── api/               # API route handlers
│   ├── quotes.ts
│   ├── sessions.ts
│   └── webhooks.ts
└── test/              # Test files
    └── setup.ts       # Test database setup
```

## Database Schema

### checkout_sessions
- Session management with state machine
- Tracks order status from CREATED to FULFILLED
- Stores Amazon URL, cart total, and balance info

### gift_code_inventory
- Encrypted gift code storage
- Denomination-based allocation
- Status tracking (AVAILABLE, ALLOCATED, USED)

### redemptions
- Tracks gift code usage
- Links sessions to inventory items
- Records balance changes

## API Endpoints

### Core APIs
- `GET /api/health` - Health check
- `POST /api/quote` - Calculate top-up amount
- `GET /api/status/:sessionId` - Check session status
- `GET /api/sessions/:sessionId/stream` - SSE for real-time updates

### Webhooks
- `POST /webhooks/payment-confirmed` - Handle payment confirmation

### Admin APIs
- `GET /api/inventory/status` - Gift code inventory status
- `POST /api/inventory/add` - Add new gift codes

## Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm test -- --coverage
```

### Test Database
Tests use in-memory SQLite database for isolation and speed.

## Development

### Adding New Services
1. Create service file in `src/services/`
2. Write tests first (TDD approach)
3. Implement service logic
4. Add to server.ts or create API routes

### Database Changes
1. Update `src/database.ts`
2. Add migration logic if needed
3. Update tests to reflect schema changes

## Environment Variables

Create a `.env` file based on `.env.example`:
- `PORT` - Server port (default: 3001)
- `DB_PATH` - SQLite database path
- `JWT_SECRET` - JWT signing secret
- `WEBHOOK_SECRET` - Webhook verification secret

## Next Steps

1. Implement Core Services: CheckoutSession, GiftCodeInventory, Quote
2. Add API Routes: RESTful endpoints for all operations
3. Webhook Integration: Connect with payment system
4. Real-time Updates: Implement SSE for extension communication
5. Testing: Comprehensive test coverage for all services

---

**Built for ETHGlobal New York 2025 Hackathon**
