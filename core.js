import {createPowderRecipe,POWDERS} from './powder-rules.js?v=0.13.3';
import { SHAPES } from './shapes.js';
export const TYPES = ['safe', 'curse', 'monster', 'demon', 'chibi'];
export const DELIVERY_TIME=3.2, VISIT_TIME=7.2;
// Ordinary categories retain their relative weights; paw parcels use the shift schedule below.
export function parcelType(roll){return roll<43/96?'safe':roll<64/96?'curse':roll<82/96?'monster':'demon';}
export const CLUES = { safe: 'Ordinary paper and tape. Check every face.', curse: 'A spiral seal in violet ink.', monster: 'Three deep claw scratches.', demon: 'An angular eye inside a triangle.', chibi: 'A little paw print with four toes.' };
export function mawhound(level=1,needs=[55,55,55,55,55]){return {name:'Mawhound',level,needs};}
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const SIGIL_PARTS=5;
export function pawSchedule(shift){return shift%3===0?[100]:[45,155];}
export const PETS=[{id:'imp',name:'Cardboard Imp'},{id:'otty',name:'Otty'},{id:'mawhound',name:'Mawhound'}];
function petRecord(spec){return {...spec,level:1,needs:[55,55,55,55,55],sigilFragments:0,awakeningSeen:false};}
export function freshSave(){return {version:5,mawhoundRewardUnlocked:false,selectedPet:'imp',shift:1,money:0,pets:PETS.map(petRecord),upgrade:false,garden:false,best:0};}
export function validateSave(raw){
 if(!raw||![1,2,3,4,5].includes(raw.version)||!Number.isInteger(raw.shift)||raw.shift<1||raw.shift>100000||!Number.isFinite(raw.money)||raw.money<0||raw.money>1e9||!Array.isArray(raw.pets)||raw.pets.length>1000)throw Error('Invalid save');
 const value=freshSave();Object.assign(value,{shift:raw.shift,money:raw.money,best:Number.isFinite(raw.best)?Math.max(0,raw.best):0,upgrade:raw.upgrade===true,garden:raw.garden===true});
 for(const pet of value.pets){
  const old=raw.version>=4?raw.pets.find(p=>p?.id===pet.id):pet.id==='mawhound'?raw.pets[0]:null;
  if(!old)continue;
  const legacyLevel=raw.version===1?1+raw.pets.length:(Number.isSafeInteger(old.level)?Math.max(1,old.level):1);
  const fragments=raw.version>=4?old.sigilFragments:raw.version===3?raw.sigilFragments:legacyLevel-1;
  pet.sigilFragments=Number.isSafeInteger(fragments)?Math.max(0,Math.min(1e6,fragments)):0;
  pet.level=Math.max(1,Math.floor(pet.sigilFragments/SIGIL_PARTS));
  pet.awakeningSeen=pet.sigilFragments>=SIGIL_PARTS&&(raw.version>=4?old.awakeningSeen:raw.awakeningSeen)===true;
  pet.needs=Array.from({length:5},(_,i)=>Math.round(Math.max(0,Math.min(100,Number(old.needs?.[i])||0))));
 }
 value.mawhoundRewardUnlocked=raw.version>=5&&raw.mawhoundRewardUnlocked===true;
 value.selectedPet=raw.version>=4&&PETS.some(p=>p.id===raw.selectedPet)?raw.selectedPet:'imp';if(value.selectedPet==='mawhound'&&!value.mawhoundRewardUnlocked)value.selectedPet='otty';return value;
}
export class Game {
  constructor(save = freshSave()) { this.save = validateSave(save); this.phase = 'lobby'; this.paused = false; this.message = 'The midnight delivery is here. Your first shift awaits.'; this.time = 300; this.serial = 0; this.parcel = null; this.puzzle = null; }
  get pet(){return this.save.pets.find(p=>p.id===this.save.selectedPet);}
  get availablePets(){return this.save.pets.filter(p=>p.id!=='mawhound'||this.save.mawhoundRewardUnlocked);}
  selectPet(id){if(!['lobby','sanctuary','backroom','summary'].includes(this.phase)||!this.availablePets.some(p=>p.id===id))return false;this.save.selectedPet=id;this.message=this.pet.name+' sigil selected. Rescued fragments now restore this companion.';return true;}
  start() {
    if (!['lobby', 'sanctuary', 'summary', 'backroom'].includes(this.phase)) return;
    this.rng = random(this.save.shift * 9127); this.phase = 'shift'; this.paused = false; this.time = 300; this.serial = 0; this.correct = 0; this.wrong = 0; this.earned = 0; this.fragmentsEarned = 0; this.pawOpportunities=0; this.puzzle = null;
    this.parcel=null;this.batchRemaining=0;this.delivery=null;this.visit=0;this.beginDelivery();
  }
  beginDelivery(){this.delivery={id:++this.visit,elapsed:0,count:1+Math.floor(this.rng()*3),arrived:false};this.message='The door is opening. A customer has a delivery for you.';}
  createParcel(){
    const roll=this.rng();
    const introductory=this.save.shift===1&&this.serial<4;
    const due=pawSchedule(this.save.shift)[this.pawOpportunities];
    let type=introductory?TYPES[this.serial]:parcelType(roll);
    if(!introductory&&due!==undefined&&300-this.time>=due){type='chibi';this.pawOpportunities++;}
    this.serial++;
    return {id:`${this.save.shift}-${this.serial}`,type,face:Math.floor(this.rng()*256),shape:Math.floor(this.rng()*SHAPES.length),tint:this.rng(),confirmed:false};
  }
  next() {
    this.puzzle = null;
    if(this.batchRemaining>0){this.batchRemaining--;this.parcel=this.createParcel();}
    else{this.parcel=null;if(!this.delivery)this.beginDelivery();}
  }
  spend(dt){this.time=Math.max(0,this.time-Math.max(0,dt));if(!this.time)this.close();}
  tick(dt) {
    if(this.phase!=='shift'||this.paused)return;
    this.spend(dt);if(this.phase!=='shift')return;
    if(this.delivery){const d=this.delivery;d.elapsed+=Math.max(0,dt);
      if(!d.arrived&&d.elapsed>=DELIVERY_TIME){d.arrived=true;this.batchRemaining=d.count;this.next();this.message=`Customer delivered ${d.count} parcel${d.count===1?'':'s'}. Inspect every surface, including the small edges.`;}
      if(d.elapsed>=VISIT_TIME){this.delivery=null;if(!this.parcel)this.beginDelivery();}
    }
  }
  test(type) {
    if (this.phase !== 'shift' || this.paused || !this.parcel || this.puzzle || !TYPES.includes(type) || type === 'safe') return;
    this.spend(this.save.upgrade ? 3 : 6); if (this.phase !== 'shift') return;
    if (type !== this.parcel.type) { this.message = 'No reaction. That test cost time. Inspect another face.'; return false; }
    this.parcel.confirmed = true;
    const sequence = type === 'curse' ? [0, 1, 2] : type === 'demon' ? [2, 1, 0] : type === 'chibi' ? [1, 0, 2] : [0, 0, 0];
    this.puzzle = type==='curse'?createPowderRecipe(this.save.shift,this.rng):type==='demon'?{type,step:0,shape:['triangle','star','square'][Math.floor(this.rng()*3)]}:{ type, step: 0, sequence };
    this.message = { curse: 'Match the color splat. Hold a powder, move it over the parcel, and release to pour.', monster: 'MONSTER confirmed. Close three latches while the needle is in the center zone.', demon: 'DEMON confirmed. Hold and trace the glowing spell in front of the parcel, starting at the gold light.', chibi: 'SIGIL FRAGMENT confirmed. Soothe its echo: hum → offer food → open gently.' }[type];
    return true;
  }
  ensurePuzzle(){
    const p=this.puzzle;if(!p)return;
    if(p.type==='demon'&&!['triangle','star','square'].includes(p.shape))p.shape='triangle';
    if(p.type==='curse'){
      const validCounts=v=>Array.isArray(v)&&v.length===4&&v.every(n=>Number.isInteger(n)&&n>=0);
      if(!validCounts(p.recipe)||!validCounts(p.mixed)||!Number.isInteger(p.doses)||p.doses<1||p.doses>3||typeof p.target!=='string'||p.recipe.reduce((a,b)=>a+b,0)!==p.doses||p.mixed.reduce((a,b)=>a+b,0)!==p.step||p.step>=p.doses){
        this.puzzle=createPowderRecipe(this.save.shift,this.rng);this.message='Match the color splat. Hold a powder, move over the parcel, and release to pour.';
      }
    }
  }
  pourPowder(index){
    this.ensurePuzzle();
    if(this.phase!=='shift'||this.paused||this.puzzle?.type!=='curse'||!Number.isInteger(index)||index<0||index>3)return;
    const p=this.puzzle,name=POWDERS[index].name;
    if(p.mixed[index]>=p.recipe[index]){
      p.feedback=p.recipe[index]===0?name+' is not part of this recipe.':name+' is already complete. Choose another color.';
      p.feedbackTone='wrong';this.message=p.feedback+' Your correct powders are kept.';return false;
    }
    p.mixed[index]++;p.step++;p.feedbackTone='correct';p.feedback='Correct: '+name+'! '+p.step+' / '+p.doses+' powders matched.';
    if(p.step===p.doses){this.resolve(true);this.message='Color matched! The curse is lifted. +10 coins.';return true;}
    this.message=p.feedback+' Add another color to finish the mixture.';return true;
  }
  resetPowder(){if(this.phase==='shift'&&!this.paused&&this.puzzle?.type==='curse'){this.puzzle.mixed=[0,0,0,0];this.puzzle.step=0;this.puzzle.feedback='Mix cleared. Try a color to check it.';this.puzzle.feedbackTone='neutral';this.message=this.puzzle.feedback;}}

