import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const cfg=window.VOCAB_FIREBASE_CONFIG||{};
const configured=Boolean(cfg.apiKey&&cfg.authDomain&&cfg.projectId&&cfg.appId);
const GUEST_KEY='vocab_lab_guest_snapshot_v1';
const USER_PREFIX='vocab_lab_user_snapshot_';
const LAST_UID_KEY='vocab_lab_last_uid';
const MIGRATED_PREFIX='vocab_lab_guest_migrated_';
let auth=null,db=null,currentUser=null,activeUid=null,syncTimer=null,syncing=false,pendingSync=false,lastSyncAt=0;

const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function readJSON(key,fallback=null){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch(e){return fallback}}
function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function normalize(s){return window.VocabState.normalize(s||{})}
function stateNow(){return window.VocabState.get()}
function stateCacheKey(uid){return USER_PREFIX+uid}
function eventTime(r){return Math.max(Number(r?.last)||0,Number(r?.lastCorrect)||0)}
function mergeCounterMaps(a={},b={}){const out={};for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))out[k]=Math.max(Number(a?.[k])||0,Number(b?.[k])||0);return out}
function mergeDeviceTotals(a={},b={}){const out={};for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))out[k]={answered:Math.max(Number(a?.[k]?.answered)||0,Number(b?.[k]?.answered)||0),correct:Math.max(Number(a?.[k]?.correct)||0,Number(b?.[k]?.correct)||0)};return out}
function mergeStates(aRaw,bRaw){
  const a=normalize(aRaw),b=normalize(bRaw),out={studied:{},wrong:{},wrongRemoved:{},deviceTotals:mergeDeviceTotals(a.deviceTotals,b.deviceTotals),history:[],updatedAt:Math.max(a.updatedAt||0,b.updatedAt||0)};
  for(const k of new Set([...Object.keys(a.studied),...Object.keys(b.studied)])){
    const x=a.studied[k],y=b.studied[k];if(!x)out.studied[k]=clone(y);else if(!y)out.studied[k]=clone(x);else{const newer=(Number(x.last)||0)>=(Number(y.last)||0)?x:y;out.studied[k]={...clone(newer),count:Math.max(Number(x.count)||0,Number(y.count)||0),last:Math.max(Number(x.last)||0,Number(y.last)||0)}}
  }
  for(const k of new Set([...Object.keys(a.wrongRemoved||{}),...Object.keys(b.wrongRemoved||{})]))out.wrongRemoved[k]=Math.max(Number(a.wrongRemoved?.[k])||0,Number(b.wrongRemoved?.[k])||0);
  for(const k of new Set([...Object.keys(a.wrong),...Object.keys(b.wrong)])){
    const x=a.wrong[k],y=b.wrong[k],latest=!x?y:!y?x:eventTime(x)>=eventTime(y)?x:y;if(!latest)continue;
    const misses=mergeCounterMaps(x?.missesByDevice,y?.missesByDevice),corrects=mergeCounterMaps(x?.correctByDevice,y?.correctByDevice);
    const rec={...clone(latest),missesByDevice:misses,correctByDevice:corrects,count:Object.values(misses).reduce((n,v)=>n+(Number(v)||0),0),correctAfterWrong:Object.values(corrects).reduce((n,v)=>n+(Number(v)||0),0),last:Math.max(Number(x?.last)||0,Number(y?.last)||0),lastCorrect:Math.max(Number(x?.lastCorrect)||0,Number(y?.lastCorrect)||0)};
    if(eventTime(rec)>(Number(out.wrongRemoved[k])||0))out.wrong[k]=rec;
  }
  const hist=new Map();
  for(const h of [...(a.history||[]),...(b.history||[])]){const key=h.id||[h.deviceId||'',h.label||'',h.time||0,h.total||0,h.correct||0].join('|');if(!hist.has(key))hist.set(key,h)}
  out.history=[...hist.values()].sort((x,y)=>(Number(x.time)||0)-(Number(y.time)||0)).slice(-150);
  return normalize(out);
}

function setBadge(text,kind='local'){const el=$('syncBadge');if(!el)return;el.textContent=text;el.className='sync-badge '+kind}
function authMessage(text='',kind=''){const el=$('authMessage');if(!el)return;el.textContent=text;el.className='small auth-message '+kind}
function setAuthControlsEnabled(enabled){['authEmail','authPassword','signInBtn','signUpBtn','resetPasswordBtn','syncNowBtn','signOutBtn'].forEach(id=>{const el=$(id);if(el)el.disabled=!enabled})}
function updateUserUI(user){
  const out=$('signedOutPanel'),inn=$('signedInPanel'),notice=$('firebaseSetupNotice');
  if(notice)notice.hidden=configured;
  if(!configured){if(out)out.hidden=false;if(inn)inn.hidden=true;setAuthControlsEnabled(false);setBadge('Local mode','local');authMessage('Firebase has not been connected yet. Your progress is still saved on this device.');return}
  setAuthControlsEnabled(true);
  if(user){if(out)out.hidden=true;if(inn)inn.hidden=false;if($('accountEmail'))$('accountEmail').textContent=user.email||'Signed in';setBadge(syncing?'Syncing…':'Cloud sync on',syncing?'syncing':'synced');updateLastSyncText()}
  else{if(out)out.hidden=false;if(inn)inn.hidden=true;setBadge('Local mode','local')}
}
function updateLastSyncText(){const el=$('lastSyncText');if(!el)return;el.textContent=lastSyncAt?'Last synced '+new Date(lastSyncAt).toLocaleString():'Cloud sync ready.'}
function friendlyError(error){const code=String(error?.code||'');if(code.includes('invalid-credential'))return'Incorrect email or password.';if(code.includes('email-already-in-use'))return'This email already has an account.';if(code.includes('weak-password'))return'Use a stronger password (at least 6 characters).';if(code.includes('invalid-email'))return'Enter a valid email address.';if(code.includes('too-many-requests'))return'Too many attempts. Try again later.';if(code.includes('network-request-failed'))return'Network error. Check your internet connection.';return error?.message||'Something went wrong.'}

