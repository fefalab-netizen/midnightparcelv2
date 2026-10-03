import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(source,'../GitHub-Upload');
fs.mkdirSync(output,{recursive:true});
const written=new Set();
function copy(file,name=path.basename(file)){
 if(written.has(name))throw Error('Duplicate release filename: '+name);
 written.add(name);let content=fs.readFileSync(file);
 if(/\.(js|mjs|html|css)$/.test(name)){
  let text=content.toString('utf8');
  text=text.replace(/(['"`])(\.{1,2}\/[^'"`\r\n]+)\1/g,(_,quote,url)=>quote+'./'+url.slice(url.lastIndexOf('/')+1)+quote);
  if(name==='index.html')text=text.replaceAll('assets/night-desk-guide.png','night-desk-guide.png');
  content=Buffer.from(text);
 }
 fs.writeFileSync(path.join(output,name),content);
}
for(const name of fs.readdirSync(source))if(/\.(js|mjs|html|css|json)$/.test(name))copy(path.join(source,name));
for(const name of fs.readdirSync(path.join(source,'vendor')))copy(path.join(source,'vendor',name));
function assets(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())assets(file);else if(!entry.name.endsWith('.md'))copy(file);}}
assets(path.join(source,'assets'));
fs.writeFileSync(path.join(output,'.nojekyll'),'');
fs.writeFileSync(path.join(output,'UPLOAD-INSTRUCTIONS.txt'),'MIDNIGHT PARCEL SERVICE — COMPLETE GITHUB UPLOAD\n\nExtract this ZIP. Upload ALL extracted files together to the root of your MidnightParcel repository, replacing files with matching names. There are no subfolders to preserve. Keep GitHub Pages set to your publishing branch and /(root). After deployment finishes, refresh the page with Ctrl+Shift+R.\n\nBoth companions, their animations and textures, package art, shop, back room, sanctuary, and local Three.js libraries are included. No installation or build step is required.\n');
// Check release module references before creating the archive.
for(const name of written){if(!name.endsWith('.js'))continue;const text=fs.readFileSync(path.join(output,name),'utf8');for(const m of text.matchAll(/from\s*['"]\.\/([^'"]+)['"]/g))if(!fs.existsSync(path.join(output,m[1])))throw Error('Missing import in release: '+name+' -> '+m[1]);}
console.log('Created folder-free release with '+(written.size+2)+' files at '+output);
