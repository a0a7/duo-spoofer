<div class="bg-white pt-8 pb-6 ">
<img src="logo.png" class="h-12 mx-auto">
</div>


<div class="text-center mt-4 w-[85%] md:w-1/2 mx-auto pb-20">
    <h1 class="text-2xl font-bold mb-2">welcome to autoauth</h1>
    <p class="text-gray-700">
        This extension works by handling authentication automatically in the background whenever you are presented with a Duo prompt in this browser. Duo authentication on other devices still works as normal.
    </p>
    <p class="text-xs text-gray-500 mt-4">
        <b>Disclaimer</b><br>
        This is an independent project and is not recognized, endorsed, or affiliated with Duo Mobile or Cisco Technology. All product names, logos, and brands are property of their respective owners.
        This extension is intended for educational purposes only and should not be used to bypass security measures without proper authorization. 
        Use at your own risk. The developers are not responsible for any misuse or consequences arising from the use of this extension.
        <br><b>Security</b><br>
        All of your information stays between Duo, your organization, and your browser. We (autoauth) don't collect or share any of your data. All credentials and information related to your duo account are stored locally in encrypted browser storage. 
        The authenticity of the above claims can be verified at any time by looking at the source code of this extension, which is <b>open-source and available on GitHub at <a href="https://github.com/a0a7/autoauth" target="_blank">https://github.com/a0a7/autoauth</a></b>.
        Still, there is an inherent security risk in using this extension, as it automates the authentication process.
        Please ensure you understand the implications of using this extension, especially in environments where security is important.
    </p>
    <h2 class="text-2xl font-bold mt-4 my-2">setup instructions</h2>
    <ol class="list-decimal list-inside text-left mx-auto max-w-xl space-y-2">
        <li>
            Visit a login page for your organization that requires Duo Mobile for authentication and trigger a sign in prompt.
            <br>
            <span class="text-slate-500 font-semibold text-s">
                If you are not presented with a Duo prompt, clear your cookies/site data for duo and try again.
            </span> 
        </li>
        <li>Click the <span class="font-semibold text-blue-600">Other Options</span> link.</li>
        <img src="steps/step0.png" class="w-[50%]">
        <li>Select <span class="font-semibold">Manage Devices</span> at the bottom of the list of options.</li>
        <img src="steps/step1.png" class="w-[50%]">
        <li>Authenticate with Duo (for the last time)</li>
        <li>Click <span class="font-semibold">Add a Device</span>.</li>
        <img src="steps/step2.png" class="w-[35%]">
        <li>Select the <span class="font-semibold">Duo Mobile</span> option.</li>
        <img src="steps/step3.png" class="w-[50%]">
        <li>
            Click the blue <span class="font-semibold text-blue-600">I have a tablet</span> link at the bottom of the popup, then click <span class="font-semibold">Next</span>
            <span class="text-slate-500 font-semibold text-s">(you don't have to download Duo Mobile).</span>
        </li>
        <img src="steps/step4.png" class="w-[40%] inline">
        <img src="steps/step5.png" class="w-[40%] inline">
        <li>
            When presented with a QR code, open the extension popup by clicking on the extension icon.
            <br>
            <span class="text-slate-500 font-semibold text-s">
                It should scan your QR code automatically. If it doesn't work, proceed to step 9.
            </span>
        </li>
        <img src="steps/step6.png" class="w-[40%]">
    </ol>
    <h2 class="text-xl font-bold mt-6 mb-2">Manual Activation</h2>
    <ol class="list-decimal list-inside text-left mx-auto max-w-xl space-y-2" start="9">
        <li>Click <span class="font-semibold">"Get an activation link instead"</span> and email it to yourself.</li>
        <img src="steps/step7.png" class="w-[40%]">
        <li>Open the email <span class="text-slate-500 font-semibold text-s">(on your computer and not on your phone)</span>.</li>
        <li>Copy the activation code from the bottom of the page and paste it into the extension popup.</li>
        <img src="steps/step8.png" class="w-[50%] inline">
    </ol>
    <h2 class="text-xl font-bold mt-6 mb-2">Usage</h2>
    <div class="text-left mx-auto max-w-xl space-y-2">
        The next time you go to sign in with Duo, click the blue Other options text.
        <img src="steps/step0.png" class="w-[50%]">
        Then, select the bottommost <span class="font-semibold">Duo Push</span> option. It will be subtitled either "Send to iOS" or "Send to Android" depending on what device the extension was registered as.
        <img src="steps/step9.png" class="w-[85%]">
        After this, you should be completely set up and all future duo prompts should be handled automatically in the background!
        <br><br>
        <b class="text  -center">
            If you experience any problems, you can leave an issue on Github at <a style="color: #38f" href="https://github.com/a0a7/autoauth" target="_blank">https://github.com/a0a7/autoauth</a>.
        </b>
    </div>
</div>