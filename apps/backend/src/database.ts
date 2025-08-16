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
          denomination_cents INTEGER NOT NULL,
          code_masked TEXT NOT NULL,
          ciphertext TEXT NOT NULL,
          nonce TEXT NOT NULL,
          status TEXT CHECK(status IN ('AVAILABLE', 'ALLOCATED', 'USED')) DEFAULT 'AVAILABLE',
          allocated_to_session INTEGER,
          purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          allocated_at DATETIME,
          FOREIGN KEY (allocated_to_session) REFERENCES checkout_sessions(id)
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create redemptions table
        db.run(`
          CREATE TABLE IF NOT EXISTS redemptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            inventory_item_id INTEGER NOT NULL,
            applied_amount_cents INTEGER NOT NULL,
            remainder_cents INTEGER DEFAULT 0,
            redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            amazon_balance_before INTEGER NOT NULL,
            amazon_balance_after INTEGER NOT NULL,
            FOREIGN KEY (session_id) REFERENCES checkout_sessions(id),
            FOREIGN KEY (inventory_item_id) REFERENCES gift_code_inventory(id)
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

                db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_denomination ON gift_code_inventory(denomination_cents)`, (err) => {
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
}
