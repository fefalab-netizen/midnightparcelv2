import {Game,freshSave} from '../core.js';
for(const inspection of [8,12,18]){
 let parcels=0,paws=0,rescued=0;
 for(let shift=2;shift<=1001;shift++){
  const save=freshSave();save.shift=shift;const g=new Game(save);g.start();let id=null,wait=0,stage='inspect';
  while(g.phase==='shift'){
   g.tick(.1);if(g.phase!=='shift')break;if(!g.parcel)continue;
   if(g.parcel.id!==id){id=g.parcel.id;wait=inspection;stage='inspect';parcels++;if(g.parcel.type==='chibi')paws++;}
   wait-=.1;if(wait>0)continue;
   if(stage==='inspect'){if(g.parcel.type==='safe'){g.ship();continue;}g.test(g.parcel.type);stage='treat';wait=.8;}
   else if(g.puzzle){const isPaw=g.puzzle.type==='chibi',last=g.puzzle.step===2;g.act(g.puzzle.sequence[g.puzzle.step],true);if(isPaw&&last)rescued++;wait=.8;}
  }
 }
 console.log(JSON.stringify({inspectionSeconds:inspection,shifts:1000,parcelsPerShift:parcels/1000,pawsSeenPerShift:paws/1000,pawsRescuedPerShift:rescued/1000}));
}
