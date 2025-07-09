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
    // Refresh device list immediately after successful activation
    await refreshDeviceList();
    // Hide setup page and show success page
    changeScreen("activationSuccess");
  } catch (error) {
    if (error == "Expired") {
      errorSplash.innerText = "Activation code expired. Create a new activation link and try again.";
    } else {
      // Send error to service worker console for debugging
      await chrome.runtime.sendMessage({ type: "debug", message: "ACTIVATION ERROR: " + (error.name || error.message || error.toString() || error) });
      
      // Timeouts will be caught here
      console.error("Activation error:", error.name || error.message || error.toString() || error);
      
      // Provide more specific error messages
      if (error.name === "InvalidCharacterError" || error.toString().includes("InvalidCharacterError")) {
        errorSplash.innerText = "Invalid activation code format. Please check the code and try again.";
      } else if (error.name === "DOMException" || error.toString().includes("DOMException")) {
        errorSplash.innerText = "Crypto operation failed. Make sure the extension has proper permissions.";
      } else if (error.message && error.message.includes("Crypto operation failed")) {
        errorSplash.innerText = "Failed to generate security keys. Try refreshing the page.";
      } else if (error.message && error.message.includes("Key export failed")) {
        errorSplash.innerText = "Failed to export security keys. Try refreshing the page.";
      } else if (error.toString && error.toString().includes("Invalid activation code")) {
        errorSplash.innerText = error.toString();
      } else if (error.toString && error.toString().includes("Request timed out")) {
        errorSplash.innerText = "Request timed out. Please check your internet connection and try again.";
      } else if (error.toString && error.toString().includes("Network error")) {
        errorSplash.innerText = "Network error. Please check your internet connection and try again.";
      } else {
        errorSplash.innerText = "Invalid code. Open the link sent to your inbox, and paste the code below.";
      }
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
  mainButtons[i].addEventListener("click", async function () {
    // Refresh the device list when going to main screen
    await refreshDeviceList();
    changeScreen("main");
    // Immediately update TOTP when going to main screen
    updateTOTP();
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
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome/index.html") });
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

// Function to refresh device list and update UI
async function refreshDeviceList() {
  const devices = await secureStorage.getAllDevices();
  console.log("refreshDeviceList: found", devices.length, "devices");
  
  let deviceSelect = document.getElementById("deviceSelect");
  
  // Clear existing options except "Add Device..."
  while (deviceSelect.children.length > 1) {
    deviceSelect.removeChild(deviceSelect.lastChild);
  }
  
  // Add devices to dropdown
  for (const device of devices) {
    let option = document.createElement("option");
    option.value = device.pkey || device.id; // Use pkey as primary, id as fallback
    option.text = device.name || `Device ${device.pkey}`;
    deviceSelect.appendChild(option);
    console.log("Added device to dropdown:", option.value, option.text);
  }
  
  // If we have devices, select the first one
  if (devices.length > 0) {
    deviceSelect.selectedIndex = 1; // First device (index 0 is "Add Device...")
    console.log("Selected first device, calling updateTOTP");
    updateTOTP();
  } else {
    deviceSelect.selectedIndex = 0; // "Add Device..." option
    document.getElementById("totpCode").textContent = "------";
    document.getElementById("totp").style.display = "none";
    console.log("No devices found, hiding TOTP");
  }
}

// Loads popup on startup and populates stored devices in the dropdown
document.addEventListener("DOMContentLoaded", async function () {
  // Show the content now that we're ready
  document.getElementById("content").style.display = "block";

  // Refresh device list
  await refreshDeviceList();
  let deviceSelect = document.getElementById("deviceSelect");

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
  const devices = await secureStorage.getAllDevices();
  if (devices.length === 0) {
    changeScreen("intro");
  } else {
    changeScreen("main");
  }

  // Start TOTP update interval
  totpInterval = setInterval(updateTOTP, 1000);
});

// Update TOTP display
async function updateTOTP() {
  let deviceSelect = document.getElementById("deviceSelect");
  let selectedDeviceId = deviceSelect.value;
  let totpElement = document.getElementById("totp");
  
  console.log("updateTOTP called with selectedDeviceId:", selectedDeviceId);
  
  if (selectedDeviceId === "-1" || !selectedDeviceId) {
    console.log("No device selected, hiding TOTP");
    document.getElementById("totpCode").textContent = "------";
    totpElement.style.display = "none";
    return;
  }

  try {
    const device = await secureStorage.getDevice(selectedDeviceId);
    console.log("Retrieved device for TOTP:", device ? "found" : "null");
    
    if (!device || (!device.secret && !device.hotp_secret)) {
      console.log("Device has no secret or hotp_secret, hiding TOTP");
      document.getElementById("totpCode").textContent = "------";
      totpElement.style.display = "none";
      return;
    }

    console.log("Showing TOTP element and generating code");
    // Show the TOTP element
    totpElement.style.display = "flex";

    // Generate TOTP using the correct secret property
    const secret = device.secret || device.hotp_secret;
    console.log("Using secret for TOTP:", secret ? "present" : "missing");
    const token = totp.generate(secret);
    document.getElementById("totpCode").textContent = token;

    // Update circle animation
    const circle = document.getElementById("totpCircle");
    const timeLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    circle.style.animationDelay = `-${30 - timeLeft}s`;
  } catch (error) {
    console.error("Error generating TOTP:", error);
    document.getElementById("totpCode").textContent = "Error";
    totpElement.style.display = "none";
  }
}

// Add click-to-copy functionality for TOTP
document.getElementById("totp").addEventListener("click", function() {
  const totpCode = document.getElementById("totpCode").textContent;
  if (totpCode && totpCode !== "------" && totpCode !== "Error") {
    navigator.clipboard.writeText(totpCode).then(() => {
      // Show visual feedback
      const originalText = totpCode;
      document.getElementById("totpCode").textContent = "Copied!";
      setTimeout(() => {
        document.getElementById("totpCode").textContent = originalText;
      }, 1000);
    }).catch(err => {
      console.error('Failed to copy TOTP code:', err);
    });
  }
});

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
      let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      
      if (!tab || !tab.url) {
        failedAttempts++;
        qrSearchText.textContent = "No active tab found...";
        console.log("No active tab found");
        return;
      }
      
      console.log("Checking tab:", tab.url);
      
      // Skip chrome:// and extension pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('moz-extension://') || tab.url.startsWith('about:')) {
        qrSearchText.textContent = "Please navigate to the Duo activation page...";
        console.log("Skipping system page:", tab.url);
        return;
      }
      
      // Check if it's a Duo page
      if (!tab.url.includes('duosecurity.com')) {
        qrSearchText.textContent = "Please navigate to your Duo activation page...";
        qrErrorText.textContent = `Current page: ${new URL(tab.url).hostname}`;
        return;
      }
      
      console.log("Sending message to content script on tab:", tab.id);
      
      const result = await chrome.tabs.sendMessage(tab.id, { task: "getQRCode" }).then((response) => {
        console.log("Content script response:", response);
        return response;
      }).catch((error) => {
        console.log("Content script error:", error);
        qrErrorText.textContent = "Content script not responding. Try refreshing the Duo page.";
        return null;
      });

      if (result && result.success) {
        // Found QR code
        clearInterval(searchInterval);
        qrSearchText.textContent = "QR code found! Processing...";
        console.log("Found activation code:", result.activationCode);
        
        try {
          console.log("Trying to activate device with code:", result.activationCode);
          await activateDevice(result.activationCode);
          // Refresh device list immediately after successful activation
          await refreshDeviceList();
          changeScreen("activationSuccess");
        } catch (error) {
          qrErrorText.textContent = "Failed to activate device. Please try manual activation.";
          console.error("Activation error:", error.name || error.message || error.toString() || error);
        }
      } else if (result && result.error) {
        qrSearchText.textContent = "Scanning page for QR code...";
        qrErrorText.textContent = result.error;
        console.log("QR scan result:", result.error);
      } else if (result === null) {
        qrSearchText.textContent = "Waiting for page to load...";
        qrErrorText.textContent = "Make sure you're on the Duo activation page";
      }
    } catch (error) {
      // Tab might not have content script, that's okay
      failedAttempts++;
      console.log("QR scan attempt", failedAttempts, "error:", error);
      qrSearchText.textContent = `Scanning... (attempt ${failedAttempts})`;
      
      if (failedAttempts > 15) {
        clearInterval(searchInterval);
        qrSearchText.textContent = "Could not find QR code automatically.";
        qrErrorText.textContent = "Make sure you're on the Duo activation page and try manual activation below.";
      }
    }
  }, 2000); // Check every 2 seconds
}

