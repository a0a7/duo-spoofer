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
      this.browserAPI.storage.local.get(this.migrationKey, (result) => {
        resolve(result[this.migrationKey] || false);
      });
    });

    if (migrated) {
      return false; // No migration needed
    }

    // Check if there's data in sync storage to migrate
    const syncData = await new Promise((resolve) => {
      this.browserAPI.storage.sync.get(null, (result) => {
        resolve(result);
      });
    });

    if (Object.keys(syncData).length === 0) {
      // No data to migrate, mark as migrated
      await this.browserAPI.storage.local.set({ [this.migrationKey]: true });
      return false;
    }

    console.log('Migrating data from sync storage to encrypted local storage...');
    
    try {
      // Migrate all data from sync to encrypted local storage
      for (const [key, value] of Object.entries(syncData)) {
        await this.setItem(key, value);
      }

      // Clear sync storage after successful migration
      await this.browserAPI.storage.sync.clear();
      
      // Mark migration as complete
      await this.browserAPI.storage.local.set({ [this.migrationKey]: true });
      
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
      this.browserAPI.storage.local.get(key, async (result) => {
        if (this.browserAPI.runtime.lastError) {
          reject(this.browserAPI.runtime.lastError);
          return;
        }

        if (result[key] === undefined) {
          resolve(null);
          return;
        }

        try {
          const decryptedData = await this.encryptionManager.decrypt(result[key]);
          resolve(decryptedData);
        } catch (error) {
          console.error(`Failed to decrypt data for key ${key}:`, error);
          // Return null instead of rejecting to handle corrupted data gracefully
          resolve(null);
        }
      });
    });
  }

  // Set an item in encrypted storage
  async setItem(key, value) {
    return new Promise(async (resolve, reject) => {
      try {
        const encryptedData = await this.encryptionManager.encrypt(value);
        this.browserAPI.storage.local.set({ [key]: encryptedData }, () => {
          if (this.browserAPI.runtime.lastError) {
            reject(this.browserAPI.runtime.lastError);
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
      this.browserAPI.storage.local.remove(key, () => {
        if (this.browserAPI.runtime.lastError) {
          reject(this.browserAPI.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Get multiple items from encrypted storage
  async getItems(keys) {
    return new Promise((resolve, reject) => {
      this.browserAPI.storage.local.get(keys, async (result) => {
        if (this.browserAPI.runtime.lastError) {
          reject(this.browserAPI.runtime.lastError);
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

        this.browserAPI.storage.local.set(encryptedItems, () => {
          if (this.browserAPI.runtime.lastError) {
            reject(this.browserAPI.runtime.lastError);
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
      this.browserAPI.storage.local.get(null, (result) => {
        if (this.browserAPI.runtime.lastError) {
          reject(this.browserAPI.runtime.lastError);
          return;
        }

        const keysToRemove = Object.keys(result).filter(key => key !== this.migrationKey);
        
        if (keysToRemove.length === 0) {
          resolve();
          return;
        }

        this.browserAPI.storage.local.remove(keysToRemove, () => {
          if (this.browserAPI.runtime.lastError) {
            reject(this.browserAPI.runtime.lastError);
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
      const deviceInfo = await this.getItem("deviceInfo");
      return this.sanitizeDeviceInfo(deviceInfo);
    } catch (error) {
      console.error("Failed to get device info:", error);
      return this.sanitizeDeviceInfo(null);
    }
  }

  // Set device info structure
  async setDeviceInfo(info) {
    const sanitized = this.sanitizeDeviceInfo(info);
    await this.setItem("deviceInfo", sanitized);
    return sanitized;
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
      if (!deviceInfo.devices || deviceInfo.devices.length === 0) {
        return [];
      }

      const deviceData = await this.getItems(deviceInfo.devices);
      return Object.values(deviceData).filter(device => device && device.pkey);
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
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SecureStorage = SecureStorage;
}
