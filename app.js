const worlds=[
  {title:'FROZEN ORBIT',image:'frozen-orbit.png',accent:'#8ce8ff',skyTop:'#c5f1ff',skyMid:'#3e8fc2',skyBottom:'#082743',surface:'#e9fbff'},
  {title:'CORAL CROWN',image:'coral-crown.png',accent:'#5ff7e3',skyTop:'#9ff3ff',skyMid:'#20b6cb',skyBottom:'#075b76',surface:'#e8fffa'},
  {title:'FORGE DEPTHS',image:'forge-depths.png',accent:'#ff7d32',skyTop:'#ffb268',skyMid:'#9c3c2a',skyBottom:'#281015',surface:'#ffe0ac'},
  {title:'AETHER REACH',image:'aether-reach.png',accent:'#ffd58a',skyTop:'#fff0bd',skyMid:'#85c5ef',skyBottom:'#345f94',surface:'#fff9e6'},
  {title:'SUNVAULT',image:'sunvault.png',accent:'#ffbd55',skyTop:'#ffe2a2',skyMid:'#dc8b3e',skyBottom:'#71361f',surface:'#fff0c9'},
  {title:'NOCTURNE MARSH',image:'nocturne-marsh.png',accent:'#9c82ff',skyTop:'#7daed0',skyMid:'#345f91',skyBottom:'#101f4a',surface:'#d8d5ff'},
  {title:'VERDANT ENGINE',image:'verdant-engine.png',video:'verdant-engine.mp4',accent:'#80e0b2',skyTop:'#d9efb5',skyMid:'#6dac86',skyBottom:'#214c50',surface:'#eaffd8'},
  {title:'NEW MERIDIAN',image:'new-meridian.png',accent:'#65c9ff',skyTop:'#d1f2ff',skyMid:'#72bed8',skyBottom:'#2a687f',surface:'#effcff'}
];

const atlas=document.querySelector('#atlas');
const game=document.querySelector('#game');
const worldImage=document.querySelector('#worldImage');
const atlasSky=document.querySelector('#atlasSky');
const atlasDepthFar=document.querySelector('#atlasDepthFar');
const atlasDepthNear=document.querySelector('#atlasDepthNear');
const worldTitle=document.querySelector('#worldTitle');
const currentIndex=document.querySelector('#currentIndex');
const rail=document.querySelector('#worldRail');
const card=document.querySelector('#worldCard');
const diorama=document.querySelector('#diorama');
const terrain=document.querySelector('#terrain');
const terrainImage=document.querySelector('#terrainImage');
const terrainVideo=document.querySelector('#terrainVideo');
const gameSkyImage=document.querySelector('#gameSkyImage');
const gameDepthImage=document.querySelector('#gameDepthImage');
const curtain=document.querySelector('#curtain');
const zoomValue=document.querySelector('#zoomValue');

let active=0;
let playing=false;
let dragging=false;
let dragStart=null;
let lastTime=performance.now();
const keys=new Set();
const view={zoom:1,x:0,y:0,rx:0,ry:0};

worlds.forEach((world,index)=>{
  const button=document.createElement('button');
  button.className='world-thumb'+(index===0?' active':'');
  button.setAttribute('aria-label',world.title);
  button.innerHTML=`<img src="./assets/${world.image}" alt="" />`;
  button.addEventListener('click',()=>selectWorld(index));
  rail.append(button);
});

function selectWorld(next){
  active=(next+worlds.length)%worlds.length;
  const world=worlds[active];
  [worldImage,atlasSky,atlasDepthFar,atlasDepthNear].forEach(image=>image.style.opacity='0');
  setTimeout(()=>{
    const source=`./assets/${world.image}`;
    worldImage.src=source;worldImage.alt=`${world.title} world`;
    [atlasSky,atlasDepthFar,atlasDepthNear].forEach(image=>image.src=source);
    [worldImage,atlasSky,atlasDepthFar,atlasDepthNear].forEach(image=>image.style.opacity='');
  },130);
  worldTitle.textContent=world.title;
  currentIndex.textContent=String(active+1).padStart(2,'0');
  document.querySelector('.eyebrow').textContent=`WORLD ${currentIndex.textContent}`;
  document.documentElement.style.setProperty('--accent',world.accent);
  document.documentElement.style.setProperty('--glow',world.accent);
  document.documentElement.style.setProperty('--sky-top',world.skyTop);
  document.documentElement.style.setProperty('--sky-mid',world.skyMid);
  document.documentElement.style.setProperty('--sky-bottom',world.skyBottom);
  document.documentElement.style.setProperty('--surface',world.surface);
  [...rail.children].forEach((element,index)=>element.classList.toggle('active',index===active));
  rail.children[active].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
}

function clamp(value,min,max){return Math.max(min,Math.min(max,value))}

function renderView(){
  terrain.style.transform=`translate3d(calc(-50% + ${view.x}px),calc(-50% + ${view.y}px),0) rotateX(${view.rx}deg) rotateY(${view.ry}deg) scale(${view.zoom})`;
  game.style.setProperty('--game-x',`${clamp(-view.x*.075,-34,34)}px`);
  game.style.setProperty('--game-y',`${clamp(-view.y*.055,-24,24)}px`);
  game.style.setProperty('--game-far-x',`${clamp(view.x*.035,-18,18)}px`);
  game.style.setProperty('--game-far-y',`${clamp(view.y*.025,-14,14)}px`);
  zoomValue.textContent=String(Math.round(view.zoom*100));
}

function resetView(){
  view.zoom=innerWidth<721?.68:1;
  view.x=0;view.y=0;view.rx=0;view.ry=0;
  renderView();
}

