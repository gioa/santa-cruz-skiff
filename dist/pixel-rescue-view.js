// A brief PFD-supported water-level rescue, not a free-swimming mode.
export function drawRescue(canvas,state){
 const t=state.capsize?.elapsed||0;canvas.hidden=!state.capsize||t<1.6;if(canvas.hidden)return;
 const w=Math.max(240,Math.round(220*innerWidth/innerHeight)),h=Math.round(w*innerHeight/innerWidth);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext('2d');
 const horizon=h*.37+Math.sin(t*1.8)*5;c.fillStyle='#a9c8c5';c.fillRect(0,0,w,h);c.fillStyle='#568f95';c.fillRect(0,horizon,w,h);
 for(let y=horizon;y<h;y+=14){c.fillStyle=y>h*.7?'#397b86':'#719fa1';for(let x=-30;x<w;x+=43)c.fillRect(x+Math.sin(t*2+y)*14,y+Math.sin(t*2+x)*3,26,2);}
 // Rounded overturned wooden hull alongside the player.
 c.save();c.translate(w*.28,horizon+30+Math.sin(t*2)*4);c.rotate(-.13);c.fillStyle='#355658';c.beginPath();c.ellipse(0,2,61,21,0,0,Math.PI*2);c.fill();c.fillStyle='#bd945a';c.beginPath();c.ellipse(0,-5,57,21,0,Math.PI,Math.PI*2);c.fill();c.fillRect(-55,-5,110,10);c.fillStyle='#725c43';c.fillRect(-48,-6,95,3);c.restore();
 // Rescue boat approaches over several seconds, PFD and connected forearms below.
 const rx=w*.77,size=5+Math.max(0,t-2)*6;c.fillStyle='#e5ddbc';c.beginPath();c.moveTo(rx-size,horizon-3);c.lineTo(rx+size,horizon-3);c.lineTo(rx+size*.65,horizon+size*.4);c.lineTo(rx-size*.65,horizon+size*.4);c.fill();c.fillRect(rx-5,horizon-size*.7,10,size*.7);c.fillStyle='#c56646';c.fillRect(rx-7,horizon-size*.7,14,3);
 c.fillStyle='#d69365';c.fillRect(12,h-69,23,69);c.fillRect(w-35,h-69,23,69);c.fillStyle='#ef973e';c.fillRect(35,h-48,w-70,48);c.fillStyle='#ffd06e';c.fillRect(48,h-48,23,48);c.fillRect(w-71,h-48,23,48);c.fillStyle='#354d51';c.fillRect(35,h-17,w-70,7);
 c.fillStyle='#f3e7c9';c.font='10px sans-serif';c.textAlign='center';c.fillText('救援船正在靠近',w/2,26);
}