async function syncNow(){
  if(!configured||!currentUser||!db)return;
  if(syncing){pendingSync=true;return}
  syncing=true;pendingSync=false;setBadge('Syncing…','syncing');updateUserUI(currentUser);
  try{
    const ref=doc(db,'users',currentUser.uid,'app','state');
    const snap=await getDoc(ref);
    const local=stateNow(),remote=snap.exists()?snap.data()?.state:null;
    const merged=remote?mergeStates(local,remote):normalize(local);
    window.VocabState.apply(merged);writeJSON(stateCacheKey(currentUser.uid),merged);
    await setDoc(ref,{state:merged,schemaVersion:4,clientUpdatedAt:Date.now(),updatedAt:serverTimestamp()});
    lastSyncAt=Date.now();setBadge('Synced','synced');updateLastSyncText();authMessage('Progress is synced across your signed-in devices.','success');
  }catch(error){console.error(error);setBadge('Sync error','error');authMessage('Cloud sync failed: '+friendlyError(error),'error')}
  finally{syncing=false;if(pendingSync){pendingSync=false;setTimeout(syncNow,250)}}
}
window.queueCloudSync=snapshot=>{
  if(configured&&currentUser){writeJSON(stateCacheKey(currentUser.uid),snapshot);if(syncing){pendingSync=true;return}clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,1200)}
  else if(!localStorage.getItem(LAST_UID_KEY)){writeJSON(GUEST_KEY,snapshot)}
};
window.syncVocabularyNow=syncNow;

function bindUI(){
  const signInBtn=$('signInBtn'),signUpBtn=$('signUpBtn'),signOutBtn=$('signOutBtn'),resetBtn=$('resetPasswordBtn'),syncBtn=$('syncNowBtn');
  if(!configured){updateUserUI(null);return}
  signInBtn?.addEventListener('click',async()=>{authMessage('Signing in…');try{await signInWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value)}catch(e){authMessage(friendlyError(e),'error')}});
  signUpBtn?.addEventListener('click',async()=>{authMessage('Creating account…');try{await createUserWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value)}catch(e){authMessage(friendlyError(e),'error')}});
  signOutBtn?.addEventListener('click',async()=>{try{if(currentUser)writeJSON(stateCacheKey(currentUser.uid),stateNow());await signOut(auth)}catch(e){authMessage(friendlyError(e),'error')}});
  resetBtn?.addEventListener('click',async()=>{const email=$('authEmail').value.trim();if(!email){authMessage('Enter your email address first.','error');return}try{await sendPasswordResetEmail(auth,email);authMessage('Password reset email sent.','success')}catch(e){authMessage(friendlyError(e),'error')}});
  syncBtn?.addEventListener('click',syncNow);
}

async function init(){
  bindUI();
  if(!configured)return;
  try{
    const app=initializeApp(cfg);auth=getAuth(app);db=getFirestore(app);await setPersistence(auth,browserLocalPersistence);
    onAuthStateChanged(auth,async user=>{
      const previous=activeUid;
      if(user){
        currentUser=user;activeUid=user.uid;
        const current=stateNow(),lastUid=localStorage.getItem(LAST_UID_KEY);
        if(!lastUid&&!localStorage.getItem(GUEST_KEY))writeJSON(GUEST_KEY,current);
        let base=readJSON(stateCacheKey(user.uid),null);
        if(!base){const migrated=localStorage.getItem(MIGRATED_PREFIX+user.uid);if(!migrated){base=current;try{localStorage.setItem(MIGRATED_PREFIX+user.uid,'1')}catch(e){}}else base={}}
        window.VocabState.apply(normalize(base));try{localStorage.setItem(LAST_UID_KEY,user.uid)}catch(e){}
        updateUserUI(user);await syncNow();
      }else{
        if(previous)writeJSON(stateCacheKey(previous),stateNow());
        currentUser=null;activeUid=null;try{localStorage.removeItem(LAST_UID_KEY)}catch(e){}
        const guest=readJSON(GUEST_KEY,null);if(guest)window.VocabState.apply(normalize(guest));
        updateUserUI(null);authMessage('Signed out. Local mode is active.');
      }
    });
  }catch(error){console.error(error);setBadge('Cloud unavailable','error');authMessage('Firebase could not start: '+friendlyError(error),'error')}
}

init();
