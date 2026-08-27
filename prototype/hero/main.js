/* Explicit semantic graph + velocity-field interaction. */
const WORDS = [
  ['Голос',.27,.22,0],['Речь',.16,.29,760],['Пауза',.08,.39,1080],['Смысл',.09,.58,760],['Ясность',.18,.48,1080],
  ['Проявление',.20,.76,0],['Свобода',.34,.88,900],['Опора',.50,.87,0],['Устойчивость',.65,.90,760],['Границы',.77,.80,1080],
  ['Диалог',.64,.16,0],['Контакт',.78,.18,760],['Подход',.57,.27,1080],['Переговоры',.90,.28,1080],['Доверие',.82,.42,1080],
  ['Связи',.92,.49,760],['Возможности',.90,.67,0],['Влияние',.73,.67,900]
];
const LINKS = {
  Голос:['Речь','Пауза','Проявление'], Речь:['Смысл','Ясность'], Смысл:['Ясность','Подход','Влияние'], Пауза:['Опора','Устойчивость'],
  Проявление:['Свобода','Опора','Контакт'], Опора:['Устойчивость','Границы'], Границы:['Переговоры','Устойчивость'],
  Диалог:['Контакт','Подход','Связи'], Контакт:['Доверие','Связи'], Подход:['Переговоры','Доверие'], Переговоры:['Влияние','Границы'],
  Доверие:['Связи','Влияние'], Связи:['Возможности'], Возможности:['Свобода','Влияние']
};
const hero=document.querySelector('#hero'), canvas=document.querySelector('#network'), ctx=canvas.getContext('2d'), layer=document.querySelector('#nodes'), title=document.querySelector('#hero-title');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const state={width:0,height:0,active:null,titleHover:false,frame:0,running:true,initialized:false,releaseTimer:0,lastTime:0};
let lastInput='keyboard';
const nodes=WORDS.map(([text,x,y,min],index)=>({text,x0:x,y0:y,min,index,x:0,y:0,vx:0,vy:0,width:0,height:0,visible:true,el:null}));
const byName=new Map(nodes.map(n=>[n.text,n]));
const graph=new Map(nodes.map(n=>[n.text,new Set()]));
Object.entries(LINKS).forEach(([from,tos])=>tos.forEach(to=>{graph.get(from)?.add(to);graph.get(to)?.add(from);}));

nodes.forEach(node=>{
  const el=document.createElement('button'); el.className='node'; el.type='button'; el.textContent=node.text; el.setAttribute('aria-describedby','network-help');
  el.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')setActive(node.text);});
  el.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&state.active===node.text)scheduleRelease(node.text);});
  el.addEventListener('pointerdown',event=>{lastInput=event.pointerType;});
  el.addEventListener('focus',()=>{if(lastInput==='keyboard')setActive(node.text);});
  el.addEventListener('blur',()=>{if(state.active===node.text)scheduleRelease(node.text);});
  el.addEventListener('click',event=>{event.preventDefault();if(lastInput==='touch'&&state.active===node.text)scheduleRelease(node.text);else setActive(node.text);});
  layer.append(el); node.el=el;
});
title.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')state.titleHover=true;});
title.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){state.titleHover=false;releaseFromCenter();}});

