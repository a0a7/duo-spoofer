// Wait for popup.js to ask for QR
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            try {
                const outerUrl = new URL(code.src);
                const encodedInnerUrl = outerUrl.searchParams.get('value');
                const outerDomain = outerUrl.hostname;

                let activationCode = null;

                if (encodedInnerUrl) {
                    const innerUrl = new URL(decodeURIComponent(encodedInnerUrl));
                    const activatePath = innerUrl.pathname;

                    // Extract code after /activate/
                    const match = activatePath.match(/\/activate\/(.+)$/);
                    if (match) {
                        const rawCode = match[1];
                        const base64Domain = btoa(outerDomain).replace(/=+$/, '');
                        activationCode = `${rawCode}-${base64Domain}`;

                        console.log("Final extracted activation code:", activationCode);
                        sendResponse({ success: true, activationCode: activationCode });
                        return;
                    }
                }
            } catch (e) {
                console.error("Error while processing activation code:", e);
            }

            // Fallback if nothing was returned successfully
            console.log("Could not extract activation code from QR");
            sendResponse({ success: false, error: "Could not extract activation code from QR" });
        } else {
            console.log("No QR code found on page");
            sendResponse({ success: false, error: "No QR code found" });
        }
    }
    return true; // Keep the message channel open for async response
});
