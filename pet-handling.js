import * as T from './vendor/three.module.js';

export function createPetHandling({parent,getPet,canGrab}){
 let held=null,settling=null;
 const plane=new T.Plane(),point=new T.Vector3(),offset=new T.Vector3(),box=new T.Box3();
 const limits={minX:-1.1,maxX:1.4,minZ:-1.3,maxZ:1.4};
 function clamp(root){root.position.x=T.MathUtils.clamp(root.position.x,limits.minX,limits.maxX);root.position.z=T.MathUtils.clamp(root.position.z,limits.minZ,limits.maxZ);root.position.y=0;}
 function release(){if(!held)return;const pet=held.pet;parent.attach(pet.root);clamp(pet.root);pet.root.rotation.set(0,pet.root.rotation.y,0);held=null;settling={pet,time:3};}
 return {
  get owner(){return held?.owner;},get holding(){return !!held;},
  grab(owner,ray,grip=null){if(held||!canGrab())return false;const pet=getPet();if(!pet?.root.visible)return false;
   pet.root.updateWorldMatrix(true,true);box.setFromObject(pet.root);const near=grip&&box.distanceToPoint(grip.getWorldPosition(point))<.15;
   if(!near&&!ray.intersectObject(pet.root,true).length)return false;
   if(settling){settling.pet.setAutonomous(true);settling=null;}pet.setAutonomous(false);pet.play(pet.root.name==='Cardboard Imp'?'Agree gesture':'Idle breathing',{loop:true});
   pet.root.getWorldPosition(point);plane.set(new T.Vector3(0,1,0),-point.y);offset.copy(point);
   if(!grip){if(!ray.ray.intersectPlane(plane,point)){pet.setAutonomous(true);return false;}offset.sub(point);}
   held={owner,pet};if(grip){grip.attach(pet.root);pet.root.position.set(0,-.3,-.25);pet.root.rotation.set(0,0,0);}return true;
  },
  moveMouse(ray){if(held?.owner!=='mouse'||!ray.ray.intersectPlane(plane,point))return;point.add(offset);parent.worldToLocal(point);held.pet.root.position.copy(point);clamp(held.pet.root);held.pet.root.position.y=.18;},
  release(owner){if(held?.owner===owner)release();},
  cancel(){release();if(settling){settling.pet.setAutonomous(true);settling=null;}},
  update(dt){if(settling){settling.time-=dt;if(settling.time<=0){const pet=settling.pet,p=pet.root.position;pet.setRoamBounds({minX:Math.max(limits.minX,p.x-.45),maxX:Math.min(limits.maxX,p.x+.45),minZ:Math.max(limits.minZ,p.z-.45),maxZ:Math.min(limits.maxZ,p.z+.45)});pet.setAutonomous(true);settling=null;}}}
 };
}