// Helper function to validate Base64 string
function isValidBase64(str) {
  try {
    // Check if string contains only valid Base64 characters
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(str)) {
      return false;
    }
    
    // Try to decode and re-encode to verify validity
    const decoded = atob(str);
    const reEncoded = btoa(decoded).replace(/=+$/, '');
    return reEncoded === str;
  } catch (error) {
    return false;
  }
}

// Device activation
async function activateDevice(rawCode) {
  // Send debug info to service worker console
  console.log("Starting device activation with code:", rawCode);
  
  // Split activation code into its two components: identifier and host.
  let code = rawCode.split("-");
  console.log("Code parts:", JSON.stringify(code));

  if (code.length !== 2) {
    console.log("VALIDATION FAILED: Expected 2 parts, got " + code.length);
    throw "Invalid activation code format. Expected format: IDENTIFIER-BASE64HOST";
  }
  
  // Validate code part lengths before attempting Base64 decode
  if (code[0].length !== 20 || code[1].length !== 38) {
    console.log(`VALIDATION FAILED: Expected 20-38 chars, got ${code[0].length}-${code[1].length}`);
    throw "Invalid activation code. Expected 20 character identifier and 38 character Base64 host. Code: " + code[0] + "-" + code[1];
  }
  
  // Validate Base64 format before decoding
  if (!isValidBase64(code[1])) {
    throw "Invalid activation code. The host portion is not valid Base64.";
  }
  
  // Decode Base64 to get host
  let host;
  let identifier = code[0];
  
  try {
    console.log("Decoding Base64 host:", code[1]);
    host = atob(code[1]);
    console.log("Decoded host:", host);
    
    // Validate that the decoded host looks like a valid hostname
    if (!host.includes('.')) {
      throw "Decoded host does not appear to be a valid hostname";
    }
  } catch (error) {
    console.error("Failed to decode Base64 host:", error);
    throw "Invalid activation code. The host portion contains invalid Base64 characters.";
  }

  console.log("Activation code validated, generating keys...");

  let url = "https://" + host + "/push/v2/activation/" + identifier;
  
  // Create new pair of RSA keys
  let keyPair;
  try {
    console.log("Generating RSA key pair...");
    keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-512",
      },
      true,
      ["sign", "verify"]
    );
    console.log("RSA key pair generated successfully");
  } catch (error) {
    console.error("Failed to generate RSA key pair:", error);
    throw new Error("Crypto operation failed: " + (error.message || error.toString()));
  }

  // Convert public key to PEM format to send to Duo
  let pemFormat;
  let publicRaw;
  let privateRaw;
  
  try {
    console.log("Exporting public key...");
    pemFormat = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    pemFormat = btoa(String.fromCharCode(...new Uint8Array(pemFormat)))
      .match(/.{1,64}/g)
      .join("\n");
    pemFormat = `-----BEGIN PUBLIC KEY-----\n${pemFormat}\n-----END PUBLIC KEY-----`;

    console.log("Exporting keys for storage...");
    // Exporting keys returns an array buffer. Convert it to Base64 string for storing
    publicRaw = arrayBufferToBase64(await crypto.subtle.exportKey("spki", keyPair.publicKey));
    privateRaw = arrayBufferToBase64(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
    console.log("Keys exported successfully");
  } catch (error) {
    console.error("Failed to export keys:", error);
    throw new Error("Key export failed: " + (error.message || error.toString()));
  }

  // Pick a randomized model and tablet
  const appleDevices = ["iPad", "iPad Air", "iPad Pro", "iPad mini"];
  const androidDevices = ["Galaxy Tab A8", "Galaxy Tab A7 Lite", "Galaxy Tab S10 Ultra", "Lenovo Tab P11"];
  const activationInfo = {
    customer_protocol: "1",
    pubkey: pemFormat,
    pkpush: "rsa-sha512",
    jailbroken: "false",
    architecture: "arm64",
    region: "US",
    app_id: "com.duosecurity.duomobile",
    full_disk_encryption: true,
    passcode_status: true,
    app_version: "4.59.0",
    app_build_number: "459010",
    version: "13",
    manufacturer: "unknown",
    language: "en",
    security_patch_level: "2022-11-05",
  };
  // New discovery: Platform = iOS is case-sensitive, Android is not
  if (Math.random() < 0.5) {
    // Apple
    activationInfo.platform = "iOS";
    activationInfo.model = appleDevices[Math.floor(Math.random() * appleDevices.length)];
  } else {
    // Android
    activationInfo.platform = "Android";
    activationInfo.model = androidDevices[Math.floor(Math.random() * androidDevices.length)];
  }

  // Grab number of devices for naming the new device
  console.log("Getting device info...");
  let deviceInfo = await getDeviceInfo();
  let devicesCount = deviceInfo.devices.length;
  console.log("Device info retrieved, device count:", devicesCount);
  
  // Initialize new HTTP request
  console.log("Making activation request toFound activation code: bP8y23artNmWleiX6JP2-YXBpLTgyZDU2MjYzLmR1b3NlY3VyaXR5LmNvbQ:", url);
  let request = new XMLHttpRequest();
  request.open("POST", url, true);
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  // Put onload() in a Promise. It will be raced with a timeout promise
  let newData = new Promise((resolve, reject) => {
    request.onload = async function () {
      let result = JSON.parse(request.responseText);
      // If successful
      if (result.stat == "OK") {
        // Get device info as JSON
        let newDevice = result.response;
        delete newDevice.customer_logo; // takes up too much space
        // Add custom data per device
        (newDevice.name = `${activationInfo.model} (#${devicesCount + 1})`), // not gonna do a bounds check on this one
          (newDevice.clickLevel = "1"); // default value is zero click login (1 means zero-click, 2 means one-click)
        newDevice.host = host;
        newDevice.publicRaw = publicRaw;
        newDevice.privateRaw = privateRaw;

        document.getElementById("newDeviceDisplay").innerHTML = `<b>${activationInfo.model}</b> (${activationInfo.platform})`;
        
        // Store device using secure storage instead of direct browser storage
        const deviceData = {
          id: newDevice.pkey,
          name: newDevice.name,
          secret: newDevice.secret || newDevice.hotp_secret, // Use secret or hotp_secret
          hotp_secret: newDevice.hotp_secret, // Keep original property too
          host: host,
          publicRaw: publicRaw,
          privateRaw: privateRaw,
          clickLevel: newDevice.clickLevel,
          // Include any other necessary properties from newDevice
          ...newDevice
        };
        
        console.log("Storing device data:", deviceData);
        console.log("Device secret being stored:", deviceData.secret);
        console.log("Device hotp_secret being stored:", deviceData.hotp_secret);
        console.log("NewDevice from Duo response:", newDevice);
        
        await secureStorage.addDevice(deviceData);
        
        resolve("Success");
      } else {
        // If we receive a result from Duo and the status is FAIL, the activation code is likely expired
        console.error(result);
        reject("Expired");
      }
    };
    
    request.onerror = function () {
      reject("Network error. Please check your internet connection and try again.");
    };
    
    request.onabort = function () {
      reject("Request was cancelled.");
    };
  });
  // await new Promise(resolve => setTimeout(resolve, 2000));
  // Append URL parameters and begin request
  request.send(new URLSearchParams(activationInfo));
  // Create timeout promise
  let timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      request.abort(); // Abort the request if it times out
      reject("Request timed out. Please check your internet connection and try again.");
    }, 10000); // Increased timeout to 10 seconds
  });
  // Wait for response, or timeout at 1.5s
  // We need a timeout because request.send() doesn't return an error when an exception occurs, and onload() is obviously never called
  await Promise.race([newData, timeout]);
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
  await new Promise((resolve) => chrome.storage.session.clear(resolve));
  await new Promise((resolve) => chrome.storage.local.clear(resolve));
}

