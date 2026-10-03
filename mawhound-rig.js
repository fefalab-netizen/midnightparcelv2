import * as THREE from './vendor/three.module.js';
const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export function rigMawhound(geometry,material){
  geometry.computeVertexNormals();
  const bones=[],locations=new Map();
  function joint(name,parent,xyz){const b=new THREE.Bone();b.name=name;const p=new THREE.Vector3(...xyz);b.position.copy(p);if(parent){b.position.sub(locations.get(parent));parent.add(b);}bones.push(b);locations.set(b,p);return b;}
  const root=joint('MawRoot',null,[0,0,0]);
  const body=joint('MawBody',root,[0,-.13,-.40]);
  const chest=joint('MawChest',body,[0,-.12,.22]);
  const head=joint('MawHead',chest,[0,.18,.42]);
  const tail=joint('MawTail',body,[0,-.08,-.54]);
  const legs=[];
  for(const front of [true,false])for(const side of [-1,1]){
    const prefix=`${front?'Front':'Rear'}${side<0?'Left':'Right'}`,x=side*(front?.26:.29),z=front?.37:-.43;
    const upper=joint(prefix+'Upper',front?chest:root,[x,-.23,z]);
    const lower=joint(prefix+'Lower',upper,[x,-.49,z+(front?-.03:.09)]);
    const paw=joint(prefix+'Paw',lower,[x,-.70,z+(front?.08:.06)]);
    legs.push({prefix,front,side,upper,lower,paw});
  }
  const positions=geometry.attributes.position,weights=[],indices=[],uv=[],colors=[];
  const fur=new THREE.Color('#9580ad'),pale=new THREE.Color('#e0d4dd'),dark=new THREE.Color('#453652');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const tailW=smooth(.34,.7,-z)*smooth(-.22,.15,y),headW=smooth(-.02,.36,z)*smooth(-.12,.22,y)*(1-tailW);
    const chestW=smooth(-.22,.28,z)*(1-headW-tailW);
    const base=[[body,1-headW-tailW-chestW],[chest,chestW],[head,headW],[tail,tailW]];
    // Continuous front/back and left/right blends avoid seams through the joined belly mesh.
    const legW=(1-smooth(-.47,-.19,y))*(1-tailW)*(1-smooth(-.55,-.30,y)*(1-smooth(.08,.27,Math.abs(x))));
    const knee=1-smooth(-.57,-.40,y),ankle=1-smooth(-.73,-.64,y),frontW=smooth(-.18,.13,z),rightW=smooth(-.10,.10,x);
    const limbInfluences=legs.flatMap(l=>{const w=legW*(l.front?frontW:1-frontW)*(l.side>0?rightW:1-rightW);return [[bones.indexOf(l.upper),w*(1-knee)],[bones.indexOf(l.lower),w*knee*(1-ankle)],[bones.indexOf(l.paw),w*knee*ankle]];});
    const influences=[...base.map(([b,w])=>[bones.indexOf(b),w*(1-legW)]),...limbInfluences].sort((a,b)=>b[1]-a[1]).slice(0,4);
    const sum=influences.reduce((a,v)=>a+v[1],0);for(const [b,w] of influences){indices.push(b);weights.push(w/sum);}
    uv.push((z+.951)/1.901,(y+.76)/1.516);
    const c=fur.clone().lerp(pale,smooth(.12,.60,z)*smooth(-.25,.28,y)*.85);c.lerp(pale,smooth(.43,.74,y)*.7);c.lerp(dark,1-smooth(-.66,-.42,y));colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name='MawhoundSkinned';mesh.add(root);mesh.bind(new THREE.Skeleton(bones));mesh.frustumCulled=false;
  const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
  const q=(b,t,a,axis=X)=>new THREE.QuaternionKeyframeTrack(`${b}.quaternion`,t,a.flatMap(v=>new THREE.Quaternion().setFromAxisAngle(axis,v).toArray()));
  const clip=(name,duration,tracks)=>new THREE.AnimationClip(name,duration,tracks);
  const idle=clip('Idle breathing',4,[new THREE.VectorKeyframeTrack('MawChest.scale',[0,2,4],[1,1,1,1.012,1.016,1.008,1,1,1]),q('MawHead',[0,2,4],[0,.022,0]),q('MawTail',[0,1,2,3,4],[0,.05,0,-.05,0],Y)]);
  const walkTimes=Array.from({length:33},(_,i)=>i*1.6/32),walkTracks=[];
  // Four-beat walk: hind left, front left, hind right, front right. No root motion.
  for(const l of legs){const offset=l.front?(l.side<0?.25:.75):(l.side<0?0:.5);const phases=walkTimes.map(t=>((t/1.6+offset)%1)*Math.PI*2);
    walkTracks.push(q(l.prefix+'Upper',walkTimes,phases.map(p=>Math.cos(p)*.29)),q(l.prefix+'Lower',walkTimes,phases.map(p=>Math.max(0,Math.sin(p))*(l.front?.40:-.40))),q(l.prefix+'Paw',walkTimes,phases.map(p=>-Math.cos(p)*.13)));
  }
  walkTracks.push(q('MawChest',walkTimes,walkTimes.map(t=>Math.sin(t/1.6*Math.PI*4)*.015),Z),q('MawHead',walkTimes,walkTimes.map(t=>Math.sin(t/1.6*Math.PI*4)*.025)),q('MawTail',walkTimes,walkTimes.map(t=>Math.sin(t/1.6*Math.PI*2)*.12),Y));
  const walk=clip('Walking',1.6,walkTracks);
  const standTimes=[0,.5,1.2,2,3.2,4,4.8],standAmount=[0,.25,1,1,1,.4,0];
  const standTracks=[q('MawBody',standTimes,standAmount.map(a=>-1.05*a)),q('MawHead',standTimes,standAmount.map(a=>1.05*a)),q('MawTail',standTimes,standAmount.map(a=>.18*a),Y)];
  for(const l of legs.filter(l=>l.front))standTracks.push(q(l.prefix+'Upper',standTimes,standAmount.map(a=>.28*a)),q(l.prefix+'Lower',standTimes,standAmount.map(a=>-.8*a)),q(l.prefix+'Paw',standTimes,standAmount.map(a=>.35*a)));
  const stand=clip('Rear-leg stand',4.8,standTracks);
  const bowTimes=[0,.6,1.2,2,2.6,3.2],bowAmount=[0,.6,1,1,.5,0];
  const bowTracks=[q('MawBody',bowTimes,bowAmount.map(a=>.16*a)),q('MawChest',bowTimes,bowAmount.map(a=>.20*a)),q('MawHead',bowTimes,bowAmount.map(a=>-.16*a)),q('MawTail',bowTimes,[0,.2,-.2,.2,-.12,0],Y)];
  for(const l of legs.filter(l=>l.front))bowTracks.push(q(l.prefix+'Upper',bowTimes,bowAmount.map(a=>-1.0*a)),q(l.prefix+'Lower',bowTimes,bowAmount.map(a=>1.6*a)),q(l.prefix+'Paw',bowTimes,bowAmount.map(a=>-.96*a)));
  const bow=clip('Play bow',3.2,bowTracks);
  const curious=clip('Curious head tilt',3.4,[q('MawHead',[0,.7,1.4,2.2,2.8,3.4],[0,.20,.20,-.14,-.14,0],Z),q('MawTail',[0,1.7,3.4],[0,.10,0],Y)]);
  const greeting=clip('Happy greeting',2.4,[q('MawHead',[0,.4,.8,1.2,1.7,2.4],[0,-.09,.055,-.06,.035,0]),q('MawTail',[0,.3,.6,.9,1.2,1.5,1.8,2.1,2.4],[0,.18,-.18,.18,-.18,.16,-.12,.08,0],Y)]);
  const sniffTimes=[0,.5,1.1,1.6,2.1,2.6,3.2,3.8],sniffAmount=[0,.4,1,.85,1,.85,.4,0];
  const sniff=clip('Sniff around',3.8,[q('MawChest',sniffTimes,sniffAmount.map(a=>.10*a)),q('MawHead',sniffTimes,sniffAmount.map(a=>.48*a)),q('MawTail',sniffTimes,[0,.06,.10,.04,-.04,-.1,-.04,0],Y)]);
  const shakeTimes=Array.from({length:25},(_,i)=>i*.1),shake=shakeTimes.map(t=>Math.sin(t/2.4*Math.PI)**2*Math.sin(t*Math.PI*6));
  const shakeOff=clip('Shake off',2.4,[q('MawChest',shakeTimes,shake.map(a=>a*.085),Z),q('MawHead',shakeTimes,shake.map(a=>a*-.24),Z),q('MawTail',shakeTimes,shake.map(a=>a*.25),Y)]);
  const clips=[idle,walk,stand,bow,curious,greeting,sniff,shakeOff];
  // Bake a small vertical correction wherever a deformed paw would cross the floor.
  const floor=geometry.boundingBox?.min.y??-.75941288,contactVertices=[];
  for(let i=0;i<positions.count;i++)if(positions.getY(i)<-.64)contactVertices.push(i);
  const sampler=new THREE.AnimationMixer(mesh),point=new THREE.Vector3();
  for(const animation of clips){
    const action=sampler.clipAction(animation);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();const times=[],values=[];
    for(let frame=0;frame<=48;frame++){
      const time=animation.duration*frame/48;sampler.setTime(time);mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;
      for(const i of contactVertices){point.fromBufferAttribute(positions,i);mesh.applyBoneTransform(i,point);min=Math.min(min,point.y);}
      times.push(time);values.push(0,Math.max(0,floor-min),0);
    }
    action.stop();animation.tracks.push(new THREE.VectorKeyframeTrack('MawRoot.position',times,values));
  }
  mesh.updateMatrixWorld(true);mesh.skeleton.update();
  return {mesh,clips};
}




