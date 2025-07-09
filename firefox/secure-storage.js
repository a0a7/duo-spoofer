// Secure storage wrapper for Auto 2FA
// Encrypts data before storing in local storage

class SecureStorage {
  constructor() {
    this.encryptionManager = new EncryptionManager();
    this.migrationKey = 'auto2fa_migrated_to_encrypted';
    
    // Browser API compatibility
    this.browserAPI = (function() {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome;
      } else if (typeof browser !== 'undefined' && browser.runtime) {
        return browser;
      } else {
        throw new Error('No compatible browser API found');
      }
    })();
  }

  // Check if we need to migrate from sync storage to encrypted local storage
  async checkAndMigrate() {
    // Check if we've already migrated
    const migrated = await new Promise((resolve) => {
      browser.storage.local.get(this.migrationKey, (result) => {
        resolve(result[this.migrationKey] || false);
      });
    });

    if (migrated) {
      return false; // No migration needed
    }

    // Check if there's data in sync storage to migrate
    const syncData = await new Promise((resolve) => {
      browser.storage.sync.get(null, (result) => {
        resolve(result);
      });
    });

    if (Object.keys(syncData).length === 0) {
      // No data to migrate, mark as migrated
      await browser.storage.local.set({ [this.migrationKey]: true });
      return false;
    }

    console.log('Migrating data from sync storage to encrypted local storage...');
    
    try {
      // Migrate all data from sync to encrypted local storage
      for (const [key, value] of Object.entries(syncData)) {
        await this.setItem(key, value);
      }

      // Clear sync storage after successful migration
      await browser.storage.sync.clear();
      
      // Mark migration as complete
      await browser.storage.local.set({ [this.migrationKey]: true });
      
      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  // Get an item from encrypted storage
  async getItem(key) {
    return new Promise((resolve, reject) => {
      browser.storage.local.get(key, async (result) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
          return;
        }

        if (result[key] === undefined) {
          console.log(`Key ${key} not found in storage`);
          resolve(null);
          return;
        }

        try {
          console.log(`Attempting to decrypt data for key: ${key}`);
          const decryptedData = await this.encryptionManager.decrypt(result[key]);
          console.log(`Successfully decrypted data for key: ${key}`);
          resolve(decryptedData);
        } catch (error) {
          console.error(`Failed to decrypt data for key ${key}:`, error);
          
          // If this is a critical key like deviceInfo, let's try to recover
          if (key === 'deviceInfo') {
            console.log('Critical key failed decryption, checking for legacy data...');
            // Try to get data from sync storage as fallback
            browser.storage.sync.get(key, (syncResult) => {
              if (syncResult[key] && Object.keys(syncResult[key]).length > 0) {
                console.log('Found legacy data in sync storage, returning that');
                resolve(syncResult[key]);
              } else {
                console.log('No legacy data found, returning null');
                resolve(null);
              }
            });
          } else {
            // For other keys, just return null
            resolve(null);
          }
        }
      });
    });
  }

  // Set an item in encrypted storage
  async setItem(key, value) {
    return new Promise(async (resolve, reject) => {
      try {
        const encryptedData = await this.encryptionManager.encrypt(value);
        browser.storage.local.set({ [key]: encryptedData }, () => {
          if (browser.runtime.lastError) {
            reject(browser.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Remove an item from storage
  async removeItem(key) {
    return new Promise((resolve, reject) => {
      browser.storage.local.remove(key, () => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Get multiple items from encrypted storage
  async getItems(keys) {
    return new Promise((resolve, reject) => {
      browser.storage.local.get(keys, async (result) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
          return;
        }

        const decryptedResult = {};
        
        for (const [key, encryptedValue] of Object.entries(result)) {
          if (encryptedValue !== undefined) {
            try {
              decryptedResult[key] = await this.encryptionManager.decrypt(encryptedValue);
            } catch (error) {
              console.error(`Failed to decrypt data for key ${key}:`, error);
              // Skip corrupted entries
            }
          }
        }

        resolve(decryptedResult);
      });
    });
  }

  // Set multiple items in encrypted storage
  async setItems(items) {
    return new Promise(async (resolve, reject) => {
      try {
        const encryptedItems = {};
        
        for (const [key, value] of Object.entries(items)) {
          encryptedItems[key] = await this.encryptionManager.encrypt(value);
        }

        browser.storage.local.set(encryptedItems, () => {
          if (browser.runtime.lastError) {
            reject(browser.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Clear all encrypted local storage (except migration flag)
  async clear() {
    return new Promise((resolve, reject) => {
      browser.storage.local.get(null, (result) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
          return;
        }

        const keysToRemove = Object.keys(result).filter(key => key !== this.migrationKey);
        
        if (keysToRemove.length === 0) {
          resolve();
          return;
        }

        browser.storage.local.remove(keysToRemove, () => {
          if (browser.runtime.lastError) {
            reject(browser.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    });
  }

  // Device management methods

  // Get device info structure
  async getDeviceInfo() {
    try {
      // First try encrypted storage
      let deviceInfo = await this.getItem('deviceInfo');
      if (deviceInfo !== null) {
        return deviceInfo;
      }

      console.log('No encrypted deviceInfo found, checking fallback storage...');
      
      // Try unencrypted fallback
      deviceInfo = await this.getItemUnencrypted('deviceInfo');
      if (deviceInfo !== null) {
        console.log('Found deviceInfo in unencrypted fallback storage');
        return deviceInfo;
      }

      // Try sync storage as last resort
      deviceInfo = await new Promise((resolve) => {
        browser.storage.sync.get('deviceInfo', (result) => {
          resolve(result.deviceInfo || null);
        });
      });

      if (deviceInfo !== null) {
        console.log('Found deviceInfo in sync storage, attempting to migrate...');
        // Try to save to encrypted storage for next time
        try {
          await this.setItem('deviceInfo', deviceInfo);
          console.log('Successfully migrated deviceInfo to encrypted storage');
        } catch (error) {
          console.warn('Failed to migrate to encrypted storage, using fallback:', error);
          await this.setItemUnencrypted('deviceInfo', deviceInfo);
        }
      }

      return deviceInfo;
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }

  // Enhanced setDeviceInfo with fallback
  async setDeviceInfo(deviceInfo) {
    try {
      // First try encrypted storage
      await this.setItem('deviceInfo', deviceInfo);
      console.log('Successfully saved deviceInfo to encrypted storage');
      return;
    } catch (error) {
      console.warn('Failed to save to encrypted storage, using fallback:', error);
      
      try {
        // Use unencrypted fallback
        await this.setItemUnencrypted('deviceInfo', deviceInfo);
        console.log('Successfully saved deviceInfo to unencrypted fallback storage');
        return;
      } catch (fallbackError) {
        console.error('Failed to save to fallback storage:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Sanitize device info to ensure proper structure
  sanitizeDeviceInfo(info) {
    if (!info || info.pkey) {
      // Old format or no data, create new structure
      return {
        devices: info && info.pkey ? [info.pkey] : [],
        version: "1.7.0"
      };
    }
    
    // Ensure devices is an array
    if (!Array.isArray(info.devices)) {
      info.devices = [];
    }
    
    return {
      devices: info.devices,
      version: info.version || "1.7.0"
    };
  }

  // Get all devices
  async getAllDevices() {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      if (!deviceInfo || !deviceInfo.devices || deviceInfo.devices.length === 0) {
        return [];
      }

      const deviceData = await this.getItems(deviceInfo.devices);
      const devices = Object.values(deviceData).filter(device => device && device.pkey);
      
      return devices;
    } catch (error) {
      console.error("Failed to get all devices:", error);
      return [];
    }
  }

  // Get a specific device by ID
  async getDevice(deviceId) {
    try {
      return await this.getItem(deviceId);
    } catch (error) {
      console.error(`Failed to get device ${deviceId}:`, error);
      return null;
    }
  }

  // Add a new device
  async addDevice(device) {
    try {
      // Generate device key if not provided
      if (!device.pkey) {
        device.pkey = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
      }

      // Store the device
      await this.setItem(device.pkey, device);

      // Update device info
      const deviceInfo = await this.getDeviceInfo();
      if (!deviceInfo.devices.includes(device.pkey)) {
        deviceInfo.devices.push(device.pkey);
        await this.setDeviceInfo(deviceInfo);
      }

      return device;
    } catch (error) {
      console.error("Failed to add device:", error);
      throw error;
    }
  }

  // Remove a device
  async removeDevice(deviceId) {
    try {
      // Remove the device data
      await this.removeItem(deviceId);

      // Update device info
      const deviceInfo = await this.getDeviceInfo();
      deviceInfo.devices = deviceInfo.devices.filter(pkey => pkey !== deviceId);
      await this.setDeviceInfo(deviceInfo);

      return true;
    } catch (error) {
      console.error(`Failed to remove device ${deviceId}:`, error);
      throw error;
    }
  }

  // Clear all data
  async clearAll() {
    try {
      // Clear all local storage
      await new Promise((resolve) => {
        browser.storage.local.clear(() => {
          resolve();
        });
      });

      // Also clear sync storage for good measure
      await new Promise((resolve) => {
        browser.storage.sync.clear(() => {
          resolve();
        });
      });

      return true;
    } catch (error) {
      console.error("Failed to clear all data:", error);
      throw error;
    }
  }

  // Debug method to test encryption/decryption consistency
  async testEncryption() {
    try {
      const testData = { test: 'encryption test', timestamp: Date.now() };
      console.log('Testing encryption with data:', testData);
      
      // Test encrypt/decrypt cycle
      const encrypted = await this.encryptionManager.encrypt(testData);
      console.log('Encrypted data:', encrypted);
      
      const decrypted = await this.encryptionManager.decrypt(encrypted);
      console.log('Decrypted data:', decrypted);
      
      const matches = JSON.stringify(testData) === JSON.stringify(decrypted);
      console.log('Encryption test result:', matches ? 'PASS' : 'FAIL');
      
      return matches;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }

  // Debug method to inspect raw storage contents
  async debugStorageContents() {
    return new Promise((resolve) => {
      browser.storage.local.get(null, (result) => {
        console.log("Raw storage contents:", result);
        resolve(result);
      });
    });
  }

  // Fallback storage methods for when encryption fails
  async setItemUnencrypted(key, value) {
    return new Promise((resolve, reject) => {
      browser.storage.local.set({ [`unencrypted_${key}`]: value }, () => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          console.warn(`Stored ${key} without encryption as fallback`);
          resolve();
        }
      });
    });
  }

  async getItemUnencrypted(key) {
    return new Promise((resolve, reject) => {
      browser.storage.local.get(`unencrypted_${key}`, (result) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(result[`unencrypted_${key}`] || null);
        }
      });
    });
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SecureStorage = SecureStorage;
}
