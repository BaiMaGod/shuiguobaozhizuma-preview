/* Reference orchard art; static plinth and independent rotating cannon body. */
(() => {
  'use strict';
  const A='./assets/resources/art/';
  const S=window.FruitLayout;
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
    nextBadge:'ui/next_badge.webp',
    burst:'fx/strawberry_burst.webp',
    orchard:S.background+'.webp'
  };
  let loaded=0,failed=0;
  let finishLoading;
  const loading=new Promise(resolve=>{finishLoading=resolve;});
  const settle=()=>{if(loaded+failed===Object.keys(entries).length)finishLoading();};
  for(const [key,path] of Object.entries(entries)){
    const img=new Image(); images[key]=img;
    img.onload=()=>{loaded++;settle();};
    img.onerror=()=>{failed++;console.warn('[fruit-art] Missing:',path);settle();};
    img.src=A+path+'?v=20261007-art7';
  }
  const FRUIT_BY_TYPE=['watermelon','orange','grape','strawberry'];
  const JUICE=['#ff4f5f','#ff9d20','#9c48eb','#ff3150'];
  const HUE=[-8,38,235,0];
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
        drawFruit(0,q.badgeOffsetY,current,q.badgeRadius);ctx.restore();
      }
      drawFruit(x+ux*(q.muzzleDistance-kick),y+uy*(q.muzzleDistance-kick),current,28);
      const n=S.next;
      if(ready('nextBadge'))ctx.drawImage(images.nextBadge,n.x-n.width/2,n.y-84,n.width,n.height);
      drawFruit(n.x,n.y+10,next,n.fruitRadius);
      ctx.save();ctx.font='800 19px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=3;ctx.strokeStyle='#71390e';ctx.strokeText('下一颗',n.x,n.y-48);
      ctx.fillStyle='#fff0bc';ctx.fillText('下一颗',n.x,n.y-48);ctx.restore();
      return true;
    },

    drawFX(ctx,waves,particles){
      for(const w of waves){
        const k=Math.max(0,w.life/w.max),p=1-k;
        ctx.save();
        // bright core flash
        const glow=ctx.createRadialGradient(w.x,w.y,0,w.x,w.y,56+p*35);
        glow.addColorStop(0,'rgba(255,255,235,'+(0.9*k)+')');
        glow.addColorStop(.22,JUICE[w.type]+'cc');glow.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(w.x,w.y,62+p*38,0,Math.PI*2);ctx.fill();

        if(ready('burst')){
          const s=(112+p*118)*(w.strength||1);
          ctx.globalAlpha=Math.min(1,k*1.55);
          ctx.filter='hue-rotate('+HUE[w.type]+'deg) saturate(1.35) contrast(1.08)';
          ctx.drawImage(images.burst,w.x-s/2,w.y-s/2,s,s);
          ctx.filter='none';
        }
        ctx.globalAlpha=k*.72;ctx.strokeStyle=JUICE[w.type];ctx.lineWidth=9-p*5;
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
      ctx.save();ctx.fillStyle='rgba(19,31,22,.78)';ctx.fillRect(0,0,720,1280);
      plaque(ctx,78,358,564,440,'#9e6634','#4c301d');
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='900 50px system-ui';ctx.fillStyle=state==='win'?'#fff18b':'#ffd0ae';ctx.fillText(result,360,460);
      ctx.font='700 29px system-ui';ctx.fillStyle='#fff1cc';ctx.fillText('最终得分：'+score,360,558);
      ctx.fillText('最大连击：×'+Math.max(1,maxCombo),360,615);
      ctx.font='600 20px system-ui';ctx.fillStyle='#f1d9ad';ctx.fillText('点击下方按钮再玩一局',360,700);
      ctx.restore();return true;
    }
  };
})();