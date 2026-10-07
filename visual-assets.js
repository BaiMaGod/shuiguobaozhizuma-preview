/* Reference orchard art; static plinth and independent rotating cannon body. */
(() => {
  'use strict';
  const A='./assets/resources/art/';
  const S=window.FruitLayout;
  const F=window.FruitFeedback;
  const images=Object.create(null);
  const entries={
    strawberry:'fruits/strawberry.webp',
    orange:'fruits/orange.webp',
    lemon:'fruits/lemon.webp',
    watermelon:'fruits/watermelon.webp',
    grape:'fruits/grape.webp',
    blueberry:'fruits/blueberry.webp',
    body:'launcher/cannon_body_v2.webp',
    base:'launcher/cannon_base_v2.webp',
    scorePlaque:'ui/score_plaque.webp',
    comboSplash:'ui/combo_splash.webp',
    resultBoard:'ui/result_board_v2.webp',
    orchard:S.background+'.webp'
  };
  F.burstKeys.forEach((key,type)=>{entries['burst'+type]=key+'.webp';});
  let loaded=0,failed=0;
  let finishLoading;
  const loading=new Promise(resolve=>{finishLoading=resolve;});
  const settle=()=>{if(loaded+failed===Object.keys(entries).length)finishLoading();};
  for(const [key,path] of Object.entries(entries)){
    const img=new Image(); images[key]=img;
    img.onload=()=>{loaded++;settle();};
    img.onerror=()=>{failed++;console.warn('[fruit-art] Missing:',path);settle();};
    img.src=A+path+'?v=20261007-polish2';
  }
  const FRUIT_BY_TYPE=['watermelon','orange','grape','strawberry','lemon'];
  const JUICE=FRUIT_BY_TYPE.map((_,type)=>window.FruitPalette[type].juice);
  const ready=k=>images[k]&&images[k].complete&&images[k].naturalWidth>0;
  const rr=(ctx,x,y,w,h,r)=>{
    const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);
    ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath();
  };
  const plaque=(ctx,x,y,w,h,c1,c2)=>{
    ctx.save();ctx.shadowColor='#26150baa';ctx.shadowBlur=10;ctx.shadowOffsetY=4;
    rr(ctx,x,y,w,h,18);ctx.fillStyle='#5f341c';ctx.fill();
    ctx.shadowColor='transparent';rr(ctx,x+4,y+4,w-8,h-9,15);
    const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='#ffe0a6aa';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  };

  window.FruitArt={
    status:()=>({loaded,failed,total:Object.keys(entries).length}),
    whenReady:()=>loading,

    drawFruit(ctx,x,y,type,r,alpha=1,scale=1){
      const img=images[FRUIT_BY_TYPE[type]];
      if(!img||!ready(FRUIT_BY_TYPE[type]))return false;
      const side=r*2.22;
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;
      ctx.shadowColor='#1e120a88';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
      ctx.drawImage(img,-side/2,-side/2,side,side);ctx.restore();return true;
    },

    drawBackground(ctx,w,h){
      if(!ready('orchard'))return false;
      ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(images.orchard,0,0,w,h);
      ctx.restore();
      return true;
    },

    // The road is baked into the approved orchard background.
    // Game logic still uses an invisible spline; do not draw a second track.
    drawTrack(){return true;},

    drawShooter(ctx,aim,current,next,drawFruit,recoil=0,reducedMotion=false){
      const q=S.shooter,x=q.x,y=q.y;
      const dx=aim.x-x,dy=aim.y-y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
      const kick=reducedMotion?0:Math.sin(Math.min(1,recoil/.12)*Math.PI)*8;
      // Stone plinth never rotates or moves with barrel recoil.
      if(ready('base'))ctx.drawImage(images.base,x-q.baseWidth/2,y+30-q.baseHeight/2,q.baseWidth,q.baseHeight);
      ctx.save();
      for(let d=q.muzzleDistance+30;d<Math.min(800,l);d+=24){
        ctx.fillStyle='rgba(255,247,211,'+(d<250?'.96':'.84')+')';
        ctx.beginPath();ctx.arc(x+ux*d,y+uy*d,d<250?4.6:3.3,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      if(ready('body')){
        ctx.save();ctx.translate(x-ux*kick,y-uy*kick);ctx.rotate(Math.atan2(uy,ux)+Math.PI/2);
        ctx.drawImage(images.body,-q.bodyWidth/2,-q.bodyPivotY,q.bodyWidth,q.bodyHeight);
        drawFruit(0,q.previewOffsetY,next,q.previewRadius);
        ctx.fillStyle='#743d16';rr(ctx,-31,q.previewLabelY-10,62,20,9);ctx.fill();
        ctx.strokeStyle='#ffe59b';ctx.lineWidth=1.3;ctx.stroke();
        ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff1bb';
        ctx.fillText('下一颗',0,q.previewLabelY);ctx.restore();
      }
      drawFruit(x+ux*(q.muzzleDistance-kick),y+uy*(q.muzzleDistance-kick),current,28);
      return true;
    },

    drawFX(ctx,waves,particles){
      for(const w of waves){
        const k=Math.max(0,w.life/w.max),p=1-k;
        ctx.save();
        // bright core flash
        const glow=ctx.createRadialGradient(w.x,w.y,0,w.x,w.y,56+p*35);
        const flash=Math.max(0,1-p/.45);
        glow.addColorStop(0,'rgba(255,255,235,'+(0.65*flash)+')');
        glow.addColorStop(.22,JUICE[w.type]+Math.round(flash*130).toString(16).padStart(2,'0'));glow.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(w.x,w.y,62+p*38,0,Math.PI*2);ctx.fill();

        if(ready('burst'+w.type)){
          const s=Math.min(236,128+(w.strength||1)*30)*(.45+(1-Math.pow(1-p,3))*.72);
          ctx.globalAlpha=p<.12?p/.12:Math.pow(k/.88,1.3);
          ctx.translate(w.x,w.y);ctx.rotate(w.rotation||0);
          ctx.drawImage(images['burst'+w.type],-s/2,-s/2,s,s);
          ctx.rotate(-(w.rotation||0));ctx.translate(-w.x,-w.y);
        }
        ctx.globalAlpha=Math.max(0,1-p/.58)*.38;ctx.strokeStyle=JUICE[w.type];ctx.lineWidth=5-p*3;
        ctx.beginPath();ctx.arc(w.x,w.y,28+p*66,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }

      for(const p of particles){
        const a=Math.max(0,Math.min(.98,p.life/p.max*1.35));
        ctx.save();ctx.globalAlpha=a;ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        if(p.shard){
          ctx.fillStyle=p.color;ctx.strokeStyle='#fff5cf99';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(-p.r*1.35,p.r*.75);ctx.lineTo(p.r*1.45,0);ctx.lineTo(-p.r*.65,-p.r*.9);ctx.closePath();ctx.fill();ctx.stroke();
        }else{
          const g=ctx.createRadialGradient(-2,-3,1,0,0,p.r*1.5);
          g.addColorStop(0,'#fff7dd');g.addColorStop(.30,p.color);g.addColorStop(1,p.color);
          ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,p.r*1.55,p.r*.76,0,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
      return true;
    },

    drawShotFlash(ctx,flash){
      if(!flash)return;
      const p=1-flash.life/F.shotFlashLife,scale=.65+p*1.35;
      ctx.save();ctx.translate(flash.x,flash.y);ctx.scale(scale,scale);ctx.globalAlpha=(1-p)*.9;
      ctx.strokeStyle='#fff5c3';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=JUICE[flash.type];ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.restore();
    },

    drawProjectileTrail(ctx,p,reducedMotion){
      if(!p||reducedMotion)return;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillStyle=JUICE[p.type];
      F.trailRadii.forEach((r,i)=>{
        ctx.globalAlpha=F.trailAlpha[i];ctx.beginPath();
        ctx.ellipse(-F.trailDistances[i],0,r*1.3,r*.65,0,0,Math.PI*2);ctx.fill();
      });ctx.restore();
    },

    // Keep the orchard route clean; the terminal is logically off-screen at the path end.
    drawMachine(){return true;},

    drawHUD(ctx,data){
      const {score,combo}=data,p=S.score,c=S.combo;
      ctx.save();
      if(ready('scorePlaque'))ctx.drawImage(images.scorePlaque,p.x,p.y,p.width,p.height);
      else plaque(ctx,p.x,p.y,p.width,p.height,'#ad7442','#6e4024');
      ctx.textBaseline='middle';ctx.textAlign='center';
      const label=(txt,x,y,size)=>{ctx.font='900 '+size+'px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#6d3418';ctx.strokeText(txt,x,y);ctx.fillStyle='#fff0b6';ctx.fillText(txt,x,y);};
      label('分数',p.x+p.width/2,p.y+29,22);
      label(String(score),p.x+p.width/2,p.y+62,34);
      if(ready('comboSplash'))ctx.drawImage(images.comboSplash,c.x,c.y,c.width,c.height);
      else plaque(ctx,c.x,c.y,c.width,c.height,'#ff9c26','#b64213');
      label('连击 ×'+combo,c.x+c.width/2,c.y+65,29);
      ctx.restore();return true;
    },

    drawResult(ctx,data){
      const {result,score,maxCombo,state}=data;if(!result)return true;
      const r=S.result,won=state==='win';
      ctx.save();ctx.fillStyle='rgba(19,31,22,.77)';ctx.fillRect(0,0,S.width,S.height);
      if(ready('resultBoard'))ctx.drawImage(images.resultBoard,r.x,r.y,r.width,r.height);
      else plaque(ctx,r.x,r.y,r.width,r.height,'#fff0c8','#e8d0a1');
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='900 48px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#673616';ctx.strokeText(won?'爆汁成功！':'还差一点！',360,r.titleY);
      ctx.fillStyle='#fff0b1';ctx.fillText(won?'爆汁成功！':'还差一点！',360,r.titleY);
      ctx.font='700 23px system-ui';ctx.fillStyle='#79512f';ctx.fillText(won?'果园清空啦，漂亮！':'水果到达终点，再试一次',360,r.subtitleY);
      ctx.font='900 70px system-ui';ctx.fillStyle='#b45b1b';ctx.fillText(String(score),360,r.scoreY);
      ctx.font='700 24px system-ui';ctx.fillStyle='#79512f';ctx.fillText('最终得分',360,r.scoreLabelY);
      ctx.font='800 29px system-ui';ctx.fillText('最大连击  ×'+Math.max(0,maxCombo),360,r.comboY);
      ctx.restore();return true;
    }
  };
})();
