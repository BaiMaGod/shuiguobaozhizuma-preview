/* Fruit Zuma visual upgrade v0.2 — render-only layer, gameplay rules unchanged. */
(() => {
  'use strict';
  const A = './assets/resources/art/';
  const images = Object.create(null);
  const entries = {
    strawberry:'fruits/strawberry.webp', orange:'fruits/orange.webp',
    lemon:'fruits/lemon.webp', watermelon:'fruits/watermelon.webp',
    grape:'fruits/grape.webp', blueberry:'fruits/blueberry.webp',
    cannon:'launcher/juice_cannon.webp', strawberryBurst:'fx/strawberry_burst.webp',
    strawberryAtlas:'fx/strawberry_atlas.webp', orangeAtlas:'fx/orange_atlas.webp',
    grapeAtlas:'fx/grape_atlas.webp', watermelonAtlas:'fx/watermelon_atlas.webp',
    orchard:'background/orchard_blurred.webp'
  };
  let loaded = 0, failed = 0;
  for (const [key, path] of Object.entries(entries)) {
    const img = new Image();
    images[key] = img;
    img.onload = () => loaded++;
    img.onerror = () => { failed++; console.warn('[fruit-art] Missing:', path); };
    img.src = A + path + '?v=20261007-art2';
  }
  const FRUIT_BY_TYPE = ['watermelon', 'orange', 'grape', 'strawberry'];
  const COLORS = ['#ff5c58','#ffad37','#ac64ef','#ff4163'];
  const isReady = key => images[key] && images[key].complete && images[key].naturalWidth > 0;
  const curve = (ctx,x,y,w,h,r=16) => {
    const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);
    ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath();
  };
  const fillBox=(ctx,x,y,w,h,base,light,edge,r=18)=>{
    ctx.save(); ctx.shadowColor='#162318aa';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
    curve(ctx,x,y,w,h,r);ctx.fillStyle=edge;ctx.fill();ctx.shadowColor='transparent';
    curve(ctx,x+4,y+4,w-8,h-10,r-3);const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,light);g.addColorStop(1,base);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='#ffe8a488';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  };
  const leaf=(ctx,x,y,s)=>{ctx.save();ctx.translate(x,y);ctx.rotate(-.42);ctx.fillStyle='#449e30';ctx.beginPath();ctx.ellipse(0,0,s,s*.52,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c3ee6b';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-s*.7,0);ctx.lineTo(s*.7,0);ctx.stroke();ctx.restore();};
  const bloom=(ctx,x,y)=>{ctx.save();ctx.translate(x,y);for(let j=0;j<5;j++){ctx.rotate(Math.PI*2/5);ctx.fillStyle='#fff5dc';ctx.beginPath();ctx.ellipse(0,-6,4.4,7,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#ffc83c';ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fill();ctx.restore();};

  let trackCache = null, backgroundCache = null;
  const drawTrackTo=(ctx,samples)=>{
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    const stroke=(width,color,shadow=false)=>{ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;
      if(shadow){ctx.shadowColor='#1d291fbb';ctx.shadowBlur=14;ctx.shadowOffsetY=8;}
      ctx.beginPath();samples.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();};
    stroke(87,'#34482a',true);stroke(78,'#744523');stroke(70,'#c48a47');
    stroke(61,'#f0bd76');stroke(54,'#7a4a2d');stroke(49,'#bd894e');
    for(let i=4;i<samples.length;i+=9){const p=samples[i], nx=-p.ty,ny=p.tx;
      ctx.beginPath();ctx.moveTo(p.x-nx*25,p.y-ny*25);ctx.lineTo(p.x+nx*25,p.y+ny*25);
      ctx.strokeStyle='#75452177';ctx.lineWidth=3;ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x-nx*22-2,p.y-ny*22-2);ctx.lineTo(p.x+nx*22-2,p.y+ny*22-2);
      ctx.strokeStyle='#ffda9580';ctx.lineWidth=1.3;ctx.stroke();
    }
    // Occasional bright wood grain makes it visually match the generated art.
    for(let i=18;i<samples.length;i+=35){const p=samples[i],nx=-p.ty,ny=p.tx;
      leaf(ctx,p.x+nx*37,p.y+ny*37,8);if(i%3===0)bloom(ctx,p.x-nx*36,p.y-ny*36);
    }
    ctx.restore();
  };
  const art={
    status:()=>({loaded,failed,total:Object.keys(entries).length}),
    drawFruit(ctx,x,y,type,r,alpha=1,scale=1){const name=FRUIT_BY_TYPE[type];if(!isReady(name))return false;
      const side=r*2.16;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;
      ctx.shadowColor='#0007';ctx.shadowBlur=6;ctx.shadowOffsetY=4;
      ctx.drawImage(images[name],-side/2,-side/2,side,side);ctx.restore();return true;},
    drawBackground(ctx,w,h){if(!isReady('orchard'))return false;
      // The previous build intentionally used a pre-blurred concept image. Build a
      // sharpened cache once so the actual orchard art reads as the scene instead
      // of a vague backdrop. Gameplay layers then sit directly on its baked road.
      if(!backgroundCache){
        backgroundCache=document.createElement('canvas');backgroundCache.width=w;backgroundCache.height=h;
        const bc=backgroundCache.getContext('2d',{willReadFrequently:true});
        bc.imageSmoothingEnabled=true;bc.imageSmoothingQuality='high';
        bc.drawImage(images.orchard,0,0,w,h);
        try{
          const im=bc.getImageData(0,0,w,h),d=im.data,src=new Uint8ClampedArray(d);
          const gain=1.28;
          for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
            const p=(y*w+x)*4,l=p-4,r=p+4,u=p-w*4,dd=p+w*4;
            for(let c=0;c<3;c++){
              const avg=(src[l+c]+src[r+c]+src[u+c]+src[dd+c])*.25;
              d[p+c]=Math.max(0,Math.min(255,src[p+c]+(src[p+c]-avg)*gain));
            }
          }
          bc.putImageData(im,0,0);
        }catch(e){console.warn('[fruit-art] background sharpen skipped',e);}
        bc.save();bc.globalCompositeOperation='source-over';
        const vg=bc.createLinearGradient(0,0,0,h);vg.addColorStop(0,'rgba(16,49,31,.04)');vg.addColorStop(.8,'rgba(9,27,20,.02)');vg.addColorStop(1,'rgba(6,20,15,.16)');
        bc.fillStyle=vg;bc.fillRect(0,0,w,h);bc.restore();
      }
      ctx.drawImage(backgroundCache,0,0,w,h);
      return true;},
    drawTrack(ctx,samples){
      // The orchard background already contains the finished road. Samples remain
      // collision/movement data only; do not paint a second synthetic track over it.
      return true;
    },
    drawShooter(ctx,aim,current,next,drawFruit,recoil=0){
      const x=360,y=1135;let dx=aim.x-x,dy=aim.y-y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
      const aimAngle=Math.atan2(dy,dx), recoilT=Math.max(0,Math.min(1,recoil/.12));
      const kick=Math.sin(recoilT*Math.PI)*10;
      ctx.save();
      // Aim guide starts at the live muzzle and follows pointer direction.
      ctx.strokeStyle='#fff8dfaa';ctx.lineWidth=5;ctx.lineCap='round';ctx.setLineDash([3,18]);
      ctx.beginPath();ctx.moveTo(x+ux*76,y+uy*76);ctx.lineTo(x+ux*Math.min(760,l),y+uy*Math.min(760,l));ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#fffce8';for(let j=1;j<=5;j++){const dd=74+j*72;if(dd>l)break;ctx.beginPath();ctx.arc(x+ux*dd,y+uy*dd,Math.max(2,5-j*.5),0,Math.PI*2);ctx.fill();}

      // Static pedestal keeps the base planted while the upper cannon rotates.
      ctx.save();ctx.translate(x,y+42);ctx.shadowColor='#0008';ctx.shadowBlur=13;ctx.shadowOffsetY=7;
      ctx.fillStyle='#5c381e';ctx.beginPath();ctx.ellipse(0,0,83,33,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#df8b26';ctx.beginPath();ctx.ellipse(0,-5,70,25,0,0,Math.PI*2);ctx.fill();ctx.restore();

      if(isReady('cannon')){
        ctx.save();
        ctx.translate(x-ux*kick,y-uy*kick);
        // Source art points mostly upward; rotate it around its body so the muzzle
        // visibly tracks the pointer without rotating the pedestal below.
        ctx.rotate(aimAngle+Math.PI/2-.14);
        ctx.shadowColor='#0009';ctx.shadowBlur=14;ctx.shadowOffsetY=7;
        ctx.drawImage(images.cannon,-101,-108,202,202);
        ctx.restore();
      }else{
        ctx.save();ctx.translate(x,y);ctx.rotate(aimAngle+Math.PI/2);
        fillBox(ctx,-70,-68,140,128,'#c47d20','#ffce60','#75401d',32);ctx.restore();
      }

      // Keep the loaded fruit at the live muzzle so the firing direction is obvious.
      const muzzleD=62-kick,mx=x+ux*muzzleD,my=y+uy*muzzleD;
      drawFruit(mx,my,current,27,1,1+recoilT*.06);

      // Next-fruit pod remains fixed and readable.
      ctx.fillStyle='#5b3118';ctx.beginPath();ctx.ellipse(610,1125,35,29,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffc663';ctx.beginPath();ctx.ellipse(610,1125,29,24,0,0,Math.PI*2);ctx.fill();
      drawFruit(610,1121,next,22);
      ctx.font='700 19px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=5;ctx.strokeStyle='#3b2918';ctx.strokeText('下一颗',610,1069);ctx.fillStyle='#fff6db';ctx.fillText('下一颗',610,1069);
      ctx.restore();return true;
    },
    drawFX(ctx,waves,particles){
      const atlasByType=['watermelonAtlas','orangeAtlas','grapeAtlas','strawberryAtlas'];
      for(const w of waves){
        const k=Math.max(0,w.life/w.max),p=1-k,type=w.type|0,col=COLORS[type]||COLORS[0];
        ctx.save();
        // White impact flash makes the contact frame feel crisp rather than just fade.
        ctx.globalAlpha=Math.min(.72,k*1.1);
        const flash=ctx.createRadialGradient(w.x,w.y,1,w.x,w.y,34+p*26);
        flash.addColorStop(0,'#fffef0');flash.addColorStop(.18,'#fff7cfdd');flash.addColorStop(.55,col+'99');flash.addColorStop(1,'#ffffff00');
        ctx.fillStyle=flash;ctx.beginPath();ctx.arc(w.x,w.y,40+p*35,0,Math.PI*2);ctx.fill();

        // Use the generated type-specific splash art as the hero frame.
        const atlas=atlasByType[type];
        if(isReady(atlas)){
          const s=92+p*(96+(w.strength||1)*14);
          ctx.globalAlpha=Math.min(1,k*1.45);
          ctx.save();ctx.translate(w.x,w.y);ctx.rotate(((w.seed||0)%7-3)*.045);
          ctx.drawImage(images[atlas],-s/2,-s/2,s,s);ctx.restore();
        }else if(type===3&&isReady('strawberryBurst')){
          const s=90+p*105;ctx.globalAlpha=Math.min(1,k*1.4);ctx.drawImage(images.strawberryBurst,w.x-s/2,w.y-s/2,s,s);
        }

        // Add three real fruit-image shards flying out from the center.
        const fruitName=FRUIT_BY_TYPE[type];
        if(isReady(fruitName)){
          for(let n=0;n<3;n++){
            const a=((w.seed||0)*.017+n*2.18),dist=18+p*(44+n*10),sz=24+p*8;
            const cx=w.x+Math.cos(a)*dist,cy=w.y+Math.sin(a)*dist-p*18;
            ctx.save();ctx.translate(cx,cy);ctx.rotate(a+p*(n%2?2.4:-2.1));
            ctx.beginPath();ctx.moveTo(-sz*.48,-sz*.42);ctx.lineTo(sz*.55,-sz*.18);ctx.lineTo(-sz*.12,sz*.58);ctx.closePath();ctx.clip();
            ctx.drawImage(images[fruitName],-sz,-sz,sz*2,sz*2);ctx.restore();
          }
        }

        // Expanding juice ring / lingering splat.
        ctx.globalAlpha=k*.7;ctx.strokeStyle=w.color;ctx.lineWidth=Math.max(2,8-p*5);
        ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=k*.28;ctx.fillStyle=col;for(let n=0;n<7;n++){
          const a=n*Math.PI*2/7+(w.seed||0)*.01,rr=22+p*(42+(n%3)*8);
          ctx.beginPath();ctx.ellipse(w.x+Math.cos(a)*rr,w.y+Math.sin(a)*rr,7+p*6,3+p*4,a,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
      for(const p of particles){
        ctx.save();ctx.globalAlpha=Math.max(0,Math.min(.98,p.life/p.max*1.25));ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        const g=ctx.createRadialGradient(-2,-3,1,0,0,p.r*1.7);g.addColorStop(0,'#fff9dd');g.addColorStop(.3,p.color);g.addColorStop(1,p.color);
        ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,p.r*1.7,p.r*.75,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      return true;
    },
    drawMachine(ctx,p){ctx.save();ctx.translate(p.x,p.y);
      ctx.save();ctx.shadowColor='#0008';ctx.shadowBlur=13;ctx.shadowOffsetY=6;
      fillBox(ctx,-59,-55,118,130,'#b26c27','#f9c66e','#5b311c',25);ctx.restore();
      ctx.fillStyle='#3e291b';ctx.beginPath();ctx.ellipse(0,-8,45,41,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffdd86';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(0,-8,43,40,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#0e1f1a';ctx.beginPath();ctx.ellipse(0,-8,33,30,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#f7d38b';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-18,-26);ctx.lineTo(18,9);ctx.moveTo(18,-26);ctx.lineTo(-18,9);ctx.stroke();
      leaf(ctx,-36,50,18);bloom(ctx,34,49);
      ctx.font='700 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#3b2118';ctx.lineWidth=5;
      ctx.strokeText('榨汁口',0,98);ctx.fillStyle='#fff5c8';ctx.fillText('榨汁口',0,98);ctx.restore();return true;},
    drawHUD(ctx,data){
      const {score,combo,startedShot,state}=data;
      ctx.save();ctx.fillStyle='#183221e8';ctx.fillRect(0,0,720,95);
      fillBox(ctx,18,11,263,74,'#673d21','#ad7442','#402415',20);
      ctx.font='800 24px system-ui';ctx.fillStyle='#ffe5a1';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('分数',45,42);
      ctx.font='900 32px system-ui';ctx.fillStyle='#fff9df';ctx.fillText(String(score),122,45);
      leaf(ctx,260,19,12);bloom(ctx,30,20);
      if(combo>=2){fillBox(ctx,304,13,221,70,'#9b3a10','#ffb83d','#63290c',24);
        ctx.textAlign='center';ctx.font='900 30px system-ui';ctx.fillStyle='#fff5aa';ctx.fillText(`连击 ×${combo}`,414,50);
      }else{ctx.font='700 24px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe4a7';ctx.fillText('水果爆汁祖玛',410,49);}
      // HUD never suggests nonfunctional controls; only buttons in HTML are clickable.
      if(!startedShot&&state==='playing'){fillBox(ctx,68,1005,530,50,'#4a3c20','#795b2f','#36281b',19);
        ctx.font='600 20px system-ui';ctx.fillStyle='#fff9d9';ctx.textAlign='center';ctx.fillText('点击轨道方向发射 · 相同水果3连即可爆汁',333,1030);}
      ctx.restore();return true;
    },
    drawResult(ctx,data){const {result,score,maxCombo,state}=data;if(!result)return true;
      ctx.save();ctx.fillStyle='#102420e8';ctx.fillRect(0,0,720,1280);
      fillBox(ctx,75,360,570,455,'#4d321f','#a46c38','#291c15',36);
      for(let j=0;j<4;j++){leaf(ctx,84+j*31,368,12);leaf(ctx,585+j*18,803,14);}
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 52px system-ui';
      ctx.fillStyle=state==='win'?'#fff28b':'#ffc6a4';ctx.fillText(result,360,462);
      ctx.fillStyle='#fce8bf';ctx.font='700 29px system-ui';ctx.fillText('最终得分：'+score,360,557);
      ctx.fillText('最大连击：×'+Math.max(1,maxCombo),360,612);
      ctx.font='600 21px system-ui';ctx.fillStyle='#efe0b6';ctx.fillText('点击下方按钮再玩一局',360,699);
      ctx.restore();return true;
    }
  };
  window.FruitArt = art;
})();