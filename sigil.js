import * as THREE from './vendor/three.module.js';
// Five physical shards share one engraved symbol, so each recovered piece completes the drawing.
export function createMawhoundSigil(brown=false){
 const palette=brown?['#94734f','#f3d9ac','#fff0ce','#ddba89','#bf8d4e','#f0d0a0','#dbb680']:['#463858','#ddc6ff','#f0dbff','#bca5d5','#9b58da','#d6b1ff','#b78bdf'];
 const root=new THREE.Group();root.position.set(0,.58,0);root.rotation.x=-.12;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=palette[0];c.fillRect(0,0,512,512);c.strokeStyle=palette[1];c.lineWidth=8;c.beginPath();c.arc(256,256,210,0,Math.PI*2);c.stroke();
 c.beginPath();for(let i=0;i<=5;i++){const a=-Math.PI/2+i*4*Math.PI/5;const x=256+175*Math.cos(a),y=256+175*Math.sin(a);i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
 c.fillStyle=palette[2];for(const [x,y,r] of [[256,290,39],[193,224,21],[234,195,22],[279,195,22],[320,224,21]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const shards=[];
 for(let i=0;i<5;i++){
  const a=-Math.PI/2+i*Math.PI*2/5,b=a+Math.PI*2/5,m=(a+b)/2,r=.44;
  const shape=new THREE.Shape();shape.moveTo(.018*Math.cos(m),.018*Math.sin(m));shape.lineTo(.20*Math.cos(a+.07),.20*Math.sin(a+.07));shape.lineTo(r*Math.cos(a+.018),r*Math.sin(a+.018));shape.absarc(0,0,r,a+.018,b-.018,false);shape.lineTo(.23*Math.cos(b-.08),.23*Math.sin(b-.08));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false,curveSegments:20});const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let n=0;n<p.count;n++)uv.setXY(n,(p.getX(n)/r+1)/2,(p.getY(n)/r+1)/2);
  const material=new THREE.MeshStandardMaterial({map:texture,color:palette[3],emissive:palette[4],emissiveIntensity:.22,roughness:1,transparent:true});const mesh=new THREE.Mesh(geometry,material);const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,20),new THREE.LineBasicMaterial({color:palette[5],transparent:true}));mesh.add(outline);root.add(mesh);shards.push({mesh,outline,angle:m});
 }
 const halo=new THREE.Mesh(new THREE.RingGeometry(.52,.535,80),new THREE.MeshBasicMaterial({color:palette[6],transparent:true,opacity:.22,side:THREE.DoubleSide}));halo.position.z=-.02;root.add(halo);let pieces=0,awakened=false;
 return {root,setAwakened(value){awakened=value;root.scale.setScalar(value?.62:1);},setPieces(n){pieces=Math.max(0,Math.min(5,n));},update(time,reveal=0){
   root.position.set(awakened?-1.25:0,(awakened?1.35:.58)+Math.sin(time*1.5)*.018,awakened?-.7:0);root.rotation.y=Math.sin(time*.5)*.09;
   const fade=Math.max(0,1-Math.max(0,reveal-.25)/.65);halo.material.opacity=(.15+Math.sin(time*2)*.05+reveal*.5)*fade;halo.scale.setScalar(1+reveal*2);
   shards.forEach(({mesh,outline,angle},i)=>{const found=i<pieces,spread=(found?.012:.09)+reveal*.20;mesh.position.set(Math.cos(angle)*spread,Math.sin(angle)*spread,i%2*.006);mesh.material.opacity=(found?1:.09)*fade;mesh.material.emissiveIntensity=(found?.2+Math.sin(time*2+i)*.08:0)+reveal*2;outline.material.opacity=(found?.9:.28)*fade;mesh.scale.setScalar(1+reveal*.12);});
 }};
}

export function renderSigilAwakening(sigil,companion,elapsed,seconds){
 const progress=Math.min(1,Math.max(0,seconds/4));
 sigil.update(elapsed,progress);companion.root.visible=true;
 companion.root.scale.setScalar(Math.max(.001,THREE.MathUtils.smoothstep(progress,.3,.9)));
 return progress===1;
}
