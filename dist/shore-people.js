/** Pixel silhouettes share a foot/hand anchor, not a wardrobe. Clothing is
 * tied to identity, so an NPC keeps the same outfit while walking or fishing. */
export const SHORE_PERSON_STYLES=Object.freeze({
 player:{coat:'#b76e50',light:'#d38f61',trousers:'#405a58',hat:'#476767',skin:'#d6aa81',hair:'#644f45',cut:'vest',head:'sunhat'},
 staff:{coat:'#cfaa64',light:'#ead091',trousers:'#354f51',hat:'#264c5c',skin:'#c6946e',hair:'#d4d4c3',cut:'apron',head:'workcap'},
 warden:{coat:'#526553',light:'#7f8768',trousers:'#384c43',hat:'#455b47',skin:'#d0a078',hair:'#443d36',cut:'uniform',head:'campaign'},
 oldhat:{coat:'#687b62',light:'#92a083',trousers:'#665c48',hat:'#c5b18a',skin:'#d2aa87',hair:'#d4d2bf',cut:'pockets',head:'bucket'},
 canvasbag:{coat:'#586e84',light:'#7d97a3',trousers:'#474857',hat:'#9e7960',skin:'#b98666',hair:'#343a40',cut:'satchel',head:'beanie'},
 raincoat:{coat:'#a58a48',light:'#d3b45b',trousers:'#415954',hat:'#a58a48',skin:'#e0b38d',hair:'#82715a',cut:'slicker',head:'hood'},
 regular:{coat:'#4d6b8c',light:'#7294af',trousers:'#444e58',hat:'#2c4868',skin:'#c59672',hair:'#bec5bf',cut:'utility',head:'baseball'},
});
export function drawShorePerson(ctx,{style='player',walking=false,fishing=false,facing='up',time=0,scale=1}={}){
 const p=SHORE_PERSON_STYLES[style]||SHORE_PERSON_STYLES.player;
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const stroke=(x,y,xx,yy,c,w=1)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();};
 const t=walking?Math.sin(time*11):0,leg=Math.round(t*3),front=['down','south',2].includes(facing),side=[1,3,'left','right'].includes(facing),left=[3,'left'].includes(facing),back=!front&&!side;
 ctx.save();ctx.scale(scale,scale);ctx.translate(0,walking?-Math.abs(Math.round(t)):0);
 // Trousers and boots. Waterproof outfits have high rubber boots.
 r(-7,-10+leg,6,10-leg,p.trousers);r(2,-10-leg,6,10+leg,p.trousers);
 const boots=['slicker','utility','uniform'].includes(p.cut)?8:4;
 r(-8,-boots+leg,8,boots+1,'#2d4145');r(2,-boots-leg,8,boots+1,'#2d4145');
 r(-7,-boots+leg,6,2,'#687570');r(3,-boots-leg,5,2,'#687570');
 // Backpack and raincoat tails alter the outline before arms are drawn.
 if(p.cut==='satchel'){r(7,-27,9,17,'#414e45');r(9,-26,7,14,'#b7a480');r(10,-22,6,2,'#d5c29b');}
 if(p.cut==='slicker'){r(-11,-25,23,20,p.coat);r(-10,-24,20,18,p.light);r(-9,-7,19,2,'#89733d');}
 r(-10,-26,20,18,p.coat);r(-7,-25,14,17,p.light);r(5,-22,3,12,p.coat);
 if(p.cut==='vest'){r(-7,-24,4,12,'#e7ad72');r(-5,-22,10,13,'#827f59');r(-4,-21,8,2,'#b6a576');r(-4,-11,8,2,'#4c6457');}
 if(p.cut==='apron'){
  r(-6,-25,2,8,'#345b56');r(5,-25,2,8,'#345b56');r(-7,-19,15,15,'#345b56');r(-5,-17,11,11,'#527970');r(-4,-14,9,4,'#294e4c');
  if(!back){r(3,-24,4,3,'#fff0cd');r(4,-23,2,1,'#516962');}
 }
 if(p.cut==='pockets'){
  if(back){r(-6,-22,13,2,'#5a6951');r(-6,-14,13,4,'#4f5f4b');}
  else{r(-7,-21,6,6,'#4e634d');r(3,-21,6,6,'#4e634d');r(-6,-21,4,2,'#b3ae85');r(4,-21,4,2,'#b3ae85');r(0,-24,2,14,'#c8bd99');}
 }
 if(p.cut==='satchel'){
  stroke(-7,-25,8,-10,'#413f36',3);stroke(-6,-25,9,-10,'#c9b68e',2);r(8,-14,9,8,'#6e634e');r(9,-14,8,5,'#c1ae84');r(12,-10,2,3,'#e1d5b3');
 }
 if(p.cut==='slicker'){r(0,-25,2,19,'#ecda89');r(-8,-14,5,2,p.coat);r(4,-14,5,2,p.coat);r(-9,-9,18,2,'#d9d9bc');}
 if(p.cut==='utility'){
  // The regular wears navy bib waders, a cream neck scarf and a tackle pouch.
  r(-6,-25,2,7,'#263f56');r(5,-25,2,7,'#263f56');r(-6,-19,13,12,'#29465d');r(-5,-18,11,2,'#869caa');
  r(-6,-27,13,3,'#e6dbb6');r(4,-25,3,7,'#d4c8a3');r(-9,-13,5,6,'#b9a071');r(-8,-13,3,2,'#e2d0a0');
 }
 if(p.cut==='uniform'){
  r(-11,-12,23,3,'#283e36');r(0,-12,3,3,'#b4b4a0');r(-10,-24,4,7,'#2b413d');r(-9,-29,1,6,'#2b413d');
  if(!back){r(3,-23,4,5,'#e3c276');r(4,-22,2,2,'#fff0bc');}
 }
 // Faces and hair remain distinguishable from the back and in profile.
 r(-6,-36,13,11,p.skin);r(-7,-35,3,7,'#9c7258');
 if(back){r(-5,-34,11,6,p.hair);r(-6,-28,3,3,p.hair);r(5,-28,3,3,p.hair);}
 else if(side){r(left?4:-6,-34,3,7,p.hair);r(left?-5:5,-31,2,2,'#293d40');r(left?-8:7,-29,3,2,p.skin);}
 else{r(-6,-33,2,7,p.hair);r(6,-33,2,7,p.hair);r(-3,-31,2,2,'#293d40');r(3,-31,2,2,'#293d40');r(-1,-28,3,1,'#97694e');}
 if(['oldhat','regular','staff'].includes(style)&&!back){r(-3,-27,8,2,p.hair);if(style==='oldhat')r(-2,-25,5,2,p.hair);}
 if(p.head==='sunhat'){r(-8,-40,15,7,p.hat);r(-10,-35,21,3,'#e0c292');r(-6,-40,12,2,'#78988a');}
 if(p.head==='bucket'){r(-6,-40,13,7,p.hat);r(-8,-37,17,4,p.hat);r(-11,-34,23,3,'#9b8a66');r(-6,-35,13,2,'#627b62');r(-8,-34,3,1,'#e4d1a6');}
 if(p.head==='beanie'){r(-6,-41,13,8,p.hat);r(-4,-43,9,3,'#b89375');r(-7,-35,15,3,'#795846');r(-5,-39,1,5,'#c0a087');r(3,-39,1,5,'#c0a087');}
 if(p.head==='hood'){r(-9,-40,19,11,p.coat);r(-6,-42,13,3,p.light);r(-9,-37,3,12,p.light);r(7,-37,3,12,p.light);if(!back){r(-5,-36,12,9,p.skin);r(left?-4:3,-31,2,2,'#293d40');}else r(-5,-36,12,7,p.light);}
 if(p.head==='baseball'||p.head==='workcap'){
  r(-7,-40,15,7,p.hat);r(-5,-41,11,2,p.hat);r(-6,-39,12,2,p.head==='baseball'?'#577896':'#4e7080');
  if(!back){r(left?-13:2,-35,12,3,p.hat);r(-1,-38,4,2,p.head==='baseball'?'#e5cf8f':'#dabc73');}else r(-3,-34,7,2,'#a7b4ad');
 }
 if(p.head==='campaign'){r(-5,-42,11,3,p.hat);r(-7,-39,15,5,p.hat);r(-12,-35,25,3,'#344b3e');r(-7,-37,15,2,'#a59d70');}
 // Sleeves match the NPC's coat instead of borrowing the player's bare arms.
 if(fishing){stroke(-10,-23,-13,-28,p.coat,5);stroke(9,-23,4,-27,p.light,5);r(-15,-30,6,4,p.skin);r(2,-29,5,4,p.skin);}
 else{r(-13,-24,4,9+leg,p.coat);r(10,-24,4,9-leg,p.light);r(-13,-16+leg,4,5,p.skin);r(10,-16-leg,4,5,p.skin);}
 if(p.cut==='uniform'&&!back){r(10,-24,12,14,'#daceab');r(12,-22,7,2,'#778073');r(12,-18,5,1,'#778073');}
 ctx.restore();
}
