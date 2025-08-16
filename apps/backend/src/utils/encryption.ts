import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export async function generateEncryptionKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(KEY_LENGTH, (err, buffer) => {
      if (err) {
        reject(new Error(`Failed to generate encryption key: ${err.message}`));
        return;
      }
      resolve(buffer.toString('base64'));
    });
  });
}

export async function encryptGiftCode(giftCode: string, key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      if (keyBuffer.length !== KEY_LENGTH) {
        throw new Error('Invalid key length');
      }

      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
      cipher.setAAD(Buffer.from('gift-code', 'utf8'));
      
      let encrypted = cipher.update(giftCode, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();
      const result = Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]);
      
      resolve(result.toString('base64'));
    } catch (error) {
      reject(new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

export async function decryptGiftCode(encryptedGiftCode: string, key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      if (keyBuffer.length !== KEY_LENGTH) {
        throw new Error('Invalid key length');
      }

      const encryptedBuffer = Buffer.from(encryptedGiftCode, 'base64');
      const iv = encryptedBuffer.subarray(0, IV_LENGTH);
      const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
      
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
      decipher.setAAD(Buffer.from('gift-code', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      resolve(decrypted);
    } catch (error) {
      reject(new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}
