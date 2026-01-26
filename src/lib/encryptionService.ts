// AES-256 Encryption Service using Web Crypto API

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

class EncryptionService {
  private keyCache: Map<string, CryptoKey> = new Map();

  // Generate a device-specific key from a password/identifier
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const cacheKey = `${password}-${Array.from(salt).join(',')}`;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Convert Uint8Array to ArrayBuffer for compatibility
    const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(cacheKey, key);
    return key;
  }

  // Generate a random encryption key
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data
  async encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(data)
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt data
  async decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new TextDecoder().decode(decryptedData);
  }

  // Encrypt a file/blob
  async encryptBlob(blob: Blob, key: CryptoKey): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      arrayBuffer
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return new Blob([combined], { type: 'application/octet-stream' });
  }

  // Decrypt a file/blob
  async decryptBlob(encryptedBlob: Blob, key: CryptoKey, originalType: string): Promise<Blob> {
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const combined = new Uint8Array(arrayBuffer);

    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new Blob([decryptedData], { type: originalType });
  }

  // Generate SHA-256 checksum
  async generateChecksum(data: string | ArrayBuffer): Promise<string> {
    const buffer = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data;
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify checksum
  async verifyChecksum(data: string | ArrayBuffer, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  // Generate random salt
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  // Get or create device key
  async getDeviceKey(): Promise<CryptoKey> {
    const deviceId = this.getDeviceId();
    const storedSalt = localStorage.getItem('myedls_encryption_salt');
    
    let salt: Uint8Array;
    if (storedSalt) {
      salt = new Uint8Array(JSON.parse(storedSalt));
    } else {
      salt = this.generateSalt();
      localStorage.setItem('myedls_encryption_salt', JSON.stringify(Array.from(salt)));
    }

    return this.deriveKey(deviceId, salt);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('myedls_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('myedls_device_id', deviceId);
    }
    return deviceId;
  }
}

export const encryptionService = new EncryptionService();
