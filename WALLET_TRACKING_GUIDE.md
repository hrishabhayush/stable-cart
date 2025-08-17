# Wallet Tracking with Coinbase CDP

## Overview

This implementation uses Coinbase CDP (Coinbase Data Platform) to track wallet activity on the Base network. It provides real-time transaction monitoring, balance tracking, and payment verification without complex webhooks.

## Features

- **Real-time Transaction Tracking**: Monitor USDC and ETH transfers
- **Wallet Activity Analysis**: Get comprehensive wallet activity summaries
- **Payment Verification**: Verify if payments were made to specific addresses
- **Balance Tracking**: Approximate wallet balances based on recent transactions
- **Database Storage**: Store transaction history locally for quick access

## API Endpoints

### 1. Wallet Activity
```
GET /api/wallet/:address/activity?limit=20
```
Get comprehensive wallet activity including transactions, totals, and recent activity.

**Response:**
```json
{
  "success": true,
  "activity": {
    "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "transactions": [...],
    "totalReceived": 150.25,
    "totalSent": 75.50,
    "lastActivity": "1703123456"
  }
}
```

### 2. Recent Transactions
```
GET /api/wallet/:address/transactions?token=usdc&limit=10
```
Get recent transactions filtered by token type (usdc, eth, or all).

**Query Parameters:**
- `token`: usdc, eth, or all (default: all)
- `limit`: Number of transactions to return (default: 10)

### 3. Wallet Balance
```
GET /api/wallet/:address/balance
```
Get approximate wallet balance based on recent transactions.

**Response:**
```json
{
  "success": true,
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "balance": {
    "usdc": 125.50,
    "eth": 0.25
  }
}
```

### 4. Recent Activity Check
```
GET /api/wallet/:address/recent-activity?minutes=5
```
Check if wallet has recent activity within specified time window.

### 5. Payment Verification
```
POST /api/wallet/verify-payment
```
Verify if a specific payment was made.

**Request Body:**
```json
{
  "fromAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "toAddress": "0xD880E96C35B217B9E220B69234A12AcFC175f92B",
  "amount": "25.50",
  "token": "USDC",
  "minutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "paymentVerified": true,
  "transaction": {
    "transactionHash": "0x1234567890abcdef...",
    "blockNumber": "34301663",
    "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "to": "0xD880E96C35B217B9E220B69234A12AcFC175f92B",
    "value": "25500000",
    "token": "USDC",
    "timestamp": "1703123456"
  },
  "message": "Payment verified successfully"
}
```

## Usage Examples

### Track a Wallet's Activity
```bash
curl -X GET "http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6/activity"
```

### Get USDC Transactions
```bash
curl -X GET "http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6/transactions?token=usdc&limit=5"
```

### Check Wallet Balance
```bash
curl -X GET "http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6/balance"
```

### Verify a Payment
```bash
curl -X POST "http://localhost:3001/api/wallet/verify-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "toAddress": "0xD880E96C35B217B9E220B69234A12AcFC175f92B",
    "amount": "25.50",
    "token": "USDC",
    "minutes": 5
  }'
```

## Integration with StableCart

### Payment Flow
1. **User makes payment** via extension
2. **Backend creates checkout session**
3. **Payment verification** using CDP tracking
4. **Gift codes allocated** if payment verified
5. **Session updated** with payment status

### Example Integration Code
```javascript
// After user makes payment
const verifyPayment = async (fromAddress, toAddress, amount) => {
  const response = await fetch('/api/wallet/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromAddress,
      toAddress,
      amount,
      token: 'USDC',
      minutes: 5
    })
  });

  const result = await response.json();
  
  if (result.paymentVerified) {
    // Payment confirmed - allocate gift codes
    console.log('Payment verified:', result.transaction);
    return true;
  } else {
    console.log('Payment not found:', result.message);
    return false;
  }
};
```

## Testing

Run the test script to verify functionality:
```bash
node test-wallet-tracking.js
```

The test script will:
1. Test CDP API connectivity
2. Test all backend endpoints
3. Test USDC transaction tracking
4. Test payment verification
5. Test stored activity retrieval

## Configuration

### Environment Variables
```bash
# CDP API Key (already configured)
CDP_API_KEY=0USnEPehKTmi0yRC4apQYawZ5QUsdhLF

# Backend Configuration
PORT=3001
DB_PATH=./stablecart.db
```

### Database Schema
The system creates a `wallet_activity` table to store transaction history:
```sql
CREATE TABLE wallet_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  value TEXT NOT NULL,
  token TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(wallet_address, transaction_hash)
);
```

## Advantages Over Webhooks

1. **Simpler Setup**: No webhook endpoints to configure
2. **Real-time Data**: Direct access to blockchain data
3. **Reliable**: No webhook delivery failures
4. **Flexible**: Query any wallet address on demand
5. **Cost-effective**: No webhook infrastructure needed

## Limitations

1. **Rate Limits**: CDP API has rate limits
2. **Historical Data**: Limited to recent transactions
3. **Approximate Balances**: Based on recent activity only
4. **Network Specific**: Currently Base network only

## Future Enhancements

1. **Multi-network Support**: Extend to other networks
2. **Real-time Updates**: WebSocket connections for live updates
3. **Advanced Analytics**: Transaction pattern analysis
4. **Batch Processing**: Process multiple wallets efficiently
5. **Caching**: Implement smart caching for frequently accessed data
