// Wait for popup.js to ask for QR
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    
    if (message.task === "getQRCode") {
        console.log("Searching for QR code on page:", window.location.href);
        
        /**
         * Credit to Easy Duo Authentication for this traditional and universal prompt detection
         * repo got deleted tho idk why ):
         * https://github.com/SparkShen02/Easy-Duo-Authentication/blob/main/content.js
        */
        let code = document.querySelector('img.qr'); // Traditional Prompt
        console.log("img.qr found:", !!code);
        
        code = (code) ? code : document.querySelector('img[data-testid="qr-code"]'); // Universal Prompt
        console.log("img[data-testid='qr-code'] found:", !!code);
        
        code = (code) ? code : document.querySelector('.qr-container img'); // QR container variant
        console.log(".qr-container img found:", !!code);
        
        code = (code) ? code : document.querySelector('img[src*="qr?value="]'); // Generic QR URL pattern
        console.log("img[src*='qr?value='] found:", !!code);
        
        code = (code) ? code : document.querySelector('img[alt*="QR"]'); // Alt text containing QR
        console.log("img[alt*='QR'] found:", !!code);
        
        code = (code) ? code : document.querySelector('img[src*="qr"]'); // Src containing qr
        console.log("img[src*='qr'] found:", !!code);
        
        code = (code) ? code : document.querySelector('.qr-code img'); // QR code class
        console.log(".qr-code img found:", !!code);
        
        // Debug: log all images on the page
        const allImages = document.querySelectorAll('img');
        console.log(`Found ${allImages.length} images on page:`);
        allImages.forEach((img, index) => {
            console.log(`Image ${index}:`, {
                src: img.src,
                alt: img.alt,
                className: img.className,
                testId: img.getAttribute('data-testid')
            });
        });
        
        if (code && code.src) {
            console.log("QR code found:", code.src);
            // Extract activation code from QR URL
            let activationCode;
            
            try {
                const urlParams = new URL(code.src);
                activationCode = urlParams.searchParams.get('value');
                console.log("URL params extraction result:", activationCode);
            } catch (e) {
                console.log("Failed to parse as URL, trying string extraction");
            }
            
            if (!activationCode && code.src.includes('value=')) {
                activationCode = code.src.substring(code.src.indexOf('value=') + 6);
                // Remove any additional parameters
                const ampIndex = activationCode.indexOf('&');
                if (ampIndex !== -1) {
                    activationCode = activationCode.substring(0, ampIndex);
                }
                // URL decode the value
                try {
                    activationCode = decodeURIComponent(activationCode);
                    console.log("String extraction + decode result:", activationCode);
                } catch (e) {
                    console.log("Failed to URL decode:", e);
                }
            }
            
            if (activationCode) {
                console.log("Final extracted activation code:", activationCode);
                sendResponse({ success: true, activationCode: activationCode });
            } else {
                console.log("Could not extract activation code from QR");
                sendResponse({ success: false, error: "Could not extract activation code from QR" });
            }
        } else {
            console.log("No QR code found on page");
            sendResponse({ success: false, error: "No QR code found" });
        }
    }
    return true; // Keep the message channel open for async response
});