function setActive(name){
  clearTimeout(state.releaseTimer); state.active=name;
  const linked=name?graph.get(name)||new Set():new Set();
  nodes.forEach(n=>{n.el.classList.toggle('is-active',n.text===name);n.el.classList.toggle('is-related',linked.has(n.text));n.el.classList.toggle('is-muted',Boolean(name)&&n.text!==name&&!linked.has(n.text));});
}
function scheduleRelease(name){
  clearTimeout(state.releaseTimer);
  state.releaseTimer=setTimeout(()=>{if(state.active===name){setActive(null);releaseFrom(name);}},70);
}
function releaseFrom(name){
  if(motion.matches)return; const active=byName.get(name); if(!active)return;
  nodes.forEach(node=>{if(!node.visible||node===active)return;const dx=node.x-active.x,dy=node.y-active.y,d=Math.hypot(dx,dy)||1;node.vx+=dx/d*2.2;node.vy+=dy/d*2.2;});
  const randomX=Math.random()*2-1,randomY=Math.random()*2-1,length=Math.hypot(randomX,randomY)||1,impulse=1.2+.5*Math.random();
  active.vx+=randomX/length*impulse;active.vy+=randomY/length*impulse;
}
function releaseFromCenter(){
  if(motion.matches)return;const cx=state.width/2,cy=state.height/2;
  nodes.forEach(node=>{if(!node.visible)return;const dx=node.x-cx,dy=node.y-cy,d=Math.hypot(dx,dy)||1;node.vx+=dx/d*.7-dy/d*.48;node.vy+=dy/d*.7+dx/d*.48;});
}
function resize(){
  const rect=hero.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),oldW=state.width||rect.width,oldH=state.height||rect.height;
  state.width=rect.width;state.height=rect.height;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  nodes.forEach(n=>{n.visible=innerWidth>=n.min;n.el.hidden=!n.visible;n.width=n.el.offsetWidth;n.height=n.el.offsetHeight;if(!state.initialized){n.x=n.x0*state.width;n.y=n.y0*state.height;n.vx=(Math.random()-.5)*.5;n.vy=(Math.random()-.5)*.5;}else{n.x=n.x/oldW*state.width;n.y=n.y/oldH*state.height;}});
  state.initialized=true;
}
function protectedRect(){
  const h=hero.getBoundingClientRect(),t=title.getBoundingClientRect(),cta=document.querySelector('.hero-cta').getBoundingClientRect(),pad=28;
  return {left:Math.min(t.left,cta.left)-h.left-pad,right:Math.max(t.right,cta.right)-h.left+pad,top:Math.min(t.top,cta.top)-h.top-pad,bottom:Math.max(t.bottom,cta.bottom)-h.top+pad};
}
function edgePoint(node,target){
  const dx=target.x-node.x,dy=target.y-node.y,sx=(node.width/2+5)/Math.max(1,Math.abs(dx)),sy=(node.height/2+5)/Math.max(1,Math.abs(dy)),scale=Math.min(sx,sy,1);return{x:node.x+dx*scale,y:node.y+dy*scale};
}
function keepSafe(node,box){
  const edge=14,halfW=node.width/2,halfH=node.height/2;
  if(node.x-halfW<edge){node.x=edge+halfW;node.vx=Math.abs(node.vx);}if(node.x+halfW>state.width-edge){node.x=state.width-edge-halfW;node.vx=-Math.abs(node.vx);}
  if(node.y-halfH<68){node.y=68+halfH;node.vy=Math.abs(node.vy);}if(node.y+halfH>state.height-edge){node.y=state.height-edge-halfH;node.vy=-Math.abs(node.vy);}
  const inside=node.x+halfW>box.left&&node.x-halfW<box.right&&node.y+halfH>box.top&&node.y-halfH<box.bottom;
  if(!inside)return;
  const options=[{d:Math.abs(node.x-halfW-box.left),x:box.left-halfW,y:node.y,axis:'x'},{d:Math.abs(box.right-(node.x+halfW)),x:box.right+halfW,y:node.y,axis:'x'},{d:Math.abs(node.y-halfH-box.top),x:node.x,y:box.top-halfH,axis:'y'},{d:Math.abs(box.bottom-(node.y+halfH)),x:node.x,y:box.bottom+halfH,axis:'y'}].sort((a,b)=>a.d-b.d)[0];
  node.x=options.x;node.y=options.y;if(options.axis==='x')node.vx*=-.65;else node.vy*=-.65;
}
function physics(dt){
  if(motion.matches)return; const active=state.active?byName.get(state.active):null,box=protectedRect(),sep=Math.max(46,Math.min(58,state.width*.055));
  nodes.forEach(node=>{if(!node.visible)return;if(Math.abs(node.vx)>.3)node.vx*=.98;if(Math.abs(node.vy)>.3)node.vy*=.98;});
  nodes.forEach((a,i)=>{if(!a.visible||a===active)return;nodes.slice(i+1).forEach(b=>{if(!b.visible||b===active)return;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;if(d<sep){const force=(1-d/sep)*.05;a.vx-=dx/d*force;a.vy-=dy/d*force;b.vx+=dx/d*force;b.vy+=dy/d*force;}});});
  if(active?.visible){
    active.vx*=.55;active.vy*=.55;
    nodes.forEach(node=>{if(!node.visible||node===active)return;const dx=node.x-active.x,dy=node.y-active.y,d=Math.hypot(dx,dy)||1;if(d<95){const f=.05*(1-d/95);node.vx+=dx/d*f;node.vy+=dy/d*f;}else if(d<380){const f=.022*Math.min(1,(380-d)/200);node.vx-=dx/d*f;node.vy-=dy/d*f;}});
  }
  if(state.titleHover){const cx=state.width/2,cy=state.height/2;nodes.forEach(node=>{if(!node.visible)return;const dx=cx-node.x,dy=cy-node.y,d=Math.hypot(dx,dy)||1;node.vx+=dx/d*.04;node.vy+=dy/d*.04;});nodes.forEach((a,i)=>{if(!a.visible)return;nodes.slice(i+1).forEach(b=>{if(!b.visible)return;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;if(d<75){const force=.08*(1-d/75);a.vx-=dx/d*force;a.vy-=dy/d*force;b.vx+=dx/d*force;b.vy+=dy/d*force;}});});}
  nodes.forEach(node=>{if(!node.visible)return;const max=1.2,mag=Math.hypot(node.vx,node.vy);if(mag>max){node.vx=node.vx/mag*max;node.vy=node.vy/mag*max;}node.x+=node.vx*dt;node.y+=node.vy*dt;keepSafe(node,box);node.el.style.transform=`translate3d(${node.x-node.width/2}px,${node.y-node.height/2}px,0)`;});
}
function draw(time){
  if(!state.running)return;const dt=Math.min(2,(time-state.lastTime||16.7)/16.7);state.lastTime=time;physics(dt);ctx.clearRect(0,0,state.width,state.height);ctx.lineWidth=1;ctx.lineCap='round';const origin={x:state.width/2,y:state.height/2};
  nodes.forEach(node=>{if(!node.visible)return;const end=edgePoint(node,origin),opacity=state.active ? (node.text===state.active ? .66 : .08) : .28;ctx.strokeStyle=`rgba(66,128,242,${opacity})`;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(end.x,end.y);ctx.stroke();});
  if(state.active)graph.get(state.active).forEach(name=>{const from=byName.get(state.active),to=byName.get(name);if(!from?.visible||!to?.visible)return;const a=edgePoint(from,to),b=edgePoint(to,from);ctx.strokeStyle='rgba(66,128,242,.78)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
  state.frame=requestAnimationFrame(draw);
}
document.addEventListener('keydown',event=>{lastInput='keyboard';if(event.key==='Escape'){clearTimeout(state.releaseTimer);setActive(null);document.activeElement?.blur();}});
addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{state.running=!document.hidden;if(state.running){state.lastTime=0;state.frame=requestAnimationFrame(draw);}});addEventListener('pagehide',()=>{state.running=false;cancelAnimationFrame(state.frame);clearTimeout(state.releaseTimer);});
resize();document.fonts?.ready.then(resize);requestAnimationFrame(draw);