async function sendMessage(intent) {
  let response = await chrome.runtime.sendMessage(intent);
  console.log(response);
}

async function getDeviceInfo() {
  return sendToWorker({ intent: "deviceInfo" });
}

async function sendToWorker(intent) {
  try {
    console.log("Sending message to worker:", intent);
    let response = await chrome.runtime.sendMessage(intent);
    console.log("Worker response:", response);
    
    if (response && response.error) {
      console.error("Worker returned error:", response.reason);
      throw response.reason;
    }
    
    return response;
  } catch (error) {
    console.error("Failed to send message to worker:", error);
    throw error;
  }
}

async function setDeviceInfo(info, update = true) {
  return sendToWorker({
    intent: "setDeviceInfo",
    params: {
      info,
    },
  }).then((response) => {
    // Response is the sanitized data
    if (update) updatePage(response);
    // Might as well return it even if it does nothing atm
    return response;
  });
}

async function getSingleDeviceInfo(pkey) {
  if (!pkey) {
    const info = await getDeviceInfo();
    pkey = info.activeDevice;
  }
  return await new Promise((resolve) =>
    chrome.storage.sync.get(pkey, (json) => {
      // First key is always the identifier
      resolve(json[Object.keys(json)[0]]);
    })
  );
}

function setSingleDeviceInfo(rawDevice) {
  return chrome.storage.sync.set({ [rawDevice.pkey]: rawDevice });
}

