import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,freshSave,validateSave,random,parcelType,DELIVERY_TIME,VISIT_TIME } from '../core.js';
import { SHAPES,markSurface,MARK_SIZE } from '../shapes.js';
function ready(g){for(let i=0;i<4&&!g.parcel&&g.phase==='shift';i++)g.tick(DELIVERY_TIME);assert.ok(g.parcel);return g;}
function started(){const g=new Game();g.start();return ready(g);}
function solve(g,type){ready(g);if(type)g.parcel.type=type;if(g.parcel.type==='safe')g.ship();else{assert.equal(g.test(g.parcel.type),true);for(const n of [...g.puzzle.sequence])g.act(n,true);}}
test('customer arrives with 1-3 parcels, then leaves',()=>{const g=new Game();g.start();assert.equal(g.parcel,null);const count=g.delivery.count;assert.ok(count>=1&&count<=3);g.tick(DELIVERY_TIME-.1);assert.equal(g.parcel,null);g.tick(.2);assert.ok(g.parcel);assert.equal(g.batchRemaining,count-1);g.tick(VISIT_TIME);assert.equal(g.delivery,null);});
test('no tools can resolve a parcel before it arrives',()=>{const g=new Game();g.start();g.ship();g.test('curse');assert.equal(g.serial,0);assert.equal(g.time,300);});
test('processing a whole batch schedules a new customer without duplicating deliveries',()=>{const g=started();const count=g.delivery.count;for(let i=0;i<count;i++)solve(g,'safe');assert.equal(g.parcel,null);g.tick(VISIT_TIME);assert.equal(g.delivery.id,2);assert.equal(g.parcel,null);g.tick(DELIVERY_TIME);assert.ok(g.parcel);assert.equal(g.correct,count);});
test('pause freezes customer, clock and actions',()=>{const g=new Game();g.start();g.paused=true;g.tick(30);g.ship();assert.equal(g.time,300);assert.equal(g.delivery.elapsed,0);g.paused=false;ready(g);g.paused=true;const time=g.time,id=g.parcel.id;g.tick(20);g.ship();g.test('curse');assert.equal(g.time,time);assert.equal(g.parcel.id,id);});
test('wrong test spends time without charging coins or animating the visitor forward',()=>{const g=started();g.parcel.type='safe';const time=g.time,elapsed=g.delivery.elapsed;assert.equal(g.test('curse'),false);assert.equal(g.time,time-6);assert.equal(g.delivery.elapsed,elapsed);assert.equal(g.earned,0);});
test('all treatment types resolve and chibis are rescued',()=>{const g=started();for(const type of ['safe','curse','monster','demon','chibi'])solve(g,type);assert.equal(g.correct,5);assert.equal(g.fragmentsEarned,1);assert.equal(g.sigilPieces,1);assert.equal(g.mawhoundAwakened,false);assert.equal(g.earned,50);});
test('wrong seal and mistimed latches are recoverable',()=>{const g=started();g.parcel.type='curse';g.test('curse');assert.equal(g.act(2),false);assert.equal(g.puzzle.step,0);for(const i of [0,1,2])g.act(i);ready(g);g.parcel.type='monster';g.test('monster');assert.equal(g.act(0,false),false);for(let i=0;i<3;i++)g.act(0,true);assert.equal(g.correct,2);});
test('shipping a threat penalizes and bank cannot go negative',()=>{const g=started();g.parcel.type='demon';g.ship();g.close();assert.equal(g.wrong,1);assert.equal(g.earned,-15);assert.equal(g.save.money,0);});
test('expiry during test or delivery cancels everything cleanly',()=>{for(const arriving of [true,false]){const g=arriving?new Game():started();if(arriving)g.start();g.time=1;if(arriving)g.tick(10);else g.test('curse');assert.equal(g.phase,'summary');assert.equal(g.parcel,null);assert.equal(g.delivery,null);assert.equal(g.puzzle,null);assert.equal(g.save.shift,2);}});
test('closing a shift settles only once and preserves the pet',()=>{const g=started();solve(g,'chibi');g.close();g.close();assert.equal(g.save.money,10);assert.equal(g.save.pets.length,1);assert.equal(g.save.shift,2);});
test('unfinished shift replays the same delivery and parcel from its checkpoint',()=>{const g=started();const original={...g.parcel};solve(g);assert.equal(g.save.money,0);const retry=new Game(g.save);retry.start();ready(retry);assert.deepEqual(retry.parcel,original);});
test('care is free, capped and survives save validation',()=>{const g=started();g.save.sigilFragments=4;solve(g,'chibi');g.close();g.sanctuary();for(let i=0;i<10;i++)g.care(0,0);g.tick(999);assert.equal(g.phase,'sanctuary');assert.equal(g.save.money,10);assert.equal(validateSave(JSON.parse(JSON.stringify(g.save))).pets[0].needs[0],100);});
test('upgrades only charge once and reduce test time',()=>{const s=freshSave();s.money=100;const g=new Game(s);g.sanctuary();assert.equal(g.buy('upgrade'),true);assert.equal(g.buy('upgrade'),false);assert.equal(g.save.money,60);g.start();ready(g);const time=g.time;g.test('curse');assert.equal(g.time,time-3);});
test('corrupt save is rejected, malformed creature values sanitized',()=>{assert.throws(()=>validateSave({}));assert.throws(()=>validateSave({...freshSave(),money:NaN}));const s=freshSave();s.pets=[{hue:2,needs:[-10,200,NaN]}];assert.deepEqual(validateSave(s).pets[0].needs,[0,100,0,0,0]);});
test('seven shapes are generated; marks use finite outward unit normals',()=>{assert.equal(SHAPES.length,7);assert.ok(MARK_SIZE<.04);const g=started(),seen=new Set();for(let i=0;i<300;i++)seen.add(g.createParcel().shape);assert.equal(seen.size,7);for(let i=0;i<SHAPES.length;i++)for(let seed=0;seed<256;seed++){const s=markSurface(i,seed);assert.ok(s.position.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...s.normal)-1)<1e-8);}});

