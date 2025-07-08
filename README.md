# Auto 2FA
Login through Duo Mobile in your browser.

The Duo Mobile app can be a nuisance; you might've lost your phone or maybe you're prone to getting distracted by Instagram. Now you can login with just a click ([or hands-free!](#login-clicks)).

Auto 2FA is currently on [Chrome, Edge](https://chromewebstore.google.com/detail/auto-2fa/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/auto-2fa/). Safari was considered, but there's no way I'm paying $100/yr to be an Apple Developer. Outdated Safari source is available on this page if you would like to build it yourself, but it won't be on the App Store unless someone with a developer membership wants to publish it for the community. If you'd like to see this project ported to another browser, open an issue.

Disclaimer
----------
This is an independent project and is not recognized, endorsed, or affiliated with Duo Mobile or Cisco Technology. All product names, logos, and brands are property of their respective owners.

How it Works
------------
Auto 2FA utilizes the knowledge gained from reverse engineering the official phone app (checkout [this repo](https://github.com/revalo/duo-bypass)). Turns out it's a simple process:

1. Activation
> Auto 2FA as a new Duo Mobile device. Auto 2FA will communicate with Duo's API activation endpoint and register itself as your new iOS / Android tablet. "Device information" is created during this, and it's synced to your browser account if your settings allow it (see [Privacy](#privacy)).
2. Approving transactions
> A transaction, or a push request, represents a login attempt. When clicked, Auto 2FA approves a single transaction without asking you for approval for a seamless login (see [Login Clicks](#login-clicks)). If there are multiple push requests, you'll compare their details to weed out old or malicious ones.

Security
--------
> [!CAUTION]
> This extension is experimental! Auto 2FA stores encrypted device data in local browser storage. While the data is encrypted using AES-GCM with a browser-specific key, if a malicious party got access to your browser and could break the encryption, they could potentially access your Duo Mobile device information.

To preface, I am not a cyber security expert. I have a basic understanding of 2FA. I do not recommend using this extension if Duo is protecting access to the nuclear football. Auto 2FA should only be used when both the risk and cost of compromising an account are practically zero.

Auto 2FA is a *practical* secure alternative to the Duo Mobile app. For typical Duo Mobile users, this extension strikes a great balance between security and convenience.

2-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* Auto 2FA. Auto 2FA now stores your device information encrypted in local storage rather than syncing it across devices. Here's some examples of risks:
1. Your browser is compromised by malware that can access local storage and break the encryption.
2. You use the extension on a shared computer and someone with technical expertise extracts the encrypted data.
3. Someone, who already has your Duo Mobile account password, and who also knows you use Auto 2FA, decides to steal your encrypted login data off your computer and attempts to decrypt it.
4. You are socially engineered to export your own Duo Mobile device information to an unauthorized party.
5. You click Auto 2FA by accident, and as it just so happens, someone who knows your username and your password tried to login at the same time and you just approved their login.

What should be clear is that these kinds of attacks are pretty unlikely to happen to someone who has a basic sense of security. As a result of this reasoning, and in my humble (and biased) opinion, you can rest easy knowing using Auto 2FA won't practically increase your chances of being the victim of any related cyber-attacks, and can safely use this extension.

#### Does this extension hack my Duo account to work?
No. Auto 2FA establishes itself as a new device using the same process as the phone app.
> But Cisco doesn't like it!

#### Are browser extensions safe to be used as 2-factor authenticators?
Probably. Many already exist. Extensions rely on the security of the browser they reside in. If the browser account is secure, then you shouldn't have anything to worry about. Modern browsers also protect extensions by using a system of [Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world) to separate them from each other and malicious code.

#### What happens if there are multiple login attempts at the same time?
If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details.

#### What's the safest way to use Auto 2FA?
1. Use two-click logins. This allows you to review every login attempt without auto-approving.
2. Use the extension only on trusted, personal devices with up-to-date security.
3. Use strong passwords (duh).
4. Keep your browser and operating system updated.

No Logins Found
----------------
If you keep seeing **No logins found!**, it means no push requests were sent to Auto 2FA. You probably sent the push request to another device (like your phone). Auto 2FA can't approve a request sent to a device it didn't create. You need to select **Other options**, and choose the device created by Auto 2FA. It's only then that you can click Auto 2FA and log in.

Login Clicks
------------
You can set the amount of clicks required to log you in with the slider in settings. If there are multiple active login attempts, Auto 2FA will always require you to review and select the correct one regardless of this setting.

### Zero-clicks
Least safe, most convenient. When you browse to a Duo login page (pages that match https://\*.duosecurity.com/frame/\*/auth/prompt\* or https://\*.duosecurity.com/frame/prompt\*), Auto 2FA will start trying to approve a single login the moment it finds one. No click required. This is unsafe as it will start checking for login attempts before yours fully loads. I'm considering requiring at least the IP addresses of the client and the transaction to match in order to approve this type of login (if you want this to be a feature, let me know).

### One-click
The default behavior. Clicking on the extension will approve a single login.

### Two-clicks
Most safe, least convenient. This is the Duo Mobile app behavior. Every login attempt will require you to review it before it's approved.

Privacy
-------
Auto 2FA stores its Duo Mobile device information encrypted in local browser storage. This means your device data stays on the specific browser/device where you activated it and is not synchronized across different browsers or devices. The encryption uses AES-GCM with a key derived from browser-specific characteristics, providing reasonable protection for local storage.

Your device information is no longer synced across devices for security reasons. If you want to use Auto 2FA on multiple devices, you'll need to activate it separately on each one, or use the export/import feature to manually transfer your encrypted data.

No information created by this extension is sent anywhere but to Duo Mobile, and there are no outside servers involved. However, your Duo Mobile device information can still be exported in settings for backup or manual transfer purposes. Do not send your exported data to anyone! This is strictly for backing up or manually transferring login data to other private machines you own.

----------------
Here are repositories that helped make Auto 2FA possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Feel free to open pull requests, share security concerns, or adapt Auto 2FA into a project of your own.
