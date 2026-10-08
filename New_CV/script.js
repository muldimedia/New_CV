/* Franko's private suite — one entrance state, one card movement model. */
const $ = id => document.getElementById(id);
const keycardScreen=$('keycardScreen'), hotelDoor=$('hotelDoor'), keycard=$('keycard');
const keycardWrap=$('keycardWrap'), keycardStage=$('keycardStage');
const readerRing=$('readerRing'), readerPanel=document.querySelector('.reader-panel');
const readerStatus=$('readerStatus'), accessStatus=$('accessStatus');
const pinDisplay=$('pinDisplay'), pinKeys=document.querySelectorAll('.pin-key');
const pinClear=$('pinClear'), pinBackspace=$('pinBackspace');
const suiteDashboard=$('suiteDashboard'), suiteExit=$('suiteExit');
const profileHit=$('profileHit'), profileModal=$('profileModal'), profileClose=$('profileClose');
const easterEggPage=$('easterEggPage'), easterClose=$('easterClose');
const downloadCV=$('downloadCV'), contactForm=$('contactForm'), formStatus=$('formStatus');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const preferences={
  get(key,fallback) { try { return localStorage.getItem('franko-'+key) ?? fallback; } catch { return fallback; } },
  set(key,value) { try { localStorage.setItem('franko-'+key,value); } catch { /* Private browsing still works. */ } }
};
let theme=preferences.get('theme','dark');
let soundEnabled=preferences.get('sound','on')==='on';
function applyTheme() {
  document.documentElement.dataset.theme=theme;
  $('themeToggle').textContent=theme==='dark'?'Light theme':'Dark theme';
  $('themeToggle').setAttribute('aria-pressed',String(theme==='light'));
}
function updateSoundButton() {
  $('soundToggle').textContent=soundEnabled?'Sound on':'Sound off';
  $('soundToggle').setAttribute('aria-pressed',String(!soundEnabled));
  $('soundToggle').setAttribute('aria-label',soundEnabled?'Mute sounds':'Enable sounds');
}
applyTheme(); updateSoundButton();
$('themeToggle').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';preferences.set('theme',theme);applyTheme();});
$('soundToggle').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;preferences.set('sound',soundEnabled?'on':'off');updateSoundButton();
  if (!soundEnabled) stopAmbience();
  prepareAudio();
  if (masterGain && accessAudio) masterGain.gain.setTargetAtTime(soundEnabled?.32:0,accessAudio.currentTime,.03);
});