function buildRequest(info, method, path, extraParam) {
  return sendToWorker({
    intent: "buildRequest",
    params: {
      info,
      method,
      path,
      extraParam,
    },
  });
}

let verifiedTransactions;
let verifiedPushUrgID;


// Approves the transaction ID provided, denies all others
// Throws an exception if no transactions are active
async function handleTransaction(info, transactions, txID) {
  if (transactions.length == 0) {
    throw "No transactions found (request expired)";
  }
  let selectedTransaction = transactions.find((sample) => sample.urgid == txID);
  if (selectedTransaction) {
    // Only approve this one
    // First check if its a duo verified push
    let stepUpCode = selectedTransaction.step_up_code_info;
    if (stepUpCode) {
      console.log("Duo verified push");
      let container = document.getElementById("pin-container");
      container.innerHTML = ""; // clear previous elements
      container.style.gridTemplateColumns = `repeat(${stepUpCode.num_digits}, 1fr)`;
      // Set input box to # of digits requested
      for (let i = 0; i < stepUpCode.num_digits; i++) {
        const input = document.createElement("input");
        input.maxLength = 1;
        input.className = "pin-input";
        // Validate only digits
        input.addEventListener("beforeinput", (e) => {
          let value = e.target.value;
          let nextVal = value.substring(0, e.target.selectionStart) + (e.data ?? "") + value.substring(e.target.selectionEnd);
          // Only allow a single digit
          if (!/^\d?$/.test(nextVal)) {
            e.preventDefault();
          }
        });
        // Go to next entry when there's an input
        input.addEventListener("input", (e) => {
          const value = e.target.value;
          const nextInput = container.children[i + 1];
          if (value.length === 1 && nextInput) {
            nextInput.focus();
          }
        });
        // Go back
        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !input.value && i > 0) {
            container.children[i - 1].focus();
          }
        });
        container.appendChild(input);
      }
      // Store this transaction for after we receive the code
      verifiedTransactions = transactions;
      verifiedPushUrgID = txID;
      changeScreen("verifiedPush");
    } else {
      // Not a verified push, approve it
      await sendToWorker({
        intent: "approveTransaction",
        params: {
          info,
          transactions,
          txID,
        },
      });
      // await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, { answer: "approve", txId: urgID });
      // If successful (throws an error otherwise)
      successDetails.innerHTML = traverse(selectedTransaction.attributes);
      failedAttempts = 0;
      changeScreen("success");
    }
  } else {
    // Selected transaction not found! Deny everything (txID == -1 [probably])
    await sendToWorker({
      intent: "approveTransaction",
      params: {
        info,
        transactions,
        txID,
      },
    });
    changeScreen("denied");
  }
}

