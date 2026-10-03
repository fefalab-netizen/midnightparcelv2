// Bake the authored skin, normals, UVs, colours, texture and clips into a portable GLB.
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';import {rigMawhound} from '../mawhound-rig.js';
const source=readFileSync(new URL('../assets/models/Mawhound.glb',import.meta.url)),jsonLength=source.readUInt32LE(12),original=JSON.parse(source.toString('utf8',20,20+jsonLength)),binaryStart=28+jsonLength;
const geometry=new T.BufferGeometry();
for(const [name,id,width,Type] of [['position',0,3,Float32Array],['index',1,1,Uint32Array]]){
 const a=original.accessors[id],v=original.bufferViews[a.bufferView],offset=binaryStart+(v.byteOffset||0)+(a.byteOffset||0),array=new Type(source.buffer.slice(source.byteOffset+offset,source.byteOffset+offset+a.count*width*4));
 if(name==='index')geometry.setIndex(new T.BufferAttribute(array,1));else geometry.setAttribute(name,new T.BufferAttribute(array,width));
}
const {mesh,clips}=rigMawhound(geometry,new T.MeshBasicMaterial());
const doc={asset:{version:'2.0',generator:'Midnight Parcel Service — authored Mawhound companion rig'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],skins:[],animations:[],accessors:[],bufferViews:[],buffers:[{}],materials:[{name:'Grey violet fur',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1}}],textures:[{source:0}],images:[]};
const parts=[];let length=0;
function view(bytes){const b=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength),id=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length});parts.push(b);length+=b.length;const pad=(4-length%4)%4;if(pad){parts.push(Buffer.alloc(pad));length+=pad;}return id;}
function accessor(array,width){const id=doc.accessors.length,a={bufferView:view(array),componentType:array instanceof Float32Array?5126:array instanceof Uint16Array?5123:5125,count:array.length/width,type:({1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'})[width]};if(width===1||width===3){a.min=Array(width).fill(Infinity);a.max=Array(width).fill(-Infinity);for(let i=0;i<array.length;i++){const k=i%width;a.min[k]=Math.min(a.min[k],array[i]);a.max[k]=Math.max(a.max[k],array[i]);}}doc.accessors.push(a);return id;}
const attributes={};for(const [name,semantic] of Object.entries({position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',color:'COLOR_0',skinIndex:'JOINTS_0',skinWeight:'WEIGHTS_0'})){const a=geometry.attributes[name];attributes[semantic]=accessor(a.array,a.itemSize);}
doc.meshes.push({name:'Mawhound',primitives:[{attributes,indices:accessor(geometry.index.array,1),material:0}]});
doc.nodes.push({name:'MawhoundSkinned',mesh:0,skin:0,children:[1]});
const bones=mesh.skeleton.bones;
for(const bone of bones){const node={name:bone.name,translation:bone.position.toArray()};const children=bone.children.filter(n=>n.isBone).map(n=>bones.indexOf(n)+1);if(children.length)node.children=children;doc.nodes.push(node);}
doc.skins.push({name:'Mawhound companion skeleton',skeleton:1,joints:bones.map((_,i)=>i+1),inverseBindMatrices:accessor(new Float32Array(mesh.skeleton.boneInverses.flatMap(m=>m.toArray())),16)});
for(const clip of clips){const anim={name:clip.name,samplers:[],channels:[]};for(const track of clip.tracks){const [name,property]=track.name.split('.'),sampler=anim.samplers.length;anim.samplers.push({input:accessor(track.times,1),output:accessor(track.values,property==='quaternion'?4:3),interpolation:'LINEAR'});anim.channels.push({sampler,target:{node:bones.findIndex(b=>b.name===name)+1,path:property==='quaternion'?'rotation':property==='position'?'translation':property}});}doc.animations.push(anim);}
doc.images.push({name:'Fine fur grain',mimeType:'image/png',bufferView:view(readFileSync(new URL('../assets/models/mawhound-fur.png',import.meta.url)))});doc.buffers[0].byteLength=length;
const json=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-json.length%4)%4,32),jsonData=Buffer.concat([json,padding]),bin=Buffer.concat(parts),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonData.length+8+bin.length,8);jh.writeUInt32LE(jsonData.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
const output=new URL('../assets/models/Mawhound-game.glb',import.meta.url);writeFileSync(output,Buffer.concat([header,jh,jsonData,bh,bin]));console.log('Saved textured, skinned Mawhound GLB with',doc.animations.length,'clips;',header.readUInt32LE(8),'bytes');


