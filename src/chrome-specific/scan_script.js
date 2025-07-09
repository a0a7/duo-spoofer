// Wait for popup.js to ask for QR
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.task === "getQRCode") {
        /**
         * Credit to Easy Duo Authentication for this traditional and universal prompt detection
         * repo got deleted tho idk why ):
         * https://github.com/SparkShen02/Easy-Duo-Authentication/blob/main/content.js
        */
        let code = document.querySelector('img.qr'); // Traditional Prompt
        code = (code) ? code : document.querySelector('img[data-testid="qr-code"]'); // Universal Prompt
        code = (code) ? code : document.querySelector('.qr-container img'); // QR container variant
        code = (code) ? code : document.querySelector('img[src*="qr?value="]'); // Generic QR URL pattern
        code = (code) ? code : document.querySelector('img[alt*="QR"]'); // Alt text containing QR
        code = (code) ? code : document.querySelector('img[src*="qr"]'); // Src containing qr
        code = (code) ? code : document.querySelector('.qr-code img'); // QR code class
        
        if (code && code.src) {
            console.log("QR code found:", code.src);
            // Extract activation code from QR URL
            const urlParams = new URL(code.src);
            let activationCode = urlParams.searchParams.get('value');
            if (!activationCode && code.src.includes('value=')) {
                activationCode = code.src.substring(code.src.indexOf('value=') + 6);
                // Remove any additional parameters
                const ampIndex = activationCode.indexOf('&');
                if (ampIndex !== -1) {
                    activationCode = activationCode.substring(0, ampIndex);
                }
            }
            
            if (activationCode) {
                sendResponse({ success: true, activationCode: activationCode });
            } else {
                sendResponse({ success: false, error: "Could not extract activation code from QR" });
            }
        } else {
            console.log("No QR code found on page");
            sendResponse({ success: false, error: "No QR code found" });
        }
    }
    return true; // Keep the message channel open for async response
});