/* Procedural mechanical audio: motor, latch, door movement and soft close. */
let accessAudio, masterGain, noiseBuffer, ambience;
function prepareAudio(forMusic=false) {
  if (!soundEnabled && forMusic !== true) return;
  try {
    const Context=window.AudioContext||window.webkitAudioContext;
    if (!Context) return;
    if (!accessAudio) {
      accessAudio=new Context();masterGain=accessAudio.createGain();
      masterGain.gain.value=soundEnabled?.32:0;masterGain.connect(accessAudio.destination);
      noiseBuffer=accessAudio.createBuffer(1,accessAudio.sampleRate*2,accessAudio.sampleRate);
      const data=noiseBuffer.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.04-.02)/1.02;data[i]=previous*3.5;}
    }
    accessAudio.resume().catch(()=>{});
  } catch { /* Audio failure must never block access. */ }
}
document.addEventListener('pointerdown',()=>prepareAudio(),{capture:true});
document.addEventListener('keydown',()=>prepareAudio(),{capture:true});
function soundPart({delay=0,duration=.1,frequency=150,endFrequency=frequency,volume=.1,type='noise',cutoff=1000}) {
  if (!soundEnabled || !accessAudio || accessAudio.state!=='running') return;
  const now=accessAudio.currentTime+delay, gain=accessAudio.createGain(), filter=accessAudio.createBiquadFilter();
  const source=type==='noise'?accessAudio.createBufferSource():accessAudio.createOscillator();
  if(type==='noise')source.buffer=noiseBuffer;
  else {source.type=type;source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);}
  filter.type='lowpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(masterGain);
  source.start(now);source.stop(now+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
function playUnlockSound() {
  soundPart({duration:.28,type:'sawtooth',frequency:115,endFrequency:170,volume:.075,cutoff:500});
  soundPart({duration:.30,volume:.14,cutoff:1400});
  soundPart({delay:.24,duration:.055,volume:.65,cutoff:2600});
  soundPart({delay:.26,duration:.075,type:'triangle',frequency:290,endFrequency:90,volume:.2});
}
function playDoorSound(closing=false) {
  soundPart({duration:closing?.8:1.05,volume:.13,cutoff:550});
  soundPart({delay:.08,duration:.48,type:'sine',frequency:closing?95:75,endFrequency:closing?65:105,volume:.024});
}
function playCloseSound() {
  soundPart({duration:.15,type:'sine',frequency:100,endFrequency:42,volume:.40});
  soundPart({duration:.09,volume:.32,cutoff:700});
  soundPart({delay:.19,duration:.04,volume:.42,cutoff:2000});
}
function playRoomSound() {
  soundPart({duration:.028,volume:.16,cutoff:1700});
  soundPart({delay:.04,duration:.22,volume:.045,cutoff:500});
}
function stopAmbience() {
  if(ambience){const old=ambience;ambience=null;old.gain.gain.setTargetAtTime(.0001,accessAudio.currentTime,.08);old.source.stop(accessAudio.currentTime+.3);}
  $('quietAmbience').textContent='Play quiet ambience';$('quietAmbience').setAttribute('aria-pressed','false');
}
$('quietAmbience').addEventListener('click',()=>{
  if(ambience){stopAmbience();return;}
  soundEnabled=true;preferences.set('sound','on');updateSoundButton();prepareAudio();
  if(!accessAudio)return;
  masterGain.gain.setTargetAtTime(.32,accessAudio.currentTime,.03);
  const source=accessAudio.createBufferSource(),filter=accessAudio.createBiquadFilter(),gain=accessAudio.createGain();
  source.buffer=noiseBuffer;source.loop=true;filter.type='lowpass';filter.frequency.value=350;
  gain.gain.value=.0001;gain.gain.setTargetAtTime(.055,accessAudio.currentTime,.8);
  source.connect(filter);filter.connect(gain);gain.connect(masterGain);source.start();
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};ambience={source,gain};
  $('quietAmbience').textContent='Pause quiet ambience';$('quietAmbience').setAttribute('aria-pressed','true');
});

