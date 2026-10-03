import * as THREE from './vendor/three.module.js';
import {celMaterial,inkEdges,inkSilhouette,boxSurfaceUV} from './cel.js';

// Touch/point activation only. These props do not change the treatment minigames.
export function createCounterTools({onActivate,canActivate,isPaused,stampTarget}){
 const root=new THREE.Group(),targets=[],items=new Map();let time=0,stampJob=null;
 const proxyMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
 function block(parent,x,y,z,w,h,d,color,wood=false){const g=new THREE.BoxGeometry(w,h,d);if(wood)boxSurfaceUV(g,w,h,d);const m=new THREE.Mesh(g,celMaterial(color,wood?'wood':'plain'));m.position.set(x,y,z);parent.add(m);inkEdges(m,.003);return m;}
 function cylinder(parent,x,y,z,top,bottom,h,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,12),celMaterial(color));m.position.set(x,y,z);parent.add(m);inkEdges(m,.0025,35);return m;}
 function orb(parent,x,y,z,r,color,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),celMaterial(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);inkSilhouette(m,.025);return m;}
 function text(parent,w,h,x,y,z,lines){const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d');ctx.fillStyle='#251f24';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#aa8b57';ctx.lineWidth=10;ctx.strokeRect(5,5,c.width-10,c.height-10);ctx.fillStyle='#f0ddae';ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>{ctx.font=`bold ${c.height/(lines.length+1)*.65}px Georgia`;ctx.fillText(line,c.width/2,c.height*(i+1)/(lines.length+1),c.width*.91);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);parent.add(m);return m;}
 function item(key,title,description,x,z,w=.27,h=.45,y=1.07){
  const anchor=new THREE.Group();anchor.position.set(x,y,z);root.add(anchor);const visual=new THREE.Group();anchor.add(visual);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(w,h,.28),proxyMaterial);hit.position.y=h*.5;anchor.add(hit);hit.userData.toolKey=key;hit.userData.run=()=>activate(key);targets.push(hit);
  const label=text(anchor,.98,.24,0,h+.21,.12,[title,description]);label.position.x=THREE.MathUtils.clamp(x,-1.25,1.25)-x;label.visible=false;
  const state={key,anchor,visual,hit,label,hover:false,lift:0,selected:-100,home:anchor.position.clone()};items.set(key,state);return state;
 }
 const powder=item('curse','CURSE POWDER','Tests the parcel for a curse.',.65,-.79);
 orb(powder.visual,0,.12,0,.13,'#716379',1,1.05,.8);cylinder(powder.visual,0,.25,0,.06,.08,.07,'#a99268');
 for(let i=0;i<6;i++){const pleat=block(powder.visual,Math.sin(i)*.07,.20,Math.cos(i)*.055,.016,.12,.016,'#413944');pleat.rotation.z=Math.sin(i)*.2;}
 const tie=new THREE.Mesh(new THREE.TorusGeometry(.063,.009,5,16),celMaterial('#dbc391'));tie.rotation.x=Math.PI/2;tie.position.y=.235;powder.visual.add(tie);
 const bait=item('monster','MONSTER BAIT','Tests for something hungry.',.87,-.29,.36,.24);
 const rag=block(bait.visual,0,.02,0,.33,.03,.23,'#665455',true);
 for(let i=0;i<5;i++){const strip=block(bait.visual,-.12+i*.055,.05+i%2*.014,0,.025,.022,.21,'#9a7161');strip.rotation.y=Math.sin(i)*.25;}
 orb(bait.visual,0,.095,0,.07,'#b99573',1.3,.55,.65);
 const ward=item('demon','DEMON WARD','Tests for a demonic seal.',1.15,-.83,.3,.48);
 const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.075:.16;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
 const talisman=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false}),celMaterial('#bca274'));talisman.position.set(0,.24,0);ward.visual.add(talisman);inkEdges(talisman,.004);cylinder(ward.visual,0,.035,0,.09,.10,.04,'#69543c');
 const engraving=new THREE.Mesh(new THREE.TorusGeometry(.071,.004,4,24),celMaterial('#51414e'));engraving.position.set(0,.24,.04);ward.visual.add(engraving);
 const bell=item('chibi','SIGIL BELL','Calls to a hidden sigil fragment.',1.50,-.35,.26,.44);
 cylinder(bell.visual,0,.10,0,.045,.125,.18,'#bca06b');cylinder(bell.visual,0,.02,0,.13,.13,.025,'#e1c38b');cylinder(bell.visual,0,.24,0,.025,.027,.14,'#795137');orb(bell.visual,0,.32,0,.039,'#795137',.8,1.3,.8);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.14,.008,5,32),new THREE.MeshBasicMaterial({color:'#f0cf89',transparent:true,opacity:0}));ring.rotation.x=-Math.PI/2;ring.position.y=.11;bell.visual.add(ring);
 const stamp=item('stamp','APPROVE & SHIP','Stamp only an ordinary parcel.',-.59,-.14,.24,.37);
 block(stamp.visual,0,.027,0,.20,.05,.14,'#b59460');cylinder(stamp.visual,0,.13,0,.03,.05,.17,'#624132');orb(stamp.visual,0,.23,0,.057,'#82573e',1.2,.6,.9);
 const stampMark=text(root,.25,.10,0,0,0,['APPROVED']);stampMark.rotation.x=-Math.PI/2;stampMark.visible=false;
 for(const [key,title,x] of [['pause','PAUSE SHIFT',-.98],['close','CLOSE EARLY',0],['recenter','RECENTER',1.02]]){
  const state=item(key,title,key==='pause'?'Pause or resume the shift.':key==='close'?'Finish and save this shift.':'Center your VR viewpoint.',x,.17,.33,.24,.37);
  state.label.position.y=.68;
  block(state.anchor,0,.02,-.01,.32,.25,.045,'#8e8068');
  const pivot=new THREE.Group();pivot.position.set(0,.04,.03);state.visual.add(pivot);state.pivot=pivot;
  cylinder(pivot,0,.11,0,.013,.013,.22,'#b7aa90');orb(pivot,0,.24,0,.046,'#342f34',1,.7,1);pivot.rotation.x=.75;
  text(state.anchor,.60,.13,0,.32,.018,[title]);
 }
 function activate(key){const s=items.get(key);if(!s||stampJob||!canActivate(key)||time-s.selected<.5)return;s.selected=time;
  if(key==='stamp'){const target=stampTarget();if(!target)return;stampJob={elapsed:0,target:new THREE.Vector3(...target),from:s.anchor.position.clone(),committed:false};}
  else onActivate(key);
 }
 const bounds=new THREE.Box3(),hovered=new Set();
 return {root,targets,get busy(){return !!stampJob;},activate,
  setHover(objects){hovered.clear();for(const object of objects)if(object?.userData.toolKey)hovered.add(object.userData.toolKey);},
  touch(point){for(const s of items.values()){bounds.setFromObject(s.hit);if(bounds.distanceToPoint(point)<.045)return s.hit;}return null;},
  cancel(){stampJob=null;stampMark.visible=false;for(const s of items.values()){s.anchor.position.copy(s.home);s.selected=-100;s.label.visible=false;s.hover=false;}hovered.clear();},
  update(dt){time+=dt;
   for(const s of items.values()){
    s.hover=hovered.has(s.key)&&!stampJob;s.label.visible=s.hover;s.lift=THREE.MathUtils.damp(s.lift,s.hover?.075:0,12,dt);
    const age=time-s.selected,active=age>=0&&age<.65,pulse=active?Math.sin(age/.65*Math.PI):0;
    s.visual.position.y=s.pivot?0:s.lift+pulse*.10;s.visual.rotation.set(0,0,0);
    if(s.pivot)s.pivot.rotation.x=THREE.MathUtils.damp(s.pivot.rotation.x,s.key==='pause'&&isPaused()?-.65:.75-pulse*1.1,15,dt);
    else if(s.key==='demon')s.visual.rotation.y=active?age/.65*Math.PI*2:0;
    else if(s.key==='chibi')s.visual.rotation.z=active?Math.sin(age*32)*.32*pulse:0;
    else s.visual.rotation.z=active?Math.sin(age*20)*.13*pulse:0;
   }
   const bellAge=time-bell.selected;ring.material.opacity=bellAge<.65?(1-bellAge/.65)*.6:0;ring.scale.setScalar(1+Math.min(1,bellAge/.65)*1.5);
   if(stampJob){const job=stampJob;job.elapsed+=dt;const t=job.elapsed,above=job.target.clone().add(new THREE.Vector3(0,.24,0));stamp.visual.position.y=0;stamp.visual.rotation.set(0,0,0);
    if(t<.3)stamp.anchor.position.lerpVectors(job.from,above,THREE.MathUtils.smoothstep(t,0,.3));
    else if(t<.47)stamp.anchor.position.lerpVectors(above,job.target,THREE.MathUtils.smoothstep(t,.3,.47));
    else if(t<.65){stamp.anchor.position.copy(job.target);stampMark.position.copy(job.target).add(new THREE.Vector3(0,.006,0));stampMark.visible=true;}
    else {if(!job.committed){job.committed=true;onActivate('stamp');}stampMark.visible=false;stamp.anchor.position.lerpVectors(job.target,job.from,THREE.MathUtils.smoothstep(t,.65,1));}
    if(t>=1){stamp.anchor.position.copy(job.from);stampJob=null;}
   }
  }
 };
}
