import * as THREE from './vendor/three.module.js';
import { Game, freshSave, validateSave } from './core.js';
import { SHAPES, markSurface, MARK_SIZE } from './shapes.js';
import {dressParcel,parcelArtReady} from './parcel-art.js';
import { createCustomer } from './customer.js';
import { celMaterial, boxSurfaceUV, inkEdges, inkSilhouette } from './cel.js';
import {loadCardboardImp} from './cardboard-imp.js';
import {loadMawhound} from './mawhound.js';
import {createMawhoundSigil,renderSigilAwakening} from './sigil.js';

import {createWardGame} from './ward-game.js';
import {createPowderGame} from './powder-game.js';
import {createCounterTools} from './counter-tools.js';
import {createBackRoom} from './back-room.js';
import {createOutdoorSanctuary} from './sanctuary-world.js';

const $ = id => document.getElementById(id);
const SAVE = 'midnight-parcel-webxr-v1';
let storageNote = '', stored;
try { const raw = localStorage.getItem(SAVE); if (raw){const parsed=JSON.parse(raw);stored = validateSave(parsed);if(parsed.version<4){try{if(!localStorage.getItem(SAVE+'-backup-v'+parsed.version))localStorage.setItem(SAVE+'-backup-v'+parsed.version,raw);storageNote='Companion progress preserved · old save backed up';}catch{storageNote='Sigil progress converted in memory; browser could not write a backup.';}}} }
catch { storageNote = 'Save unavailable or damaged. A fresh session is ready; the old save is kept until you finish a shift.'; }
const game = new Game(stored || freshSave());
let sound = false, audio, elapsed = 0, lastUI = '', parcelId = '', heldBy = null, sanctuaryMode = false, sceneMode = ''; 
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1a27'); scene.fog = new THREE.Fog('#0d1a27', 7, 20);
const camera = new THREE.PerspectiveCamera(48, 1, .05, 110);
camera.position.set(0, 2.05, 3.1); camera.lookAt(0, 1.35, -1.5);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch { $('error').hidden = false; $('error').textContent = 'WebGL could not start. Enable hardware acceleration or open this page in a WebGL-capable browser.'; throw Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor'); renderer.xr.setFramebufferScaleFactor(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('world').appendChild(renderer.domElement);
const hemi = new THREE.HemisphereLight('#7189a6', '#0a101b', .65); scene.add(hemi);
const sun = new THREE.DirectionalLight('#c8d7ed', .55); sun.position.set(-3, 4, -2); scene.add(sun);
const deskLight=new THREE.PointLight('#ffe3bd',6,3.4,2);deskLight.position.set(0,2.15,.05);scene.add(deskLight);
const room = new THREE.Group(), petRoom = new THREE.Group(); scene.add(room, petRoom); petRoom.visible = false;
const mats = new Map();
function material(color) { if (!mats.has(color)) mats.set(color, celMaterial(color)); return mats.get(color); }
const woodenColors=new Set(['#554936','#967453','#624e48','#86715a','#625644','#493f34','#9a7456','#374a48','#ad9067','#7d6e51']);
function box(parent, x,y,z, w,h,d, color, outline = false, surface = null) {
  const style=surface||(woodenColors.has(color)?'wood':'plain');
  const g = new THREE.BoxGeometry(w,h,d);if(style!=='plain')boxSurfaceUV(g,w,h,d);
  const m = new THREE.Mesh(g,style==='plain'?material(color):celMaterial(color,style)); m.position.set(x,y,z); parent.add(m);
  if (outline||style==='wood')inkEdges(m,Math.min(.010,Math.max(.0018,Math.min(w,h,d)*.085)));
  return m;
}
function ball(parent,x,y,z,r,color, sx=1,sy=1,sz=1) { const m = new THREE.Mesh(new THREE.SphereGeometry(r,12,8),material(color)); m.position.set(x,y,z); m.scale.set(sx,sy,sz); parent.add(m);if(r>=.07)inkSilhouette(m,.025); return m; }
function cylinder(parent,x,y,z,r1,r2,h,color) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,12),material(color)); m.position.set(x,y,z); parent.add(m);if(r1>=.09)inkEdges(m,.003,35); return m; }
function canvasPlane(parent,w,h,x,y,z,draw,pixels=1024) {
  const c = document.createElement('canvas'); c.width=pixels; c.height=Math.round(pixels*h/w); const ctx=c.getContext('2d'); draw(ctx,c.width,c.height);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide})); mesh.position.set(x,y,z); parent.add(mesh); mesh.userData.canvas=c; return mesh;
}
function sign(parent,text,x,y,z,w=.9,h=.18,color='#d6c99e') {
  return canvasPlane(parent,w,h,x,y,z,(c,W,H)=>{c.fillStyle=color;c.font=`bold ${Math.floor(H*.46)}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,W*.95);},512);
}
function plant(parent,x,y,z,scale=1) {
  const p=new THREE.Group();p.position.set(x,y,z);p.scale.setScalar(scale);parent.add(p);
  cylinder(p,0,.1,0,.13,.09,.2,'#8d6555');
  for(let i=0;i<5;i++) {const leaf=ball(p,Math.sin(i*2)*.1,.3+i*.03,Math.cos(i*2)*.1,.11,'#648f72',.55,1.6,.6);leaf.rotation.z=Math.sin(i*2)*.6;}
}
// A compact, low-poly set. No external textures, models, fonts, or audio.
box(room,0,-.09,-2,10,.15,12,'#24363d',true,'wood');
for(let i=-6;i<7;i++)box(room,i*.65,.005,-2,.015,.008,10,'#172930');
for(const x of [-2.63,2.63]){box(room,x,2,-4,3.74,4,.2,'#182932',true,'plaster');box(room,x,.48,-3.86,3.74,.95,.1,'#19252d',true,'wood');box(room,x,1,-3.73,3.74,.07,.13,'#554936');}
box(room,0,3.35,-4,1.52,1.3,.2,'#182932');
box(room,-4.2,2,-1,.2,4,6,'#202b35');box(room,4.2,2,-1,.2,4,6,'#182431');
for(let i=-8;i<=8;i++)if(Math.abs(i)>1.6)box(room,i*.5,.49,-3.77,.035,.92,.03,'#353c40');
// Moonlit arched-style window framed with geometric trim.
box(room,-2.45,2.25,-3.82,2,2.1,.09,'#121d33');
for(const x of [-3.49,-2.45,-1.41])box(room,x,2.25,-3.65,.065,2.25,.12,'#967453');
for(const y of [1.14,2.22,3.36])box(room,-2.45,y,-3.65,2.14,.065,.12,'#967453');
ball(room,-2.8,2.85,-3.7,.24,'#d4ddb8',1,1,.15);
const stars=new THREE.Group();room.add(stars);
for(let i=0;i<27;i++) {const x=-3.34+((i*17)%29)/29*1.8,y=1.28+((i*11)%31)/31*1.95;ball(stars,x,y,-3.69,.009,'#91b9cb');}
for(let i=0;i<12;i++)box(room,-3.3+(i%6)*.3,1.45+Math.floor(i/6)*1.1,-3.67,.008,.16,.007,'#517e94').rotation.z=-.2;
// Shelves and shipping archive.
for(const x of [1.6,3.3])box(room,x,1.75,-3.45,.1,2.65,.52,'#624e48');
for(const y of [.48,1.15,1.85,2.55,3.04])box(room,2.45,y,-3.45,1.9,.09,.6,'#86715a');
for(let i=0;i<14;i++) {const x=1.86+(i%3)*.53,y=.72+Math.floor(i/3)*.69; if(y>3)continue;box(room,x,y,-3.41,.39,.34,.36,['#b98e60','#799091','#946967'][i%3],true);box(room,x,y,-3.22,.08,.34,.006,'#cdb68b');}
box(room,0,3.32,-3.80,3.62,.49,.12,'#111a23',true);
for(const y of [3.09,3.55])box(room,0,y,-3.715,3.58,.026,.024,'#9e8656');
for(const x of [-1.78,1.78])box(room,x,3.32,-3.715,.026,.47,.024,'#9e8656');
sign(room,'MIDNIGHT PARCEL SERVICE',0,3.32,-3.69,3.35,.35,'#f0d193');
for(const x of [-1.55,1.55]){cylinder(room,x,3.77,-3.8,.012,.012,.44,'#4e5148');ball(room,x,3.45,-3.65,.027,'#f0d193');}
// Working front door: the wall really has an opening, with a dark vestibule behind it.
box(room,0,1.3,-5.25,1.52,2.6,.08,'#070d17');
for(const x of [-.79,.79])box(room,x,1.34,-3.72,.13,2.68,.23,'#625644',true);
box(room,0,2.7,-3.72,1.72,.14,.23,'#625644',true);
const doorHinge=new THREE.Group();doorHinge.position.set(-.72,0,-3.78);room.add(doorHinge);
box(doorHinge,.72,1.29,0,1.44,2.58,.11,'#26373b',true,'wood');
for(const y of [.53,1.18])box(doorHinge,.72,y,.064,1.15,.47,.035,'#1b282e',true,'wood');
box(doorHinge,.72,2.01,.065,1.12,.77,.015,'#344751');
sign(doorHinge,'NIGHT DELIVERIES',.72,2.06,.08,1,.16,'#bfb38d');
ball(doorHinge,1.27,1.2,.12,.046,'#b99b62');
box(room,0,.018,-3.6,1.55,.035,.65,'#493f34');
// Original grey/violet customer, with jointed limbs and an angular sculpted face.
const customerModel=createCustomer(),customer=customerModel.root;room.add(customer);customer.visible=false;
const carried=new THREE.Group();carried.position.set(0,.99,.36);customer.add(carried);
const customerLight=new THREE.PointLight('#c0b4ef',2.3,2.4,2);customerLight.position.set(0,1.85,-1.18);room.add(customerLight);
const waitingParcels=new THREE.Group();room.add(waitingParcels);
let shownVisit=0,shownQueue=-1;
function stack(group,count,onDesk=false){disposeGroup(group);for(let i=0;i<count;i++){box(group,onDesk?-.94:0,(onDesk?1.17:.08)+i*.15,onDesk?-.96:0,.40,.14,.29,['#ae8a65','#82958b','#8a7171'][i],true);box(group,onDesk?-.94:0,(onDesk?1.17:.08)+i*.15,onDesk?-.808:.15,.055,.14,.006,'#b9a27b');}}
function animateDelivery(){
  const d=game.delivery;
  customer.visible=game.phase==='shift'&&!!d;
  if(!d){doorHinge.rotation.y=0;carried.visible=false;}
  else{
    const visitKey=`${game.save.shift}:${d.id}`;
    if(shownVisit!==visitKey){shownVisit=visitKey;stack(carried,d.count);}
    const t=d.elapsed,walkIn=THREE.MathUtils.clamp((t-.65)/2,0,1),walkOut=THREE.MathUtils.clamp((t-4.1)/2.2,0,1);
    doorHinge.rotation.y=-1.45*Math.min(1,t/.65,Math.max(0,(7.2-t)/.8));
    customer.position.set(0,0,t<4.1?THREE.MathUtils.lerp(-4.55,-1.8,walkIn):THREE.MathUtils.lerp(-1.8,-4.55,walkOut));
    customer.rotation.y=t<3.7?0:Math.PI*THREE.MathUtils.clamp((t-3.7)/.4,0,1);
    const walking=(t>.65&&t<2.65)||(t>4.1&&t<6.3),handoff=Math.max(0,1-Math.abs(t-3)/.35);
    customerModel.animate(t,{walking,carrying:!d.arrived,handoff});
    carried.visible=!d.arrived;carried.position.z=.36+handoff*.19;
  }
  const count=game.phase==='shift'?(game.batchRemaining||0):0;
  if(shownQueue!==count){shownQueue=count;stack(waitingParcels,count,true);}
}
// Counter, inspection pad, incoming/outgoing trays.
box(room,0,.48,-.7,3.5,.96,1.42,'#374a48',true);
box(room,0,.99,-.7,3.72,.13,1.6,'#c3a17a',true,'wood');
box(room,0,1.067,-.5,.95,.009,.76,'#263b43');
for(const x of [-.48,.48])box(room,x,1.08,-.5,.013,.009,.77,'#c7b17a');
for(const z of [-.88,-.12])box(room,0,1.08,z,.97,.009,.013,'#c7b17a');
sign(room,'INSPECT  •  TEST  •  PROTECT',0,.65,.025,2.55,.23);
box(room,-.94,1.08,-.96,.53,.04,.42,'#293a3a',true);
plant(room,-3.3,0,-2.8,2.2);
for(const x of [-1.12,1.12]) {cylinder(room,x,2.7,-1.9,.22,.33,.23,'#826c48');cylinder(room,x,3.35,-1.9,.015,.015,1.1,'#252631');ball(room,x,2.56,-1.9,.14,'#e8c787',1,.25,1);}
// Between shifts: a quiet back room and a separate outdoor sanctuary.
const backRoom=createBackRoom({onPortal:enterSanctuary,onSleep:sleepAndStart});scene.add(backRoom.root);
sign(backRoom.root,'TOUCH TO VISIT SANCTUARY',.27,1.52,-.58,1.05,.12,'#d8b1ff');
sign(backRoom.root,'REST · BEGIN NEXT SHIFT',1.08,.90,.95,1.05,.13);
const outdoorSanctuary=createOutdoorSanctuary(goBackRoom);petRoom.add(outdoorSanctuary.root);
const garden=outdoorSanctuary.garden;
sign(petRoom,'RETURN TO YOUR ROOM',-2,2.95,-2.4,1.5,.16,'#ead8ff');
const petsGroup=new THREE.Group();petsGroup.position.set(0,.04,-1.3);petRoom.add(petsGroup);
let mawhoundTricks=false,mawhoundRoot=null,mawhoundController=null,mawhoundStatus='idle',petBadgeLevel=null;
const petBadge=canvasPlane(petRoom,1.35,.18,0,.23,-.70,()=>{},512);
const companions=new Map(),sigils={imp:createMawhoundSigil(true),mawhound:createMawhoundSigil()};
for(const item of Object.values(sigils)){petsGroup.add(item.root);item.root.visible=false;}
let sigil=sigils[game.pet.id],revealTime=-1;
function updatePetBadge(){const label=game.petAwakened&&game.pet.awakeningSeen?game.pet.name.toUpperCase()+' · LEVEL '+game.petLevel:game.pet.name.toUpperCase()+' SIGIL · '+game.sigilPieces+'/5';if(petBadgeLevel===label)return;petBadgeLevel=label;const c=petBadge.userData.canvas,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#e4d3a6';ctx.font='bold '+c.height*.44+'px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,c.width/2,c.height/2,c.width*.95);petBadge.material.map.needsUpdate=true;}
async function ensureMawhound(){
 const pet=game.pet;if(!game.petAwakened||['loading','ready'].includes(companions.get(pet.id)?.status))return;
 const entry={status:'loading',controller:null};companions.set(pet.id,entry);mawhoundStatus='loading';sync(true);
 try{const loaded=await (pet.id==='imp'?loadCardboardImp():loadMawhound());entry.controller=loaded;entry.status='ready';loaded.setRoamBounds({minX:-.8,maxX:.7,minZ:-1.5,maxZ:.2});loaded.setAutonomous(pet.awakeningSeen);loaded.root.visible=false;petsGroup.add(loaded.root);}
 catch(error){entry.status='error';console.error(pet.name+' model load failed:',error);}
 rebuildPets();sync(true);
}
function rebuildPets(){
 for(const item of Object.values(sigils))item.root.visible=false;sigil=sigils[game.pet.id];sigil.root.visible=true;
 for(const [id,entry] of companions)if(entry.controller)entry.controller.root.visible=id===game.pet.id&&game.pet.awakeningSeen;
 const entry=companions.get(game.pet.id);mawhoundStatus=entry?.status||'idle';mawhoundController=entry?.controller||null;mawhoundRoot=mawhoundController?.root||null;
 garden.visible=game.save.garden;updatePetBadge();sigil.setPieces(game.sigilPieces);sigil.setAwakened(game.petAwakened&&game.pet.awakeningSeen);if(game.petAwakened&&mawhoundStatus==='idle')ensureMawhound();
}
function selectCompanion(id){if(!game.selectPet(id))return;revealTime=-1;mawhoundTricks=false;rebuildPets();save();}
// Parcel meshes and decals are rebuilt only when a parcel changes.
const parcel = new THREE.Group();scene.add(parcel);
const powderGame=createPowderGame({parcel,onPour:index=>invoke(()=>tone(game.pourPowder(index)))});scene.add(powderGame.root);
const wardGame=createWardGame({parcel,onComplete:puzzle=>invoke(()=>tone(game.completeWard(puzzle)))});scene.add(wardGame.root);
const parcelHome=new THREE.Vector3(-.12,1.51,-.48);
function disposeGroup(group) {
  for(const child of [...group.children]) {group.remove(child);child.traverse(o=>{if(!o.userData.sharedGeometry)o.geometry?.dispose();if(o.material&&!o.material.userData.shared){if(!o.material.map?.userData.shared)o.material.map?.dispose();o.material.dispose();}});}
}
function resetParcel() { if(heldBy)heldBy=null;scene.attach(parcel);parcel.position.copy(parcelHome);parcel.rotation.set(.08,-.28,0);if(['curse','demon'].includes(game.puzzle?.type))parcel.rotation.set(0,0,0);parcel.scale.setScalar(1); }
function markTexture(type) {
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.strokeStyle=ctx.fillStyle={curse:'#773c9c',monster:'#733132',demon:'#a53954',chibi:'#355e56'}[type];ctx.lineCap='round';ctx.lineWidth=8;
  if(type==='curse'){ctx.beginPath();for(let i=0;i<95;i++){const a=i/9,r=3+i*.44;const x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
  if(type==='monster'){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(35+i*27,22);ctx.lineTo(23+i*27,105-i*5);ctx.stroke();}}
  if(type==='demon'){ctx.beginPath();ctx.moveTo(64,13);ctx.lineTo(116,110);ctx.lineTo(12,110);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.ellipse(64,76,25,14,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(64,76,7,0,Math.PI*2);ctx.fill();}
  if(type==='chibi'){ctx.beginPath();ctx.ellipse(64,83,28,23,0,0,Math.PI*2);ctx.fill();for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(25+i*26,41-Math.sin(i/3*Math.PI)*12,10,14,(i-1.5)*.3,0,Math.PI*2);ctx.fill();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function buildParcel() {
  disposeGroup(parcel);resetParcel();
  const p=game.parcel;if(!p){parcel.visible=false;return;}parcel.visible=true;
  const spec=SHAPES[p.shape],shape=new THREE.Shape(spec.points.map(([x,y])=>new THREE.Vector2(x,y)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:spec.depth,bevelEnabled:false,steps:1});geometry.translate(0,0,-spec.depth/2);
  const body=new THREE.Mesh(geometry,material(['#b99063','#91a296','#b09682','#8c745e','#ab9472','#89928a','#b0957c'][p.shape]));parcel.add(body);
  inkEdges(body,.0024,25);
  dressParcel(parcel,geometry,p);
  const [lx,ly]=spec.label;
  canvasPlane(parcel,.13,.075,lx,ly,spec.depth/2+.004,(c,W,H)=>{c.fillStyle='#e5d7b5';c.fillRect(0,0,W,H);c.fillStyle='#2c3c44';c.font=`bold ${H*.23}px monospace`;c.fillText('NIGHT ROUTE',W*.06,H*.3);c.font=`${H*.2}px monospace`;c.fillText('#'+p.id,W*.07,H*.58);for(let i=0;i<17;i++)c.fillRect(W*.08+i*W*.045,H*.7,2+(i%3),H*.2);},256);
  if(p.type!=='safe') {
    const size=MARK_SIZE;
    const decal=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:markTexture(p.type),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    const surface=markSurface(p.shape,p.face);decal.position.fromArray(surface.position);decal.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...surface.normal));
    parcel.add(decal);
  }
}
// All essential controls also exist as in-world targets for WebXR.
let parcelArtPending=false;
parcelArtReady.then(()=>{if(game.parcel){if(heldBy)parcelArtPending=true;else buildParcel();}}).catch(error=>{console.error('Parcel decoration could not load:',error);$('error').hidden=false;$('error').textContent='Package textures could not load. Refresh the page and check that assets/parcels was uploaded.';});
// Physical counter controls; the sanctuary gets a separate wooden noticeboard.
const toolsOnCounter=createCounterTools({
 canActivate:key=>key==='recenter'||(game.phase==='shift'&&(key==='pause'||key==='close'||(!game.paused&&!!game.parcel&&!game.puzzle&&!heldBy))),
 isPaused:()=>game.paused,
 stampTarget:()=>{if(!game.parcel)return null;resetParcel();parcel.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(parcel),center=bounds.getCenter(new THREE.Vector3());return [center.x,bounds.max.y+.008,center.z];},
 onActivate:key=>invoke(()=>{if(key==='pause')togglePause();else if(key==='close')game.close();else if(key==='recenter')recenter();else if(key==='stamp'){if(game.phase==='shift'&&game.parcel&&!game.paused&&!game.puzzle){const ok=game.parcel.type==='safe';game.ship();tone(ok);}}else test(key);})
});room.add(toolsOnCounter.root);
let mouseTool=null;
const vrUI=new THREE.Group();petRoom.add(vrUI);
const actionBoard=new THREE.Group();actionBoard.position.set(1.25,1.55,-.85);vrUI.add(actionBoard);
box(actionBoard,0,-.03,-.045,1.05,1.57,.09,'#967453',true,'wood');
box(actionBoard,0,-.03,.01,.94,1.45,.02,'#493f34',true,'wood');
for(const x of [-.41,.41])box(actionBoard,x,-1.02,-.08,.085,1.1,.09,'#625644',true,'wood');
sign(actionBoard,'SANCTUARY NOTICEBOARD',0,.67,.04,.93,.13);
const shopStatus=new THREE.Group();shopStatus.position.set(-1.04,1.12,-.40);shopStatus.rotation.x=-.95;room.add(shopStatus);
box(shopStatus,0,0,-.025,1.08,.46,.05,'#625644',true,'wood');
const statusCanvas=document.createElement('canvas');statusCanvas.width=1024;statusCanvas.height=384;
const statusTexture=new THREE.CanvasTexture(statusCanvas);statusTexture.colorSpace=THREE.SRGBColorSpace;
const statusMaterial=new THREE.MeshBasicMaterial({map:statusTexture});
const statusMesh=new THREE.Mesh(new THREE.PlaneGeometry(.94,.35),statusMaterial);statusMesh.position.set(0,.41,.045);actionBoard.add(statusMesh);
const counterStatus=new THREE.Mesh(new THREE.PlaneGeometry(1,.38),statusMaterial);counterStatus.position.z=.005;shopStatus.add(counterStatus);
// Temporary parchment controls retain the existing treatment sequences until their redesign.
const shopControls=new THREE.Group();shopControls.position.set(1.05,1.86,-.78);shopControls.rotation.x=-.12;room.add(shopControls);
const contextPaper=box(shopControls,0,-.025,-.008,.91,.43,.018,'#b8a27e',true);
const guideTexture=new THREE.TextureLoader().load('./assets/night-desk-guide.png');guideTexture.colorSpace=THREE.SRGBColorSpace;
// The physical shop window's lower-right pane, visible in both desktop and VR.
const windowPoster=new THREE.Mesh(new THREE.PlaneGeometry(.682,1.023),new THREE.MeshBasicMaterial({map:guideTexture,color:'#c7c4bb'}));windowPoster.position.set(-1.841,1.7315,-3.59);room.add(windowPoster);
for(const x of [-2.142,-1.54])box(room,x,2.213,-3.578,.075,.055,.003,'#ac9d74');
windowPoster.userData.run=()=>{if(renderer.xr.isPresenting)game.message='Window guide: no mark—ship; spiral—powder; claws—bait; eye—ward; paw—bell. Turn every parcel.';else showGuide();};
const buttonsGroup=new THREE.Group();actionBoard.add(buttonsGroup);let worldTargets=[], options=[];
function buildButtons() {
  disposeGroup(buttonsGroup);worldTargets=[];shopControls.visible=false;
  if(['summary','backroom'].includes(game.phase)){worldTargets.push(...backRoom.targets);return;}
  const sanctuary=game.phase==='sanctuary';
  if(!sanctuary)worldTargets.push(...toolsOnCounter.targets);
  const vrOptions=sanctuary?[...options]:game.phase==='lobby'||game.puzzle?[...options]:[];
  if(sanctuary)vrOptions.push({label:'Recenter view',run:recenter});
  (sanctuary?actionBoard:shopControls).add(buttonsGroup);shopControls.visible=!sanctuary&&vrOptions.length>0;
  const step=Math.min(.12,(sanctuary ? .86 : .36)/Math.max(1,vrOptions.length)), top=(sanctuary ? .18 : .15)-step/2;
  vrOptions.forEach((item,i)=>{
    const btn=canvasPlane(buttonsGroup,.77,step*.88,0,top-i*step,.028,(c,W,H)=>{c.fillStyle=item.primary?'#ddc48d':'#66503b';c.fillRect(0,0,W,H);c.fillStyle=item.primary?'#1b2c34':'#ecedd9';c.font=`bold ${H*.42}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(item.label,W/2,H/2,W*.95);},512);
    btn.userData.run=item.label==='How to play'?()=>{game.message='Grip + turn a parcel. Look for tiny stamps on edges and backs. Touch or point at tools to activate them. The poster is on the window left of the door.';}:item.run;worldTargets.push(btn);
  });
  if(game.phase==='sanctuary')worldTargets.push(...outdoorSanctuary.targets);else worldTargets.push(windowPoster);
}
function writeStatus() {
  const c=statusCanvas.getContext('2d');c.fillStyle='#2a302d';c.fillRect(0,0,1024,384);c.fillStyle='#d9c48e';c.font='bold 48px Georgia';
  c.fillText(game.phase==='sanctuary'?'POCKET SANCTUARY':`SHIFT ${game.save.shift-(game.phase==='summary'?1:0)}  /  ${formatTime(game.time)}  /  ${game.save.money} COINS`,30,65);
  c.fillStyle='#d3e5df';c.font='34px Arial';const words=(game.paused?'PAUSED. Touch the pause lever to resume.':game.message).split(' ');let line='',y=125;
  for(const word of words){if(c.measureText(line+word).width>950){c.fillText(line,30,y);y+=45;line='';}line+=word+' ';}c.fillText(line,30,y);
  if(game.puzzle){c.fillStyle='#e9ca83';c.font='bold 33px Arial';c.fillText(game.puzzle.type==='demon'?`TRACE THE ${game.puzzle.shape.toUpperCase()}`:game.puzzle.type==='curse'?`POWDER ${game.puzzle.step} / ${game.puzzle.doses} DOSES`:`STEP ${game.puzzle.step+1} / 3`,30,310);}
  if(game.phase==='sanctuary'&&(!game.petAwakened||!game.pet.awakeningSeen)){c.fillStyle='#e9ca83';c.font='28px Arial';c.fillText(`${game.pet.name.toUpperCase()} SIGIL · ${game.sigilPieces} / 5 FRAGMENTS`,30,300);c.fillText('Rescue paw-marked parcels to restore the sigil.',30,343);}
  if(game.phase==='sanctuary'&&game.petAwakened&&game.pet.awakeningSeen){const pet=game.pet;c.fillStyle='#e9ca83';c.font='28px Arial';c.fillText(`${game.pet.name} · LEVEL ${game.petLevel} · SIGIL ${game.sigilPieces}/5`,30,300);c.fillText(`Fed ${pet.needs[0]} · Clean ${pet.needs[1]} · Rest ${pet.needs[2]}`,30,343);}
  if(game.puzzle?.type==='monster') {c.fillStyle='#3c5961';c.fillRect(250,290,650,35);c.fillStyle='#82a16a';c.fillRect(250+650*.35,290,650*.3,35);c.fillStyle='#fff5d9';c.fillRect(250+timing()*650,280,8,55);}
  statusTexture.needsUpdate=true;
}
function formatTime(n){const seconds=Math.ceil(n);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function timing(){return .5+Math.sin(elapsed*2.6)*.47;}
function tone(ok=true) {
  if(!sound)return;try{audio ||= new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(ok?520:160,audio.currentTime);o.frequency.exponentialRampToValueAtTime(ok?780:100,audio.currentTime+.18);g.gain.setValueAtTime(.065,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.25);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.26);}catch{}
}
function save() {try{localStorage.setItem(SAVE,JSON.stringify(game.save));storageNote='Saved on this device · progress saved between shifts';}catch{storageNote='Browser storage is blocked. Progress will last for this session only.';}}
function invoke(fn){const previous=game.phase;fn();if(game.phase==='summary'&&previous==='shift')save();sync(true);}
function start(){game.start();tone();}
function closeShift(){if(!toolsOnCounter.busy)invoke(()=>game.close());}
function togglePause(){if(game.phase==='shift'&&!toolsOnCounter.busy){game.paused=!game.paused;resetParcel();sync(true);}}
function test(type){const ok=game.test(type);if(ok&&['curse','demon'].includes(type)){resetParcel();drag=null;}tone(ok);}
function act(i){if(toolsOnCounter.busy)return;const value=timing();tone(game.act(i,value>=.35&&value<=.65));}
function goBackRoom(){game.backRoom();mawhoundTricks=false;tone();}
function sleepAndStart(){if(!['backroom','summary'].includes(game.phase))return;save();start();}
function enterSanctuary(){game.sanctuary();rebuildPets();tone();}
function care(n){game.care(0,n);mawhoundController?.react(n);save();tone();}
function menu() {
  const o=(label,run,detail='',primary=false)=>({label,run,detail,primary});
  if(game.phase==='lobby')return [o(stored?'Continue · open shift':'Open the shop',start,'A five-minute shift at the midnight counter.',true),o('Go to back room',goBackRoom,game.petAwakened?`${game.pet.name} · level ${game.petLevel}`:`Restore the sigil · ${game.sigilPieces}/5`),o('How to play',()=>showGuide())];
  if(['summary','backroom'].includes(game.phase))return [o('Touch portal bottle',enterSanctuary,'Visit your companion in the outdoor sanctuary.',true),o('Sleep in bed',sleepAndStart,'Call it a night and begin the next shift.')];
  if(game.phase==='sanctuary') {
    if(game.petAwakened&&game.pet.awakeningSeen&&mawhoundTricks)return [o('Back to care',()=>{mawhoundTricks=false;}),...(game.pet.id==='imp'?['Agree gesture','Walking','Running','Boxing practice','Play dead']:['Idle breathing','Walking','Rear-leg stand','Play bow','Curious head tilt','Happy greeting','Sniff around','Shake off']).map(name=>o(name,()=>{mawhoundController?.play(name,{loop:name==='Idle breathing'});game.message=name==='Walking'?game.pet.name+' is going for a little walk.':`${game.pet.name}: ${name}.`;}))];
    const rows=[o('Return through portal',goBackRoom,'Rest in your bed to begin the next shift.',true),...game.save.pets.filter(p=>p.id!==game.pet.id).map(p=>o('Visit '+p.name,()=>selectCompanion(p.id),'Switch companion and the sigil receiving fragments.'))];
    if(game.petAwakened&&game.pet.awakeningSeen)rows.push(o('Feed',()=>care(0)),o('Brush',()=>care(1)),o('Tuck in',()=>care(2)),o('Play',()=>care(3)),o('Pet',()=>care(4)));
    if(game.petAwakened&&game.pet.awakeningSeen&&mawhoundStatus==='ready')rows.push(o('Animations & tricks',()=>{mawhoundTricks=true;}));
    if(mawhoundStatus==='error')rows.push(o('Retry companion model',()=>ensureMawhound()));
    if(!game.save.upgrade)rows.push(o('Quick-test kit · 40 coins',()=>{game.buy('upgrade');save();}));
    if(!game.save.garden)rows.push(o('Moon garden · 60 coins',()=>{game.buy('garden');rebuildPets();save();}));
    return rows;
  }
  if(game.paused)return [o('Resume shift',togglePause,'The clock is stopped.',true)];
  if(!game.parcel)return [];
  if(game.puzzle?.type==='demon')return [o('Restart spell',()=>wardGame.cancel(),'Hold mouse button or VR trigger and trace from the gold light.')];
  if(game.puzzle?.type==='curse')return [o('Clear powder mix',()=>{if(!powderGame.busy&&!powderGame.owner)game.resetPowder();},'Hold a colored powder and release it over the parcel.')];
  if(game.puzzle){const type=game.puzzle.type;const labels=type==='chibi'?['Offer food','Hum softly','Open gently']:type==='monster'?['Close latch']:['Seal I','Seal II','Seal III'];return labels.map((l,i)=>o(l,()=>act(i),'',i===0));}
  return [o('Approve & ship',()=>toolsOnCounter.activate('stamp'),'Stamp only an ordinary parcel.',true),o('Curse powder',()=>toolsOnCounter.activate('curse'),'Spiral seal · unlimited powder'),o('Monster bait',()=>toolsOnCounter.activate('monster'),'Claw marks · unlimited bait'),o('Demon ward',()=>toolsOnCounter.activate('demon'),'Triangle eye · unlimited wards'),o('Sigil bell',()=>toolsOnCounter.activate('chibi'),'Paw print · recover a sigil fragment')];
}
function sync(force=false) {
  if(parcelId!==game.parcel?.id){parcelId=game.parcel?.id;buildParcel();}
  powderGame.sync(game.puzzle?.type==='curse'?game.puzzle:null,game.parcel?SHAPES[game.parcel.shape]:null);wardGame.sync(game.puzzle?.type==='demon'?game.puzzle:null,game.parcel?SHAPES[game.parcel.shape].depth:0);if(game.paused){powderGame.cancel();wardGame.cancel();}
  const isSanctuary=game.phase==='sanctuary';
  const isBackRoom=['summary','backroom'].includes(game.phase),mode=isSanctuary?'sanctuary':isBackRoom?'backroom':'shop';
  if(sceneMode!==mode){
    toolsOnCounter.cancel();mouseTool=null;sceneMode=mode;sanctuaryMode=isSanctuary;room.visible=mode==='shop';petRoom.visible=isSanctuary;backRoom.root.visible=isBackRoom;vrUI.visible=!isBackRoom;
    scene.background.set(isSanctuary?'#80afd3':isBackRoom?'#0b1013':'#0d1a27');scene.fog.color.copy(scene.background);scene.fog.near=isSanctuary?25:7;scene.fog.far=isSanctuary?85:20;
    hemi.color.set(isSanctuary?'#e3efff':'#7189a6');hemi.groundColor.set(isSanctuary?'#647c49':'#0a101b');hemi.intensity=isSanctuary?2.4:isBackRoom ? .55 : .65;
    sun.intensity=isSanctuary?2.4:isBackRoom ? .3 : .55;deskLight.intensity=mode==='shop'?6:0;if(isSanctuary)rebuildPets();
  }
  document.body.classList.toggle('playing',game.phase!=='lobby');
  $('phase').textContent=isSanctuary?'THE POCKET SANCTUARY':isBackRoom?'THE BACK ROOM':'THE NIGHT SHIFT';
  $('shift').textContent=String(game.save.shift-(game.phase==='summary'?1:0)).padStart(2,'0');$('timer').textContent=game.phase==='shift'?formatTime(game.time):'—';$('money').textContent=game.save.money;
  $('message').textContent=game.paused?'The clock is stopped. Take your time.':game.message;
  $('title').textContent=game.phase==='lobby'?'Welcome, custodian.':isBackRoom?'The night is yours.':isSanctuary?(game.petAwakened&&game.pet.awakeningSeen?`${game.pet.name} · Level ${game.petLevel}`:`${game.pet.name} sigil · ${game.sigilPieces}/5`):game.paused?'A moment of quiet.':game.puzzle?({curse:'Unwind the curse.',monster:'Steady your hands.',demon:'Reverse the ward.',chibi:'A fragment is calling.'}[game.puzzle.type]):game.parcel?`${SHAPES[game.parcel.shape].name} #${game.parcel.id}`:'Customer arriving…';
  $('hint').textContent=isSanctuary?(!game.petAwakened?'Five fragments restore the sigil. Paw opportunities follow a 2 / 2 / 1 shift rhythm.':!game.pet.awakeningSeen&&mawhoundStatus==='ready'?'The sigil is becoming '+game.pet.name+'…':mawhoundStatus==='loading'?'Loading '+game.pet.name+'…':mawhoundStatus==='error'?game.pet.name+' could not load. Use Retry companion model.':`${game.pet.name} is ${mawhoundController?.behaviorLabel||'watching you'}. Sigil: ${game.sigilPieces}/5 toward the next level.`):isBackRoom?'Touch the purple bottle to visit the sanctuary. Touch the bed to sleep and begin your next shift.':game.puzzle?.type==='demon'?'Parcel locked · hold mouse / VR trigger to trace the spell':game.puzzle?.type==='curse'?'Parcel locked · hold a powder with mouse/grip · release over the parcel to pour':'Hover for tool descriptions · touch/click to activate · drag parcels to inspect';
  $('save-status').textContent=storageNote||'Saves between shifts · stored on this device';
  const key=JSON.stringify([game.pet.id,game.phase,game.paused,game.parcel?.id,game.puzzle?.type,game.puzzle?.step,mawhoundStatus,mawhoundTricks,game.sigilPieces,game.petLevel,game.pet.awakeningSeen,game.save.upgrade,game.save.garden]);
  if(force||key!==lastUI){lastUI=key;options=menu();$('actions').replaceChildren();
    for(const item of options){const b=document.createElement('button');if(item.primary)b.className='primary';b.textContent=item.label;if(item.detail){const small=document.createElement('small');small.textContent=item.detail;b.appendChild(small);}b.onclick=()=>invoke(item.run);$('actions').appendChild(b);}
    $('utilities').replaceChildren();
    if(game.phase==='shift'){for(const [label,fn] of [[game.paused?'Resume':'Pause',togglePause],['Close early',closeShift],['Reset parcel',resetParcel]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>invoke(fn);$('utilities').appendChild(b);}}
    $('puzzle-progress').replaceChildren();
    if(game.puzzle){const p=document.createElement('div');p.textContent=game.puzzle.type==='demon'?`Trace the ${game.puzzle.shape} · hold mouse / VR trigger · start at the gold light`:game.puzzle.type==='curse'?`Match the splat · ${game.puzzle.step}/${game.puzzle.doses} doses · hold, move, release`:`Step ${game.puzzle.step+1} of 3 · `+({curse:'I → II → III',demon:'III → II → I',chibi:'Hum → food → open',monster:'Latch in the center zone'}[game.puzzle.type]);$('puzzle-progress').appendChild(p);if(game.puzzle.type==='monster'){const meter=document.createElement('div');meter.className='timing';const needle=document.createElement('div');needle.className='needle';meter.appendChild(needle);$('puzzle-progress').appendChild(meter);}}
    if(isSanctuary&&game.petAwakened&&game.pet.awakeningSeen){const p=document.createElement('div');p.className='pet-needs';const pet=game.pet;pet.needs.forEach((v,i)=>{const row=document.createElement('div');row.textContent=`${['Fed','Clean','Rested','Playful','Loved'][i]}: ${v}%`;p.appendChild(row);});$('puzzle-progress').appendChild(p);}
    {const p=document.createElement('div');p.textContent=`${game.pet.name} sigil: ${game.sigilPieces} / 5 · ${game.petAwakened?'restore to gain a level':'restore to awaken'}${game.phase==='shift'?' · saves at shift end':''}`;$('puzzle-progress').appendChild(p);}
    buildButtons();
  }
  writeStatus();
}
// Mouse/touch inspection and pointing.
const ray=new THREE.Raycaster(), pointer=new THREE.Vector2();let drag=null;
function pointerRay(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
renderer.domElement.addEventListener('pointerdown',e=>{if(renderer.xr.isPresenting)return;pointerRay(e);if(wardGame.active&&!game.paused&&wardGame.begin('mouse',ray)){renderer.domElement.setPointerCapture(e.pointerId);drag=null;return;}if(powderGame.active&&!game.paused&&powderGame.grab('mouse',ray)){renderer.domElement.setPointerCapture(e.pointerId);drag=null;return;}const hit=ray.intersectObjects(worldTargets)[0];if(hit){invoke(hit.object.userData.run);return;}
  if(game.phase==='shift'&&!game.paused&&!game.puzzle&&!toolsOnCounter.busy){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}
});
renderer.domElement.addEventListener('pointerleave',()=>{mouseTool=null;});
renderer.domElement.addEventListener('pointermove',e=>{if(!renderer.xr.isPresenting){pointerRay(e);if(wardGame.owner==='mouse'){wardGame.move('mouse',ray);return;}if(powderGame.owner==='mouse'){powderGame.moveMouse(ray);return;}mouseTool=ray.intersectObjects(worldTargets)[0]?.object||null;renderer.domElement.style.cursor=mouseTool?'pointer':'default';}if(drag&&!heldBy&&!game.puzzle&&!toolsOnCounter.busy){parcel.rotateOnWorldAxis(new THREE.Vector3(0,1,0),(e.clientX-drag.x)*.011);parcel.rotateOnWorldAxis(new THREE.Vector3(1,0,0),(e.clientY-drag.y)*.011);drag={x:e.clientX,y:e.clientY};}});
renderer.domElement.addEventListener('pointerup',e=>{pointerRay(e);wardGame.move('mouse',ray);wardGame.end('mouse');powderGame.release('mouse',!game.paused&&ray.intersectObject(parcel,true).length>0);drag=null;});renderer.domElement.addEventListener('pointercancel',()=>{powderGame.cancel();wardGame.cancel();drag=null;});
renderer.domElement.addEventListener('wheel',e=>{if(game.phase==='shift'&&game.parcel&&!game.puzzle&&!renderer.xr.isPresenting&&!toolsOnCounter.busy){e.preventDefault();parcel.scale.setScalar(THREE.MathUtils.clamp(parcel.scale.x-e.deltaY*.001,.8,1.65));}},{passive:false});
window.addEventListener('keydown',e=>{if($('guide').open||e.target.tagName==='BUTTON')return;if(e.code==='Space'){e.preventDefault();togglePause();}if(game.phase==='shift'&&!game.paused&&!game.puzzle&&!toolsOnCounter.busy){const k=e.key;if(k.startsWith('Arrow'))e.preventDefault();if(k==='ArrowLeft')parcel.rotateOnWorldAxis(new THREE.Vector3(0,1,0),-.2);if(k==='ArrowRight')parcel.rotateOnWorldAxis(new THREE.Vector3(0,1,0),.2);if(k==='ArrowUp')parcel.rotateOnWorldAxis(new THREE.Vector3(1,0,0),-.2);if(k==='ArrowDown')parcel.rotateOnWorldAxis(new THREE.Vector3(1,0,0),.2);if(k.toLowerCase()==='r')resetParcel();}});
let guideWasPaused=false;
function showGuide(){powderGame.cancel();wardGame.cancel();guideWasPaused=game.paused;if(game.phase==='shift')game.paused=true;$('guide').showModal();sync(true);}
$('help').onclick=showGuide;$('close-guide').onclick=()=>$('guide').close();$('guide').addEventListener('close',()=>{if(game.phase==='shift')game.paused=guideWasPaused;sync(true);});
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));tone();};
// Two controller rays, either-hand grip pickup, tracking-loss recovery.
const tempMat=new THREE.Matrix4(), direction=new THREE.Vector3(), pos=new THREE.Vector3();const controllers=[];
function controllerRay(c){c.updateWorldMatrix(true,false);tempMat.extractRotation(c.matrixWorld);ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(tempMat);}
function pulse(controller){try{controller.userData.source?.gamepad?.hapticActuators?.[0]?.pulse(.25,60);}catch{}}
for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i),grip=renderer.xr.getControllerGrip(i);rig.add(c,grip);controllers.push(c);c.userData.grip=grip;
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:'#dfc88b'}));line.scale.z=3;c.add(line);c.userData.line=line;
  ball(grip,0,0,0,.035,i===0?'#89b7c2':'#dbc28a',1,1,1.8);
  c.addEventListener('connected',e=>c.userData.source=e.data);
  c.addEventListener('disconnected',()=>{if(wardGame.owner===c)wardGame.cancel();if(powderGame.owner===c)powderGame.cancel();if(heldBy===c)resetParcel();c.userData.source=null;});
  c.addEventListener('selectstart',()=>{controllerRay(c);if(wardGame.active&&!game.paused&&wardGame.begin(c,ray)){pulse(c);return;}const hit=ray.intersectObjects(worldTargets)[0];if(hit){invoke(hit.object.userData.run);pulse(c);}});
  c.addEventListener('selectend',()=>{controllerRay(c);wardGame.move(c,ray);wardGame.end(c);});
  c.addEventListener('squeezestart',()=>{if(powderGame.active&&!game.paused){controllerRay(c);grip.getWorldPosition(pos);if(powderGame.grab(c,ray,pos))pulse(c);return;}if(game.puzzle)return;if(game.phase!=='shift'||game.paused||toolsOnCounter.busy||heldBy||!parcel.visible)return;controllerRay(c);grip.getWorldPosition(pos);if(ray.intersectObject(parcel,true).length||pos.distanceTo(parcel.getWorldPosition(direction))<.35){heldBy=c;grip.attach(parcel);parcel.position.set(0,.04,-.17);pulse(c);}});
  c.addEventListener('squeezeend',()=>{if(powderGame.owner===c){if(game.paused)powderGame.cancel();else powderGame.release(c);return;}if(heldBy===c)resetParcel();});
}
function recenter(){if(toolsOnCounter.busy)return;powderGame.cancel();wardGame.cancel();if(!renderer.xr.isPresenting){game.message='Recenter is available while wearing a VR headset.';return;}const head=renderer.xr.getCamera();head.getWorldPosition(pos);head.getWorldDirection(direction);rig.worldToLocal(pos);const yaw=Math.atan2(-direction.x,-direction.z);rig.rotation.y-=yaw;pos.applyQuaternion(rig.quaternion);rig.position.set(-pos.x,1.65-pos.y,.75-pos.z);rig.updateMatrixWorld(true);resetParcel();}
const vr=$('vr');
async function checkVR(){if(!isSecureContext){vr.textContent='VR needs HTTPS';return;}if(!navigator.xr){vr.textContent='VR needs a headset';return;}try{const supported=await navigator.xr.isSessionSupported('immersive-vr');vr.disabled=!supported;vr.textContent=supported?'Enter VR':'VR not available';}catch{vr.textContent='VR unavailable';}}
vr.onclick=async()=>{try{const current=renderer.xr.getSession();if(current){await current.end();return;}const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});await renderer.xr.setSession(session);vr.textContent='Exit VR';rig.position.set(0,0,.75);rig.rotation.set(0,0,0);session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible'&&game.phase==='shift'){game.paused=true;resetParcel();sync(true);}});}catch(e){$('error').hidden=false;$('error').textContent='Could not enter VR: '+e.message;}};
renderer.xr.addEventListener('sessionend',()=>{powderGame.cancel();wardGame.cancel();rig.position.set(0,0,0);rig.rotation.set(0,0,0);camera.position.set(0,2.05,3.1);camera.lookAt(0,1.35,-1.5);resetParcel();if(game.phase==='shift')game.paused=true;vr.textContent='Enter VR';sync(true);resize();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.phase==='shift'){game.paused=true;resetParcel();sync(true);}});
function resize(){const r=$('world').getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);}
window.addEventListener('resize',resize);resize();checkVR();sync(true);
let previous=0,uiClock=0;
renderer.setAnimationLoop(ms=>{
  const dt=previous?Math.min((ms-previous)/1000,1):0;previous=ms;
  if(!game.paused)elapsed+=dt;
  const before=game.phase;if(!toolsOnCounter.busy)game.tick(dt);if(before==='shift'&&game.phase==='summary'){save();sync(true);}
  uiClock+=dt;if(uiClock>.2){uiClock=0;sync();}
  if(game.puzzle?.type==='monster'){const needle=document.querySelector('.needle');if(needle)needle.style.left=`${timing()*100}%`;writeStatus();}
  if(parcelArtPending&&!heldBy){parcelArtPending=false;if(game.parcel)buildParcel();}
  animateDelivery();
  if(backRoom.root.visible)backRoom.update(elapsed);
  if(sanctuaryMode)outdoorSanctuary.update(elapsed);
  if(sanctuaryMode){
    const step=Math.min(dt,.05);
    if(game.petAwakened&&!game.pet.awakeningSeen&&mawhoundStatus==='ready'){
      if(revealTime<0){revealTime=0;mawhoundRoot.visible=true;mawhoundController.setAutonomous(false);mawhoundController.play('Happy greeting');}
      revealTime+=step;const revealDone=renderSigilAwakening(sigil,mawhoundController,elapsed,revealTime);
      if(revealDone){game.pet.awakeningSeen=true;sigil.root.visible=true;sigil.setAwakened(true);sigil.setPieces(game.sigilPieces);sigil.update(elapsed);mawhoundRoot.scale.setScalar(1);mawhoundController.setAutonomous(true);game.message=game.pet.name+' has awakened. Your companion is home.';save();updatePetBadge();sync(true);}
    }else sigil.update(elapsed);
    if(game.petAwakened)mawhoundController?.update(step,{camera:renderer.xr.isPresenting?renderer.xr.getCamera():camera,needs:game.pet.needs});
  }
  const toolHover=renderer.xr.isPresenting?[]:[mouseTool];
  if(renderer.xr.isPresenting){for(const c of controllers){
    if(c.userData.source){powderGame.moveGrip(c,c.userData.grip);c.userData.grip.getWorldPosition(pos);const target=backRoom.root.visible?backRoom.touch(pos):sanctuaryMode?outdoorSanctuary.touch(pos):room.visible?toolsOnCounter.touch(pos):null;if(target)toolHover.push(target);if(target&&target!==c.userData.lastTouch){invoke(target.userData.run);pulse(c);}c.userData.lastTouch=target;}
    controllerRay(c);if(!game.paused)wardGame.move(c,ray);const hit=ray.intersectObjects(worldTargets)[0];if(hit)toolHover.push(hit.object);c.userData.line.scale.z=hit?hit.distance:2.5;c.userData.line.material.color.set(hit?'#a8e6ad':'#dfc88b');}}
  if(!game.paused){powderGame.update(Math.min(dt,.05));wardGame.update(Math.min(dt,.05));}
  toolsOnCounter.setHover(toolHover);toolsOnCounter.update(Math.min(dt,.05));
  renderer.render(scene,camera);
});
window.addEventListener('error',e=>{if(e.message){$('error').hidden=false;$('error').textContent='Something went wrong: '+e.message;}});



