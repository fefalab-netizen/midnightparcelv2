import * as THREE from './vendor/three.module.js';
import {celRamp} from './cel.js';

// Original faceted character. Named joint groups follow a conventional humanoid hierarchy.
// Reference: hmthanh/3d-human-model (Three.js model loading / human joint organization).
export function createCustomer(){
  const root=new THREE.Group();root.name='NightCustomer';
  const palette={skin:'#a6a4b5',shadow:'#79768e',light:'#beb9c9',hair:'#474451',suit:'#393344',lapel:'#51475f',shirt:'#c1bcc9',tie:'#82658f',shoe:'#25222f',ink:'#3b334a',eye:'#dbd4da',iris:'#696079'};
  const materials={};for(const [key,color]of Object.entries(palette))materials[key]=new THREE.MeshToonMaterial({color,gradientMap:celRamp,side:THREE.DoubleSide,emissive:color,emissiveIntensity:key==='skin'||key==='light'?.075:.025});
  function joint(parent,name,x,y,z){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,materials[mat]);m.position.set(x,y,z);parent.add(m);return m;}
  function oval(parent,mat,x,y,z,rx,ry,rz,segments=12){const m=mesh(parent,new THREE.SphereGeometry(1,segments,8),mat,x,y,z);m.scale.set(rx,ry,rz);return m;}
  function segment(parent,mat,length,r1,r2,z=0){return mesh(parent,new THREE.CylinderGeometry(r1,r2,length,8),mat,0,-length/2,z);}
  function facet(parent,mat,vertices,triangles){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex(triangles);g.computeVertexNormals();return mesh(parent,g,mat);}
  function patch(parent,mat,points){const triangles=[];for(let i=1;i<points.length-1;i++)triangles.push(0,i,i+1);return facet(parent,mat,points,triangles);}
  function line(parent,points,color='ink',radius=.002){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(parent,new THREE.TubeGeometry(curve,Math.max(2,points.length*2),radius,4,false),color);}
  // Ring lofts form connected silhouettes for the head, jacket and trousers.
  function loft(parent,mat,rings,sides=12){const vertices=[],indices=[];for(const [y,rx,rz,offset=0]of rings)for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2;vertices.push([Math.sin(a)*rx,y,Math.cos(a)*rz+offset]);}
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){const a=r*sides+i,b=r*sides+(i+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
    for(let i=1;i<sides-1;i++){indices.push(0,i+1,i);const last=(rings.length-1)*sides;indices.push(last,last+i,last+i+1);}return facet(parent,mat,vertices,indices);}
  const hips=joint(root,'Hips',0,.89,0);
  loft(hips,'suit',[[-.10,.17,.10],[.08,.185,.115],[.18,.17,.11]]);
  const chest=joint(hips,'Spine',0,.23,0);
  loft(chest,'suit',[[-.18,.17,.11],[-.02,.18,.125],[.17,.24,.135],[.28,.27,.125],[.32,.22,.105],[.36,.085,.065]]);
  patch(chest,'shirt',[[-.105,.315,.125],[0,-.095,.143],[.105,.315,.125]]);
  patch(chest,'shirt',[[-.066,.35,.10],[-.105,.315,.126],[.105,.315,.126],[.066,.35,.10]]);
  patch(chest,'lapel',[[-.10,.33,.129],[-.225,.245,.113],[-.155,.185,.152],[-.205,.12,.145],[0,-.13,.143],[-.06,.19,.15]]);
  patch(chest,'lapel',[[.10,.33,.129],[.06,.19,.15],[0,-.13,.143],[.205,.12,.145],[.155,.185,.152],[.225,.245,.113]]);
  patch(chest,'light',[[-.075,.34,.132],[-.10,.265,.15],[-.025,.21,.166],[0,.30,.163]]);
  patch(chest,'shirt',[[.075,.34,.132],[0,.30,.163],[.025,.21,.166],[.10,.265,.15]]);
  patch(chest,'tie',[[0,.287,.17],[-.027,.25,.174],[0,.21,.178],[.027,.25,.174]]);
  patch(chest,'tie',[[0,.224,.177],[-.018,.184,.169],[-.028,.026,.154],[0,-.015,.154],[.028,.026,.154],[.018,.184,.169]]);
  line(chest,[[-.011,.205,.18],[-.012,.11,.168],[-.01,.04,.16]],'lapel',.0015);
  line(chest,[[-.19,.04,.132],[-.095,.04,.15]],'ink',.0025);
  for(const y of [-.05,-.125])oval(chest,'ink',.028,y,.139,.009,.009,.005,8);
  segment(joint(chest,'Neck',0,.435,0),'skin',.10,.066,.074);
  const head=joint(chest,'Head',0,.54,.008);
  loft(head,'skin',[[-.17,.044,.061,.015],[-.15,.071,.079,.012],[-.10,.101,.083,.005],[-.04,.116,.089,0],[.035,.12,.095,0],[.09,.126,.1,-.002],[.15,.12,.103,-.006],[.195,.081,.078,-.015],[.21,.025,.026,-.015]],16);
  // Cheek and temple planes make the face gaunt rather than round.
  for(const side of [-1,1]){
    oval(head,'skin',side*.126,-.007,-.008,.024,.050,.021,8);
    oval(head,'shadow',side*.133,-.006,.010,.011,.030,.007,8);
    patch(head,'light',[[side*.105,.003,.051],[side*.073,-.015,.102],[side*.035,-.045,.107],[side*.09,-.065,.063]]);
    patch(head,'shadow',[[side*.104,-.030,.065],[side*.065,-.070,.091],[side*.085,-.110,.064]]);
    const eyeX=side*.055;
    oval(head,'shadow',eyeX,.039,.086,.040,.029,.014);
    oval(head,'eye',eyeX,.039,.097,.028,.018,.010);
    oval(head,'iris',eyeX-side*.003,.040,.106,.012,.014,.006);
    oval(head,'ink',eyeX-side*.003,.040,.111,.005,.009,.002,8);
    oval(head,'light',eyeX-.004,.046,.113,.0027,.003,.0015,8);
    line(head,[[eyeX-.029,.039,.104],[eyeX-.011,.057,.109],[eyeX+.012,.057,.106],[eyeX+.028,.04,.101]],'shadow',.003);
    line(head,[[eyeX-.025,.024,.099],[eyeX,.013,.103],[eyeX+.025,.023,.098]],'shadow',.0025);
    const brow=oval(head,'hair',eyeX,.078,.09,.039,.008,.013,8);brow.rotation.z=side*.16;
    line(head,[[side*.016,.063,.105],[side*.010,.084,.101],[side*.012,.099,.095]],'shadow',.002);
    line(head,[[side*.029,-.039,.111],[side*.046,-.067,.099],[side*.045,-.095,.087]],'shadow',.0024);
  }
  // Angular projecting nose, nostrils, tight mouth and squared chin.
  facet(head,'skin',[[-.016,.063,.094],[.016,.063,.094],[-.019,-.025,.112],[.019,-.025,.112],[0,-.012,.157],[0,.043,.12],[0,-.041,.122]],[0,5,4,0,4,2,5,1,4,1,3,4,2,4,6,4,3,6]);
  for(const side of [-1,1])oval(head,'shadow',side*.015,-.030,.124,.008,.004,.005,8);
  line(head,[[-.041,-.093,.087],[-.019,-.086,.102],[0,-.086,.107],[.022,-.087,.101],[.041,-.095,.088]],'ink',.0028);
  oval(head,'light',0,-.109,.087,.033,.009,.010);
  patch(head,'light',[[-.043,-.137,.064],[0,-.155,.075],[.043,-.137,.064],[.033,-.119,.081],[-.033,-.119,.081]]);
  // Dark swept hair with an uneven hairline, asymmetry and a few broad combed locks.
  const hair=mesh(head,new THREE.SphereGeometry(1,14,6,0,Math.PI*2,0,Math.PI*.49),'hair',0,.128,-.015);hair.scale.set(.13,.106,.118);hair.rotation.z=-.12;
  for(let i=0;i<5;i++){const lock=oval(head,'hair',-.071+i*.035,.169-i*.004,.079+i*.002,.056,.018,.018,8);lock.rotation.z=.24-i*.055;}
  patch(head,'hair',[[-.122,.155,.02],[-.121,.052,.024],[-.104,.083,.070],[-.083,.169,.087]]);
  patch(head,'hair',[[.122,.151,.020],[.090,.169,.089],[.11,.090,.062],[.121,.055,.02]]);
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const leg=joint(hips,side<0?'LeftUpLeg':'RightUpLeg',side*.10,-.03,0);segment(leg,'suit',.38,.09,.07);
    const knee=joint(leg,side<0?'LeftLeg':'RightLeg',0,-.38,0);segment(knee,'suit',.37,.073,.052);
    const foot=joint(knee,side<0?'LeftFoot':'RightFoot',0,-.39,.035);oval(foot,'shoe',0,-.012,.041,.068,.053,.135);
    legs.push({leg,knee});
    const shoulder=joint(chest,side<0?'LeftArm':'RightArm',side*.258,.245,0);oval(shoulder,'suit',0,-.042,0,.090,.108,.101);segment(shoulder,'suit',.275,.078,.058);
    const elbow=joint(shoulder,side<0?'LeftForeArm':'RightForeArm',0,-.275,0);segment(elbow,'suit',.25,.058,.045);segment(joint(elbow,'Cuff',0,-.242,0),'shirt',.030,.046,.046);
    const hand=joint(elbow,side<0?'LeftHand':'RightHand',0,-.28,0);oval(hand,'skin',0,-.033,0,.039,.052,.024);
    for(let i=0;i<4;i++){const finger=oval(hand,'skin',-.023+i*.015,-.080-(i===1||i===2?.008:0),.006,.007,.031,.01,8);finger.rotation.x=-.14;}
    const thumb=oval(hand,'skin',-side*.039,-.025,.01,.013,.032,.016,8);thumb.rotation.z=-side*.55;
    arms.push({shoulder,elbow,side});
  }
  function animate(t,{walking=false,carrying=false,handoff=0}={}){
    const gait=walking?Math.sin(t*8.6):0;
    hips.position.y=.89+(walking?Math.abs(Math.sin(t*8.6))*.016:Math.sin(t*1.7)*.003);
    chest.rotation.z=walking?gait*.016:0;head.rotation.y=carrying?Math.sin(t*.8)*.028:Math.sin(t*.55)*.05;head.rotation.x=handoff*.12;
    legs.forEach(({leg,knee},i)=>{const stride=gait*(i?1:-1);leg.rotation.x=stride*.30;knee.rotation.x=walking?Math.max(0,-stride)*.34:0;});
    arms.forEach(({shoulder,elbow,side})=>{shoulder.rotation.x=carrying?-.28-handoff*.2:gait*side*.24;shoulder.rotation.z=carrying?-.15*side:.035*side;elbow.rotation.x=carrying?-1.16+handoff*.25:-.12;});
  }
  return {root,head,animate};
}
