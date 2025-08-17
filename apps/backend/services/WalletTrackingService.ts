import { Database } from 'sqlite3';

export interface WalletTransaction {
  transactionHash: string;
  blockNumber: string;
  from: string;
  to: string;
  value: string;
  token: string;
  timestamp: string;
}

export interface WalletActivity {
  walletAddress: string;
  transactions: WalletTransaction[];
  totalReceived: number;
  totalSent: number;
  lastActivity: string;
}

export class WalletTrackingService {
  private db: Database;
  private apiKey: string;
  private baseUrl: string = 'https://api.cdp.coinbase.com/platform/v2/data/query/run';

  constructor(db: Database, apiKey: string) {
    this.db = db;
    this.apiKey = apiKey;
  }

  /**
   * Track USDC transfers for a specific wallet
   */
  async trackUSDCTransfers(walletAddress: string, limit: number = 10): Promise<WalletTransaction[]> {
    try {
      console.log(`🔍 Tracking USDC transfers for wallet: ${walletAddress}`);

      // USDC contract address on Base
      const usdcContract = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      
      const sql = `
        SELECT 
          transaction_hash,
          block_number,
          parameters['from']::String AS sender,
          parameters['to']::String AS recipient,
          parameters['value']::UInt256 AS amount,
          block_timestamp
        FROM base.events 
        WHERE event_signature = 'Transfer(address,address,uint256)' 
        AND address = '${usdcContract}'
        AND (parameters['from']::String = '${walletAddress}' OR parameters['to']::String = '${walletAddress}')
        ORDER BY block_number DESC 
        LIMIT ${limit}
      `;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        throw new Error(`CDP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.result) {
        console.log('No transactions found');
        return [];
      }

      const transactions: WalletTransaction[] = data.result.map((tx: any) => ({
        transactionHash: tx.transaction_hash,
        blockNumber: tx.block_number,
        from: tx.sender,
        to: tx.recipient,
        value: tx.amount,
        token: 'USDC',
        timestamp: tx.block_timestamp
      }));

      console.log(`✅ Found ${transactions.length} USDC transactions`);
      return transactions;

    } catch (error) {
      console.error('❌ Error tracking USDC transfers:', error);
      throw error;
    }
  }

  /**
   * Track ETH transfers for a specific wallet
   */
  async trackETHTransfers(walletAddress: string, limit: number = 10): Promise<WalletTransaction[]> {
    try {
      console.log(`🔍 Tracking ETH transfers for wallet: ${walletAddress}`);

      const sql = `
        SELECT 
          transaction_hash,
          block_number,
          from_address AS sender,
          to_address AS recipient,
          value AS amount,
          block_timestamp
        FROM base.transactions 
        WHERE (from_address = '${walletAddress}' OR to_address = '${walletAddress}')
        AND value > 0
        ORDER BY block_number DESC 
        LIMIT ${limit}
      `;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        throw new Error(`CDP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.result) {
        console.log('No ETH transactions found');
        return [];
      }

      const transactions: WalletTransaction[] = data.result.map((tx: any) => ({
        transactionHash: tx.transaction_hash,
        blockNumber: tx.block_number,
        from: tx.sender,
        to: tx.recipient,
        value: tx.amount,
        token: 'ETH',
        timestamp: tx.block_timestamp
      }));

      console.log(`✅ Found ${transactions.length} ETH transactions`);
      return transactions;

    } catch (error) {
      console.error('❌ Error tracking ETH transfers:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive wallet activity
   */
  async getWalletActivity(walletAddress: string): Promise<WalletActivity> {
    try {
      console.log(`📊 Getting comprehensive activity for wallet: ${walletAddress}`);

      const [usdcTransactions, ethTransactions] = await Promise.all([
        this.trackUSDCTransfers(walletAddress, 20),
        this.trackETHTransfers(walletAddress, 20)
      ]);

      const allTransactions = [...usdcTransactions, ...ethTransactions]
        .sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber))
        .slice(0, 20);

      // Calculate totals
      let totalReceived = 0;
      let totalSent = 0;

      allTransactions.forEach(tx => {
        const amount = parseFloat(tx.value) / Math.pow(10, tx.token === 'USDC' ? 6 : 18);
        
        if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
          totalReceived += amount;
        } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
          totalSent += amount;
        }
      });

      const lastActivity = allTransactions.length > 0 ? allTransactions[0].timestamp : '';

      // Store activity in database
      await this.storeWalletActivity(walletAddress, allTransactions);

      return {
        walletAddress,
        transactions: allTransactions,
        totalReceived,
        totalSent,
        lastActivity
      };

    } catch (error) {
      console.error('❌ Error getting wallet activity:', error);
      throw error;
    }
  }

  /**
   * Store wallet activity in database
   */
  private async storeWalletActivity(walletAddress: string, transactions: WalletTransaction[]): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO wallet_activity (
          wallet_address, transaction_hash, block_number, from_address, 
          to_address, value, token, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const now = new Date().toISOString();

      for (const tx of transactions) {
        const params = [
          walletAddress,
          tx.transactionHash,
          tx.blockNumber,
          tx.from,
          tx.to,
          tx.value,
          tx.token,
          tx.timestamp,
          now
        ];

        await new Promise<void>((resolve, reject) => {
          this.db.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      console.log(`💾 Stored ${transactions.length} transactions for ${walletAddress}`);

    } catch (error) {
      console.error('❌ Error storing wallet activity:', error);
    }
  }

  /**
   * Get stored wallet activity from database
   */
  async getStoredWalletActivity(walletAddress: string, limit: number = 50): Promise<WalletTransaction[]> {
    try {
      const sql = `
        SELECT transaction_hash, block_number, from_address, to_address, 
               value, token, timestamp
        FROM wallet_activity 
        WHERE wallet_address = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;

      return new Promise<WalletTransaction[]>((resolve, reject) => {
        this.db.all(sql, [walletAddress, limit], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const transactions: WalletTransaction[] = rows.map(row => ({
            transactionHash: row.transaction_hash,
            blockNumber: row.block_number,
            from: row.from_address,
            to: row.to_address,
            value: row.value,
            token: row.token,
            timestamp: row.timestamp
          }));

          resolve(transactions);
        });
      });

    } catch (error) {
      console.error('❌ Error getting stored wallet activity:', error);
      return [];
    }
  }

  /**
   * Check if a wallet has recent activity (for payment verification)
   */
  async hasRecentActivity(walletAddress: string, minutes: number = 5): Promise<boolean> {
    try {
      const activity = await this.getWalletActivity(walletAddress);
      
      if (activity.transactions.length === 0) {
        return false;
      }

      const lastTransaction = activity.transactions[0];
      const lastActivityTime = new Date(parseInt(lastTransaction.timestamp) * 1000);
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

      return lastActivityTime > cutoffTime;

    } catch (error) {
      console.error('❌ Error checking recent activity:', error);
      return false;
    }
  }

  /**
   * Get wallet balance (approximate based on recent transactions)
   */
  async getWalletBalance(walletAddress: string): Promise<{ usdc: number; eth: number }> {
    try {
      const activity = await this.getWalletActivity(walletAddress);
      
      let usdcBalance = 0;
      let ethBalance = 0;

      activity.transactions.forEach(tx => {
        const amount = parseFloat(tx.value) / Math.pow(10, tx.token === 'USDC' ? 6 : 18);
        
        if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
          if (tx.token === 'USDC') usdcBalance += amount;
          else if (tx.token === 'ETH') ethBalance += amount;
        } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
          if (tx.token === 'USDC') usdcBalance -= amount;
          else if (tx.token === 'ETH') ethBalance -= amount;
        }
      });

      return { usdc: usdcBalance, eth: ethBalance };

    } catch (error) {
      console.error('❌ Error getting wallet balance:', error);
      return { usdc: 0, eth: 0 };
    }
  }
}
