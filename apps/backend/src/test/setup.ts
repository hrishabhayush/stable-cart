import { Database } from 'sqlite3';
import { initializeDatabase } from '../database';

// Global test database instance
export let testDb: Database;

beforeAll(async () => {
  // Create in-memory database for testing
  testDb = new Database(':memory:');
  await initializeDatabase(testDb);
});

afterAll(async () => {
  // Close test database
  if (testDb) {
    testDb.close();
  }
});

afterEach(async () => {
  // Clean up data after each test
  if (testDb) {
    await new Promise<void>((resolve, reject) => {
      testDb.run('DELETE FROM redemptions', (err) => {
        if (err) reject(err);
        else {
          testDb.run('DELETE FROM gift_code_inventory', (err) => {
            if (err) reject(err);
            else {
              testDb.run('DELETE FROM checkout_sessions', (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          });
        }
      });
    });
  }
});
