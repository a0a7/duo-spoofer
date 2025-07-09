// Browser compatibility layer
const browserAPI = (function() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  } else if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
  } else {
    throw new Error('No compatible browser API found');
  }
})();

// otplib
import "./libs/buffer.js";
import "./libs/index.js";
const { totp } = window.otplib;

// Initialize secure storage
const secureStorage = new SecureStorage();

// Determines which slide should be visible on startup page
let slideIndex = 0;

// Help button
document.getElementById("helpButton").addEventListener("click", function () {
  changeScreen("failedAttempts");
  failedAttempts = 0;
});

// Submit activation
let errorSplash = document.getElementById("errorSplash");
let activateButton = document.getElementById("activateButton");
let activateCode = document.getElementById("code");

activateButton.addEventListener("click", async function () {
  // Disable button so user can't spam it
  activateButton.disabled = true;
  errorSplash.innerText = "Activating...";
  activateButton.innerText = "Working...";

  try {
    // Make request. Throws an error if an error occurs
    await activateDevice(activateCode.value);
    // Hide setup page and show success page
    changeScreen("activationSuccess");
  } catch (error) {
    if (error == "Expired") {
      errorSplash.innerText = "Activation code expired. Create a new activation link and try again.";
    } else {
      // Timeouts will be caught here
      console.error(error);
      errorSplash.innerText = "Invalid code. Open the link sent to your inbox, and paste the code below.";
    }
  } finally {
    // Re-enable button
    activateButton.disabled = false;
    activateButton.innerText = "Retry";
  }
});

// Switch to main page after success button is pressed
let mainButtons = document.getElementsByClassName("toMainScreen");
for (let i = 0; i < mainButtons.length; i++) {
  mainButtons[i].addEventListener("click", function () {
    changeScreen("main");
  });
}

// From main page to add device
document.getElementById("addDevice").addEventListener("click", function () {
  changeScreen("intro");
});

// Intro button brings user to activation
document.getElementById("introButton").addEventListener("click", function () {
  changeScreen("activation");
  getQRCode();
});

// Open welcome page
document.getElementById("helpButton").addEventListener("click", function () {
  browserAPI.tabs.create({ url: browserAPI.runtime.getURL("welcome/index.html") });
});

// Open settings page
document.getElementById("gear").addEventListener("click", function () {
  browserAPI.tabs.create({ url: browserAPI.runtime.getURL("options.html") });
});

// Remove devices
document.getElementById("removeDevice").addEventListener("click", function () {
  removeDevice();
});

// Remove device function
async function removeDevice() {
  let deviceSelect = document.getElementById("deviceSelect");
  let selectedIndex = deviceSelect.selectedIndex;

  if (selectedIndex === 0) {
    return; // Don't remove the "Add Device..." option
  }

  let deviceId = deviceSelect.value;
  
  // Remove from storage
  await secureStorage.removeDevice(deviceId);
  
  // Remove from select element
  deviceSelect.remove(selectedIndex);
  
  // Select the first option (Add Device...)
  deviceSelect.selectedIndex = 0;
  
  // Update UI
  updateTOTP();
  changeScreen("main");
}

let totpInterval = null;

// Loads popup on startup and populates stored devices in the dropdown
document.addEventListener("DOMContentLoaded", async function () {
  // Show the content now that we're ready
  document.getElementById("content").style.display = "block";

  // Get stored devices and populate dropdown
  const devices = await secureStorage.getAllDevices();
  let deviceSelect = document.getElementById("deviceSelect");
  
  // Clear existing options except "Add Device..."
  while (deviceSelect.children.length > 1) {
    deviceSelect.removeChild(deviceSelect.lastChild);
  }
  
  // Add devices to dropdown
  for (const device of devices) {
    let option = document.createElement("option");
    option.value = device.id;
    option.text = device.name;
    deviceSelect.appendChild(option);
  }

  // Set up device selection handler
  deviceSelect.addEventListener("change", function () {
    if (this.value === "-1") {
      changeScreen("intro");
    } else {
      changeScreen("main");
      updateTOTP();
    }
  });

  // Determine which screen to show
  if (devices.length === 0) {
    changeScreen("intro");
  } else {
    // Select the first device and show main screen
    deviceSelect.selectedIndex = 1; // First device (index 0 is "Add Device...")
    changeScreen("main");
    updateTOTP();
  }

  // Start TOTP update interval
  totpInterval = setInterval(updateTOTP, 1000);
});

