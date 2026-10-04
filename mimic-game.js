import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {celRamp} from './cel.js';

// Keep the original timing rules; only the presentation and jaw are new.
export function createMimicGame({parcel,onLatch,onError}){
 const root=new T.Group();root.position.set(-.12,1.62,-.48);root.visible=false;
 const model=new T.Group();root.add(model);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const panel=new T.Mesh(new T.PlaneGeometry(.85,.177),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));panel.position.set(0,-.46,.43);panel.rotation.x=-.3;root.add(panel);
 panel.userData.run=()=>{if(error){error=false;load();}else if(ready())onLatch();};
 const sparks=new T.Group();root.add(sparks);const sparkMaterial=new T.MeshBasicMaterial({color:'#af82e3',transparent:true});
 for(let i=0;i<30;i++){const s=new T.Mesh(new T.OctahedronGeometry(.022+(i%3)*.008),sparkMaterial);s.userData.angle=i*2.399;s.userData.height=(i%7)/7;sparks.add(s);}
 let puzzle=null,loaded=false,loading=false,error=false,age=0,upper,lower;
 async function load(){if(loaded||loading)return;loading=true;try{
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/models/Mimic.glb',import.meta.url).href);let source;gltf.scene.traverse(n=>{if(n.isMesh)source=n;});
  const g=source.geometry.clone();if(!g.attributes.normal)g.computeVertexNormals();const p=g.attributes.position,si=[],sw=[],colors=[];
  const base=new T.Bone();base.name='MimicBase';upper=new T.Bone();upper.name='UpperJaw';upper.position.set(0,.08,-.40);lower=new T.Bone();lower.name='LowerJaw';lower.position.set(0,-.43,-.37);base.add(upper,lower);
  const paper=new T.Color('#ad8458'),tooth=new T.Color('#e3d2a5'),shadow=new T.Color('#45313d');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=T.MathUtils.smoothstep(z,-.48,.1),top=T.MathUtils.smoothstep(y,-.08,.12),bottom=1-T.MathUtils.smoothstep(y,-.48,-.20);
   const u=front*top,l=front*bottom*(1-top);si.push(0,1,2,0);sw.push(1-u-l,u,l,0);
   // The supplied mesh has no texture. Warm paper, pale teeth, and ink-dark recesses.
   const teeth=z>.15&&Math.abs(x)<.49&&y>-.55&&y<.37;
   const c=(teeth?tooth:z<-.05&&Math.abs(x)<.4&&y>-.4&&y<.2?shadow:paper).clone();c.multiplyScalar(.88+.12*Math.sin(x*83+y*51+z*31)**2);colors.push(c.r,c.g,c.b);
  }
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const mesh=new T.SkinnedMesh(g,new T.MeshToonMaterial({vertexColors:true,gradientMap:celRamp,side:T.DoubleSide}));mesh.add(base);mesh.bind(new T.Skeleton([base,upper,lower]));mesh.frustumCulled=false;model.add(mesh);loaded=true;
 }catch(e){error=true;onError?.('Mimic could not load. Click its panel to retry.');console.error('Mimic load failed',e);}finally{loading=false;}}
 function ready(){return !!puzzle&&loaded&&age>=.85;}
 function draw(value){const c=canvas.getContext('2d');c.fillStyle='#16151e';c.fillRect(0,0,768,160);c.strokeStyle='#b69768';c.lineWidth=5;c.strokeRect(3,3,762,154);c.fillStyle='#ebd5ae';c.textAlign='center';c.font='bold 29px Georgia';c.fillText(error?'CLICK TO RETRY':!ready()?'THE PARCEL IS WAKING…':`LATCH ${puzzle.step+1} / 3 · CLICK IN GREEN`,384,43);c.fillStyle='#4f3549';c.fillRect(40,70,688,52);c.fillStyle='#82b96c';c.fillRect(40+688*.35,70,688*.3,52);c.fillStyle='#fff2d2';c.fillRect(40+value*688-4,63,8,66);texture.needsUpdate=true;}
 return {root,targets:[panel],get busy(){return !!puzzle&&!ready()&&!error;},get ready(){return ready();},
  sync(next){if(next===puzzle)return;const had=!!puzzle;puzzle=next;root.visible=!!next;age=0;if(next){load();model.visible=false;}else if(had){parcel.scale.setScalar(1);parcel.visible=parcel.children.length>0;}},
  update(dt,value){if(!puzzle)return;if(loaded)age+=dt;const t=T.MathUtils.smoothstep(age,0,.85);parcel.scale.setScalar(Math.max(.001,1-t));parcel.visible=t<.95;model.visible=loaded;model.scale.setScalar(Math.max(.001,t*.43));
   if(loaded){const closed=value>=.35&&value<=.65;const amount=closed?1:1-T.MathUtils.smoothstep(Math.min(Math.abs(value-.35),Math.abs(value-.65)),0,.13);upper.rotation.x=.62*amount;lower.rotation.x=-.32*amount;model.rotation.z=Math.sin(age*3)*.018;}
   sparks.visible=age<.95&&!error;sparkMaterial.opacity=1-t;sparks.children.forEach(s=>{const a=s.userData.angle+age*4,r=.15+t*.7;s.position.set(Math.cos(a)*r,(s.userData.height-.5)*1.1*t,Math.sin(a)*r);s.rotation.set(age*3,a,age*2);});draw(value);
  }
 };
}