function base64ToArrayBuffer(base64) {
  let binary_string = atob(base64);
  let len = binary_string.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert an ArrayBuffer to Base64 encoded string
function arrayBufferToBase64(buffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Updates page information to new device information
const deviceSettingsDiv = document.getElementById("deviceSettingsDiv");
async function updatePage(deviceInfo) {
  // Remove devices already added
  Array.from(deviceSelect.options).forEach(option => {
    if (option.value !== "-1") deviceSelect.removeChild(option);
  });
  let allDevices = await secureStorage.getAllDevices();
  // Add to select device box
  for (let device of allDevices) {
    let newDevice = document.createElement("option");
    newDevice.value = device.pkey || device.id; // Use pkey as primary, id as fallback
    newDevice.innerText = device.name;
    deviceSelect.appendChild(newDevice);
    deviceSelect.insertBefore(newDevice, deviceSelect.firstChild);
  }
  // If we're not on the "Add device..." device
  if (deviceInfo.activeDevice != -1) {
    let activeDevice = allDevices.find(device => (device.pkey || device.id) === deviceInfo.activeDevice);
    if (activeDevice) {
      deviceSettingsDiv.style.display = "revert";
      deviceName.value = activeDevice.name;
      deviceNameResponse.innerHTML = "Name";
      // Update selected device value
      deviceSelect.value = deviceInfo.activeDevice;
      updateClickSlider(activeDevice.clickLevel);
    }
  } else {
    // Hide device settings
    deviceSettingsDiv.style.display = "none";
  }
  // Show device TOTP
  updateTOTP();
}