/* Authentication only advances while the physical card is aligned. */
let entranceState='idle', currentX=0,currentY=0,targetX=0,targetY=0;
let drag=null,motionFrame=0,suppressCardClick=false,aligned=false;
let holdStart=null,holdFrame=0,lastTap=null,lastSecond=-1;
let unlockTimers=[],pinTimer=0,enteredPin='',pinBusy=false;
const HOLD_MS=2500,DOUBLE_TAP_MS=1200,SECRET_PIN='2027';
function later(fn,delay){unlockTimers.push(setTimeout(fn,delay));}
function blocked(){return entranceState!=='idle'||profileModal.classList.contains('open')||easterEggPage.classList.contains('open')||document.hidden;}
function setProgress(value){keycardScreen.style.setProperty('--auth-progress',value);}
function resetHold(message){
  cancelAnimationFrame(holdFrame);holdFrame=0;holdStart=null;lastTap=null;lastSecond=-1;setProgress(0);
  if(message)accessStatus.textContent=message;
}
function isAligned(){
  const card=keycardWrap.getBoundingClientRect(),sensor=readerRing.getBoundingClientRect();
  return Math.abs(card.left+card.width/2-sensor.left-sensor.width/2)<=card.width*.28 &&
    Math.abs(card.top+card.height/2-sensor.top-sensor.height/2)<=card.height*.32;
}
function updateDetection(){
  const next=!blocked()&&!pinBusy&&!enteredPin&&isAligned();
  keycardWrap.classList.toggle('aligned',next);readerPanel.classList.toggle('near',next);
  if(next && holdStart===null){holdStart=performance.now();holdFrame=requestAnimationFrame(tickHold);}
  if(!next && holdStart!==null)resetHold('Move the card over the reader to begin.');
  aligned=next;
  if(entranceState==='idle'&&!pinBusy&&!enteredPin)readerStatus.textContent=next?'CARD DETECTED':'NFC / PIN · READY';
}
function tickHold(now){
  holdFrame=0;
  if(blocked()||pinBusy||enteredPin||!isAligned()){aligned=false;resetHold('Hold cancelled. Position the card to try again.');return;}
  const elapsed=now-holdStart,remaining=Math.max(0,Math.ceil((HOLD_MS-elapsed)/500)/2);
  setProgress(Math.min(1,elapsed/HOLD_MS));
  if(remaining!==lastSecond){lastSecond=remaining;accessStatus.textContent=`Hold steady · ${remaining}s, or tap twice`;}
  if(elapsed>=HOLD_MS){unlockDoor();return;}
  holdFrame=requestAnimationFrame(tickHold);
}
function bounds(x,y){
  const stage=keycardStage.getBoundingClientRect(),door=hotelDoor.getBoundingClientRect();
  const minX=stage.left-door.left+8,minY=stage.top-door.top+8;
  return {x:Math.max(minX,Math.min(stage.right-door.left-keycardWrap.offsetWidth-8,x)),
    y:Math.max(minY,Math.min(door.height-keycardWrap.offsetHeight-8,y))};
}
function renderCard(){keycardWrap.style.transform=`translate3d(${currentX}px, ${currentY}px, 0px)`;updateDetection();}
function moveCard(x,y,immediate=false){
  const pos=bounds(x,y);targetX=pos.x;targetY=pos.y;
  if(immediate||reducedMotion.matches){cancelAnimationFrame(motionFrame);motionFrame=0;currentX=targetX;currentY=targetY;renderCard();}
  else if(!motionFrame)motionFrame=requestAnimationFrame(animateCard);
}
function animateCard(){
  currentX+=(targetX-currentX)*.18;currentY+=(targetY-currentY)*.18;renderCard();
  if(Math.hypot(targetX-currentX,targetY-currentY)>.15)motionFrame=requestAnimationFrame(animateCard);
  else {motionFrame=0;currentX=targetX;currentY=targetY;renderCard();}
}
function restCard(){
  const mobile=keycardStage.clientWidth<=650;
  moveCard(mobile?10:Math.max(16,(hotelDoor.clientWidth-keycardWrap.offsetWidth)/2-110),
    Math.max(46,Math.min(95,hotelDoor.clientHeight*.14)),true);
}
function fitEntrance(){
  const controls=document.querySelector('.experience-controls');
  document.documentElement.style.setProperty('--controls-height',`${controls.offsetHeight}px`);
  if(entranceState==='idle'){resetHold();restCard();}
}
new ResizeObserver(fitEntrance).observe(document.querySelector('.experience-controls'));
window.visualViewport?.addEventListener('resize',fitEntrance);

