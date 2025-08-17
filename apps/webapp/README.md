# Primer Webapp

**Payment interface for crypto checkout on Amazon**

This is the payment webapp that users see when they click "Checkout with Crypto" on Amazon. It handles wallet connections, USDC payments, and communicates with the extension to trigger gift card automation.

## What It Does

- **Wallet Connection** Connect Coinbase, MetaMask, Phantom wallets
- **Payment Processing** Send USDC to merchant address on Base network
- **Real-Time Pricing** Shows actual Amazon listing prices (not hardcoded $0.01)
- **Extension Sync** Communicates payment success to trigger automation

## Tech Stack

- **Next.js 13** React framework
- **TypeScript** Type safety
- **Wagmi** Wallet connections
- **CSS Modules** Styling
- **Vercel** Deployment

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Open http://localhost:3000
```

## How It Works

1. **Extension opens webapp** when user clicks "Checkout with Crypto"
2. **User connects wallet** supports multiple wallet types
3. **Webapp shows order details** with real Amazon pricing
4. **User confirms payment** amount and gas fees
5. **USDC transaction sent** to merchant wallet
6. **Payment verified** via Coinbase CDP
7. **Extension notified** triggers gift card automation
8. **Order completed** on Amazon

## Key Features

**Dynamic pricing** Real Amazon prices, not $0.01  
**Multi-wallet** Coinbase, MetaMask, Phantom  
**Payment processing** USDC on Base network  
**Extension communication** Real-time sync  
**Error handling** User-friendly messages  

## Project Structure

```
src/
├── pages/index.tsx          # Main payment interface
├── components/PaymentButton.tsx # Crypto payment processing
├── services/priceConversion.ts # Price utilities
├── config/merchant.ts        # Merchant config
├── styles/                   # CSS modules
└── wagmi.ts                  # Wallet config
```

## Integration Points

- **Chrome Extension** postMessage communication
- **Backend API** Payment verification
- **Blockchain** Base network, USDC payments
- **Payment Monitoring** Gift card automation triggers

## Testing

- **Wallet connections** Test with different wallet types
- **Payment flows** Simulate USDC transactions
- **Extension sync** Test cross-tab communication
- **Error scenarios** Network failures, insufficient funds

## Deployment

- **Production**: [Vercel](https://webapp-2p3fj5n6g-cynthwanggs-projects.vercel.app)
- **Development**: localhost:3000
- **Auto-deploy**: Connected to main branch

## Innovation Highlights

**Mainstream focused** Designed for regular Amazon shoppers, not crypto experts
**Seamless experience** Users get crypto benefits without blockchain knowledge
**Real automation** Complete order fulfillment, not just payment processing
**Production ready** Deployed and working with real integrations

---

**Part of Primer Making crypto payments seamless on Amazon**
