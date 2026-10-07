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

  let trackCache = null;
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
      ctx.drawImage(images.orchard,0,0,w,h);
      ctx.fillStyle='rgba(14,39,31,.22)';ctx.fillRect(0,0,w,h);
      return true;},
    drawTrack(ctx,samples){if(!trackCache){trackCache=document.createElement('canvas');trackCache.width=720;trackCache.height=1280;drawTrackTo(trackCache.getContext('2d'),samples);}ctx.drawImage(trackCache,0,0);return true;},
    drawShooter(ctx,aim,current,next,drawFruit){
      const x=360,y=1135;let dx=aim.x-x,dy=aim.y-y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
      ctx.save();ctx.strokeStyle='#fff8df88';ctx.lineWidth=5;ctx.lineCap='round';ctx.setLineDash([3,18]);
      ctx.beginPath();ctx.moveTo(x+ux*69,y+uy*69);ctx.lineTo(x+ux*Math.min(760,l),y+uy*Math.min(760,l));ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#fffce5';for(let j=1;j<=5;j++){let dd=65+j*75;if(dd>l)break;ctx.beginPath();ctx.arc(x+ux*dd,y+uy*dd,Math.max(2,5-j*.45),0,Math.PI*2);ctx.fill();}
      if(isReady('cannon')){ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=14;ctx.shadowOffsetY=7;ctx.drawImage(images.cannon,x-101,y-112,202,202);ctx.restore();}
      else{fillBox(ctx,x-70,y-68,140,128,'#c47d20','#ffce60','#75401d',32);}
      // The loaded cannon artwork is a prop; the current ball remains a separate live sprite.
      drawFruit(x+13,y-52,current,27);
      ctx.fillStyle='#5b3118';ctx.beginPath();ctx.ellipse(610,1125,35,29,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffc663';ctx.beginPath();ctx.ellipse(610,1125,29,24,0,0,Math.PI*2);ctx.fill();
      drawFruit(610,1121,next,22);
      ctx.font='700 19px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=5;ctx.strokeStyle='#3b2918';ctx.strokeText('下一颗',610,1069);ctx.fillStyle='#fff6db';ctx.fillText('下一颗',610,1069);
      ctx.restore();return true;
    },
    drawFX(ctx,waves,particles){
      for(const w of waves){let k=Math.max(0,w.life/w.max),p=1-k;
        ctx.save();ctx.globalAlpha=k*.7;
        if(w.type===3&&isReady('strawberryBurst')){const s=70+p*120;ctx.drawImage(images.strawberryBurst,w.x-s/2,w.y-s/2,s,s);}
        else{let col=COLORS[w.type]||COLORS[0];let g=ctx.createRadialGradient(w.x,w.y,4,w.x,w.y,42+p*30);
          g.addColorStop(0,col);g.addColorStop(.22,col+'aa');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(w.x,w.y,42+p*30,0,Math.PI*2);ctx.fill();}
        ctx.strokeStyle=w.color;ctx.lineWidth=8-p*5;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(.98,p.life/.66*1.3));ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        const g=ctx.createRadialGradient(-2,-3,1,0,0,p.r*1.5);g.addColorStop(0,'#fff6d9');g.addColorStop(.36,p.color);g.addColorStop(1,p.color);ctx.fillStyle=g;
        ctx.beginPath();ctx.ellipse(0,0,p.r*1.5,p.r*.82,0,0,Math.PI*2);ctx.fill();ctx.restore();}
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