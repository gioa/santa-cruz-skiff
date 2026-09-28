// Model fallback is explicitly unobserved, never labelled as measured calm water.
export function surfaceCurrentConditions(sample,now=Date.now()){
 const age=now-Date.parse(sample?.observedAt),valid=Number.isFinite(sample?.eastMps)&&Number.isFinite(sample?.northMps)&&Math.hypot(sample.eastMps,sample.northMps)<=2.5&&Number.isFinite(age)&&age>=0;
 const fresh=valid&&age<=6*3600e3;
 return{currentX:fresh?sample.eastMps:0,currentZ:fresh?-sample.northMps:0,currentFresh:fresh,currentObservedAt:valid?sample.observedAt:null,currentSource:sample?.source??null,currentStatus:fresh?'NOAA HF Radar 区域表层观测':valid?'历史海流已过期，暂按无流模拟':'海流观测缺失，暂按无流模拟'};
}
