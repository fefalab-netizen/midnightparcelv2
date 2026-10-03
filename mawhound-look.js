import * as THREE from './vendor/three.module.js';
const position=new THREE.Vector3(),direction=new THREE.Vector3(),parentRotation=new THREE.Quaternion(),desired=new THREE.Quaternion(),angles=new THREE.Euler(0,0,0,'YXZ');
// +Z is the sculpt's forward axis. Resolve camera direction in the animated parent's frame.
export function aimMawhoundHead(head,target,blend=1){
  head.updateWorldMatrix(true,false);head.getWorldPosition(position);direction.copy(target).sub(position);if(direction.lengthSq()<1e-8)return;
  head.parent.getWorldQuaternion(parentRotation).invert();direction.applyQuaternion(parentRotation).normalize();
  angles.set(THREE.MathUtils.clamp(-Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),-.6,1.45),THREE.MathUtils.clamp(Math.atan2(direction.x,direction.z),-1.15,1.15),0,'YXZ');
  desired.setFromEuler(angles);head.quaternion.slerp(desired,THREE.MathUtils.clamp(blend,0,1));head.updateWorldMatrix(false,false);
}
