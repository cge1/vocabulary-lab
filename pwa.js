let deferredInstallPrompt=null;
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid=()=>/android/i.test(navigator.userAgent);

function ensureInstallModal(){
  let modal=document.getElementById('installHelpModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='installHelpModal';
  modal.hidden=true;
  modal.innerHTML=`
    <div id="installHelpBackdrop" style="position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:9998"></div>
    <div role="dialog" aria-modal="true" aria-labelledby="installHelpTitle" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,480px);max-height:82vh;overflow:auto;background:#fff;border-radius:18px;padding:22px;z-index:9999;box-shadow:0 24px 80px rgba(0,0,0,.28)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
        <div><div style="font-size:26px">📲</div><h2 id="installHelpTitle" style="margin:6px 0 4px">Install Vocabulary Lab</h2></div>
        <button id="installHelpClose" aria-label="Close" style="border:0;background:#eef2f7;border-radius:10px;width:38px;height:38px;font-size:22px;cursor:pointer">×</button>
      </div>
      <div id="installHelpBody" style="line-height:1.6;color:#344054"></div>
      <button id="installHelpDone" style="width:100%;margin-top:16px;border:0;border-radius:11px;padding:12px 16px;background:#315efb;color:#fff;font-weight:700;font-size:16px;cursor:pointer">Got it</button>
    </div>`;
  document.body.appendChild(modal);
  const close=()=>{modal.hidden=true};
  modal.querySelector('#installHelpClose').addEventListener('click',close);
  modal.querySelector('#installHelpDone').addEventListener('click',close);
  modal.querySelector('#installHelpBackdrop').addEventListener('click',close);
  return modal;
}

function showInstallGuide(){
  const modal=ensureInstallModal(),title=modal.querySelector('#installHelpTitle'),body=modal.querySelector('#installHelpBody');
  if(isIOS()){
    title.textContent='Install on iPhone / iPad';
    body.innerHTML=`
      <p><b>iPhone does not allow a website button to open the install prompt directly.</b></p>
      <ol style="padding-left:22px">
        <li>Open this Vocabulary Lab page in <b>Safari</b> (or use your browser's Share menu on newer iOS versions).</li>
        <li>Tap the <b>Share</b> button.</li>
        <li>Scroll down and choose <b>Add to Home Screen</b>.</li>
        <li>Turn on <b>Open as Web App</b> if that option appears.</li>
        <li>Tap <b>Add</b>.</li>
      </ol>
      <p style="margin-bottom:0"><b>If you opened the site inside another app</b> (for example an in-app browser), first choose <b>Open in Safari</b>, then follow the steps above.</p>`;
  }else if(isAndroid()){
    title.textContent='Install on Android';
    body.innerHTML=`
      <ol style="padding-left:22px">
        <li>Open this page in <b>Chrome</b> for the best install experience.</li>
        <li>Tap Chrome's <b>⋮</b> menu.</li>
        <li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li>
        <li>Confirm the installation.</li>
      </ol>
      <p style="margin-bottom:0">If the install option is not shown yet, keep this page open briefly, refresh once, and check the Chrome menu again.</p>`;
  }else{
    title.textContent='Install Vocabulary Lab';
    body.innerHTML=`<p>Your browser did not provide a direct install prompt. In Chrome or Edge, open the browser menu and choose <b>Install Vocabulary Lab</b> / <b>Install app</b>. You can continue using the website normally even without installing it.</p>`;
  }
  modal.hidden=false;
}

function updateInstallUI(){
  const installed=isStandalone();
  const banner=document.getElementById('installBanner');
  const mainBtn=document.getElementById('installAppBtn');
  const iosHelp=document.getElementById('iosInstallHelp');
  const installedText=document.getElementById('installedText');
  if(installed){
    if(banner)banner.hidden=true;
    if(mainBtn)mainBtn.hidden=true;
    if(iosHelp)iosHelp.hidden=true;
    if(installedText)installedText.hidden=false;
    return;
  }
  if(installedText)installedText.hidden=true;
  if(mainBtn){
    mainBtn.hidden=false;
    mainBtn.disabled=false;
    mainBtn.title=deferredInstallPrompt?'Install Vocabulary Lab':'Show installation instructions';
    mainBtn.textContent=isIOS()?'Add to Home Screen':'Install App';
  }
  if(iosHelp)iosHelp.hidden=!isIOS();
  if(banner)banner.hidden=!deferredInstallPrompt;
}

async function installApp(){
  if(isStandalone())return;
  if(deferredInstallPrompt){
    try{
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    }catch(e){
      showInstallGuide();
    }
    deferredInstallPrompt=null;
    updateInstallUI();
    return;
  }
  showInstallGuide();
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  updateInstallUI();
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  updateInstallUI();
});
window.addEventListener('DOMContentLoaded',()=>{
  const a=document.getElementById('installAppBtn'),b=document.getElementById('installBannerBtn');
  if(a)a.addEventListener('click',installApp);
  if(b)b.addEventListener('click',installApp);
  updateInstallUI();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service worker registration failed:',err));
  }
});