// Update TOTP display
async function updateTOTP() {
  let deviceSelect = document.getElementById("deviceSelect");
  let selectedDeviceId = deviceSelect.value;
  
  if (selectedDeviceId === "-1" || !selectedDeviceId) {
    document.getElementById("totpCode").textContent = "------";
    return;
  }

  try {
    const device = await secureStorage.getDevice(selectedDeviceId);
    if (!device || !device.secret) {
      document.getElementById("totpCode").textContent = "------";
      return;
    }

    // Generate TOTP
    const token = totp.generate(device.secret);
    document.getElementById("totpCode").textContent = token;

    // Update circle animation
    const circle = document.getElementById("totpCircle");
    const timeLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    circle.style.animationDelay = `-${30 - timeLeft}s`;
  } catch (error) {
    console.error("Error generating TOTP:", error);
    document.getElementById("totpCode").textContent = "Error";
  }
}

// Screen management
function changeScreen(screenName) {
  // Hide all screens
  let screens = document.getElementsByClassName("screen");
  for (let i = 0; i < screens.length; i++) {
    screens[i].style.display = "none";
  }
  
  // Show the requested screen
  let targetScreen = document.getElementById(screenName);
  if (targetScreen) {
    targetScreen.style.display = "block";
  }
}

// QR Code scanning
let searchInterval = null;
let failedAttempts = 0;

async function getQRCode() {
  const qrSearchText = document.getElementById("qrSearchText");
  const qrErrorText = document.getElementById("qrErrorText");
  
  qrSearchText.textContent = "Searching for a QR code...";
  qrErrorText.textContent = "";
  
  // Start searching for QR code
  searchInterval = setInterval(async () => {
    try {
      let [tab] = await browserAPI.tabs.query({ active: true, lastFocusedWindow: true });
      
      const result = await browserAPI.tabs.sendMessage(tab.id, { task: "getQRCode" }).then((response) => {
        return response;
      }).catch((error) => {
        return null;
      });

      if (result && result.success) {
        // Found QR code
        clearInterval(searchInterval);
        qrSearchText.textContent = "QR code found! Processing...";
        
        try {
          await activateDevice(result.activationCode);
          changeScreen("activationSuccess");
        } catch (error) {
          qrErrorText.textContent = "Failed to activate device. Please try manual activation.";
          console.error("Activation error:", error);
        }
      }
    } catch (error) {
      // Tab might not have content script, that's okay
      failedAttempts++;
      
      if (failedAttempts > 10) {
        clearInterval(searchInterval);
        qrSearchText.textContent = "Could not find QR code automatically.";
        qrErrorText.textContent = "Please use manual activation below.";
      }
    }
  }, 2000); // Check every 2 seconds
}

// Device activation
async function activateDevice(activationCode) {
  if (!activationCode) {
    throw new Error("Activation code is required");
  }

  // Extract the code from URL if it's a full URL
  let code = activationCode;
  if (activationCode.includes('activate/')) {
    const parts = activationCode.split('activate/');
    if (parts.length > 1) {
      code = parts[1].split('?')[0]; // Remove any query parameters
    }
  }

  // Simulate device activation (replace with actual API call)
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        // This would normally be an API call to Duo
        // For now, we'll create a mock device
        const deviceId = Date.now().toString();
        const deviceName = `Device ${new Date().toLocaleDateString()}`;
        
        // Generate a mock secret (in real implementation, this comes from Duo)
        const secret = generateMockSecret();
        
        await secureStorage.addDevice({
          id: deviceId,
          name: deviceName,
          secret: secret,
          activationCode: code
        });
        
        // Update the device dropdown
        const deviceSelect = document.getElementById("deviceSelect");
        const option = document.createElement("option");
        option.value = deviceId;
        option.text = deviceName;
        deviceSelect.appendChild(option);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 1000);
  });
}

function generateMockSecret() {
  // Generate a random base32 secret for testing
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Clean up intervals when popup closes
window.addEventListener('beforeunload', () => {
  if (totpInterval) {
    clearInterval(totpInterval);
  }
  if (searchInterval) {
    clearInterval(searchInterval);
  }
});

// Debug functions (can be removed in production)
async function clearAllData() {
  await new Promise((resolve) => browserAPI.storage.session.clear(resolve));
  await new Promise((resolve) => browserAPI.storage.local.clear(resolve));
}

async function sendMessage(intent) {
  let response = await browserAPI.runtime.sendMessage(intent);
  console.log(response);
}
