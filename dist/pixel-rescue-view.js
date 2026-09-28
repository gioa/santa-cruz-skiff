// A brief PFD-supported water-level rescue, not a free-swimming mode.
export function drawRescue(canvas,state){
 const t=state.capsize?.elapsed||0;canvas.hidden=!state.capsize||t<1.6;if(canvas.hidden)return;
 const w=Math.max(240,Math.round(220*innerWidth/innerHeight)),h=Math.round(w*innerHeight/innerWidth);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext('2d');
 canvas.setAttribute('aria-label',state.capsize.hospital&&t>=6?'医院抢救与留院观察':state.capsize.worePfd===false?'救援后送院抢救':'穿着救生衣等待救援');
 if(state.capsize.hospital&&t>=6){
  c.fillStyle='#c7d5cb';c.fillRect(0,0,w,h);c.fillStyle='#e4e6d6';c.fillRect(0,h*.17,w,h*.54);
  const x=w*.5-106,y=Math.max(70,h*.48-55);c.save();c.translate(x,y);
  c.fillStyle='#759593';c.fillRect(22,50,4,96);c.fillRect(7,143,35,4);c.fillStyle='#517a77';c.fillRect(0,8,57,43);c.fillStyle='#dce7d7';c.fillRect(-3,4,63,4);
  c.strokeStyle='#bcdf90';c.lineWidth=2;c.beginPath();for(let xx=0;xx<48;xx+=2){const phase=(xx+t*18)%36,yy=phase>15&&phase<19?-12:phase>19&&phase<23?9:0;c.lineTo(4+xx,30+yy);}c.stroke();
  c.fillStyle='#f4eedc';c.fillRect(70,78,138,70);c.fillStyle='#76938c';c.fillRect(72,148,5,17);c.fillRect(201,148,5,17);c.fillStyle='#bfd0c4';c.fillRect(76,84,42,35);c.fillStyle='#dcaa86';c.fillRect(85,86,24,24);c.fillStyle='#795d48';c.fillRect(83,83,28,8);c.fillStyle='#8aafaa';c.fillRect(117,85,87,57);c.fillStyle='#b2ccc3';c.fillRect(119,91,3,45);c.fillStyle='#f1eee0';c.fillRect(80,142,123,5);
  c.fillStyle='#415d65';c.fillRect(155,49,11,31);c.fillRect(175,49,11,31);c.fillStyle='#f6f3e3';c.fillRect(149,9,43,45);c.fillStyle='#d6a784';c.fillRect(159,-12,22,23);c.fillStyle='#526b66';c.fillRect(158,-15,24,7);c.fillStyle='#799ea0';c.fillRect(157,1,26,9);c.fillStyle='#c66c53';c.fillRect(176,20,10,3);c.fillRect(180,16,3,11);c.fillStyle='#e1af8e';c.fillRect(140,39,12,8);c.fillRect(188,40,10,9);c.fillStyle='#e2e3d5';c.fillRect(143,16,10,23);c.fillRect(191,18,8,22);c.restore();
  c.fillStyle='#294d54';c.font='12px sans-serif';c.textAlign='center';c.fillText('医院 · 抢救与留院观察',w/2,30);c.font='9px sans-serif';c.fillText(`抢救费用 ${state.capsize.hospitalFee} credits`,w/2,48);return;
 }
 const horizon=h*.37+Math.sin(t*1.8)*5;c.fillStyle='#a9c8c5';c.fillRect(0,0,w,h);c.fillStyle='#568f95';c.fillRect(0,horizon,w,h);
 for(let y=horizon;y<h;y+=14){c.fillStyle=y>h*.7?'#397b86':'#719fa1';for(let x=-30;x<w;x+=43)c.fillRect(x+Math.sin(t*2+y)*14,y+Math.sin(t*2+x)*3,26,2);}
 // Rounded overturned wooden hull alongside the player.
 c.save();c.translate(w*.28,horizon+30+Math.sin(t*2)*4);c.rotate(-.13);c.fillStyle='#355658';c.beginPath();c.ellipse(0,2,61,21,0,0,Math.PI*2);c.fill();c.fillStyle='#bd945a';c.beginPath();c.ellipse(0,-5,57,21,0,Math.PI,Math.PI*2);c.fill();c.fillRect(-55,-5,110,10);c.fillStyle='#725c43';c.fillRect(-48,-6,95,3);c.restore();
 // Rescue boat approaches over several seconds, PFD and connected forearms below.
 const rx=w*.77,size=5+Math.max(0,t-2)*6;c.fillStyle='#e5ddbc';c.beginPath();c.moveTo(rx-size,horizon-3);c.lineTo(rx+size,horizon-3);c.lineTo(rx+size*.65,horizon+size*.4);c.lineTo(rx-size*.65,horizon+size*.4);c.fill();c.fillRect(rx-5,horizon-size*.7,10,size*.7);c.fillStyle='#c56646';c.fillRect(rx-7,horizon-size*.7,14,3);
 c.fillStyle='#d69365';c.fillRect(12,h-69,23,69);c.fillRect(w-35,h-69,23,69);c.fillStyle=state.capsize.worePfd===false?'#617c82':'#ef973e';c.fillRect(35,h-48,w-70,48);if(state.capsize.worePfd!==false){c.fillStyle='#ffd06e';c.fillRect(48,h-48,23,48);c.fillRect(w-71,h-48,23,48);}c.fillStyle='#354d51';c.fillRect(35,h-17,w-70,7);
 c.fillStyle='#f3e7c9';c.font='10px sans-serif';c.textAlign='center';c.fillText(state.capsize.hospital?'救援后送院抢救':'救援船正在靠近',w/2,26);
}