function alignCard(){
  const door=hotelDoor.getBoundingClientRect(),sensor=readerRing.getBoundingClientRect();
  moveCard(sensor.left+sensor.width/2-door.left-keycardWrap.offsetWidth/2,
    sensor.top+sensor.height/2-door.top-keycardWrap.offsetHeight/2);
}
keycardStage.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||drag||blocked()||event.target.closest('button,.reader-zone,.entrance-guide'))return;
  const rect=hotelDoor.getBoundingClientRect();moveCard(event.clientX-rect.left-keycardWrap.offsetWidth/2,event.clientY-rect.top-keycardWrap.offsetHeight/2);
});
keycardWrap.addEventListener('pointerdown',event=>{
  if(event.button!==0||drag||blocked()||event.target.closest('button'))return;
  cancelAnimationFrame(motionFrame);motionFrame=0;targetX=currentX;targetY=currentY;suppressCardClick=false;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,cardX:currentX,cardY:currentY,moved:false};
  keycard.setPointerCapture(event.pointerId);
});
keycardWrap.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.hypot(dx,dy)>7)drag.moved=true;
  if(drag.moved){suppressCardClick=true;keycardWrap.classList.add('dragging');moveCard(drag.cardX+dx,drag.cardY+dy,true);}
});
function finishDrag(event){
  if(!drag||event.pointerId!==drag.id)return;
  suppressCardClick=drag.moved||event.type!=='pointerup';drag=null;keycardWrap.classList.remove('dragging');
  if(keycard.hasPointerCapture(event.pointerId))keycard.releasePointerCapture(event.pointerId);
  if(event.type!=='pointerup'){aligned=false;resetHold('Hold cancelled. Move the card to try again.');}
}
keycardWrap.addEventListener('pointerup',finishDrag);keycardWrap.addEventListener('pointercancel',finishDrag);
keycard.addEventListener('lostpointercapture',finishDrag);
function tapCard(){
  if(blocked())return;
  prepareAudio();
  if(!isAligned()||pinBusy||enteredPin){lastTap=null;accessStatus.textContent='Position the card over the reader first.';return;}
  const now=performance.now();
  if(lastTap!==null&&now-lastTap<=DOUBLE_TAP_MS){unlockDoor();return;}
  lastTap=now;accessStatus.textContent='Card detected · tap once more to unlock.';
}
keycard.addEventListener('click',event=>{
  if(event.target.closest('button'))return;
  if(suppressCardClick){suppressCardClick=false;return;}tapCard();
});
keycard.addEventListener('keydown',event=>{
  if(event.target!==keycard||blocked())return;
  const step=event.shiftKey?40:20,arrows={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(arrows[event.key]){event.preventDefault();moveCard(currentX+arrows[event.key][0],currentY+arrows[event.key][1],true);}
  if(event.key==='Home'){event.preventDefault();restCard();}
  if(['Enter',' '].includes(event.key)){event.preventDefault();if(event.repeat)return;if(isAligned())tapCard();else alignCard();}
});
const DOOR_MS=900,SUITE_FADE_MS=1600;
function afterDoorMotion(callback){
  const leaf=document.querySelector('.door-leaf-right');let done=false;
  const finish=()=>{if(done)return;done=true;leaf.removeEventListener('transitionend',onEnd);callback();};
  const onEnd=event=>{if(event.target===leaf&&event.propertyName==='transform')finish();};
  leaf.addEventListener('transitionend',onEnd);
  later(finish,reducedMotion.matches?40:DOOR_MS+80);
}
function unlockDoor(quick=false){
  if(blocked()||(!quick&&!isAligned()))return;
  entranceState='auth';resetHold();clearPin();cancelAnimationFrame(motionFrame);motionFrame=0;
  if(drag){if(keycard.hasPointerCapture(drag.id))keycard.releasePointerCapture(drag.id);drag=null;}
  keycardScreen.classList.add('presenting');setProgress(1);
  readerRing.classList.add('active');readerStatus.textContent='ACCESS GRANTED';accessStatus.textContent='Access granted · welcome to your suite.';
  prepareAudio();playUnlockSound();
  later(()=>{
    window.scrollTo({top:0,behavior:'instant'});applyRoom('101');suiteDashboard.scrollTop=0;suiteDashboard.classList.add('open');
    document.body.classList.add('revealing');
    void suiteDashboard.offsetWidth;
    requestAnimationFrame(()=>document.body.classList.add('suite-revealed'));
    afterDoorMotion(()=>{keycardScreen.style.display='none';});
    // Remove the doors as soon as they finish, while the slower suite fade continues.
    later(()=>{
      document.body.classList.remove('revealing','suite-revealed');
      entranceState='open';suiteExit.focus({preventScroll:true});
    },reducedMotion.matches?80:SUITE_FADE_MS+80);
    keycardScreen.classList.add('opening');playDoorSound();
  },reducedMotion.matches?40:320);
}
$('quickAccess').addEventListener('click',()=>unlockDoor(true));
function returnToDoor(){
  if(entranceState!=='open')return;
  entranceState='closing';clearTimeout(roomTimer);resetHold();stopAmbience();unlockTimers.forEach(clearTimeout);unlockTimers=[];
  window.scrollTo({top:0,behavior:'instant'});keycardScreen.style.display='flex';
  document.body.classList.add('revealing','closing-door','suite-revealed');keycardScreen.classList.add('opening');
  void keycardScreen.offsetWidth;
  requestAnimationFrame(()=>{
    afterDoorMotion(()=>{
      playCloseSound();suiteDashboard.classList.remove('open');
      document.body.classList.remove('revealing','closing-door','suite-revealed');applyRoom('101');suiteDashboard.scrollTop=0;
      keycardScreen.classList.remove('presenting');readerRing.classList.remove('active');
      entranceState='idle';clearPin();restCard();resetHold('Suite locked. Welcome back whenever you are ready.');
      keycard.focus({preventScroll:true});
    });
    document.body.classList.remove('suite-revealed');keycardScreen.classList.remove('opening');playDoorSound(true);
  });
}
suiteExit.addEventListener('click',returnToDoor);
window.addEventListener('resize',fitEntrance);
window.addEventListener('blur',()=>{resetHold();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetHold();stopAmbience();} syncLobbyPlayback();});
requestAnimationFrame(fitEntrance);