test('fragments settle once and survive reload; unfinished fragments roll back',()=>{const g=started();solve(g,'chibi');solve(g,'chibi');assert.equal(g.sigilPieces,2);assert.match(g.message,/fragment restored/);assert.equal(new Game(g.save).sigilPieces,0);g.close();g.close();assert.equal(g.save.pets.length,1);assert.equal(new Game(JSON.parse(JSON.stringify(g.save))).sigilPieces,2);});
test('old rescued collection migrates to earned sigil fragments',()=>{const s={...freshSave(),version:1,pets:[{name:'A',needs:[20,40,60,80,100]},{name:'B',needs:[40,60,80,100,20]}]};const migrated=validateSave(s);assert.equal(migrated.version,3);assert.equal(migrated.pets.length,1);assert.equal(migrated.sigilFragments,2);assert.deepEqual(migrated.pets[0].needs,[30,50,70,90,60]);assert.deepEqual(validateSave(migrated),migrated);});
test('shipping a paw parcel does not grant a fragment',()=>{const g=started();g.parcel.type='chibi';g.ship();g.close();assert.equal(g.sigilPieces,0);});

test('five fragments unlock Mawhound at settlement; later pieces refill the sigil',()=>{const g=started();g.save.sigilFragments=4;assert.equal(g.mawhoundAwakened,false);solve(g,'chibi');assert.equal(g.sigilPieces,5);assert.equal(g.mawhoundAwakened,false);g.close();assert.equal(g.mawhoundAwakened,true);assert.equal(g.save.awakeningSeen,false);g.save.awakeningSeen=true;g.sanctuary();g.start();ready(g);solve(g,'chibi');g.close();assert.equal(g.sigilPieces,1);assert.equal(validateSave(g.save).awakeningSeen,true);assert.equal(g.save.pets[0].level,1);});
test('locked companion cannot be cared for and invalid reveal state is sanitized',()=>{const g=new Game();g.sanctuary();g.care(0,0);assert.equal(g.save.pets[0].needs[0],55);assert.equal(validateSave({...freshSave(),sigilFragments:NaN,awakeningSeen:true}).awakeningSeen,false);});
test('version 2 levels convert to fragments without changing coins, shift or upgrades',()=>{const old={...freshSave(),version:2,shift:9,money:240,upgrade:true,pets:[{name:'Mawhound',level:8,needs:[70,80,90,60,50]}]};const s=validateSave(old);assert.equal(s.sigilFragments,7);assert.equal(s.awakeningSeen,false);assert.equal(s.money,240);assert.equal(s.shift,9);assert.equal(s.upgrade,true);assert.deepEqual(validateSave(s),s);assert.deepEqual(s.pets[0].needs,old.pets[0].needs);});
test('closing immediately does not award scheduled fragments',()=>{const g=new Game();g.start();g.close();assert.equal(g.sigilPieces,0);});
test('three full shifts deliver 2, 2, 1 earned fragments across inspection speeds',()=>{
 for(const seconds of [8,12,18])for(const upgrade of [false,true]){
  const save=freshSave();save.upgrade=upgrade;const g=new Game(save),counts=[];
  for(let shift=0;shift<3;shift++){
   g.start();let id=null,wait=0,stage='inspect',seen=0;
   while(g.phase==='shift'){
    g.tick(.1);if(g.phase!=='shift')break;if(!g.parcel)continue;
    if(g.parcel.id!==id){id=g.parcel.id;wait=seconds;stage='inspect';if(g.parcel.type==='chibi')seen++;}
    wait-=.1;if(wait>0)continue;
    if(stage==='inspect'){if(g.parcel.type==='safe'){g.ship();continue;}g.test(g.parcel.type);stage='treat';wait=.8;}
    else if(g.puzzle){g.act(g.puzzle.sequence[g.puzzle.step],true);wait=.8;}
   }
   counts.push(seen);g.sanctuary();
  }
  assert.deepEqual(counts,[2,2,1]);assert.equal(g.sigilPieces,5);assert.equal(g.mawhoundAwakened,true);
 }
});

test('every five additional fragments grants exactly one level and resets the sigil',()=>{const saved=freshSave();saved.sigilFragments=5;saved.awakeningSeen=true;const g=new Game(saved);assert.equal(g.mawhoundLevel,1);assert.equal(g.sigilPieces,0);g.start();for(let i=0;i<5;i++)solve(g,'chibi');assert.equal(g.mawhoundLevel,2);assert.equal(g.sigilPieces,5);g.close();g.close();assert.equal(g.mawhoundLevel,2);assert.equal(g.sigilPieces,0);assert.equal(g.save.pets[0].level,2);g.sanctuary();g.start();for(let i=0;i<7;i++)solve(g,'chibi');g.close();assert.equal(g.mawhoundLevel,3);assert.equal(g.sigilPieces,2);const reloaded=new Game(JSON.parse(JSON.stringify(g.save)));assert.equal(reloaded.mawhoundLevel,3);assert.equal(reloaded.sigilPieces,2);assert.equal(reloaded.save.awakeningSeen,true);});
