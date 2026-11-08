let audioContext:AudioContext|null=null;
let stopCurrent:(()=>void)|null=null;

function context(){
 if(typeof window==='undefined'||!window.AudioContext)return null;
 audioContext??=new window.AudioContext();
 return audioContext;
}

export function unlockEmergencyAudio(){const audio=context();if(audio?.state==='suspended')void audio.resume().catch(()=>{});}

export function playEmergencySound(durationMs=10000){
 const audio=context();if(!audio)return;
 stopCurrent?.();
 if(audio.state==='suspended')void audio.resume().catch(()=>{});
 let closed=false;
 const beep=()=>{
  if(closed||audio.state!=='running')return;
  const oscillator=audio.createOscillator();const gain=audio.createGain();
  oscillator.type='sine';oscillator.frequency.value=880;gain.gain.setValueAtTime(0.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(0.09,audio.currentTime+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+0.24);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+0.25);
 };
 beep();const interval=window.setInterval(beep,850);
 const timeout=window.setTimeout(()=>stop(),durationMs);
 function stop(){if(closed)return;closed=true;window.clearInterval(interval);window.clearTimeout(timeout);if(stopCurrent===stop)stopCurrent=null}
 stopCurrent=stop;
}

export function stopEmergencySound(){stopCurrent?.()}