/* Four digits submit automatically; edits invalidate pending submissions. */
function updatePinDisplay(){pinDisplay.querySelectorAll('span').forEach((dot,i)=>dot.classList.toggle('filled',i<enteredPin.length));}
function clearPin(){clearTimeout(pinTimer);pinBusy=false;enteredPin='';pinDisplay.style.color='';pinDisplay.innerHTML='<span></span><span></span><span></span><span></span>';updatePinDisplay();}
function submitPin(){
  if(enteredPin.length!==4||entranceState!=='idle')return;
  pinBusy=true;resetHold();
  if(enteredPin===SECRET_PIN){
    readerRing.classList.add('active');readerStatus.textContent='PRIVATE ACCESS';playUnlockSound();
    pinTimer=setTimeout(()=>{clearPin();openQuiet();},380);
  }else{
    readerStatus.textContent='ACCESS DENIED';accessStatus.textContent='Code not recognised. Please try again.';
    pinDisplay.style.color='#d46a61';pinDisplay.innerHTML='<span>×</span><span>×</span><span>×</span><span>×</span>';
    pinTimer=setTimeout(()=>{clearPin();readerStatus.textContent='NFC / PIN · READY';},700);
  }
}
function addDigit(digit){
  if(blocked()||pinBusy||enteredPin.length>=4)return;
  resetHold();enteredPin+=digit;updatePinDisplay();readerStatus.textContent='ENTER ACCESS CODE';
  if(enteredPin.length===4)pinTimer=setTimeout(submitPin,120);
}
pinKeys.forEach(button=>button.addEventListener('click',()=>{if(button.dataset.pin)addDigit(button.dataset.pin);}));
pinClear.addEventListener('click',()=>{clearPin();updateDetection();});
pinBackspace.addEventListener('click',()=>{if(pinBusy)return;clearTimeout(pinTimer);enteredPin=enteredPin.slice(0,-1);updatePinDisplay();updateDetection();});
document.addEventListener('keydown',event=>{
  if(blocked()||event.target.closest('input,textarea,select'))return;
  if(/^[0-9]$/.test(event.key)){event.preventDefault();addDigit(event.key);}
  if(event.key==='Backspace'){event.preventDefault();pinBackspace.click();}
});

