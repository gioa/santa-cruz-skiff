import {shoreWorldMetres as m} from './shore-scale.js';
export function shoreFineLine(ctx,a,b,color,width=.035){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
export function drawMetricRod(ctx,rod){
 for(let i=1;i<rod.points.length;i++)shoreFineLine(ctx,rod.points[i-1],rod.points[i],'#354e50',m(i<7?.018:.008));
 const a=rod.points[0],b=rod.points[4];shoreFineLine(ctx,a,b,'#caa374',m(.035));
 ctx.fillStyle='#aeb4a0';ctx.fillRect(a.x-m(.025),a.y-m(.025),m(.05),m(.075));
}
export function drawMetricFloat(ctx,point,contact){
 ctx.save();ctx.translate(point.x,point.y);ctx.rotate(contact.tilt);
 ctx.fillStyle='#e26e50';ctx.fillRect(-m(.009),-m(.15),m(.018),m(.08));
 ctx.fillStyle='#fff0cf';ctx.fillRect(-m(.018),-m(.07),m(.036),m(.07));
 ctx.fillStyle='#c96a47';ctx.fillRect(-m(.012),0,m(.024),m(.025));ctx.restore();
 if(contact.breaking>.05){ctx.fillStyle='#e6eddb';ctx.fillRect(point.x-m(.055),point.y-m(.02)*contact.breaking,m(.11),m(.035)*contact.breaking);}
}
export function drawMetricWeight(ctx,point){ctx.fillStyle='#d4c9a6';ctx.fillRect(point.x-m(.012),point.y-m(.025),m(.024),m(.05));}
// Scale authored pixel props about their ground contact; art keeps its detail
// in a close camera without changing its physical dimensions at another zoom.
export function withShoreProp(ctx,x,y,scale,draw,scaleY=scale){ctx.save();ctx.translate(x,y);ctx.scale(scale,scaleY);ctx.translate(-x,-y);draw();ctx.restore();}
