// Counter-clockwise silhouettes extruded along Z. Mark anchors stay on real surfaces.
const rect=(w,h)=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
export const SHAPES=[
  {name:'Carton',points:rect(.46,.37),depth:.36,label:[-.10,.025],anchors:[[.13,.11],[-.13,-.11]]},
  {name:'Flat box',points:rect(.55,.25),depth:.36,label:[-.12,.015],anchors:[[.18,.07],[-.18,-.07]]},
  {name:'Tall box',points:rect(.35,.5),depth:.34,label:[-.04,.06],anchors:[[.1,-.16],[-.1,.17]]},
  {name:'Guitar case',points:[[-.09,-.38],[.09,-.38],[.18,-.30],[.19,-.19],[.12,-.10],[.15,.01],[.11,.11],[.045,.15],[.045,.32],[.065,.35],[.065,.44],[-.065,.44],[-.065,.35],[-.045,.32],[-.045,.15],[-.11,.11],[-.15,.01],[-.12,-.10],[-.19,-.19],[-.18,-.30]],depth:.16,label:[0,-.22],anchors:[[0,.37],[0,.19],[.06,-.31],[-.065,.035]]},
  {name:'L-shaped parcel',points:[[-.28,-.27],[.28,-.27],[.28,-.07],[-.08,-.07],[-.08,.29],[-.28,.29]],depth:.24,label:[-.18,.12],anchors:[[-.18,-.19],[.16,-.17],[-.18,.24]]},
  {name:'Mailing tube',points:Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*.17,Math.sin(i*Math.PI/8)*.17]),depth:.66,label:[0,-.04],anchors:[[0,.1],[-.09,.06],[.1,.035]]},
  {name:'Triangular parcel',points:[[-.29,-.23],[.29,-.23],[0,.29]],depth:.34,label:[0,-.10],anchors:[[0,.17],[-.17,-.16],[.17,-.16]]}
];
export function markSurface(shape,seed){
  const s=SHAPES[shape],surfaces=[];
  for(const [x,y] of s.anchors)for(const side of [-1,1])surfaces.push({position:[x,y,side*(s.depth/2+.002)],normal:[0,0,side]});
  s.points.forEach(([x,y],i)=>{const [X,Y]=s.points[(i+1)%s.points.length],dx=X-x,dy=Y-y,length=Math.hypot(dx,dy);if(length<.058)return;const nx=dy/length,ny=-dx/length;surfaces.push({position:[(x+X)/2+nx*.002,(y+Y)/2+ny*.002,s.depth*.19],normal:[nx,ny,0]});});
  return surfaces[seed%surfaces.length];
}
export const MARK_SIZE=.038;