/* Modal focus stays in the current room; ambient audio is always opt-in. */
let modalOrigin=null;
function openModal(modal,focus){
  resetHold();modalOrigin=document.activeElement;modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';keycardScreen.inert=true;suiteDashboard.inert=true;focus.focus({preventScroll:true});
}
function closeModal(modal){
  modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';
  keycardScreen.inert=false;suiteDashboard.inert=false;modalOrigin?.focus({preventScroll:true});
}
function openProfile(){openModal(profileModal,profileClose);}
function closeProfile(){closeModal(profileModal);}
profileHit.addEventListener('click',event=>{event.stopPropagation();openProfile();});
profileClose.addEventListener('click',closeProfile);$('profilePhoto').addEventListener('click',closeProfile);
profileModal.addEventListener('click',event=>{if(event.target===profileModal)closeProfile();});
function openQuiet(){fadeLobby(true);playDoorSound();openModal(easterEggPage,easterClose);}
function closeQuiet(){stopAmbience();closeModal(easterEggPage);fadeLobby(false);readerRing.classList.remove('active');readerStatus.textContent='NFC / PIN · READY';}
easterClose.addEventListener('click',closeQuiet);
$('quietReturn').addEventListener('click',()=>{closeQuiet();if(entranceState==='idle')unlockDoor(true);});
document.addEventListener('keydown',event=>{
  const modal=profileModal.classList.contains('open')?profileModal:easterEggPage.classList.contains('open')?easterEggPage:null;
  if(event.key==='Escape'){
    if(modal===profileModal)closeProfile();else if(modal===easterEggPage)closeQuiet();
    else if(typeof reviewLightbox!=='undefined'&&reviewLightbox.classList.contains('open'))closeLightbox();
    else if(entranceState==='idle'){clearPin();resetHold();}
  }
  if(modal&&event.key==='Tab'){
    const elements=Array.from(modal.querySelectorAll('button,a[href],[tabindex="0"]'));
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});

/* Rooms remember the visitor's place, with a short interior-door transition. */
const roomTabs=document.querySelectorAll('.room-tab'),roomContents=document.querySelectorAll('.suite-room');
let activeRoom='101',roomTimer=0;
try{localStorage.removeItem('franko-room');}catch{}
if(!Array.from(roomTabs).some(tab=>tab.dataset.room===activeRoom))activeRoom='101';
function applyRoom(room){
  activeRoom=room;
  roomTabs.forEach(tab=>{const active=tab.dataset.room===room;tab.classList.toggle('active',active);tab.setAttribute('aria-current',active?'page':'false');});
  roomContents.forEach(content=>{content.classList.remove('room-leaving');content.classList.toggle('active',content.dataset.roomContent===room);});
}
applyRoom(activeRoom);
roomTabs.forEach(tab=>tab.addEventListener('click',()=>{
  clearTimeout(roomTimer);roomContents.forEach(content=>content.classList.remove('room-leaving'));
  if(tab.dataset.room===activeRoom)return;
  playRoomSound();document.querySelector('.suite-room.active')?.classList.add('room-leaving');
  roomTimer=setTimeout(()=>{applyRoom(tab.dataset.room);tab.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'nearest',inline:'nearest'});},reducedMotion.matches?0:160);
}));


/* =========================================================
   REVIEW CAROUSEL
========================================================= */

const reviewTrack =
  document.getElementById(
    "reviewTrack"
  );

const reviewPrev =
  document.getElementById(
    "reviewPrev"
  );

const reviewNext =
  document.getElementById(
    "reviewNext"
  );

const reviewCounter =
  document.getElementById(
    "reviewCounter"
  );

const reviewCards =
  document.querySelectorAll(
    ".review-card"
  );


let reviewIndex = 0;
let visibleReviews = Array.from(reviewCards);
function updateReviewCounter() {

  reviewCounter.textContent =
    visibleReviews.length ? `Review ${reviewIndex + 1} / ${visibleReviews.length}` : "No categorized scans available";

}


function goToReview(index) {

  reviewIndex =
    Math.max(
      0,
      Math.min(
        visibleReviews.length - 1,
        index
      )
    );


  const card =
    visibleReviews[reviewIndex];


  if (card) {

    reviewTrack.scrollTo({

      left:
        card.offsetLeft -
        reviewTrack.offsetLeft -
        5,

      behavior: "smooth"

    });

  }


  updateReviewCounter();

}


reviewPrev.addEventListener(
  "click",
  () => {

    goToReview(
      reviewIndex - 1
    );

  }
);


reviewNext.addEventListener(
  "click",
  () => {

    goToReview(
      reviewIndex + 1
    );

  }
);


reviewCards.forEach(
  (card, index) => {

    const image =
      card.querySelector("img");


    image.addEventListener(
      "click",
      () => {

        openLightbox(index);

      }
    );


    function missingReview() {
      image.style.display='none';
      if (!card.querySelector('.review-placeholder')) {
        const label=document.createElement('span'); label.className='review-placeholder';
        label.textContent=`Guest review ${index+1} · Scan unavailable`; card.append(label);
      }
    }
    image.addEventListener('error',missingReview);
    if (image.complete && !image.naturalWidth) missingReview();

  }
);


