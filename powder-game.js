import * as THREE from './vendor/three.module.js';
import {POWDERS,powderColor} from './powder-rules.js?v=0.13.3';
import {celMaterial,inkEdges} from './cel.js';
export function createPowderGame({parcel,onPour}){
 const root=new THREE.Group();root.visible=false;let puzzle=null,held=null,motion=null;
 const bags=[],targets=[],point=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=128;
 const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Mesh(new THREE.PlaneGeometry(1.16,.145),new THREE.MeshBasicMaterial({map:labelTexture}));label.position.set(0,1.12,.22);root.add(label);
 for(let i=0;i<4;i++){
  const bag=new THREE.Group();bag.position.set(-.45+i*.30,1.15,.02);bag.userData.home=bag.position.clone();root.add(bag);
  // Dark apothecary tins with six flat sides, brass fittings and inked edges.
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.064,.079,.17,6),celMaterial('#393040','plaster'));body.position.y=.10;bag.add(body);inkEdges(body,.003,25);
  const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.035,.065,.045,6),celMaterial('#574754'));shoulder.position.y=.207;bag.add(shoulder);inkEdges(shoulder,.0025,25);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.039,.039,.03,8),celMaterial('#8e7854'));neck.position.y=.245;bag.add(neck);inkEdges(neck,.002);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.037,.037,.018,8),celMaterial('#28232e'));cap.position.y=.269;bag.add(cap);inkEdges(cap,.002);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(.073,.076,.022,6),celMaterial(POWDERS[i].color));band.position.y=.046;bag.add(band);inkEdges(band,.0018,25);
  const nameCanvas=document.createElement('canvas');nameCanvas.width=256;nameCanvas.height=96;const nc=nameCanvas.getContext('2d');nc.fillStyle='#17151e';nc.fillRect(0,0,256,96);nc.strokeStyle='#ac9165';nc.lineWidth=9;nc.strokeRect(5,5,246,86);nc.fillStyle=POWDERS[i].color;nc.font='bold 40px Georgia';nc.textAlign='center';nc.fillText(POWDERS[i].name.toUpperCase(),128,62,232);
  const nt=new THREE.CanvasTexture(nameCanvas);nt.colorSpace=THREE.SRGBColorSpace;const nameplate=new THREE.Mesh(new THREE.PlaneGeometry(.125,.047),new THREE.MeshBasicMaterial({map:nt}));nameplate.position.set(0,.116,.072);bag.add(nameplate);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(.19,.27,.19),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.position.y=.11;hit.userData.powderIndex=i;bag.add(hit);targets.push(hit);bags.push(bag);
 }
 const splatShape=new THREE.Shape();for(let i=0;i<36;i++){const a=i*Math.PI*2/36,r=i%3===0?.075:.055;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?splatShape.lineTo(x,y):splatShape.moveTo(x,y);}splatShape.closePath();
 const splat=new THREE.Mesh(new THREE.ShapeGeometry(splatShape),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3}));splat.visible=false;splat.userData.sharedGeometry=true;splat.material.userData.shared=true;
 const grainPositions=new Float32Array(60*3),grainGeometry=new THREE.BufferGeometry();grainGeometry.setAttribute('position',new THREE.BufferAttribute(grainPositions,3));
 const grains=new THREE.Points(grainGeometry,new THREE.PointsMaterial({size:.012,color:'#ffffff',transparent:true,opacity:.9}));grains.visible=false;grains.frustumCulled=false;root.add(grains);
 const bounds=new THREE.Box3();
 function home(bag){root.attach(bag);bag.position.copy(bag.userData.home);bag.rotation.set(0,0,0);bag.scale.setScalar(1);}
 function draw(){if(!puzzle)return;const c=labelCanvas.getContext('2d');c.fillStyle='#29252b';c.fillRect(0,0,1024,128);c.fillStyle=powderColor(puzzle.mixed);c.fillRect(7,7,110,114);c.fillStyle='#f6e8c7';c.font='bold 27px Georgia';c.textAlign='left';c.fillText('YOUR MIX  ·  '+puzzle.step+' / '+puzzle.doses+' DOSES',135,39);c.font='23px Arial';c.fillStyle=puzzle.feedbackTone==='wrong'?'#ff9c91':puzzle.feedbackTone==='correct'?'#a8edb0':'#f6e8c7';c.fillText(puzzle.feedback||'Choose a color. Each pour tells you if it is correct.',135,76,875);c.fillStyle='#f6e8c7';c.font='19px Arial';c.fillText('CYAN                 MAGENTA                 YELLOW                 WHITE',135,111);labelTexture.needsUpdate=true;}
 return {root,targets,get active(){return !!puzzle;},get owner(){return held?.owner;},get busy(){return !!motion;},
  sync(next,spec){if(next===puzzle){if(next&&splat.parent!==parcel)parcel.add(splat);draw();return;}this.cancel();puzzle=next;root.visible=!!next;splat.visible=!!next;if(next){parcel.add(splat);splat.position.set(spec.label[0],spec.label[1],spec.depth/2+.016);splat.material.color.set(next.target);draw();}},
  cancel(){held=null;motion=null;grains.visible=false;for(const bag of bags)home(bag);},
  grab(owner,ray,position){if(!puzzle||held||motion)return false;let hit=ray.intersectObjects(targets,false)[0]?.object;
   if(position){const nearby=targets.find(t=>{bounds.setFromObject(t);return bounds.distanceToPoint(position)<.075;});hit=nearby||hit;}
   if(!hit)return false;held={owner,index:hit.userData.powderIndex};bags[held.index].position.y+=.08;return true;
  },
  moveMouse(ray){if(held?.owner!=='mouse')return;parcel.getWorldPosition(point);plane.constant=-(point.z+.30);if(ray.ray.intersectPlane(plane,point)){point.y=Math.max(1.18,Math.min(2.6,point.y));bags[held.index].position.copy(point);}},
  moveGrip(owner,grip){if(held?.owner!==owner)return;grip.getWorldPosition(point);bags[held.index].position.copy(point).add(new THREE.Vector3(0,.03,-.04));},
  release(owner,mouseOverParcel){if(held?.owner!==owner)return;const {index}=held,bag=bags[index];bounds.setFromObject(parcel).expandByScalar(.20);
   const valid=owner==='mouse'?mouseOverParcel:bounds.containsPoint(bag.position);splat.getWorldPosition(point);
   motion={index,from:bag.position.clone(),to:point.clone().add(new THREE.Vector3(0,.24,.08)),landing:point.clone(),elapsed:0,pour:valid};held=null;
  },
  update(dt){if(!puzzle)return;if(held){bags[held.index].rotation.z=Math.sin(performance.now()*.006)*.045;return;}if(!motion)return;const job=motion;job.elapsed+=dt;const t=job.elapsed,bag=bags[job.index];
   if(!job.pour){bag.position.lerpVectors(job.from,bag.userData.home,THREE.MathUtils.smoothstep(t,0,.28));bag.rotation.z*=Math.exp(-dt*15);if(t>=.28){home(bag);motion=null;}return;}
   if(t<.20)bag.position.lerpVectors(job.from,job.to,THREE.MathUtils.smoothstep(t,0,.20));
   else if(t<.8){bag.position.copy(job.to);bag.rotation.z=-.95+Math.sin(t*35)*.09;grains.visible=true;grains.material.color.set(POWDERS[job.index].color);for(let i=0;i<60;i++){const f=(t*2+i/60)%1;grainPositions[i*3]=job.landing.x+Math.sin(i*8.1)*.04*f;grainPositions[i*3+1]=job.landing.y+.24*(1-f);grainPositions[i*3+2]=job.landing.z+.08*(1-f)+Math.cos(i*5.2)*.025*f;}grainGeometry.attributes.position.needsUpdate=true;}
   else {grains.visible=false;bag.position.lerpVectors(job.to,bag.userData.home,THREE.MathUtils.smoothstep(t,.8,1.08));bag.rotation.z*=Math.exp(-dt*18);if(t>=1.08){home(bag);motion=null;onPour(job.index);}}
  }
 };
}
