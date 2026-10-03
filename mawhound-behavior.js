// Local companion behavior: bounded waypoints, weighted choices and interruptible reactions.
// Positions are relative to the companion's table, with clearance for its body and the tablet.
export const ROAM_BOUNDS={minX:-.92,maxX:.02,minZ:-.18,maxZ:.18};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export class MawhoundBehavior {
  constructor({random=Math.random,onPlay=()=>{},durations={}}={}){
    this.bounds={...ROAM_BOUNDS};this.random=random;this.onPlay=onPlay;this.durations=durations;this.enabled=false;this.x=0;this.z=0;this.heading=0;this.state='idle';this.label='watching you';this.remaining=1;this.lastAction='';this.nonWalks=0;
  }
  setEnabled(enabled){this.enabled=enabled;if(enabled){this.remaining=.8;this.state='idle';this.onPlay('Idle breathing',true);}}
  waypoint(){
    const b=this.bounds;let x,z;
    for(let n=0;n<8;n++){x=b.minX+this.random()*(b.maxX-b.minX);z=b.minZ+this.random()*(b.maxZ-b.minZ);if(Math.hypot(x-this.x,z-this.z)>.4)break;}
    if(Math.hypot(x-this.x,z-this.z)<.3)x=this.x>(b.minX+b.maxX)/2?b.minX:b.maxX;
    this.target={x,z};this.state='turn';this.label='choosing where to explore';this.onPlay('Idle breathing',true);this.nonWalks=0;
  }
  action(name,label){this.state='action';this.label=label;this.remaining=(this.durations[name]||3)+.35;this.lastAction=name;this.nonWalks++;this.onPlay(name,false);}
  command(name){
    if(name==='Walking'){this.waypoint();return;}
    const labels={'Idle breathing':'resting','Rear-leg stand':'standing up to look at you','Play bow':'inviting you to play','Curious head tilt':'watching you curiously','Happy greeting':'wagging hello','Sniff around':'sniffing for something interesting','Shake off':'shaking out his fur'};
    this.state='manual';this.label=labels[name]||'playing';this.remaining=(this.durations[name]||4)+1.5;this.onPlay(name,name==='Idle breathing');
  }
  react(need){const names=['Sniff around','Shake off','Idle breathing','Play bow','Rear-leg stand'];this.command(names[need]||'Happy greeting');}
  choose(needs){
    if(this.nonWalks>=2||this.random()<.50){this.waypoint();return;}
    const choices=[['Sniff around','sniffing for something interesting',needs[0]<45?4:2],['Shake off','shaking out his fur',1],['Curious head tilt','watching you curiously',2],['Play bow','inviting you to play',needs[3]<45?3:1],['Rear-leg stand','standing up to look at you',needs[4]<45?3:1],['Happy greeting','wagging hello',1],['Idle breathing','taking a short rest',needs[2]<40?4:1]].filter(c=>c[0]!==this.lastAction);
    let roll=this.random()*choices.reduce((s,c)=>s+c[2],0);for(const [name,label,weight] of choices){roll-=weight;if(roll<=0){this.action(name,label);return;}}
  }
  update(dt,{needs=[55,55,55,55,55],viewer=null}={}){
    if(!this.enabled)return;dt=clamp(dt,0,.1);
    if(this.state==='turn'||this.state==='walk'){
      const dx=this.target.x-this.x,dz=this.target.z-this.z,distance=Math.hypot(dx,dz),desired=Math.atan2(dx,dz),delta=angleDelta(this.heading,desired);
      this.heading+=clamp(delta,-2.5*dt,2.5*dt);
      if(this.state==='turn'&&Math.abs(delta)<.08){this.state='walk';this.label='exploring the clearing';this.onPlay('Walking',true);}
      if(this.state==='walk'){
        const step=Math.min(distance,.23*dt);if(distance>0){this.x+=dx/distance*step;this.z+=dz/distance*step;}
        if(distance<.015){this.state='idle';this.label='taking a look around';this.remaining=.7+this.random()*1.3;this.onPlay('Idle breathing',true);}
      }
    }else{
      if(viewer){const desired=Math.atan2(viewer.x-this.x,viewer.z-this.z);this.heading+=clamp(angleDelta(this.heading,desired),-1.8*dt,1.8*dt);}
      this.remaining-=dt;if(this.remaining<=0){this.choose(needs);}
    }
    const b=this.bounds;this.x=clamp(this.x,b.minX,b.maxX);this.z=clamp(this.z,b.minZ,b.maxZ);
  }
}


