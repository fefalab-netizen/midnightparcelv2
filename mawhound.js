import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {celRamp} from './cel.js';
import {MawhoundBehavior} from './mawhound-behavior.js';
import {aimMawhoundHead} from './mawhound-look.js';
export async function loadMawhound(){
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/models/Mawhound-game.glb',import.meta.url).href),model=gltf.scene;
  model.traverse(node=>{if(!node.isMesh)return;const old=node.material;node.material=new THREE.MeshToonMaterial({map:old.map,vertexColors:true,gradientMap:celRamp,emissive:'#302339',emissiveIntensity:.12});old.dispose();node.frustumCulled=false;});
  model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=1.15/Math.max(size.x,size.y,size.z);
  model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  const root=new THREE.Group();root.name='Mawhound';root.add(model);
  const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)])),head=model.getObjectByName('MawHead');let current=null;
  const viewerWorld=new THREE.Vector3(),viewerLocal=new THREE.Vector3();
  function playClip(name,loop=false){
    const next=actions.get(name);if(!next)return false;
    if(current&&current!==next)current.fadeOut(.25);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);next.clampWhenFinished=!loop;next.fadeIn(.25).play();current=next;return true;
  }
  const brain=new MawhoundBehavior({onPlay:playClip,durations:Object.fromEntries(gltf.animations.map(c=>[c.name,c.duration]))});
  mixer.addEventListener('finished',e=>{if(e.action===current)playClip('Idle breathing',true);});playClip('Idle breathing',true);
  function getViewer(camera){if(!camera)return null;camera.getWorldPosition(viewerWorld);viewerLocal.copy(viewerWorld);root.parent?.worldToLocal(viewerLocal);return viewerLocal;}
  function lookAtViewer(camera,dt=0,snap=false){
    if(!camera||current?.getClip().name!=='Rear-leg stand')return;
    const local=getViewer(camera),time=current.time,weight=THREE.MathUtils.smoothstep(time,.25,1.2)*(1-THREE.MathUtils.smoothstep(time,3.6,4.8));
    if(!brain.enabled){const desired=Math.atan2(local.x-root.position.x,local.z-root.position.z),delta=Math.atan2(Math.sin(desired-root.rotation.y),Math.cos(desired-root.rotation.y));root.rotation.y+=snap?delta:THREE.MathUtils.clamp(delta,-dt*2,dt*2);}
    root.updateWorldMatrix(true,true);aimMawhoundHead(head,viewerWorld,weight*current.getEffectiveWeight());
  }
  return {root,clips:gltf.animations,get behaviorLabel(){return brain.label;},get autonomous(){return brain.enabled;},setRoamBounds(bounds){brain.bounds={...bounds};},setAutonomous(value){if(value){brain.x=root.position.x;brain.z=root.position.z;brain.heading=root.rotation.y;}brain.setEnabled(value);},
    play(name,{loop=false}={}){if(!actions.has(name))return false;if(brain.enabled)brain.command(name);else playClip(name,loop);return true;},
    react(need){brain.enabled?brain.react(need):playClip('Happy greeting');},
    pose(name,time,camera){const action=actions.get(name);if(!action)return;brain.setEnabled(false);mixer.stopAllAction();action.reset().setEffectiveWeight(1).setLoop(THREE.LoopOnce,1).play();action.clampWhenFinished=true;current=action;mixer.update(time);lookAtViewer(camera,0,true);},
    update(dt,{camera,needs}={}){const viewer=getViewer(camera);brain.update(dt,{viewer,needs});if(brain.enabled){root.position.x=brain.x;root.position.z=brain.z;root.rotation.y=brain.heading;}mixer.update(dt);lookAtViewer(camera,dt);},
    greet(){this.play('Happy greeting');}
  };
}
