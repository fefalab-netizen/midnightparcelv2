import * as THREE from './vendor/three.module.js';
import {SHAPES,markSurface,MARK_SIZE} from './shapes.js';
let ready=false;
const textureLoader=new THREE.TextureLoader(),paper=[],stickers=[];
// Explicit SVG MIME also supports older copies of the local development server.
const loader={async loadAsync(url){const response=await fetch(url);if(!response.ok)throw new Error(`Parcel art: ${response.status}`);const objectURL=URL.createObjectURL(new Blob([await response.text()],{type:'image/svg+xml'}));try{return await textureLoader.loadAsync(objectURL);}finally{URL.revokeObjectURL(objectURL);}}};
export const parcelArtReady=Promise.all([
 ...['wrinkle-soft','wrinkle-crumpled','kraft-fine','kraft-coarse'].map(async(name,i)=>{const t=await loader.loadAsync(new URL(`./assets/parcels/${name}.svg`,import.meta.url).href);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.userData.shared=true;paper[i]=t;}),
 loader.loadAsync(new URL('./assets/parcels/postal-stickers-5x5.svg',import.meta.url).href).then(atlas=>{atlas.colorSpace=THREE.SRGBColorSpace;for(let i=0;i<25;i++){const t=atlas.clone();t.repeat.set(.2,.2);t.offset.set((i%5)/5,(4-Math.floor(i/5))/5);t.userData.shared=true;t.needsUpdate=true;stickers.push(t);}atlas.dispose();})
]).then(()=>{ready=true;});
export function dressParcel(group,geometry,parcel){
 if(!ready)return;
 let seed=2166136261;for(const char of parcel.id)seed=Math.imul(seed^char.charCodeAt(0),16777619);seed^=Math.floor(parcel.tint*1e6);
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);if(Math.abs(normals.getZ(i))>.5)uv.setXY(i,(x+.5)*2,(y+.5)*2);else if(Math.abs(normals.getX(i))>.5)uv.setXY(i,(z+.5)*2,(y+.5)*2);else uv.setXY(i,(x+.5)*2,(z+.5)*2);}uv.needsUpdate=true;
 const overlay=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:paper[Math.floor(random()*4)],transparent:true,opacity:.65,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-.35,polygonOffsetUnits:-.35}));overlay.userData.sharedGeometry=true;group.add(overlay);
 const spec=SHAPES[parcel.shape],clue=parcel.type==='safe'?null:markSurface(parcel.shape,parcel.face),placed=[];
 const candidates=spec.anchors.flatMap(([x,y])=>[-1,1].map(side=>({x,y,side,sort:random()}))).sort((a,b)=>a.sort-b.sort),count=1+Math.floor(random()*3);
 for(const {x,y,side} of candidates){
  if(placed.length>=count)break;
  // Leave the shipping label and the real gameplay clue completely unobstructed.
  if(side===1&&Math.abs(x-spec.label[0])<.105&&Math.abs(y-spec.label[1])<.078)continue;
  if(clue&&clue.normal[2]===side&&Math.hypot(x-clue.position[0],y-clue.position[1])<.07/Math.SQRT2+MARK_SIZE/Math.SQRT2+.008)continue;
  if(placed.some(p=>p.side===side&&Math.hypot(x-p.x,y-p.y)<.085))continue;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.07,.07),new THREE.MeshBasicMaterial({map:stickers[Math.floor(random()*25)],transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-.7}));mesh.position.set(x,y,side*(spec.depth/2+.003));mesh.rotation.y=side===1?0:Math.PI;mesh.rotateZ((random()-.5)*.16);group.add(mesh);placed.push({x,y,side});
 }
}
