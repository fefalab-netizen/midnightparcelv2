import * as THREE from './vendor/three.module.js';

// Three hard lighting bands; shared by scenery, parcels, pets and the customer.
export const celRamp=new THREE.DataTexture(new Uint8Array([38,132,255]),3,1,THREE.RedFormat);
celRamp.minFilter=celRamp.magFilter=THREE.NearestFilter;celRamp.generateMipmaps=false;celRamp.needsUpdate=true;
const ink=new THREE.MeshBasicMaterial({color:'#090d16'});ink.userData.shared=true;
const silhouetteInk=new THREE.MeshBasicMaterial({color:'#10131e',side:THREE.BackSide});silhouetteInk.userData.shared=true;
const maps=new Map(),paints=new Map();
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};}
function surfaceMap(style){
  if(maps.has(style))return maps.get(style);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d'),r=random(style==='wood'?57:99);
  c.fillStyle='#fff9ed';c.fillRect(0,0,512,512);
  if(style==='wood'){
    // Broad, uneven pen strokes along the grain, plus fine subdued fibers.
    for(let i=0;i<120;i++){const y=r()*512,x=r()*512,len=25+r()*170;c.strokeStyle=i%3?'#b8b19b':'#d9d2ba';c.globalAlpha=.22;c.lineWidth=.5+r()*.6;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+len*.3,y-2,x+len*.7,y+2,x+len,y);c.stroke();}
    c.globalAlpha=1;
    for(let i=0;i<22;i++){const x=r()*440,y=12+r()*488,len=25+r()*100,width=1+r()*2.2;
      c.fillStyle=i%4?'#24212a':'#58505a';c.beginPath();c.moveTo(x,y);c.lineTo(x+len*.4,y-width);c.lineTo(x+len,y-1);c.lineTo(x+len*.65,y+width*.35);c.lineTo(x+len*.16,y+width);c.closePath();c.fill();
      if(i%5===0){c.strokeStyle='#38313b';c.lineWidth=1;c.beginPath();c.moveTo(x+len*.3,y-2);c.quadraticCurveTo(x+len*.45,y-9,x+len*.75,y-4);c.stroke();}
    }
    // Staggered seams, drawn like an inked tabletop instead of photoreal grain.
    c.strokeStyle='#191b25';c.lineWidth=3;
    for(const y of [0,171,342]){c.beginPath();c.moveTo(0,y+1);c.lineTo(150,y+3);c.lineTo(335,y);c.lineTo(512,y+2);c.stroke();}
  }else{
    // Quiet plaster/paper: a little dry-brush wear, never parcel-like symbols.
    c.fillStyle='#777981';c.globalAlpha=.14;
    for(let i=0;i<130;i++){const x=r()*512,y=r()*512;c.fillRect(x,y,1+r()*9,.5+r());}c.globalAlpha=1;
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;texture.userData.shared=true;maps.set(style,texture);return texture;
}
export function celMaterial(color,style='plain'){
  const key=`${color}:${style}`;if(!paints.has(key)){const m=new THREE.MeshToonMaterial({color,gradientMap:celRamp,map:style==='plain'?null:surfaceMap(style)});m.userData.shared=true;paints.set(key,m);}return paints.get(key);
}
export function boxSurfaceUV(geometry,w,h,d){
  const uv=geometry.attributes.uv,scale=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let face=0;face<6;face++)for(let i=0;i<4;i++){const index=face*4+i;uv.setXY(index,uv.getX(index)*scale[face][0]*.72,uv.getY(index)*scale[face][1]*.72);}uv.needsUpdate=true;
}
// Real geometry for thick strokes. WebGL lineWidth is commonly fixed at one pixel.
export function inkEdges(mesh,radius=.004,threshold=28){
  const source=new THREE.EdgesGeometry(mesh.geometry,threshold),p=source.attributes.position,vertices=[],indices=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),axis=new THREE.Vector3(),u=new THREE.Vector3(),v=new THREE.Vector3(),point=new THREE.Vector3();
  for(let i=0;i<p.count;i+=2){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);axis.subVectors(b,a).normalize();u.crossVectors(axis,Math.abs(axis.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();v.crossVectors(axis,u).normalize();const start=vertices.length/3;
    for(const end of [a,b])for(let k=0;k<4;k++){const angle=k*Math.PI/2;point.copy(end).addScaledVector(u,Math.cos(angle)*radius).addScaledVector(v,Math.sin(angle)*radius);vertices.push(point.x,point.y,point.z);}
    for(let k=0;k<4;k++){const next=(k+1)%4;indices.push(start+k,start+next,start+k+4,start+next,start+next+4,start+k+4);}
  }
  source.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const edge=new THREE.Mesh(g,ink);edge.name='Ink edges';edge.raycast=()=>{};mesh.add(edge);return edge;
}
export function inkSilhouette(mesh,amount=.018){
  const shell=new THREE.Mesh(mesh.geometry,silhouetteInk);shell.scale.setScalar(1+amount);shell.raycast=()=>{};shell.userData.sharedGeometry=true;mesh.add(shell);return shell;
}
