// Close, foreshortened hands. The left grip is behind/below the reel seat;
// the right palm and the crank share the same moving endpoint.
export function drawCloseTackle(ctx,g,{line,ellipse,rect,spoolAngle}){
 const {width:w,scale:k,grip,reel,knob,base,butt,points}=g;
 const hand=g.rightHand||knob;
 const C={dark:'#193b40',shirt:'#345e70',shirtlight:'#598191',skin:'#d8a074',skinlight:'#f1c69b'};
 const poly=(p,col)=>{ctx.fillStyle=col;ctx.beginPath();p.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](Math.round(x*k),Math.round(y*k)));ctx.closePath();ctx.fill();};
 const armLine=(x,y,xx,yy,col,width)=>line({x:x*k,y:y*k},{x:xx*k,y:yy*k},col,width*k);
 const edgeL=-25,edgeR=w/k+25;
 function arm(hx,hy,right){
  if(right){
   poly([[edgeR,hy+63],[edgeR,hy+18],[hx+28,hy+9],[hx+8,hy+32]],C.dark);
   poly([[edgeR,hy+58],[edgeR,hy+24],[hx+29,hy+13],[hx+13,hy+31]],C.shirt);
   poly([[edgeR,hy+31],[hx+30,hy+14],[hx+24,hy+22],[edgeR-3,hy+52]],C.shirtlight);
   poly([[hx+30,hy+11],[hx+11,hy+29],[hx-3,hy+13],[hx+12,hy-7]],C.skin);
   poly([[hx+27,hy+12],[hx+15,hy+22],[hx+6,hy+10],[hx+15,hy-4]],C.skinlight);
   armLine(hx+28,hy+13,hx+13,hy+29,C.dark,3);
   poly([[hx-4,hy-12],[hx+10,hy-13],[hx+19,hy-3],[hx+17,hy+13],[hx+7,hy+22],[hx-7,hy+15],[hx-13,hy+4]],C.skin);
   poly([[hx-4,hy-10],[hx+9,hy-10],[hx+15,hy-1],[hx+12,hy+8],[hx-7,hy+6]],C.skinlight);
  }else{
   poly([[edgeL,hy+51],[edgeL,hy],[hx-26,hy+8],[hx-11,hy+31]],C.dark);
   poly([[edgeL,hy+45],[edgeL,hy+6],[hx-29,hy+12],[hx-15,hy+29]],C.shirt);
   poly([[edgeL,hy+9],[hx-30,hy+13],[hx-26,hy+20],[edgeL,hy+28]],C.shirtlight);
   poly([[hx-30,hy+13],[hx-16,hy+29],[hx+3,hy+18],[hx-9,hy-1]],C.skin);
   poly([[hx-26,hy+13],[hx-18,hy+22],[hx-3,hy+14],[hx-10,hy+4]],C.skinlight);
   armLine(hx-31,hy+13,hx-17,hy+29,C.dark,3);
   poly([[hx-14,hy+12],[hx-18,hy-2],[hx-12,hy-14],[hx-1,hy-19],[hx+13,hy-13],[hx+17,hy+5],[hx+10,hy+19],[hx-4,hy+22]],C.skin);
   poly([[hx-13,hy-1],[hx-8,hy-12],[hx+1,hy-15],[hx+10,hy-10],[hx+11,hy+4],[hx+2,hy+14],[hx-9,hy+13]],C.skinlight);
  }
 }

 if(!g.mounted){arm(grip.x/k-3,grip.y/k,false);arm(hand.x/k+6,hand.y/k+5,true);}
 line(butt,points[3],'#213b3c',9*k);line(butt,points[3],'#a58b5d',6*k);
 for(let i=0;i<12;i++){const t=i/12,x=butt.x+(points[3].x-butt.x)*t,y=butt.y+(points[3].y-butt.y)*t;rect(x-2*k,y,4*k,1,'#d2b98a');}
 // Rod blank, guides, and line remain bound to the physical rod pose.
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];line(a,b,'#254447',i<5?4*k:i<13?2*k:1);if(i<17)line({x:a.x-1,y:a.y},{x:b.x-1,y:b.y},'#91a697',1);}
 for(const i of[5,10,15,20,24,28]){const p=points[i];rect(p.x-1,p.y,3,2,'#b5c5b1');rect(p.x,p.y,1,1,'#385f60');}
 // A compact conventional spool, flanked by two side plates. Its overall
 // diameter is close to a palm rather than larger than both hands together.
 const x=reel.x,y=reel.y,rk=k*1.65;
 line(g.reelSeat,{x,y:y+8*rk},'#263c3e',4*rk);
 ellipse(x-9*rk,y,5*rk,9*rk,'#1d393e');ellipse(x-9*rk,y,3.6*rk,7.5*rk,'#a6bbb1');
 rect(x-9*rk,y-7*rk,17*rk,14*rk,'#baa370');
 for(let i=0;i<8;i++)rect(x-8*rk+i*2*rk,y-6*rk,k,12*rk,i%2?'#e4d0a1':'#8f815c');
 const shift=((spoolAngle*2)%4+4)%4;
 for(let i=0;i<3;i++)line({x:x-8*rk,y:y+(-6+i*4+shift)*rk},{x:x+7*rk,y:y+(-6+i*4+shift)*rk},'#8d805e',1);
 ellipse(x+8*rk,y,6*rk,9*rk,'#1d393e');ellipse(x+8*rk,y,4.5*rk,7.5*rk,'#b1c4b7');ellipse(x+8*rk,y,3*rk,5.8*rk,'#365b58');
 line({x:x-9*rk,y:y-8*rk},{x:x+8*rk,y:y-8*rk},'#c8d1bd',2*rk);
 line({x:x-9*rk,y:y+8*rk},{x:x+8*rk,y:y+8*rk},'#99afa4',2*rk);
 const hub=g.reelHub;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;line(hub,{x:hub.x+Math.cos(a)*5*rk,y:hub.y+Math.sin(a)*5*rk},'#c8ad71',2*rk);}
 line(hub,knob,'#223f43',4*rk);line(hub,knob,'#c3cdbb',2*rk);
 ellipse(knob.x,knob.y,5*rk,3.5*rk,'#243e43');rect(knob.x-3*rk,knob.y-2*rk,6*rk,k,'#74928c');
 // Fingers wrap over the rear grip and crank, after those surfaces are drawn.
 if(!g.mounted){
 for(let i=0;i<4;i++){const yy=grip.y-11*k+i*7*k;ellipse(grip.x+5*k,yy,(9-i*.4)*k,4*k,C.skin);line({x:grip.x+1*k,y:yy-2*k},{x:grip.x+9*k,y:yy-k},C.skinlight,2*k);}
 line({x:grip.x-10*k,y:grip.y-19*k},{x:grip.x-1*k,y:grip.y-20*k},C.skinlight,4*k);
 for(let i=0;i<3;i++){ellipse(hand.x+6*k+i*4*k,hand.y-6*k+i*5*k,5*k,5*k,C.skin);line({x:hand.x+5*k+i*4*k,y:hand.y-8*k+i*5*k},{x:hand.x+9*k+i*4*k,y:hand.y-7*k+i*5*k},C.skinlight,2*k);}
 line({x:hand.x-6*k,y:hand.y-10*k},{x:hand.x+3*k,y:hand.y-5*k},C.skinlight,6*k);
 }
}
