// Secure storage wrapper for Auto 2FA
// Encrypts data before storing in local storage

class SecureStorage {
  constructor() {
    this.encryptionManager = new EncryptionManager();
    this.migrationKey = 'auto2fa_migrated_to_encrypted';
  }

  // Check if we need to migrate from sync storage to encrypted local storage
  async checkAndMigrate() {
    // Check if we've already migrated
    const migrated = await new Promise((resolve) => {
      chrome.storage.local.get(this.migrationKey, (result) => {
        resolve(result[this.migrationKey] || false);
      });
    });

    if (migrated) {
      return false; // No migration needed
    }

    // Check if there's data in sync storage to migrate
    const syncData = await new Promise((resolve) => {
      chrome.storage.sync.get(null, (result) => {
        resolve(result);
      });
    });

    if (Object.keys(syncData).length === 0) {
      // No data to migrate, mark as migrated
      await chrome.storage.local.set({ [this.migrationKey]: true });
      return false;
    }

    console.log('Migrating data from sync storage to encrypted local storage...');
    
    try {
      // Migrate all data from sync to encrypted local storage
      for (const [key, value] of Object.entries(syncData)) {
        await this.setItem(key, value);
      }

      // Clear sync storage after successful migration
      await chrome.storage.sync.clear();
      
      // Mark migration as complete
      await chrome.storage.local.set({ [this.migrationKey]: true });
      
      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error('Failed to migrate data to encrypted storage');
    }
  }

  // Get item from encrypted local storage
  async getItem(key) {
    await this.checkAndMigrate();
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, async (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const encryptedData = result[key];
        if (!encryptedData) {
          resolve(undefined);
          return;
        }

        try {
          const decryptedData = await this.encryptionManager.decrypt(encryptedData);
          resolve(decryptedData);
        } catch (error) {
          console.error('Failed to decrypt data for key:', key, error);
          reject(error);
        }
      });
    });
  }

  // Set item in encrypted local storage
  async setItem(key, value) {
    await this.checkAndMigrate();
    
    try {
      const encryptedData = await this.encryptionManager.encrypt(value);
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: encryptedData }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Failed to encrypt data for key:', key, error);
      throw error;
    }
  }

  // Remove item from encrypted local storage
  async removeItem(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Get multiple items from encrypted local storage
  async getItems(keys) {
    await this.checkAndMigrate();
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, async (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        try {
          const decryptedResult = {};
          for (const [key, encryptedData] of Object.entries(result)) {
            if (encryptedData && key !== this.migrationKey) {
              decryptedResult[key] = await this.encryptionManager.decrypt(encryptedData);
            }
          }
          resolve(decryptedResult);
        } catch (error) {
          console.error('Failed to decrypt data:', error);
          reject(error);
        }
      });
    });
  }

  // Set multiple items in encrypted local storage
  async setItems(items) {
    await this.checkAndMigrate();
    
    try {
      const encryptedItems = {};
      for (const [key, value] of Object.entries(items)) {
        encryptedItems[key] = await this.encryptionManager.encrypt(value);
      }
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(encryptedItems, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      throw error;
    }
  }

  // Clear all encrypted local storage (except migration flag)
  async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const keysToRemove = Object.keys(result).filter(key => key !== this.migrationKey);
        
        if (keysToRemove.length === 0) {
          resolve();
          return;
        }

        chrome.storage.local.remove(keysToRemove, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    });
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SecureStorage = SecureStorage;
}
