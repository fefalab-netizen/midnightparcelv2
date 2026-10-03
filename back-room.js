import * as THREE from './vendor/three.module.js';
import {celMaterial} from './cel.js';
export function createBackRoom({onPortal,onSleep}){
 const root=new THREE.Group();root.visible=false;
 function block(x,y,z,w,h,d,color,wood=false){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),celMaterial(color,wood?'wood':'plain'));mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 function orb(x,y,z,r,color,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),celMaterial(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;}
 block(0,-.1,-1.6,6,.2,8,'#242925');block(0,1.8,-3.9,6,3.8,.2,'#161d1d');
 for(let row=0;row<9;row++)for(let col=0;col<10;col++){const x=-2.8+col*.61+(row%2)*.25,y=.19+row*.4;if(Math.abs(x)<.93&&y<2.35)continue;block(x,y,-3.74,.57,.36,.19,['#343b35','#3b4138','#2c3532'][(row+col)%3]);}
 for(const side of [-1,1])for(let row=0;row<9;row++)for(let col=0;col<8;col++)block(side*3,.19+row*.4,-3.5+col*.7,.16,.36,.66,['#303731','#3a4037'][(row+col)%2]);
 block(0,1.1,-3.66,1.62,2.3,.03,'#070b10');for(const x of [-.94,.94])for(let y=.18;y<1.8;y+=.36)block(x,y,-3.51,.32,.32,.4,'#535347');
 const arch=new THREE.Mesh(new THREE.TorusGeometry(.94,.16,6,18,Math.PI),celMaterial('#535347'));arch.position.set(0,1.75,-3.5);root.add(arch);
 for(let row=0;row<9;row++)for(let col=0;col<7;col++)block(-2.7+col*.8+(row%2)*.15,.008,-3.5+row*.7,.74,.025,.64,(row+col)%3?'#383e35':'#47493b');
 // Empty storage cages and shelving, matching the back-room reference's arrangement.
 for(const [x,z,w,h] of [[-1.9,-1.4,1.15,1.35],[-1.4,-2.65,.85,1.65]]){
  block(x,.12,z,w,.16,.9,'#574631',true);block(x,h,z,w,.12,.9,'#574631',true);
  for(let i=0;i<6;i++)for(const dz of [-.43,.43])block(x-w/2+i*w/5,h/2,z+dz,.028,h,.028,'#514d39');
  for(const y of [.45,.9])block(x,y,z+.43,w,.035,.035,'#514d39');
 }
 for(const x of [1.05,2.6])block(x,1.05,-2.8,.12,2.1,.6,'#56422e',true);
 for(const y of [.3,1,1.7,2.1])block(1.82,y,-2.8,1.7,.10,.68,'#62503b',true);
 for(let i=0;i<8;i++){const x=1.22+(i%3)*.53,y=.52+Math.floor(i/3)*.70;orb(x,y,-2.72,.13,['#384441','#564e39','#344252'][i%3],.8,1.3,.8);block(x,y+.18,-2.72,.11,.06,.11,'#76603e');}
 // Reachable bed and portal bottle, plus desktop / controller-ray interaction.
 block(1.08,.28,.18,1.2,.25,1.85,'#5c4632',true);
 for(const x of [.43,1.73])for(const z of [-.78,1.13])block(x,.42,z,.1,.8,.1,'#5c4632',true);
 const bed=block(1.08,.49,.18,1.14,.20,1.8,'#9c8556');block(1.08,.62,-.43,.91,.16,.39,'#b1a27b');block(1.08,.61,.39,1.12,.045,1.05,'#3c3f3e');bed.userData.run=onSleep;
 block(.27,.44,-.57,.62,.88,.56,'#54412f',true);
 const bottle=orb(.27,1.10,-.57,.19,'#724bb3',.85,1.05,.85);bottle.material=new THREE.MeshStandardMaterial({color:'#66329b',emissive:'#8c37dd',emissiveIntensity:1.1,roughness:.18,transparent:true,opacity:.85});bottle.userData.run=onPortal;
 block(.27,1.33,-.57,.12,.15,.12,'#665442');
 const rings=[];for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.11+i*.015,.007,5,32),new THREE.MeshBasicMaterial({color:'#e8b0ff'}));ring.position.copy(bottle.position);ring.rotation.set(i*.6,i*.8,0);root.add(ring);rings.push(ring);}
 const glow=new THREE.PointLight('#b57dff',2,2.2);glow.position.copy(bottle.position);root.add(glow);
 block(.79,.99,-.57,.08,.25,.08,'#dbbd7e');orb(.79,1.16,-.57,.035,'#ffdc91',.6,1.6,.6);const candle=new THREE.PointLight('#ffd29c',5,5);candle.position.set(.79,1.22,-.57);root.add(candle);
 const web=[];for(const x of [-2.9,2.9])for(let i=0;i<7;i++){web.push(new THREE.Vector3(x,3.5,-3.5),new THREE.Vector3(x-Math.sign(x)*(.3+i*.16),2.2+i*.16,-3.4));}const lines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(web),new THREE.LineBasicMaterial({color:'#857f69',transparent:true,opacity:.27}));root.add(lines);
 const bounds=[new THREE.Box3().setFromObject(bottle),new THREE.Box3().setFromObject(bed)];
 return {root,targets:[bottle,bed],touch(point){const index=bounds.findIndex(b=>b.distanceToPoint(point)<.065);return index<0?null:[bottle,bed][index];},update(t){rings.forEach((ring,i)=>{ring.rotation.z=t*(.3+i*.13);ring.rotation.y=i*.8+t*.12;});glow.intensity=1.8+Math.sin(t*2)*.3;}};
}
