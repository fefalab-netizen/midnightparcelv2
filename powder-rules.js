export const POWDERS=[{name:'Cyan',color:'#1accdb'},{name:'Magenta',color:'#e0248c'},{name:'Yellow',color:'#f0c414'},{name:'White',color:'#f5ebd9'}];
export function powderColor(counts){
 counts=Array.from({length:4},(_,i)=>Number.isFinite(counts?.[i])?Math.max(0,counts[i]):0);
 const total=counts.reduce((a,b)=>a+b,0);if(!total)return '#847969';
 // Pigment absorption: cyan + yellow makes green, cyan + magenta makes blue.
 const pigments=[[.10,.80,.86],[.88,.14,.55],[.94,.77,.08],[.96,.92,.85]];
 const rgb=[0,1,2].map(channel=>Math.round(255*Math.exp(counts.reduce((sum,n,i)=>sum+n*Math.log(pigments[i][channel]),0)/total)));
 return '#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function createPowderRecipe(shift,random){
 const doses=1+Math.floor((shift-1)/3),recipe=[0,0,0,0],order=[0,1,2,3];
 for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 for(let i=0;i<doses;i++)recipe[order[i<Math.min(doses,4)?i:Math.floor(random()*4)]]++;
 return {type:'curse',step:0,doses,recipe,mixed:[0,0,0,0],target:powderColor(recipe)};
}
