# Primer

**Crypto payments on Amazon that feel as seamless as credit cards!**

Primer is a Chrome extension that lets you pay for Amazon orders with crypto. We built an invisible bridge so that users never see the complexity of adding another settlement layer. They just get a smooth checkout experience.

## How It Works

1. **Browse Amazon** Extension adds a "Checkout with Crypto" button
2. **Click & Connect** Connect your wallet (Coinbase, MetaMask, Phantom)
3. **Pay USDC** Send payment to our merchant address
4. **We Handle the Rest** Backend buys gift cards and completes your order
5. **Done** You get your Amazon order, we handle the crypto to gift card conversion

## Why This Matters

Amazon doesn't support crypto. We solved this by making gift cards invisible. Users get the same checkout experience they're used to, but pay with USDC on Base network.

## Tech Stack

- **Extension**: TypeScript, React, Chrome APIs
- **Webapp**: Next.js, wagmi, CSS Modules  
- **Backend**: Node.js, Express, SQLite
- **Blockchain**: Base network, USDC, Coinbase CDP

## Quick Start

```bash
# Install dependencies
pnpm install

# Start backend
cd apps/backend && pnpm dev

# Start webapp  
cd apps/webapp && pnpm dev

# Build extension
cd apps/extension && pnpm build
```

## Load Extension

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" select `apps/extension/dist/`
4. Visit any Amazon checkout page
5. Look for "Checkout with Crypto" button

## Architecture

```
Extension → Webapp → Backend → Amazon
   ↓         ↓        ↓        ↓
Inject    Payment  Verify   Gift Card
Button    UI       Payment  Automation
```

## Deployments

- **Webapp**: [Vercel](https://webapp-2p3fj5n6g-cynthwanggs-projects.vercel.app)
- **Backend**: localhost:3001 (local dev)
- **Extension**: Built and ready for Chrome Web Store

## Next Steps

- Chrome Web Store submission
- Production backend deployment
- Merchant onboarding
- User testing and feedback

---

**Built for ETHGlobal NYC. Making crypto payments accessible to everyone.**