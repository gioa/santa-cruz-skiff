// User-approved sharp-drag-3 timbre from fishing-audio-studio. Synthesized
// metal contact, not a recording. Pre-render each tooth to keep mobile audio
// scheduling to one source rather than three live layers per click.
export function dragToothSamples(sampleRate,rng=Math.random){
 const rate=Math.max(8000,Number.isFinite(sampleRate)?sampleRate:48000);
 const samples=new Float32Array(Math.ceil(rate*.04));
 const frequency=note=>Math.min(rate*.43,440*2**((note-69)/12));
 const fundamental=frequency(110+rng()*1.2),overtone=frequency(120+rng()*.8);
 const centre=Math.min(6800,rate*.4),omega=2*Math.PI*centre/rate;
 const alpha=Math.sin(omega)/(2*2.4),a0=1+alpha;
 const b0=alpha/a0,b2=-b0,a1=-2*Math.cos(omega)/a0,a2=(1-alpha)/a0;
 let brown=0,x1=0,x2=0,y1=0,y2=0;
 const envelope=(t,attack,duration,peak)=>t>=duration?0:t<attack?
  .00001*(peak/.00001)**(t/attack):peak*(.00001/peak)**((t-attack)/(duration-attack));
 for(let i=0;i<samples.length;i++){
  const t=i/rate;brown=(brown+(rng()*2-1)*.12)/1.025;
  const x=brown*2.5,y=b0*x+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;
  samples[i]=y*envelope(t,.002,.007,.18)+
   Math.sin(2*Math.PI*fundamental*t)*envelope(t,.0003,.027,.030)+
   Math.sin(2*Math.PI*overtone*t)*envelope(t,.0002,.016,.018);
 }
 return samples;
}
