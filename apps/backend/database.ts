import { Database } from 'sqlite3';

export function initializeDatabase(db: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create checkout_sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS checkout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        amazon_url TEXT NOT NULL,
        cart_total_cents INTEGER NOT NULL,
        current_balance_cents INTEGER DEFAULT 0,
        top_up_amount_cents INTEGER NOT NULL,
        status TEXT CHECK(status IN ('CREATED', 'PENDING', 'PAID', 'FULFILLED', 'FAILED')) DEFAULT 'CREATED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        metadata TEXT
      )
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create gift_code_inventory table
      db.run(`
        CREATE TABLE IF NOT EXISTS gift_code_inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          denomination INTEGER NOT NULL,
          status TEXT CHECK(status IN ('AVAILABLE', 'ALLOCATED', 'REDEEMED', 'EXPIRED', 'FAILED')) DEFAULT 'AVAILABLE',
          encrypted_code TEXT NOT NULL,
          encryption_key TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          metadata TEXT
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create redemptions table (simplified for now)
        db.run(`
          CREATE TABLE IF NOT EXISTS redemptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            inventory_item_id INTEGER NOT NULL,
            applied_amount_cents INTEGER NOT NULL,
            remainder_cents INTEGER DEFAULT 0,
            redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            amazon_balance_before INTEGER NOT NULL,
            amazon_balance_after INTEGER NOT NULL
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create indexes for performance
          db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON checkout_sessions(session_id)`, (err) => {
            if (err) {
              reject(err);
              return;
            }

            db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON checkout_sessions(status)`, (err) => {
              if (err) {
                reject(err);
                return;
              }

              db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_status ON gift_code_inventory(status)`, (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                                  db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_denomination ON gift_code_inventory(denomination)`, (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    // Create wallet_activity table
                    db.run(`
                      CREATE TABLE IF NOT EXISTS wallet_activity (
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
                      )
                    `, (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }

                      // Create indexes for wallet activity
                      db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_address ON wallet_activity(wallet_address)`, (err) => {
                        if (err) {
                          reject(err);
                          return;
                        }

                        db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_timestamp ON wallet_activity(timestamp)`, (err) => {
                          if (err) {
                            reject(err);
                            return;
                          }

                          db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_token ON wallet_activity(token)`, (err) => {
                            if (err) {
                              reject(err);
                              return;
                            }

                            console.log('✅ Database tables initialized successfully');
                            resolve();
                          });
                        });
                      });
                    });
                  });
              });
            });
          });
        });
      });
    });
  });
}