updateReviewCounter();


/* =========================================================
   LIGHTBOX
========================================================= */

const reviewLightbox =
  document.getElementById(
    "reviewLightbox"
  );

const lightboxImage =
  document.getElementById(
    "lightboxImage"
  );

const lightboxClose =
  document.getElementById(
    "lightboxClose"
  );

const lightboxPrev =
  document.getElementById(
    "lightboxPrev"
  );

const lightboxNext =
  document.getElementById(
    "lightboxNext"
  );


let lightboxIndex = 0;


function openLightbox(index) {

  lightboxIndex = index;


  const image =
    reviewCards[
      lightboxIndex
    ].querySelector("img");


  if (!image) {
    return;
  }


  lightboxImage.src =
    image.src;


  lightboxImage.alt =
    image.alt;


  reviewLightbox.classList.add(
    "open"
  );

  reviewLightbox.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

}


function closeLightbox() {

  reviewLightbox.classList.remove("open", "zoomed");

  reviewLightbox.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    "";

}


function changeLightbox(
  direction
) {

  const visibleIndices=Array.from(reviewCards).map((card,index) => card.hidden ? -1 : index).filter(index => index>=0);
  if (!visibleIndices.length) return;
  const position=visibleIndices.indexOf(lightboxIndex);
  lightboxIndex=visibleIndices[(position+direction+visibleIndices.length)%visibleIndices.length];


  if (
    lightboxIndex < 0
  ) {

    lightboxIndex =
      reviewCards.length - 1;

  }


  if (
    lightboxIndex >=
    reviewCards.length
  ) {

    lightboxIndex = 0;

  }


  const image =
    reviewCards[
      lightboxIndex
    ].querySelector("img");


  if (!image) {
    return;
  }


  lightboxImage.src =
    image.src;

  lightboxImage.alt =
    image.alt;


  goToReview(visibleReviews.indexOf(reviewCards[lightboxIndex]));

}


lightboxImage.addEventListener('click', () => reviewLightbox.classList.toggle('zoomed'));
lightboxImage.addEventListener('error', () => { lightboxImage.alt='Review scan unavailable'; });

lightboxClose.addEventListener(
  "click",
  closeLightbox
);


lightboxPrev.addEventListener(
  "click",
  () => {
    changeLightbox(-1);
  }
);


lightboxNext.addEventListener(
  "click",
  () => {
    changeLightbox(1);
  }
);


reviewLightbox.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      reviewLightbox
    ) {

      closeLightbox();

    }

  }
);


/* =========================================================
   CONTACT FORM
========================================================= */

// Native HTTPS form POST sends the inquiry through FormSubmit.
// Activate the recipient once using the confirmation email from FormSubmit.
contactForm.addEventListener('submit', () => {
  formStatus.textContent='Opening secure submission…';
});


/* =========================================================
   PDF CV
========================================================= */

downloadCV.addEventListener(
  "click",
  () => {

    /*
      Opens browser print dialog.
      Select "Save as PDF".
    */

    suiteDashboard
      .classList
      .add("printing");

    window.print();

  }
);


/* =========================================================
   INITIAL STATE
========================================================= */

updatePinDisplay();

console.log(
  "Franko Hysenllari Luxury Hospitality Keycard loaded."
);


/* Original, gently scheduled lobby music. Independent from interface effects.
   Playback starts on the first interaction; the sequence never restarts on room changes. */