  completeWard(puzzle){if(this.phase!=='shift'||this.paused||this.puzzle!==puzzle||puzzle?.type!=='demon')return false;this.resolve(true);return true;}
  act(index, inZone = false) {
    if (this.phase !== 'shift' || this.paused || !this.puzzle || ['curse','demon'].includes(this.puzzle.type)) return;
    const p = this.puzzle;
    if (index !== p.sequence[p.step] || (p.type === 'monster' && !inZone)) { this.spend(4); if (this.phase === 'shift') this.message = 'The ward slipped. Four seconds lost; try this step again.'; return false; }
    p.step++;
    if (p.step === p.sequence.length) this.resolve(true);
    else this.message = `Good. ${p.step} of 3 steps complete.`;
    return true;
  }
  ship() { if (this.phase === 'shift' && !this.paused && this.parcel && !this.puzzle) this.resolve(this.parcel.type === 'safe'); }
  get petLevel(){return Math.max(1,Math.floor(this.fragmentTotal/SIGIL_PARTS));}
  get fragmentTotal(){return this.pet.sigilFragments+(this.phase==='shift'?(this.fragmentsEarned||0):0);}
  get sigilPieces(){if(!this.pet.awakeningSeen&&this.fragmentTotal>=SIGIL_PARTS)return SIGIL_PARTS;const n=this.fragmentTotal%SIGIL_PARTS;return n===0&&this.phase==='shift'&&this.fragmentsEarned>0?SIGIL_PARTS:n;}
  get petAwakened(){return this.pet.sigilFragments>=SIGIL_PARTS;}
  resolve(ok) {
    if (ok) {
      this.correct++; this.earned += 10;
      if (this.parcel.type === 'chibi') this.fragmentsEarned++;
      this.message = this.parcel.type === 'chibi' ? (this.fragmentTotal<=SIGIL_PARTS?`Sigil fragment restored: ${this.sigilPieces}/${SIGIL_PARTS}. ${this.sigilPieces===SIGIL_PARTS?'Your companion will awaken when you return to the sanctuary.':''} +10 coins. Saves at shift end.`:(this.fragmentTotal%SIGIL_PARTS===0?`Sigil restored! ${this.pet.name} reaches level ${this.petLevel} when the shift closes. +10 coins.`:`${this.pet.name} sigil: ${this.fragmentTotal%SIGIL_PARTS}/${SIGIL_PARTS} toward the next level. +10 coins. Saves at shift end.`)) : 'Parcel resolved safely. +10';
    } else { this.wrong++; this.earned -= 15; this.message = 'An afflicted parcel slipped through. −15. Inspect every face.'; }
    const resultMessage=this.message;
    this.next();
    this.message=resultMessage;
  }
  close() {
    if (this.phase !== 'shift') return;
    this.phase = 'summary'; this.paused = false; this.parcel = null; this.puzzle = null;this.delivery=null;this.batchRemaining=0;
    this.save.money = Math.max(0, this.save.money + this.earned);
    this.save.best = Math.max(this.save.best, this.correct);
    this.save.pets.forEach(p => p.needs = p.needs.map(n => Math.max(0, n - 12)));
    this.pet.sigilFragments+=this.fragmentsEarned; this.pet.level=this.petLevel; this.save.shift++;
    this.message = `Shift complete: ${this.correct} safe resolutions, ${this.wrong} mistakes, ${this.fragmentsEarned} sigil fragments. ${this.pet.name} sigil: ${this.sigilPieces}/${SIGIL_PARTS}.${this.petAwakened?` ${this.pet.name} level ${this.petLevel}.`:''} Net ${this.earned >= 0 ? '+' : ''}${this.earned} coins.`;
  }
  backRoom() { if (['lobby','summary','sanctuary','backroom'].includes(this.phase)) { this.phase='backroom'; this.message='Touch the purple bottle to visit the sanctuary, or touch the bed to sleep and begin your next shift.'; } }
  sanctuary() { if (['summary', 'lobby', 'backroom'].includes(this.phase)) { this.phase = 'sanctuary'; this.message = this.petAwakened?(this.pet.awakeningSeen?`${this.pet.name} is level ${this.petLevel}. Restore his sigil again to gain a level: ${this.sigilPieces}/${SIGIL_PARTS} fragments.`:'The five fragments are together. Your companion is awakening…'):`${this.pet.name} sleeps within a broken sigil: ${this.sigilPieces}/${SIGIL_PARTS} pieces restored. Rescue paw-marked parcels to rebuild it.`; } }
  care(index, need) { if (this.phase !== 'sanctuary' || !this.petAwakened || !this.pet || need < 0 || need > 4) return; this.pet.needs[need] = Math.min(100, this.pet.needs[need] + 25); this.message = `${this.pet.name} loved that. Care is always free.`; }
  buy(key) { const cost = key === 'upgrade' ? 40 : key === 'garden' ? 60 : Infinity; if (this.phase !== 'sanctuary' || this.save[key] || this.save.money < cost) { this.message = 'Not enough coins, or already owned. Basic tools and care are always free.'; return false; } this.save.money -= cost; this.save[key] = true; this.message = key === 'upgrade' ? 'Quick-test kit installed: tests now take 3 seconds.' : 'Your sanctuary has a little moon garden.'; return true; }
}
