import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export async function loadCardboardImp(){
 const gltf=await new GLTFLoader().loadAsync(new URL('./assets/models/Cardboard-Imp-game.glb',import.meta.url).href),model=gltf.scene;
 model.traverse(n=>{if(n.isMesh)n.frustumCulled=false;});
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=1.05/size.y;
 const mount=new THREE.Group();mount.scale.setScalar(scale);mount.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);mount.add(model);
 const root=new THREE.Group();root.name='Cardboard Imp';root.add(mount);
 const mixer=new THREE.AnimationMixer(model),names={Agree_Gesture:'Agree gesture',Boxing_Practice:'Boxing practice',Dead:'Play dead',Running:'Running',Walking:'Walking'};
 const clips=gltf.animations.map(source=>{const clip=source.clone();clip.name=names[source.name]||source.name;
   // Locomotion belongs to the game; retain the animated vertical bounce without root drift.
   for(const track of clip.tracks)if(track.name.endsWith('.position')&&/Hips|Armature/i.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2];}
   return clip;
 });
 const actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));let current=null,automatic=false,state='idle',remaining=2,time=0,label='watching you',destination=new THREE.Vector2(),bounds={minX:-.8,maxX:.7,minZ:-1.5,maxZ:.2};
 function play(name,loop=false){if(name==='Happy greeting')name='Agree gesture';const next=actions.get(name);if(!next)return false;if(current&&current!==next)current.fadeOut(.2);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);next.clampWhenFinished=!loop;next.fadeIn(.2).play();current=next;return true;}
 function idle(){state='idle';label='watching you';remaining=2+Math.random()*3;play('Agree gesture');}
 idle();
 return {root,clips,get behaviorLabel(){return label;},setRoamBounds(value){bounds={...value};},setAutonomous(value){automatic=value;if(value)idle();},
  play(name,{loop=false}={}){if(!play(name,loop))return false;state='trick';label=name.toLowerCase();remaining=current.getClip().duration+.4;return true;},
  react(need){this.play(need===3?'Boxing practice':need===2?'Play dead':'Agree gesture');},
  update(dt){time+=dt;mixer.update(dt);if(!automatic)return;remaining-=dt;
   if(state==='walk'||state==='run'){const dx=destination.x-root.position.x,dz=destination.y-root.position.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*(state==='run'?.65:.25));if(d>.01){root.position.x+=dx/d*step;root.position.z+=dz/d*step;const heading=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(heading-root.rotation.y),Math.cos(heading-root.rotation.y));root.rotation.y+=THREE.MathUtils.clamp(delta,-dt*3,dt*3);}if(d<.03||remaining<=0)idle();}
   else if(remaining<=0){if(Math.random()<.7){destination.set(bounds.minX+Math.random()*(bounds.maxX-bounds.minX),bounds.minZ+Math.random()*(bounds.maxZ-bounds.minZ));state=Math.random()<.22?'run':'walk';label=state==='run'?'scampering around':'exploring the clearing';remaining=12;play(state==='run'?'Running':'Walking',true);}else this.play(Math.random()<.5?'Agree gesture':'Boxing practice');}
  }
 };
}
