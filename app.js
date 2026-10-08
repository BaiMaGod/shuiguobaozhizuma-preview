(() => {
'use strict';
const S=window.FruitLayout,W=S.width,H=S.height,SX=S.shooter.x,SY=S.shooter.y;
const ART=window.FruitArt||null;
const AUDIO=new window.JuiceAudio();
const COUNTER=new window.EliminationFeedback();
let leaderClock=0,atHome=false;
const runtimePerf={frames:0,elapsed:0,fps:0,slowFrames:0,lastRenderMs:0};
const FEEDBACK=window.FruitFeedback;
const G=window.FruitConfig;
const CFG={fruitR:G.fruitRadius,spacing:G.fruitSpacing,collisionR:G.collisionRadius,baseSpeed:G.baseChainSpeed,pullSpeed:G.pullbackSpeed,projectileSpeed:G.projectileSpeed,initial:G.initialFruitCount,total:G.totalFruitCount,match:G.matchCount,insertDelay:G.insertDuration,matchDelay:G.matchHoldDuration,score:G.baseScorePerFruit,losePadding:G.losePadding};
const FRUITS=window.FruitTypes;
const COLORS=window.FruitPalette;
// Invisible movement spline aligned to the road baked into the orchard background.
const control=S.track;
const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
const swapBtn=document.getElementById('swap'); const restartBtn=document.getElementById('restart');
let dpr=Math.min(devicePixelRatio||1,2);
let samples=[],totalLen=0,fruits=[],spawned=0,history=[],projectile=null,current=0,next=1,state='playing',stateTimer=0,pendingId=-1,currentMatch=null,pullback=null,score=0,combo=0,maxCombo=0,aim={x:SX-65,y:660},last=performance.now(),particles=[],waves=[],muzzleFlash=null,shake=0,shakeMag=0,recoil=0,startedShot=false,result=null,paused=false,muted=false,reducedMotion=false,debugHold=false;

function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return{x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),y:.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)}}
function buildTrack(){const raw=[]; for(let i=0;i<control.length-1;i++){const p0=control[Math.max(0,i-1)],p1=control[i],p2=control[i+1],p3=control[Math.min(control.length-1,i+2)];for(let t=0;t<1;t+=.035)raw.push(catmull(p0,p1,p2,p3,t));}raw.push(control.at(-1));samples=[];let dist=0;for(let i=0;i<raw.length;i++){if(i){const dx=raw[i].x-raw[i-1].x,dy=raw[i].y-raw[i-1].y;dist+=Math.hypot(dx,dy);}const a=raw[Math.max(0,i-1)],b=raw[Math.min(raw.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;samples.push({...raw[i],distance:dist,tx:dx/l,ty:dy/l});}totalLen=dist;}
function pointAt(d){if(d<=0)return samples[0];if(d>=totalLen)return samples.at(-1);let lo=0,hi=samples.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(samples[m].distance<=d)lo=m;else hi=m;}const a=samples[lo],b=samples[hi],t=(d-a.distance)/((b.distance-a.distance)||1);let tx=a.tx+(b.tx-a.tx)*t,ty=a.ty+(b.ty-a.ty)*t,l=Math.hypot(tx,ty)||1;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,distance:d,tx:tx/l,ty:ty/l};}
function rndType(){let c=FRUITS[(Math.random()*FRUITS.length)|0],n=0;while(n++<12&&history.length>=2&&history.at(-1)===c&&history.at(-2)===c)c=FRUITS[(Math.random()*FRUITS.length)|0];history.push(c);if(history.length>8)history.shift();return c;}
function shooterType(){const a=FRUITS.filter(t=>fruits.some(f=>f.type===t));const pool=a.length?a:FRUITS;return pool[(Math.random()*pool.length)|0];}
function mkFruit(type,d){return{id:Math.random().toString(36).slice(2),type,d,renderD:d,matching:false,matchAge:0};}
function seed(){for(let i=0;i<CFG.initial;i++){fruits.push(mkFruit(rndType(),i*CFG.spacing));spawned++;}}
function trySpawn(){
  if(spawned>=CFG.total)return;
  if(fruits.length&&fruits[0].d<CFG.spacing)return;
  const spawnD=fruits.length?Math.max(0,fruits[0].d-CFG.spacing):0;
  fruits.unshift(mkFruit(rndType(),spawnD));
  spawned++;
}
function speed(){const p=spawned/CFG.total;return CFG.baseSpeed*(p>=.7?1.3:p>=.3?1.15:1)}
function findMatch(index){if(index<0||index>=fruits.length)return null;const t=fruits[index].type;let l=index,r=index;while(l>0&&fruits[l-1].type===t)l--;while(r+1<fruits.length&&fruits[r+1].type===t)r++;return r-l+1>=CFG.match?{left:l,right:r,count:r-l+1}:null;}
function insertFruit(type,index,renderD){index=Math.max(0,Math.min(index,fruits.length));let target=0;if(!fruits.length)target=Math.max(0,renderD);else if(index<fruits.length){target=fruits[index].d-CFG.spacing;for(let i=0;i<index;i++)fruits[i].d-=CFG.spacing;}else{const old=fruits.at(-1).d;for(const f of fruits)f.d-=CFG.spacing;target=old;}const f=mkFruit(type,target);f.renderD=renderD;fruits.splice(index,0,f);return f;}
function beginMatch(m){
  combo++;maxCombo=Math.max(maxCombo,combo);currentMatch=m;state='resolving';
  stateTimer=CFG.matchDelay;
  const strength=1+(combo-1)*.22;
  const matchedCenter=fruits[Math.floor((m.left+m.right)/2)],countPoint=pointAt(matchedCenter.renderD);
  COUNTER.match(m.count,combo,countPoint.x,countPoint.y);
  for(let i=m.left;i<=m.right;i++){fruits[i].matching=true;fruits[i].matchAge=0;const p=pointAt(fruits[i].renderD);burst(p.x,p.y,fruits[i].type,1,combo);}
  AUDIO.playJuice(strength,combo);
  if(combo>=2&&!reducedMotion){shake=.11;shakeMag=Math.min(6,2+combo*.8);}
}
function finishMatch(){if(!currentMatch)return;const count=currentMatch.count,mult=1+Math.max(0,combo-1)*.5;score+=Math.round(count*CFG.score*mult);const left=currentMatch.left;fruits.splice(left,count);const hasEntrance=left-1>=0,hasExit=left<fruits.length;currentMatch=null;if(hasEntrance&&hasExit){pullback={boundary:left};state='pulling';}else finishCombo();}
function finishCombo(){COUNTER.finishChain();pendingId=-1;pullback=null;currentMatch=null;combo=0;state='playing';}
function updatePull(dt){
  if(!pullback)return finishCombo();
  const b=pullback.boundary;
  if(b<=0||b>=fruits.length)return finishCombo();

  // The segment closer to the exit rolls BACKWARD toward the rear segment.
  // This is the classic Zuma retraction behavior after a match.
  const rearTail=fruits[b-1];
  const frontHead=fruits[b];
  const desiredFrontDistance=rearTail.d+CFG.spacing;
  const gap=frontHead.d-desiredFrontDistance;

  if(gap<=.3){
    const correction=desiredFrontDistance-frontHead.d;
    for(let i=b;i<fruits.length;i++)fruits[i].d+=correction;
    const m=findMatch(b-1);
    return m?beginMatch(m):finishCombo();
  }

  const shift=Math.min(gap,CFG.pullSpeed*dt);
  for(let i=b;i<fruits.length;i++)fruits[i].d-=shift;
}
// Exactly one actual elimination splash per fruit; combo determines visual reach.
function burst(x,y,type,str=1,combo=1){
  const range=Math.max(1,Math.floor(combo)),c=COLORS[type],target=Math.min(40,Math.round(18+str*7));
  particles.splice(0,Math.max(0,particles.length-(FEEDBACK.maxParticles-target)));
  const count=Math.min(target,FEEDBACK.maxParticles-particles.length);
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=(145+Math.random()*(215+str*34))*range,life=.30+Math.random()*.28;
    particles.push({x:x+(Math.random()-.5)*16,y:y+(Math.random()-.5)*16,vx:Math.cos(a)*s,vy:Math.sin(a)*s-65*range,
      g:430+Math.random()*270,life,max:life,r:3.4+Math.random()*(7.5+str),color:i%5===0?c.accent:c.juice,
      rot:Math.random()*6.28,spin:(Math.random()-.5)*12,type,shard:i%6===0});
  }
  if(waves.length>=FEEDBACK.maxBursts)waves.shift();
  waves.push({x,y,r:10*range,range,life:FEEDBACK.burstLife,max:FEEDBACK.burstLife,
    color:c.juice,type,strength:str,rotation:(Math.random()-.5)*.7});
}
function fire(x,y){
  if(atHome||paused||state!=='playing'||projectile)return;
  let dx=x-SX,dy=y-SY,l=Math.hypot(dx,dy);if(l<20)return;
  dx/=l;dy/=l;
  const muzzle=S.shooter.muzzleDistance;
  projectile={type:current,x:SX+dx*muzzle,y:SY+dy*muzzle,vx:dx*CFG.projectileSpeed,vy:dy*CFG.projectileSpeed};
  muzzleFlash={x:projectile.x,y:projectile.y,type:current,life:FEEDBACK.shotFlashLife};
  recoil=.12;AUDIO.playShot();COUNTER.clear();combo=0;startedShot=true;current=next;next=shooterType();
}
function updateProjectile(dt){const p=projectile;if(!p||state!=='playing')return;p.x+=p.vx*dt;p.y+=p.vy*dt;let hit=-1,best=Infinity;const rr=CFG.collisionR**2;for(let i=0;i<fruits.length;i++){const fp=pointAt(fruits[i].renderD),dx=p.x-fp.x,dy=p.y-fp.y,d2=dx*dx+dy*dy;if(d2<=rr&&d2<best){best=d2;hit=i;}}if(hit>=0){const h=fruits[hit],hp=pointAt(h.renderD),relx=p.x-hp.x,rely=p.y-hp.y,dot=relx*hp.tx+rely*hp.ty,idx=dot>0?hit+1:hit;const ins=insertFruit(p.type,idx,h.renderD);AUDIO.playImpact();projectile=null;pendingId=ins.id;state='inserting';stateTimer=CFG.insertDelay;return;}if(p.x<-80||p.x>W+80||p.y<-80||p.y>H+80)projectile=null;}
function updateState(dt){if(state==='inserting'){stateTimer-=dt;if(stateTimer<=0){const i=fruits.findIndex(f=>f.id===pendingId),m=findMatch(i);m?beginMatch(m):finishCombo();}}else if(state==='resolving'){stateTimer-=dt;if(stateTimer<=0)finishMatch();}else if(state==='pulling')updatePull(dt);}
function endGame(win){
  COUNTER.clear();
  AUDIO.playResult(win);
  projectile=null;state=win?'win':'lose';result=win?'爆汁成功！':'还差一点！';
  restartBtn.hidden=false;swapBtn.disabled=true;
  const summary=document.getElementById('result-summary');
  summary.textContent=result+' 最终得分 '+score+'，最大连击 '+maxCombo+'。';summary.hidden=false;
  document.getElementById('pause').disabled=true;
  document.getElementById('settings').disabled=true;
  shake=reducedMotion?0:.14;shakeMag=win?3:7;
}
function reset(){AUDIO.stopAll();COUNTER.clear();leaderClock=0;setPaused(false);document.getElementById('settings-panel').hidden=true;document.getElementById('result-summary').hidden=true;document.getElementById('pause').disabled=false;document.getElementById('settings').disabled=false;fruits=[];spawned=0;history=[];projectile=null;particles=[];waves=[];muzzleFlash=null;score=0;combo=0;maxCombo=0;state='playing';stateTimer=0;pendingId=-1;currentMatch=null;pullback=null;shake=0;shakeMag=0;recoil=0;startedShot=false;result=null;seed();current=shooterType();next=shooterType();restartBtn.hidden=true;swapBtn.disabled=false;last=performance.now();}
function update(dt){
  if(atHome||paused||debugHold)return;
  if(shake>0)shake=Math.max(0,shake-dt);
  if(recoil>0)recoil=Math.max(0,recoil-dt);
  if(state==='win'||state==='lose'){updateFX(dt);return;}
  leaderClock+=dt;

  // During pullback, pause the normal forward march. Only the front segment
  // is allowed to move backward in updatePull().
  if(state==='playing'||state==='inserting'){
    const s=speed();
    for(const f of fruits)f.d+=s*dt;
  }

  for(const f of fruits){
    f.matchAge+=f.matching?dt:0;
    const follow=Math.min(1,dt*18);
    f.renderD+=(f.d-f.renderD)*follow;
  }

  if(state==='playing')trySpawn();
  swapBtn.disabled=state!=='playing'||!!projectile;
  updateProjectile(dt);
  updateState(dt);
  for(const f of fruits)if(!f.matching)f.matchAge=0;
  updateFX(dt);

  const front=fruits.at(-1);
  if(front&&!front.matching&&front.d+S.leader.gap>=totalLen-CFG.losePadding)return endGame(false);
  if(spawned>=CFG.total&&!fruits.length&&!projectile)return endGame(true);
}
function updateFX(dt){
  COUNTER.update(dt);
  if(muzzleFlash){muzzleFlash.life-=dt;if(muzzleFlash.life<=0)muzzleFlash=null;}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.spin*dt;if(p.life<=0)particles.splice(i,1);}
  for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.life-=dt;w.r+=220*dt*w.range;if(w.life<=0)waves.splice(i,1);}
}
function leaderSnapshot(){
  const front=fruits.at(-1);if(!front)return null;
  const distance=front.d+S.leader.gap,p=pointAt(front.renderD+S.leader.gap);
  return {distance,renderDistance:front.renderD+S.leader.gap,x:p.x,y:p.y,tilt:p.tx*S.leader.tilt};
}
function drawLeader(){
  const head=leaderSnapshot();if(!head)return;
  const bob=reducedMotion?0:Math.sin(leaderClock*6)*S.leader.bob;
  const scale=reducedMotion?1:1+Math.sin(leaderClock*6)*.012;
  if(ART&&ART.drawLeader(ctx,head.x,head.y+bob,head.tilt,scale))return;
  ctx.save();ctx.translate(head.x,head.y+bob);ctx.fillStyle='#e92778';circle(0,0,40);
  ctx.fillStyle='#fff4c4';circle(-15,-4,10);circle(15,-4,10);
  ctx.fillStyle='#592518';circle(-15,-4,5);circle(15,-4,5);ctx.restore();
}
function drawFruit(x,y,type,r,alpha=1,scale=1){if(ART&&ART.drawFruit(ctx,x,y,type,r,alpha,scale))return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(scale,scale);const c=COLORS[type];ctx.shadowColor='#0005';ctx.shadowBlur=8;ctx.shadowOffsetY=5;if(type===0){ctx.fillStyle=c.accent;circle(0,0,r);ctx.fillStyle=c.main;circle(0,0,r-5);ctx.fillStyle=c.dark;[[-8,-5],[8,-1],[0,10]].forEach(q=>circle(q[0],q[1],2.2));}else if(type===1){ctx.fillStyle=c.main;circle(0,0,r);ctx.fillStyle=c.accent;circle(-9,-11,r*.2);ctx.strokeStyle='#5d8d35';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-6,-r+4);ctx.lineTo(4,-r-4);ctx.stroke();}else if(type===2){ctx.fillStyle=c.dark;circle(0,2,r);const rr=r*.34,pts=[[-rr,-rr*.5],[0,-rr],[rr,-rr*.5],[-rr*.6,rr*.35],[rr*.6,rr*.35],[0,rr]];ctx.fillStyle=c.main;pts.forEach(q=>circle(q[0],q[1],r*.34));ctx.strokeStyle='#5d8d35';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-r+2);ctx.lineTo(6,-r-7);ctx.stroke();}else{ctx.fillStyle='#8e6445';circle(0,0,r);ctx.fillStyle=c.main;circle(0,0,r-5);ctx.fillStyle=c.accent;circle(0,0,r*.30);ctx.fillStyle=c.dark;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;circle(Math.cos(a)*r*.48,Math.sin(a)*r*.48,1.7);}}ctx.shadowColor='transparent';ctx.fillStyle='#fff';ctx.globalAlpha=alpha*.72;circle(-r*.32,-r*.34,Math.max(3,r*.12));ctx.restore();}
function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function roundedRect(x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
function drawTrack(){return;}
function drawMachine(){if(ART&&ART.drawMachine(ctx,pointAt(totalLen)))return;
  const e=pointAt(totalLen);
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.shadowColor='#0007';
  ctx.shadowBlur=12;
  ctx.shadowOffsetY=5;

  // Bright juicer housing: deliberately non-circular so it cannot be mistaken for a fruit.
  ctx.fillStyle='#f39b3a';
  roundedRect(-62,-54,124,116,18);
  ctx.fill();
  ctx.fillStyle='#f7e1a7';
  roundedRect(-50,-42,100,86,13);
  ctx.fill();

  // Wide intake slot and visible cutter blades.
  ctx.fillStyle='#23332f';
  roundedRect(-39,-22,78,44,12);
  ctx.fill();
  ctx.strokeStyle='#d9ebe3';
  ctx.lineWidth=7;
  ctx.beginPath();
  ctx.moveTo(-24,-13); ctx.lineTo(24,13);
  ctx.moveTo(24,-13); ctx.lineTo(-24,13);
  ctx.stroke();
  ctx.fillStyle='#ffb245';
  circle(0,0,7);

  // Juice outlet/base.
  ctx.shadowColor='transparent';
  ctx.fillStyle='#8aa596';
  ctx.fillRect(-26,44,52,16);
  ctx.fillStyle='#d9782d';
  ctx.fillRect(-44,60,88,15);

  ctx.textAlign='center';
  ctx.textBaseline='top';
  ctx.font='700 18px system-ui';
  ctx.fillStyle='#fff3ca';
  ctx.fillText('榨汁口',0,82);
  ctx.restore();
}
function drawShooter(){if(ART&&ART.drawShooter(ctx,aim,current,next,drawFruit,recoil,reducedMotion))return;let dx=aim.x-360,dy=aim.y-1135,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;ctx.save();ctx.globalAlpha=.23;ctx.strokeStyle='#fff4cf';ctx.lineWidth=4;ctx.setLineDash([16,18]);ctx.beginPath();ctx.moveTo(360+ux*78,1135+uy*78);ctx.lineTo(360+ux*Math.min(720,l),1135+uy*Math.min(720,l));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.strokeStyle='#355d50';ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(360+ux*20,1135+uy*20);ctx.lineTo(360+ux*66,1135+uy*66);ctx.stroke();ctx.fillStyle='#27493f';circle(360,1135,52);ctx.fillStyle='#f1d18b';circle(360,1135,43);ctx.fillStyle='#355d50';circle(360,1135,34);drawFruit(360,1135,current,28);ctx.restore();drawFruit(610,1125,next,21);}
function drawBackground(){if(ART&&ART.drawBackground(ctx,W,H))return;ctx.fillStyle='#183d35';ctx.fillRect(0,0,W,H);ctx.fillStyle='#214c40';circle(86,1180,150);circle(670,175,175);ctx.fillStyle='#2d5a4d';for(let i=0;i<18;i++)circle((i*137)%720,110+(i*223)%930,3+(i%3));ctx.fillStyle='#102c27';ctx.fillRect(0,0,W,92);}
function drawHUD(){if(ART&&ART.drawHUD(ctx,{score,combo:COUNTER.badgeVisible?COUNTER.combo:0,comboScale:COUNTER.badgeScale,comboAlpha:COUNTER.badgeAlpha,startedShot,state}))return;ctx.textBaseline='middle';ctx.font='700 32px system-ui';ctx.fillStyle='#fff6db';ctx.fillText(`得分  ${score}`,24,48);ctx.textAlign='right';if(COUNTER.badgeVisible){ctx.font='900 42px system-ui';ctx.strokeStyle='#8f3c43';ctx.lineWidth=7;ctx.strokeText(`COMBO ×${combo}`,684,50);ctx.fillStyle='#fff09a';ctx.fillText(`COMBO ×${combo}`,684,50);}ctx.textAlign='center';if(!startedShot&&state==='playing'){ctx.font='600 24px system-ui';ctx.fillStyle='#fff7df';ctx.globalAlpha=.92;ctx.fillText('点击轨道方向发射水果 · 3个相同水果即可爆汁',360,1060);ctx.globalAlpha=1;}ctx.font='600 19px system-ui';ctx.fillStyle='#fff3ca';ctx.fillText('下一颗',610,1070);ctx.textAlign='left';}
function drawCount(){
  if(!COUNTER.countVisible)return;
  const c=COUNTER,q=S.elimination,z=q.zone;
  // Bound the entire treatment, including light and juice, outside the route.
  ctx.save();ctx.beginPath();ctx.rect(z.x,z.y,z.width,z.height);ctx.clip();
  ctx.translate(c.x,c.y+(reducedMotion?0:c.countOffsetY));
  const scale=reducedMotion?1:c.countScale;ctx.scale(scale,scale);ctx.globalAlpha=c.countAlpha;
  const halo=ctx.createRadialGradient(0,16,3,0,16,70);
  halo.addColorStop(0,'rgba(255,245,118,'+(.38*c.glowPulse)+')');
  halo.addColorStop(.48,'rgba(255,148,37,'+(.26*c.glowPulse)+')');halo.addColorStop(1,'rgba(255,125,61,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(0,16,76,44,0,0,Math.PI*2);ctx.fill();
  if(!reducedMotion)for(const d of c.juiceDrops){
    ctx.save();ctx.globalAlpha=c.countAlpha*d.alpha;ctx.translate(d.x,d.y);ctx.rotate(Math.atan2(d.y-18,d.x));
    ctx.shadowColor=d.color;ctx.shadowBlur=9;ctx.fillStyle=d.color;ctx.beginPath();ctx.ellipse(0,0,d.radius*1.55,d.radius*.75,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#fffce0';ctx.beginPath();ctx.arc(-d.radius*.25,-d.radius*.15,Math.max(1,d.radius*.28),0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  const fill=ctx.createLinearGradient(0,-28,0,57);fill.addColorStop(0,'#ffffff');fill.addColorStop(.5,'#fff5b5');fill.addColorStop(1,'#ffb83e');
  const text=(value,y,size)=>{
    ctx.font='900 '+size+'px system-ui';ctx.shadowColor='#ffef75';ctx.shadowBlur=18*c.glowPulse;
    ctx.strokeStyle='#a33a1d';ctx.lineWidth=size>40?7:4;ctx.strokeText(value,0,y);
    ctx.fillStyle=fill;ctx.fillText(value,0,y);
    ctx.shadowBlur=0;ctx.strokeStyle='#fff9d5';ctx.lineWidth=.7;ctx.strokeText(value,0,y);
  };
  text(String(c.total),0,q.numberSize);text(c.label,q.labelY,q.labelSize);
  ctx.restore();
}
function drawFX(){if(ART&&ART.drawFX(ctx,waves,particles))return;for(const w of waves){ctx.save();ctx.globalAlpha=Math.max(0,w.life/w.max)*.28;ctx.strokeStyle=w.color;ctx.lineWidth=8;circleStroke(w.x,w.y,w.r);ctx.restore();}for(const p of particles){ctx.save();ctx.globalAlpha=Math.min(.95,p.life/.66*1.25);ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.scale(1.35,.75);ctx.fillStyle=p.color;circle(0,0,p.r);ctx.restore();}}
function circleStroke(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
function drawResult(){if(ART&&ART.drawResult(ctx,{result,score,maxCombo,state}))return;if(!result)return;ctx.save();ctx.fillStyle='#162620f8';ctx.fillRect(0,0,W,H);ctx.fillStyle='#f6e4b2';roundedRect(70,365,580,440,26);ctx.fill();ctx.fillStyle='#31554a';roundedRect(82,377,556,416,20);ctx.fill();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 50px system-ui';ctx.fillStyle=state==='win'?'#fff09a':'#ffd2bd';ctx.fillText(result,360,465);ctx.font='600 28px system-ui';ctx.fillStyle='#fff';ctx.fillText(`最终得分：${score}`,360,565);ctx.fillText(`最大 Combo：×${Math.max(1,maxCombo)}`,360,615);ctx.font='500 20px system-ui';ctx.fillStyle='#d8eadf';ctx.fillText('点击下方按钮重新开始',360,690);ctx.restore();}
function render(){ctx.save();let sx=0,sy=0;if(!reducedMotion&&shake>0){sx=(Math.random()-.5)*shakeMag*2;sy=(Math.random()-.5)*shakeMag*2;}ctx.translate(sx,sy);drawBackground();drawTrack();drawMachine();for(const f of fruits){const p=pointAt(f.renderD),pulse=f.matching?1+Math.sin(Math.min(1,f.matchAge/CFG.matchDelay)*Math.PI)*.2:1;drawFruit(p.x,p.y,f.type,CFG.fruitR,f.matching?.88:1,pulse);}drawLeader();if(projectile){if(ART)ART.drawProjectileTrail(ctx,projectile,reducedMotion);drawFruit(projectile.x,projectile.y,projectile.type,29);}drawFX();if(ART)ART.drawShotFlash(ctx,muzzleFlash);drawShooter();ctx.restore();drawHUD();drawCount();drawResult();if(new URLSearchParams(location.search).has('track'))drawTrackDebug();}
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  const beforeRender=performance.now();update(dt);render();
  runtimePerf.lastRenderMs=performance.now()-beforeRender;
  runtimePerf.frames++;runtimePerf.elapsed+=dt;
  if(dt>.033)runtimePerf.slowFrames++;
  if(runtimePerf.elapsed>=1){runtimePerf.fps=Math.round(runtimePerf.frames/runtimePerf.elapsed);runtimePerf.frames=0;runtimePerf.elapsed=0;}
  requestAnimationFrame(frame);
}
function localPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};}
function setPaused(value){
  if(value)AUDIO.stopAll();
  paused=value;swapBtn.disabled=paused||state!=='playing'||!!projectile;
  document.getElementById('pause').setAttribute('aria-pressed',String(value));
  document.getElementById('pause').setAttribute('aria-label',value?'继续游戏':'暂停游戏');
  document.getElementById('pause-shape').setAttribute('d',value?'M12 7L32 20L12 33Z':'M12 8V32M28 8V32');
  document.getElementById('pause-panel').hidden=!value;
  document.getElementById('pause-score').textContent=String(score);
  document.getElementById('pause-combo').textContent='×'+maxCombo;
  if(value)document.getElementById('resume').focus?.({preventScroll:true});
}
function setMuted(value){
  AUDIO.setMuted(value);
  muted=value;document.getElementById('sound').setAttribute('aria-pressed',String(value));
  document.getElementById('sound').setAttribute('aria-label',value?'开启音效':'关闭音效');
  if(value)document.getElementById('mute-shape').removeAttribute('hidden');else document.getElementById('mute-shape').setAttribute('hidden','');
  document.getElementById('sound-setting').checked=!value;
}
function drawTrackDebug(){
  ctx.save();ctx.strokeStyle='#00ffff';ctx.lineWidth=2;
  ctx.beginPath();samples.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  for(const p of control){ctx.fillStyle='#ff00ff';circle(p.x,p.y,3);}
  ctx.restore();
}
function placeButton(id,x,y,width,height){const el=document.getElementById(id);Object.assign(el.style,{left:100*x/W+'%',top:100*y/H+'%',width:100*width/W+'%',height:100*height/H+'%'});}
for(const [id,key] of [['pause','pauseX'],['reset','restartX'],['sound','soundX'],['settings','settingsX']])placeButton(id,S.buttons[key],S.buttons.y,S.buttons.size,S.buttons.size);
placeButton('pause-card',S.pause.x,S.pause.y,S.pause.width,S.pause.height);
document.getElementById('pause-title').style.top=100*(S.pause.titleY-S.pause.y)/S.pause.height+'%';
placeButton('resume',S.pause.button.x,S.pause.button.y,S.pause.button.width,S.pause.button.height);
placeButton('pause-restart',260,S.pause.restartY-23,200,46);
placeButton('swap',S.swap.x,S.swap.y,S.swap.width,S.swap.height);
placeButton('restart',S.result.button.x,S.result.button.y,S.result.button.width,S.result.button.height);
canvas.addEventListener('pointermove',ev=>{if(atHome||paused||state==='win'||state==='lose')return;const p=localPoint(ev);if(p.y<S.hudBottom||p.y>S.aimMaxY)return;aim.x=Math.max(10,Math.min(W-10,p.x));aim.y=p.y;});
canvas.addEventListener('pointerdown',ev=>{if(atHome||paused||state==='win'||state==='lose')return;const p=localPoint(ev);if(p.y<S.hudBottom||p.y>S.aimMaxY)return;aim.x=p.x;aim.y=p.y;fire(p.x,p.y);});
swapBtn.addEventListener('click',ev=>{ev.stopPropagation();if(atHome||paused||state!=='playing'||projectile)return;[current,next]=[next,current];AUDIO.playSwap();});
restartBtn.addEventListener('click',ev=>{ev.stopPropagation();reset();});
document.getElementById('reset').addEventListener('click',reset);
document.getElementById('start-play').addEventListener('click',()=>{atHome=false;document.getElementById('start-panel').hidden=true;last=performance.now();});
document.getElementById('pause').addEventListener('click',()=>{if(atHome||state==='win'||state==='lose')return;if(!document.getElementById('settings-panel').hidden){document.getElementById('settings-panel').hidden=true;setPaused(false);return;}setPaused(!paused);});
document.getElementById('resume').addEventListener('click',()=>setPaused(false));
document.getElementById('pause-restart').addEventListener('click',reset);
document.getElementById('sound').addEventListener('click',()=>setMuted(!muted));
document.getElementById('sound-setting').addEventListener('change',e=>setMuted(!e.target.checked));
document.getElementById('motion-setting').addEventListener('change',e=>{reducedMotion=!e.target.checked;});
document.getElementById('settings').addEventListener('click',()=>{if(atHome)return;setPaused(true);document.getElementById('settings-panel').hidden=false;document.getElementById('pause-panel').hidden=true;});
document.getElementById('close-settings').addEventListener('click',()=>{document.getElementById('settings-panel').hidden=true;setPaused(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&paused){document.getElementById('settings-panel').hidden=true;setPaused(false);}if(e.key==='Tab'&&paused&&document.getElementById('settings-panel').hidden){e.preventDefault();const a=document.getElementById('resume'),b=document.getElementById('pause-restart');(document.activeElement===a?b:a).focus?.();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state!=='win'&&state!=='lose')setPaused(true);});
if(new URLSearchParams(location.search).has('debug')){
  window.ZumaDebug={
    snapshot:()=>({state,paused,atHome,score,combo,maxCombo,spawned,current,next,projectile:projectile?{...projectile}:null,fruits:fruits.map(f=>({...f,point:pointAt(f.renderD)})),control,totalLen,leader:leaderSnapshot(),shooter:S.shooter,aim:{...aim},feedback:{x:COUNTER.x,y:COUNTER.y,label:COUNTER.label,total:COUNTER.total,countVisible:COUNTER.countVisible,badgeVisible:COUNTER.badgeVisible,scale:COUNTER.countScale,life:COUNTER.life,badgeLife:COUNTER.badgeLife},effects:{particles:particles.length,bursts:waves.length,ranges:waves.map(w=>w.range),muzzleFlash:muzzleFlash?{...muzzleFlash}:null},recoil}),
    pointAt,
    performance:()=>({...runtimePerf,art:ART?ART.status():null}),
    hold:(value=true)=>{debugHold=value;},
    aimAt:(x,y)=>{aim={x,y};render();},
    fireAt:(x,y)=>{aim={x,y};fire(x,y);},
    step:(dt)=>{const held=debugHold;debugHold=false;update(dt);debugHold=held;render();},
    resolveAt:index=>{const m=findMatch(index);if(m)beginMatch(m);render();},
    reset,
    render,
    load:spec=>{reset();fruits=spec.fruits.map(f=>mkFruit(f.type,f.d));spawned=spec.spawned??CFG.total;current=spec.current??0;next=spec.next??1;score=spec.score??0;maxCombo=spec.maxCombo??0;state=spec.state??'playing';debugHold=true;render();}
  };
}
async function start(){
  if(ART&&ART.whenReady)await ART.whenReady();
  buildTrack();reset();
  atHome=!new URLSearchParams(location.search).has('debug');
  document.getElementById('start-panel').hidden=!atHome;
  document.getElementById('loading').hidden=true;setMuted(false);requestAnimationFrame(frame);
  // Opt-in, frozen visual QA fixtures. Normal gameplay never enters this branch.
  const query=new URLSearchParams(location.search);
  if(query.has('debug')){
    const scene=query.get('scene'),d=window.ZumaDebug;
    if(scene==='polish2'||scene==='dragon'||scene==='pause'){
      d.load({fruits:Array.from({length:31},(_,i)=>({type:i%FRUITS.length,d:12+i*54})),current:1,next:4,score:450,maxCombo:3});
      d.aimAt(320,520);if(scene==='pause')setPaused(true);
    }
    else if(scene==='combo3'){
      d.load({fruits:[0,0,4,4,3,3,3,4,0].map((type,i)=>({type,d:1050+i*54}))});
      d.resolveAt(5);for(let i=0;i<300&&d.snapshot().combo<3;i++)d.step(1/60);
      d.step(.32);d.step(.07);
    }
    else if(scene==='win') {d.load({fruits:[],score:2460,maxCombo:4});d.step(.001);d.step(.5);}
    else if(scene==='lose'){d.load({fruits:[{type:1,d:totalLen-S.leader.gap-11}],score:1280,maxCombo:3});d.step(.001);d.step(.5);}
    else if(scene==='burst'){
      d.load({fruits:Array.from({length:37},(_,i)=>({type:i%FRUITS.length,d:15+i*54}))});
      [260,620,980,1340,1700].forEach((distance,type)=>{const p=pointAt(distance);burst(p.x,p.y,type);});
      updateFX(.10);render();
    }
  }
}
start();
})();

