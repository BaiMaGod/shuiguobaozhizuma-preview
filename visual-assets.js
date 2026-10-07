/* Fruit Zuma visual layer v0.4 — portrait orchard art, no fake track overlay. */
(() => {
  'use strict';
  const A='./assets/resources/art/';
  const images=Object.create(null);
  const entries={
    strawberry:'fruits/strawberry.webp',
    orange:'fruits/orange.webp',
    lemon:'fruits/lemon.webp',
    watermelon:'fruits/watermelon.webp',
    grape:'fruits/grape.webp',
    blueberry:'fruits/blueberry.webp',
    cannon:'launcher/juice_cannon.webp',
    burst:'fx/strawberry_burst.webp',
    orchard:'background/orchard_vertical.webp'
  };
  let loaded=0,failed=0;
  for(const [key,path] of Object.entries(entries)){
    const img=new Image(); images[key]=img;
    img.onload=()=>loaded++;
    img.onerror=()=>{failed++;console.warn('[fruit-art] Missing:',path);};
    img.src=A+path+'?v=20261007-art5';
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
      const g=ctx.createLinearGradient(0,0,0,118);
      g.addColorStop(0,'rgba(17,44,25,.62)');g.addColorStop(1,'rgba(17,44,25,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,w,125);ctx.restore();
      return true;
    },

    // The road is baked into the approved orchard background.
    // Game logic still uses an invisible spline; do not draw a second track.
    drawTrack(){return true;},

    drawShooter(ctx,aim,current,next,drawFruit,recoil=0){
      const x=360,y=1135;
      let dx=aim.x-x,dy=aim.y-y,l=Math.hypot(dx,dy)||1;
      const ux=dx/l,uy=dy/l,angle=Math.atan2(uy,ux);
      const kick=recoil>0?Math.sin(Math.min(1,recoil/.12)*Math.PI)*11:0;
      const bx=x-ux*kick,by=y-uy*kick;

      // Aim guide begins at the muzzle, not the base.
      ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(255,249,217,.88)';ctx.lineWidth=4;
      ctx.setLineDash([2,16]);ctx.beginPath();ctx.moveTo(x+ux*78,y+uy*78);
      ctx.lineTo(x+ux*Math.min(620,l),y+uy*Math.min(620,l));ctx.stroke();ctx.setLineDash([]);ctx.restore();

      // Source cannon points slightly up-right; compensate before applying live aim angle.
      if(ready('cannon')){
        ctx.save();ctx.translate(bx,by);ctx.rotate(angle-(-1.18));
        ctx.shadowColor='#1a100988';ctx.shadowBlur=13;ctx.shadowOffsetY=7;
        const s=184;ctx.drawImage(images.cannon,-s/2,-s*.60,s,s);ctx.restore();
      }

      // Live current fruit sits at the actual muzzle and rotates with the aim direction.
      const mx=x+ux*(66-kick),my=y+uy*(66-kick);
      drawFruit(mx,my,current,27);

      // Next fruit: independent polished preview badge.
      const nx=636,ny=1084;
      ctx.save();ctx.shadowColor='#1c100a99';ctx.shadowBlur=8;ctx.shadowOffsetY=4;
      ctx.fillStyle='#6e401f';ctx.beginPath();ctx.arc(nx,ny,39,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f5c05b';ctx.beginPath();ctx.arc(nx,ny,33,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#5e361c';ctx.beginPath();ctx.arc(nx,ny,27,0,Math.PI*2);ctx.fill();ctx.restore();
      drawFruit(nx,ny,next,22);
      ctx.save();ctx.font='700 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=4;ctx.strokeStyle='#3a2114';ctx.strokeText('下一颗',nx,1038);
      ctx.fillStyle='#fff4c9';ctx.fillText('下一颗',nx,1038);ctx.restore();
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
      const {score,combo}=data;
      ctx.save();
      plaque(ctx,18,10,232,70,'#ad7442','#6e4024');
      ctx.textBaseline='middle';ctx.textAlign='left';
      ctx.font='800 22px system-ui';ctx.fillStyle='#ffe7ac';ctx.fillText('分数',42,42);
      ctx.font='900 31px system-ui';ctx.fillStyle='#fff9df';ctx.fillText(String(score),112,44);

      plaque(ctx,278,12,218,66,'#ff9c26','#b64213');
      ctx.textAlign='center';ctx.font='900 28px system-ui';ctx.fillStyle='#fff1a6';
      ctx.fillText('连击 ×'+combo,387,46);
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