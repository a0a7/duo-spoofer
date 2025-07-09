// Encryption utilities for Auto 2FA
// Uses AES-GCM encryption with a key derived from a master password

class EncryptionManager {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
    this.derivationAlgorithm = 'PBKDF2';
    this.derivationIterations = 100000;
    this.salt = new Uint8Array([
      // Fixed salt for key derivation ( in production, this could be randomized per installation)
      0x73, 0x61, 0x6c, 0x74, 0x5f, 0x66, 0x6f, 0x72, 
      0x5f, 0x64, 0x75, 0x6f, 0x5f, 0x32, 0x66, 0x61
    ]);
  }

  // Generate or retrieve master key based on browser fingerprint
  async getMasterKey() {
    // Use a combination of browser characteristics as a basis for the key
    // This isn't perfect security but provides reasonable protection for local storage
    const fingerprint = await this.generateBrowserFingerprint();
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(fingerprint),
      { name: this.derivationAlgorithm },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: this.derivationAlgorithm,
        salt: this.salt,
        iterations: this.derivationIterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a deterministic fingerprint from browser characteristics
  async generateBrowserFingerprint() {
    // Use only stable characteristics that are consistent across all contexts
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      // Use fixed values for screen dimensions to ensure consistency across contexts
      '1920', '1080', '24', // Default screen dimensions and color depth
      new Date().getTimezoneOffset().toString(),
      (navigator.hardwareConcurrency || 'unknown').toString()
    ];

    // Add extension ID for additional uniqueness (browser-agnostic)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      components.push(chrome.runtime.id);
    } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) {
      components.push(browser.runtime.id);
    }

    // Add a fixed salt to make the key unique to this extension
    components.push('duo-spoofer-key-salt-2024');

    const fingerprint = components.join('|');
    console.log('Browser fingerprint components:', components);
    
    // Hash the fingerprint for additional security
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert to base64 for use as key material
    return btoa(String.fromCharCode(...hashArray));
  }

  // Encrypt data
  async encrypt(data) {
    try {
      const key = await this.getMasterKey();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: iv },
        key,
        dataBuffer
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Return as base64 string
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  async decrypt(encryptedData) {
    try {
      const key = await this.getMasterKey();
      
      // Convert from base64
      const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Extract IV and encrypted data
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const encrypted = encryptedBuffer.slice(this.ivLength);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decryptedBuffer);
      
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - data may be corrupted or from a different browser/installation');
    }
  }

  // Test if data can be decrypted (useful for migration)
  async canDecrypt(encryptedData) {
    try {
      await this.decrypt(encryptedData);
      return true;
    } catch {
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EncryptionManager;
} else if (typeof window !== 'undefined') {
  window.EncryptionManager = EncryptionManager;
}
