import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {celRamp} from './cel.js';
const smooth=(a,b,v)=>T.MathUtils.smoothstep(v,a,b);
export async function loadOtty(){
 const gltf=await new GLTFLoader().loadAsync(new URL('./assets/models/Otty.glb',import.meta.url).href);let source;gltf.scene.traverse(n=>{if(n.isMesh)source=n;});
 const geometry=source.geometry.clone(),p=geometry.attributes.position,bones=[],locations=new Map();
 function joint(name,parent,x,y,z){const b=new T.Bone();b.name=name;const pos=new T.Vector3(x,y,z);b.position.copy(pos);if(parent){b.position.sub(locations.get(parent));parent.add(b);}bones.push(b);locations.set(b,pos);return b;}
 const rootBone=joint('InkRoot',null,0,0,0),body=joint('InkBody',rootBone,-.12,-.12,-.44),chest=joint('InkChest',body,-.12,-.10,.18),head=joint('InkHead',chest,-.12,.16,.48),tail=joint('InkTail',body,.02,-.08,-.69),tailTip=joint('InkTailTip',tail,.30,-.15,-.85);
 // Feet are clustered from the floor-contact vertices: two front feet, four hind feet.
 const centers=[[-.36,.44],[.07,.44],[-.39,-.40],[.13,-.40],[-.39,-.72],[.13,-.72]];
 for(let pass=0;pass<10;pass++){const sums=centers.map(()=>[0,0,0]);for(let i=0;i<p.count;i++){if(p.getY(i)>-.57)continue;const x=p.getX(i),z=p.getZ(i);let nearest=0;for(let k=1;k<6;k++)if(Math.hypot(x-centers[k][0],z-centers[k][1])<Math.hypot(x-centers[nearest][0],z-centers[nearest][1]))nearest=k;sums[nearest][0]+=x;sums[nearest][1]+=z;sums[nearest][2]++;}sums.forEach((s,i)=>{if(s[2])centers[i]=[s[0]/s[2],s[1]/s[2]];});}
 const legs=centers.map(([x,z],i)=>{const front=i<2,name=front?'Front'+i:'Hind'+(i-2),upper=joint(name+'Upper',front?chest:rootBone,x,-.23,z),lower=joint(name+'Lower',upper,x,-.47,z),paw=joint(name+'Paw',lower,x,-.64,z+.035);return {front,name,upper,lower,paw,x,z};});
 // Weld UV-seam duplicates only for component classification; keep the original texture UVs.
 const parents=Array.from({length:p.count},(_,i)=>i),weld=new Map();function find(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;}
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e4)).join(',');if(weld.has(key))parents[find(i)]=find(weld.get(key));else weld.set(key,i);}
 const index=geometry.index;for(let i=0;i<index.count;i+=3){const a=find(index.getX(i));parents[find(index.getX(i+1))]=a;parents[find(index.getX(i+2))]=a;}
 const groups=new Map();for(let i=0;i<p.count;i++){const id=find(i);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}const components=[...groups.values()].sort((a,b)=>b.length-a.length),particleBone=new Map();
 for(const vertices of components.slice(1)){const center=new T.Vector3();for(const i of vertices)center.add(new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)));center.divideScalar(vertices.length);const b=joint('InkDroplet'+particleBone.size,rootBone,...center.toArray());for(const i of vertices)particleBone.set(i,b);}
 const indices=[],weights=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let influences;
  if(particleBone.has(i))influences=[[particleBone.get(i),1]];
  else {
   const tailW=(1-smooth(-.88,-.69,z))*smooth(-.43,-.27,y);
   const tipW=tailW*smooth(.1,.36,x),headW=smooth(.27,.50,z)*smooth(-.25,.12,y)*(1-tailW),chestW=smooth(-.15,.24,z)*(1-headW-tailW);
   const limb=legs.reduce((a,b)=>Math.hypot(x-b.x,z-b.z)<Math.hypot(x-a.x,z-a.z)?b:a),distance=Math.hypot(x-limb.x,z-limb.z),legW=(1-smooth(-.53,-.22,y))*(1-smooth(.12,.25,distance))*(1-tailW);
   const lowerW=1-smooth(-.54,-.38,y),pawW=1-smooth(-.65,-.57,y);
   influences=[[body,Math.max(0,1-headW-tailW-chestW)*(1-legW)],[chest,chestW*(1-legW)],[head,headW*(1-legW)],[tail,(tailW-tipW)*(1-legW)],[tailTip,tipW*(1-legW)],[limb.upper,legW*(1-lowerW)],[limb.lower,legW*lowerW*(1-pawW)],[limb.paw,legW*lowerW*pawW]];
  }
  influences.sort((a,b)=>b[1]-a[1]);influences=influences.slice(0,4);while(influences.length<4)influences.push([rootBone,0]);const sum=influences.reduce((n,a)=>n+a[1],0)||1;for(const [b,w] of influences){indices.push(bones.indexOf(b));weights.push(w/sum);}
 }
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const material=new T.MeshToonMaterial({map:source.material.map,color:'#c6c5d3',gradientMap:celRamp,side:T.DoubleSide});
 const mesh=new T.SkinnedMesh(geometry,material);mesh.add(rootBone);mesh.bind(new T.Skeleton(bones));mesh.frustumCulled=false;
 const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1),q=(bone,times,angles,axis=X)=>new T.QuaternionKeyframeTrack(bone.name+'.quaternion',times,angles.flatMap(a=>new T.Quaternion().setFromAxisAngle(axis,a).toArray()));
 const idle=new T.AnimationClip('Idle breathing',4,[q(head,[0,2,4],[0,.025,0]),q(tail,[0,1,2,3,4],[0,.10,0,-.10,0],Y)]);
 const times=Array.from({length:33},(_,i)=>i/16),walk=[];
 legs.forEach((l,i)=>{const phase=times.map(t=>t*Math.PI+(i%2)*Math.PI+Math.floor(i/2)*1.1);walk.push(q(l.upper,times,phase.map(a=>Math.sin(a)*.24)),q(l.lower,times,phase.map(a=>Math.max(0,Math.cos(a))*.25)),q(l.paw,times,phase.map(a=>-Math.sin(a)*.10)));});walk.push(q(tail,times,times.map(t=>Math.sin(t*Math.PI)*.14),Y));
 const standTimes=[0,.6,1.3,2.6,3.4,4.2],amount=[0,.35,1,1,1,1];
 function stance(t,a){const tracks=[q(body,t,a.map(v=>-1.0*v)),q(head,t,a.map(v=>.90*v)),q(tail,t,a.map(v=>.18*v))];for(const l of legs.filter(l=>l.front))tracks.push(q(l.upper,t,a.map(v=>-.35*v)),q(l.lower,t,a.map(v=>-1.1*v)),q(l.paw,t,a.map(v=>.4*v)));return tracks;}
 const boxTimes=Array.from({length:49},(_,i)=>i/8),boxAmount=boxTimes.map(t=>1-smooth(5,6,t)),boxing=stance(boxTimes,boxAmount);
 for(const l of legs.filter(l=>l.front)){const phase=l===legs[0]?0:Math.PI;boxing.push(new T.VectorKeyframeTrack(l.paw.name+'.scale',boxTimes,boxTimes.flatMap(t=>{const v=1+Math.max(0,Math.sin(t*7+phase))*.08;return [v,v,v];})));const track=boxing.find(t=>t.name===l.lower.name+'.quaternion');track.values=new Float32Array(boxTimes.flatMap((t,i)=>new T.Quaternion().setFromAxisAngle(X,(-1.1+Math.max(0,Math.sin(t*7+phase))*.85)*boxAmount[i]).toArray()));}
 const swimTimes=Array.from({length:49},(_,i)=>i/8),roll=swimTimes.map(t=>Math.PI*smooth(0,1.2,t)*(1-smooth(4.8,6,t))),swim=[q(rootBone,swimTimes,roll,Z),new T.VectorKeyframeTrack(rootBone.name+'.position',swimTimes,swimTimes.flatMap(t=>[0,.30*smooth(0,1.2,t)*(1-smooth(4.8,6,t)),0])),q(tail,swimTimes,swimTimes.map(t=>Math.sin(t*4)*.25),Y)];
 legs.forEach((l,i)=>swim.push(q(l.upper,swimTimes,swimTimes.map(t=>Math.sin(t*5+i*Math.PI)*.30))));
 const clips=[idle,new T.AnimationClip('Walking',2,walk),new T.AnimationClip('Four-leg stand',4.2,stance(standTimes,amount)),new T.AnimationClip('Boxing',6,boxing),new T.AnimationClip('Upside-down swim',6,swim)];
 const mount=new T.Group();mount.scale.setScalar(.68);mount.position.set(.08,.462,0);mount.add(mesh);const root=new T.Group();root.add(mount);root.name='Otty';
 const mixer=new T.AnimationMixer(mesh),actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));let current,automatic=false,remaining=3,state='idle',label='watching you',target=new T.Vector2(),bounds={minX:-.8,maxX:.7,minZ:-1.5,maxZ:.2},clock=0;
 function play(name,loop=false){if(name==='Happy greeting')name='Four-leg stand';const next=actions.get(name);if(!next)return false;current?.fadeOut(.2);next.reset().setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1).setEffectiveWeight(1).fadeIn(.2).play();next.clampWhenFinished=!loop;current=next;remaining=loop?4:next.getClip().duration;state=name==='Walking'?'walk':name==='Four-leg stand'?'stand':name;label=name.toLowerCase();return true;}
 const droplets=[...new Set(particleBone.values())];
 play('Idle breathing',true);
 return {root,clips,get behaviorLabel(){return label;},setRoamBounds(value){bounds={...value};},setAutonomous(v){automatic=v;if(v)play('Idle breathing',true);},play(name,{loop=false}={}){if(name==='Walking')target.set(bounds.minX+Math.random()*(bounds.maxX-bounds.minX),bounds.minZ+Math.random()*(bounds.maxZ-bounds.minZ));return play(name,loop);},react(need){this.play(need===3?'Four-leg stand':need===2?'Upside-down swim':'Idle breathing');},
 update(dt){clock+=dt;mixer.update(dt);for(let i=0;i<droplets.length;i++){const bone=droplets[i],base=locations.get(bone);bone.position.set(base.x+Math.sin(clock*.9+i)*.025,base.y+Math.sin(clock*1.5+i)*.04,base.z);}remaining-=dt;if(!automatic){if(state==='stand'&&remaining<=0)play('Boxing');return;}
  if(state==='walk'){const dx=target.x-root.position.x,dz=target.y-root.position.z,d=Math.hypot(dx,dz),step=Math.min(d,.23*dt);if(d>.01){root.position.x+=dx/d*step;root.position.z+=dz/d*step;root.rotation.y=Math.atan2(dx,dz);}if(d<.03)remaining=0;}
  if(remaining<=0){if(state==='stand')play('Boxing');else if(Math.random()<.55){target.set(bounds.minX+Math.random()*(bounds.maxX-bounds.minX),bounds.minZ+Math.random()*(bounds.maxZ-bounds.minZ));play('Walking',true);remaining=10;}else play(['Idle breathing','Four-leg stand','Upside-down swim'][Math.floor(Math.random()*3)]);}
 }
 };
}