let musicEnabled=true,musicBus=null,musicTimer=0,musicStep=0,nextMusicTime=0;
let musicQuiet=false;
const musicButton=$('musicToggle');
function updateMusicButton(){
  musicButton.textContent=musicEnabled?'Music on':'Music off';
  musicButton.setAttribute('aria-label',musicEnabled?'Mute lobby music':'Enable lobby music');
  musicButton.setAttribute('aria-pressed',String(musicEnabled));
}
function fadeLobby(quiet){musicQuiet=quiet;syncLobbyPlayback();}
function syncLobbyPlayback(){
  if(!musicBus||!accessAudio)return;
  const playing=musicEnabled&&!musicQuiet&&!document.hidden;
  const now=accessAudio.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setTargetAtTime(playing?.10:0,now,playing?.04:.35);
  clearTimeout(musicTimer);musicTimer=0;
  if(playing){nextMusicTime=Math.max(nextMusicTime,now+.012);scheduleLobby();}
}
function lobbyNote(frequency,time,duration,velocity){
  const envelope=accessAudio.createGain();envelope.gain.setValueAtTime(0,time);
  envelope.gain.linearRampToValueAtTime(velocity,time+.012);
  envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
  envelope.connect(musicBus);
  // Soft fundamental and a faint second harmonic give a rounded, struck-key tone.
  const voices=[1,2,3].map((harmonic,index)=>{
    const oscillator=accessAudio.createOscillator(),gain=accessAudio.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency*harmonic;
    gain.gain.value=[1,.20,.055][index];oscillator.connect(gain);gain.connect(envelope);
    oscillator.start(time);oscillator.stop(time+duration+.03);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};return oscillator;
  });
  voices[0].addEventListener('ended',()=>envelope.disconnect());
}
function scheduleLobby(){
  if(!musicEnabled||musicQuiet||document.hidden)return;
  // Cmaj9 – Fmaj9 – G6 – Cmaj9: a brighter, lightly syncopated welcome.
  const chords=[[130.81,164.81,196,246.94,293.66],[174.61,220,261.63,329.63,392],
    [196,246.94,293.66,329.63,392],[130.81,196,246.94,293.66,329.63]];
  const melody=[2,4,3,1,2,3,4,2];
  while(nextMusicTime<accessAudio.currentTime+.25){
    const chord=chords[Math.floor(musicStep/8)%chords.length],beat=musicStep%8;
    if(beat===0){
      lobbyNote(chord[0],nextMusicTime,2.7,.18);
      chord.slice(1,4).forEach((note,i)=>lobbyNote(note,nextMusicTime+i*.015,2.4,.10));
    }
    if(beat===4)lobbyNote(chord[2],nextMusicTime,1.3,.10);
    if(beat%2===0)lobbyNote(chord[melody[Math.floor(musicStep/2)%melody.length]]*2,nextMusicTime+.015,1.45,.23);
    musicStep++;nextMusicTime+=.38;
  }
  musicTimer=setTimeout(scheduleLobby,100);
}

let musicStarting=false;
async function startLobby(){
  if(musicStarting||!musicEnabled)return;
  musicStarting=true;
  try{
    prepareAudio(true);
    if(!accessAudio){musicButton.textContent='Music unavailable';return;}
    await accessAudio.resume();
    if(!musicEnabled)return;
    if(!musicBus){musicBus=accessAudio.createGain();musicBus.gain.value=0;musicBus.connect(accessAudio.destination);}
    musicQuiet=easterEggPage.classList.contains('open');syncLobbyPlayback();updateMusicButton();
  }catch{musicButton.textContent='Tap to retry music';}
  finally{musicStarting=false;}
}
function startMusicOnInteraction(event){
  if(event.target.closest('#musicToggle')||!musicEnabled||musicBus)return;
  startLobby();
}
document.addEventListener('pointerdown',startMusicOnInteraction,{capture:true});
document.addEventListener('keydown',startMusicOnInteraction,{capture:true});
musicButton.addEventListener('click',()=>{
  musicEnabled=!musicEnabled;updateMusicButton();
  if(musicEnabled)startLobby();else syncLobbyPlayback();
});
updateMusicButton();

document.querySelectorAll('.review-card img').forEach(img=>img.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();img.click();}}));
reviewTrack.addEventListener('scroll',()=>{
 if(!visibleReviews.length)return;
 const left=reviewTrack.getBoundingClientRect().left;
 reviewIndex=visibleReviews.reduce((best,card,i)=>Math.abs(card.getBoundingClientRect().left-left)<Math.abs(visibleReviews[best].getBoundingClientRect().left-left)?i:best,0);
 updateReviewCounter();
},{passive:true});
window.addEventListener('afterprint',()=>suiteDashboard.classList.remove('printing'));
