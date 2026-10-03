// Reproducible procedural fur grain: no build dependencies or remote assets.
import {deflateSync} from 'node:zlib';import {writeFileSync} from 'node:fs';
const size=512,raw=Buffer.alloc((size*4+1)*size);let seed=9127;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const strand=Math.sin(x*.75+Math.sin(y*.024)*3),grain=noise(),v=Math.round(215+strand*2+grain*18);
 const i=y*(size*4+1)+1+x*4;raw[i]=v;raw[i+1]=v;raw[i+2]=Math.min(255,v+3);raw[i+3]=255;
}
function chunk(type,data){const b=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;for(const byte of b){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);b.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
writeFileSync(new URL('../assets/models/mawhound-fur.png',import.meta.url),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

