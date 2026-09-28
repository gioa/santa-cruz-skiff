/** Keep browser lifecycle recovery separate from the player's sound settings.
 * No context is created here: the game start/settings gesture owns init().
 */
export function bindAudioLifecycle(audio,{page=window,document:doc=document}={}){
  const listeners=[];
  const on=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  const background=()=>audio.setPaused(true);
  const foreground=()=>audio.setPaused(Boolean(doc.hidden));
  on(page,'blur',background);
  on(page,'pagehide',background);
  on(page,'focus',foreground);
  on(page,'pageshow',foreground);
  on(doc,'visibilitychange',foreground);
  // A return can be denied autoplay or omit focus/pageshow on mobile. The
  // next ordinary touch/key retries inside the trusted user gesture itself.
  for(const type of ['pointerdown','touchend','keydown','click'])on(doc,type,()=>{if(!doc.hidden)audio.setPaused(false);},{capture:true,passive:true});
  return()=>listeners.splice(0).forEach(remove=>remove());
}