function setZoom(next){
  view.zoom=clamp(next,.68,2.4);
  if(view.zoom<.95){view.x=0;view.y=0}
  renderView();
}

function enterWorld(){
  const world=worlds[active];
  curtain.classList.add('show');
  setTimeout(()=>{
    playing=true;
    terrain.classList.toggle('video-mode',Boolean(world.video));
    if(world.video){
      if(!terrainVideo.src)terrainVideo.src='./assets/verdant-engine.mp4';
      terrainVideo.play().catch(()=>{});
    }else{
      terrainVideo.pause();
      terrainImage.src=`./assets/${world.image}`;
      terrainImage.alt=`${world.title} isometric world`;
    }
    const source=`./assets/${world.image}`;
    gameSkyImage.src=source;
    gameDepthImage.src=source;
    document.querySelector('#gameTitle').textContent=world.title;
    document.querySelector('#gameIndex').textContent=`WORLD ${String(active+1).padStart(2,'0')}`;
    game.style.setProperty('--accent',world.accent);
    resetView();
    atlas.setAttribute('aria-hidden','true');
    game.classList.add('active');
    game.setAttribute('aria-hidden','false');
    setTimeout(()=>curtain.classList.remove('show'),180);
  },220);
}

function exitWorld(){
  curtain.classList.add('show');
  setTimeout(()=>{
    playing=false;
    dragging=false;
    keys.clear();
    terrainVideo.pause();
    game.classList.remove('active');
    game.setAttribute('aria-hidden','true');
    atlas.setAttribute('aria-hidden','false');
    setTimeout(()=>curtain.classList.remove('show'),180);
  },220);
}

function tick(time){
  const dt=Math.min(32,time-lastTime);
  lastTime=time;
  if(playing&&!dragging){
    const speed=.36*dt;
    const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    const dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if(dx||dy){view.x=clamp(view.x+dx*speed,-innerWidth*.65,innerWidth*.65);view.y=clamp(view.y+dy*speed,-innerHeight*.55,innerHeight*.55);renderView()}
  }
  requestAnimationFrame(tick);
}

document.querySelector('#prevWorld').addEventListener('click',()=>selectWorld(active-1));
document.querySelector('#nextWorld').addEventListener('click',()=>selectWorld(active+1));
document.querySelector('#enterWorld').addEventListener('click',enterWorld);
document.querySelector('#exitWorld').addEventListener('click',exitWorld);
document.querySelector('#resetView').addEventListener('click',resetView);
document.querySelector('#zoomIn').addEventListener('click',()=>setZoom(view.zoom+.18));
document.querySelector('#zoomOut').addEventListener('click',()=>setZoom(view.zoom-.18));
document.querySelector('#fullScreen').addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(playing){
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();keys.add(key)}
    if(key==='escape')exitWorld();
    if(key==='0')resetView();
  }else{
    if(key==='arrowleft')selectWorld(active-1);
    if(key==='arrowright')selectWorld(active+1);
    if(key==='enter')enterWorld();
  }
});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));

diorama.addEventListener('pointerdown',event=>{
  if(event.target.closest('button'))return;
  dragging=true;
  diorama.classList.add('dragging');
  diorama.setPointerCapture(event.pointerId);
  dragStart={px:event.clientX,py:event.clientY,x:view.x,y:view.y,rx:view.rx,ry:view.ry};
});
diorama.addEventListener('pointermove',event=>{
  if(!dragging||!dragStart)return;
  const dx=event.clientX-dragStart.px,dy=event.clientY-dragStart.py;
  view.ry=clamp(dragStart.ry+dx*.018,-5.5,5.5);
  view.rx=clamp(dragStart.rx-dy*.014,-3.5,3.5);
  if(view.zoom>.92){view.x=clamp(dragStart.x+dx*.72,-innerWidth*.65,innerWidth*.65);view.y=clamp(dragStart.y+dy*.72,-innerHeight*.55,innerHeight*.55)}
  renderView();
});
function endDrag(){dragging=false;dragStart=null;diorama.classList.remove('dragging')}
diorama.addEventListener('pointerup',endDrag);diorama.addEventListener('pointercancel',endDrag);
diorama.addEventListener('dblclick',()=>setZoom(view.zoom<1.35?1.55:1));
game.addEventListener('wheel',event=>{event.preventDefault();setZoom(view.zoom-event.deltaY*.0008)},{passive:false});

window.addEventListener('resize',()=>{if(playing)resetView()});
window.addEventListener('blur',()=>{keys.clear();endDrag()});
document.addEventListener('mousemove',event=>{
  if(playing||innerWidth<721)return;
  const rx=(event.clientY/innerHeight-.5)*-2.2;
  const ry=(event.clientX/innerWidth-.5)*2.6;
  const nx=event.clientX/innerWidth-.5;
  const ny=event.clientY/innerHeight-.5;
  card.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;
  atlas.style.setProperty('--atlas-x',`${nx*-18}px`);
  atlas.style.setProperty('--atlas-y',`${ny*-12}px`);
  atlas.style.setProperty('--atlas-far-x',`${nx*10}px`);
  atlas.style.setProperty('--atlas-far-y',`${ny*7}px`);
  atlas.style.setProperty('--atlas-near-x',`${nx*-28}px`);
  atlas.style.setProperty('--atlas-near-y',`${ny*-12}px`);
});
document.addEventListener('mouseleave',()=>{
  card.style.transform='rotateX(0) rotateY(0)';
  ['--atlas-x','--atlas-y','--atlas-far-x','--atlas-far-y','--atlas-near-x','--atlas-near-y'].forEach(name=>atlas.style.setProperty(name,'0px'));
});

selectWorld(0);
requestAnimationFrame(tick);
