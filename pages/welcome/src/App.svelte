<div class="bg-white pt-8 pb-6 ">
<img src="logo.png" class="h-12 mx-auto">
</div>

<div class="text-center mt-4 w-[85%] md:w-1/2 mx-auto pb-20">
    <h1 class="text-2xl font-bold mb-2">welcome to autoauth</h1>
    <p class="text-gray-700">
        The purpose of this extension is to stop you having to deal with Duo mobile. It handles authentication automatically in the background whenever you are presented with a Duo prompt in this browser.
    </p>
    <p class="text-xs text-gray-500 mt-4">
        <b>Disclaimer</b><br>
        This is an independent project and is not recognized, endorsed, or affiliated with Duo Mobile or Cisco Technology. All product names, logos, and brands are property of their respective owners.
    </p>
    <h2 class="text-3xl font-bold mt-4 my-2">Setup Instructions</h2>
    <ol class="list-decimal list-inside text-left mx-auto max-w-xl space-y-2">
        <li>
            Visit a login page for your organization that requires Duo Mobile for authentication and sign in.
            <br>
            <span class="text-slate-500 font-semibold text-s">
                If you are not presented with a Duo prompt, try again in an incognito window.
            </span> 
        </li>
        <li>Click the <span class="font-semibold text-blue-600">Other Options</span> link.</li>
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
</div>