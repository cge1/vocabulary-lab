let deferredInstallPrompt=null;
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
function updateInstallUI(){
  const installed=isStandalone();
  const banner=document.getElementById('installBanner');
  const mainBtn=document.getElementById('installAppBtn');
  const iosHelp=document.getElementById('iosInstallHelp');
  const installedText=document.getElementById('installedText');
  if(installed){if(banner)banner.hidden=true;if(mainBtn)mainBtn.hidden=true;if(iosHelp)iosHelp.hidden=true;if(installedText)installedText.hidden=false;return}
  if(installedText)installedText.hidden=true;
  if(deferredInstallPrompt){if(banner)banner.hidden=false;if(mainBtn){mainBtn.hidden=false;mainBtn.disabled=false}if(iosHelp)iosHelp.hidden=true}
  else if(isIOS()){if(banner)banner.hidden=true;if(mainBtn){mainBtn.hidden=false;mainBtn.disabled=false}if(iosHelp)iosHelp.hidden=false}
  else{if(banner)banner.hidden=true;if(mainBtn){mainBtn.hidden=false;mainBtn.disabled=true;mainBtn.title='Install becomes available after the browser confirms PWA eligibility.'}}
}
async function installApp(){
  if(isStandalone())return;
  if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch(e){}deferredInstallPrompt=null;updateInstallUI();return}
  if(isIOS()){const h=document.getElementById('iosInstallHelp');if(h)h.hidden=false}
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallUI()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallUI()});
window.addEventListener('DOMContentLoaded',()=>{
  const a=document.getElementById('installAppBtn'),b=document.getElementById('installBannerBtn');
  if(a)a.addEventListener('click',installApp);if(b)b.addEventListener('click',installApp);updateInstallUI();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service worker registration failed:',err))}
});
