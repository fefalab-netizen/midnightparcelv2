import * as THREE from './vendor/three.module.js';
import {celMaterial} from './cel.js';
export function createOutdoorSanctuary(onReturn){
 const root=new THREE.Group();
 function mesh(g,color,x,y,z){const m=new THREE.Mesh(g,celMaterial(color));m.position.set(x,y,z);root.add(m);return m;}
 function box(x,y,z,w,h,d,color){return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z);}
 const hillGeometry=new THREE.SphereGeometry(1,16,10),leafGeometry=new THREE.IcosahedronGeometry(1,1);
 const ground=mesh(new THREE.PlaneGeometry(120,120),'#719955',0,-.025,-20);ground.rotation.x=-Math.PI/2;
 for(let i=0;i<14;i++){const a=i*Math.PI*2/14,h=mesh(hillGeometry,i%2?'#6e9569':'#83a777',Math.cos(a)*35,-2,-18+Math.sin(a)*27);h.scale.set(12,5+i%4,9);}
 const path=mesh(new THREE.PlaneGeometry(2.3,17),'#c4b485',.5,.003,-7);path.rotation.x=-Math.PI/2;path.rotation.z=-.15;
 for(let i=0;i<24;i++){const x=Math.sin(i*1.7)*.58,z=-i*.55;const stone=mesh(new THREE.CylinderGeometry(.18+(i%3)*.05,.23,.035,6),'#d1c499',x+.07*i,.025,z);stone.scale.z=.7;}
 function tree(x,z,size){mesh(new THREE.CylinderGeometry(.12*size,.22*size,2.1*size,7),'#69563b',x,size,z);for(let j=0;j<4;j++){const canopy=mesh(leafGeometry,['#5f843e','#76954c','#88a75a','#52773c'][j],x+Math.sin(j*2)*size*.55,(2.1+(j%2)*.5)*size,z+Math.cos(j*2)*size*.5);canopy.scale.set(size*1.25,size,size*1.15);}}
 for(const [x,z,size] of [[-5,-4,1.4],[-7,-9,2],[-3,-12,1.5],[-9,-18,2.6],[7,-8,1.8],[8,-15,2.4],[2,-19,2],[-16,-22,3],[15,-26,3],[-12,3,2.4],[12,2,2.1]])tree(x,z,size);
 // A broad pond, low rock banks and soft animated water rings.
 const pond=mesh(new THREE.CircleGeometry(1,48),'#4c9cad',3,.018,-4);pond.rotation.x=-Math.PI/2;pond.scale.set(2.2,1.45,1);
 for(let i=0;i<21;i++){const a=i*Math.PI*2/21,rock=mesh(leafGeometry,i%3?'#68794b':'#929779',3+Math.cos(a)*2.18,.12,-4+Math.sin(a)*1.45);rock.scale.set(.25,.17,.24);}
 const ripples=[];for(let i=0;i<3;i++){const ripple=new THREE.Mesh(new THREE.RingGeometry(.45+i*.36,.46+i*.36,48),new THREE.MeshBasicMaterial({color:'#b7e0d8',transparent:true,opacity:.25,side:THREE.DoubleSide}));ripple.rotation.x=-Math.PI/2;ripple.position.set(3,.027+i*.001,-4);ripple.scale.x=1.4;root.add(ripple);ripples.push(ripple);}
 // Cottage with timber framing, pitched tile roof, door and windows.
 box(3.7,1.25,-10,2.8,2.5,2.6,'#d4c7a3');
 for(const x of [2.3,3.7,5.1])box(x,1.25,-8.68,.10,2.5,.09,'#695139');
 for(const y of [.12,1.25,2.45])box(3.7,y,-8.65,2.9,.10,.1,'#695139');
 box(3.55,.8,-8.58,.76,1.6,.08,'#574634');box(4.58,1.65,-8.57,.58,.65,.08,'#56818a');box(4.58,1.65,-8.50,.05,.65,.03,'#ede1c2');box(4.58,1.65,-8.50,.58,.05,.03,'#ede1c2');
 for(const side of [-1,1]){const roof=box(3.7+side*.78,2.95,-10,1.95,.13,3.15,'#9a724b');roof.rotation.z=side*-.62;for(let row=0;row<4;row++)for(let col=0;col<8;col++){const tile=box(3.7+side*(.2+row*.4),3.35-row*.28,-11.4+col*.4,.48,.06,.36,(row+col)%2?'#a77a50':'#89633f');tile.rotation.z=side*-.62;}}
 box(4.55,3.25,-10.6,.38,1.1,.42,'#827b6c');
 box(.2,.48,-8.2,1.8,.13,.62,'#8c7147');for(const x of [-.5,.9])box(x,.22,-8.2,.12,.5,.5,'#695139');
 // Shared instanced flowers keep the meadow economical in WebXR.
 const flowerGeometry=new THREE.IcosahedronGeometry(.055,0),stemGeometry=new THREE.CylinderGeometry(.012,.012,.17,4),matrix=new THREE.Matrix4();let seed=874;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=[];for(let i=0;i<260;i++){const x=(random()-.5)*21,z=-random()*18;if(Math.abs(x)<1.5||((x-3)**2/7+(z+4)**2/4)<1.2)continue;positions.push([x,z]);}
 const stems=new THREE.InstancedMesh(stemGeometry,celMaterial('#477142'),positions.length);positions.forEach(([x,z],i)=>{matrix.makeTranslation(x,.085,z);stems.setMatrixAt(i,matrix);});root.add(stems);
 for(let color=0;color<3;color++){const points=positions.filter((_,i)=>i%3===color),flowers=new THREE.InstancedMesh(flowerGeometry,celMaterial(['#dedbbe','#a687c7','#e4c777'][color]),points.length);points.forEach(([x,z],i)=>{matrix.makeTranslation(x,.19,z);flowers.setMatrixAt(i,matrix);});root.add(flowers);}
 const clouds=new THREE.Group();root.add(clouds);for(let i=0;i<9;i++)for(let j=0;j<3;j++){const cloud=new THREE.Mesh(hillGeometry,celMaterial('#edf3e4'));cloud.position.set(-25+i*7+j*1.7,12+(i%3)*2,-22-(i%2)*12);cloud.scale.set(2.8,1.3,1.5);clouds.add(cloud);}
 const portal=new THREE.Group();portal.position.set(-2,1.35,-2.4);root.add(portal);
 const face=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:'#32144e',side:THREE.DoubleSide}));face.scale.set(.63,1.18,1);face.userData.run=onReturn;portal.add(face);
 const rings=[];for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.022-i*.005,6,64),new THREE.MeshBasicMaterial({color:['#e2acff','#b06cf2','#e8d7ff'][i],transparent:true,opacity:1-i*.18}));ring.scale.set(.67+i*.08,1.24+i*.09,1);ring.position.z=.02+i*.004;portal.add(ring);rings.push(ring);}
 const motes=new THREE.Group();portal.add(motes);for(let i=0;i<22;i++){const a=i*2.4,m=new THREE.Mesh(new THREE.IcosahedronGeometry(.018,0),new THREE.MeshBasicMaterial({color:'#e6bbff'}));m.position.set(Math.cos(a)*(.35+i%3*.08),Math.sin(a)*1.05,.05);motes.add(m);}
 const garden=new THREE.Group();root.add(garden);for(let i=0;i<7;i++){const crystal=new THREE.Mesh(new THREE.ConeGeometry(.12,.52,5),celMaterial('#b5a1da'));crystal.position.set(1.2+i*.27,.22,-6-Math.sin(i));garden.add(crystal);}
 const bounds=new THREE.Box3();
 return {root,garden,targets:[face],touch(point){bounds.setFromObject(face);return bounds.distanceToPoint(point)<.12?face:null;},update(t){rings.forEach((r,i)=>{r.material.opacity=.65+Math.sin(t*2+i)*.25;});motes.rotation.z=t*.08;ripples.forEach((r,i)=>{r.material.opacity=.16+Math.sin(t+i)*.08;});clouds.position.x=Math.sin(t*.012)*1.5;}};
}
