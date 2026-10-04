import * as THREE from './vendor/three.module.js';

const shapes={
 triangle:[[0,.29],[.27,-.22],[-.27,-.22]],
 square:[[-.25,.25],[.25,.25],[.25,-.25],[-.25,-.25]],
 star:Array.from({length:10},(_,i)=>{const a=Math.PI/2-i*Math.PI/5,r=i%2?.125:.30;return [Math.cos(a)*r,Math.sin(a)*r];})
};
export function createWardGame({parcel,onComplete}){
 const root=new THREE.Group();root.visible=false;let puzzle=null,owner=null,previous=null,samples=[],progress=0,finishTime=-1,guide=null,ink=null;
 const plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3();
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.021,10,8),new THREE.MeshBasicMaterial({color:'#ffe6a0'}));root.add(marker);
 const cursor=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshBasicMaterial({color:'#cfafff'}));cursor.visible=false;root.add(cursor);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=112;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const caption=new THREE.Mesh(new THREE.PlaneGeometry(.92,.134),new THREE.MeshBasicMaterial({map:texture,transparent:true}));caption.position.set(0,-.40,.012);root.add(caption);
 const trailGeometry=new THREE.BufferGeometry(),trailPoints=new Float32Array(8192*3);trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPoints,3));trailGeometry.setDrawRange(0,0);let trailCount=0;
 const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#fff3d6',transparent:true,opacity:.85}));trail.frustumCulled=false;root.add(trail);
 function label(message){const c=canvas.getContext('2d');c.clearRect(0,0,768,112);c.fillStyle='#201c2bdd';c.fillRect(0,0,768,112);c.fillStyle='#f4e0b3';c.textAlign='center';c.font='bold 27px Georgia';c.fillText((puzzle?.shape||'WARD').toUpperCase()+' · TRACE THE SPELL',384,35);c.font='21px Arial';c.fillText(message,384,78);texture.needsUpdate=true;}
 function reset(message='Start at the gold light. Hold and follow it around.'){owner=null;previous=null;progress=0;finishTime=-1;trailCount=0;trailGeometry.setDrawRange(0,0);if(ink)ink.geometry.setDrawRange(0,0);if(samples.length)marker.position.copy(samples[0]);marker.visible=true;cursor.visible=false;root.scale.setScalar(1);label(message);}
 function project(ray){if(!puzzle)return null;plane.constant=-root.position.z;if(!ray.ray.intersectPlane(plane,hit))return null;return hit.clone().sub(root.position);}
 return {root,get active(){return !!puzzle;},get owner(){return owner;},
  sync(next,depth){if(next===puzzle)return;this.cancel();puzzle=next;root.visible=!!next;if(!next)return;
   for(const mesh of [guide,ink])if(mesh){root.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
   root.position.copy(parcel.position);root.position.y+=.05;root.position.z+=depth/2+.24;
   const vertices=shapes[next.shape].map(([x,y])=>new THREE.Vector3(x,y,0));vertices.push(vertices[0].clone());samples=[];const path=new THREE.CurvePath();
   for(let i=1;i<vertices.length;i++){const a=vertices[i-1],b=vertices[i],n=Math.ceil(a.distanceTo(b)/.018);path.add(new THREE.LineCurve3(a,b));for(let j=0;j<n;j++)samples.push(a.clone().lerp(b,j/n));}samples.push(vertices[0].clone());
   const geometry=new THREE.TubeGeometry(path,samples.length-1,.0045,5,false);
   guide=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#735495',transparent:true,opacity:.65}));root.add(guide);
   ink=new THREE.Mesh(geometry.clone(),new THREE.MeshBasicMaterial({color:'#d9b8ff'}));root.add(ink);reset();
  },
  cancel(){reset();},
  begin(input,ray){if(!puzzle||owner||finishTime>=0)return false;const p=project(ray);if(!p||Math.abs(p.x)>.40||Math.abs(p.y)>.34)return false;
   reset();if(p.distanceTo(samples[0])>.065){label('Begin at the gold light.');return true;}owner=input;previous=p;this.move(input,ray);return true;
  },
  move(input,ray){if(owner!==input||finishTime>=0)return;const p=project(ray);if(!p){reset('Stroke lost. Start again at the gold light.');return;}
   const count=Math.max(1,Math.ceil(previous.distanceTo(p)/.012));if(count>160){reset('Move smoothly along the outline.');return;}
   const from=previous.clone();for(let i=1;i<=count;i++){
    const q=from.clone().lerp(p,i/count);
    if(q.distanceTo(samples[Math.min(progress,samples.length-1)])>.075){reset('Stay near the outline. Start again at the gold light.');return;}
    while(progress<samples.length&&q.distanceTo(samples[progress])<.038)progress++;
    if(progress===samples.length){finishTime=0;owner=null;marker.visible=false;cursor.visible=false;ink.geometry.setDrawRange(0,Infinity);label('WARD COMPLETE');return;}
   }
   previous=p;cursor.position.copy(p);cursor.position.z=.01;cursor.visible=true;marker.position.copy(samples[progress]);
   ink.geometry.setDrawRange(0,Math.max(0,progress-1)*5*6);
   if(trailCount<8192){trailPoints.set([p.x,p.y,.012],trailCount*3);trailCount++;trailGeometry.attributes.position.needsUpdate=true;trailGeometry.setDrawRange(0,trailCount);}
  },
  end(input){if(owner===input)reset('Keep holding until the outline is closed.');},
  update(dt){if(finishTime<0)return;finishTime+=dt;root.scale.setScalar(1+Math.sin(Math.min(1,finishTime/.55)*Math.PI)*.10);if(finishTime>=.55){finishTime=-1;onComplete(puzzle);}}
 };
}
