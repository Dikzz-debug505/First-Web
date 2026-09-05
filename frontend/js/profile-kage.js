import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js";

const canvas=document.querySelector("#profileWebgl");
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x06080b);
scene.fog=new THREE.FogExp2(0x0a0e13,.029);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);
camera.position.set(0,5.5,23);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
const world=new THREE.Group();scene.add(world);

const mat=(c,r=.8,e=0,ei=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:.02,emissive:e,emissiveIntensity:ei});
const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);world.add(o);return o};
const cyl=(a,b,h,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,10),m);o.position.set(x,y,z);world.add(o);return o};
scene.add(new THREE.HemisphereLight(0x6d7891,0x070708,.46));
const moonLight=new THREE.DirectionalLight(0x7184b2,1.12);moonLight.position.set(-15,25,-20);scene.add(moonLight);
const warm=new THREE.PointLight(0xd48b3c,4.8,22,2);warm.position.set(0,5,0);scene.add(warm);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(90,150,30,45),mat(0x101419));
ground.rotation.x=-Math.PI/2;ground.position.set(0,-.1,-35);world.add(ground);
const gp=ground.geometry.attributes.position;
for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getY(i);gp.setZ(i,Math.sin(x*.12)*.45+Math.sin(z*.07)*.35+Math.sin((x+z)*.04)*.5)}
gp.needsUpdate=true;ground.geometry.computeVertexNormals();

for(const side of[-1,1]){const m=new THREE.Mesh(new THREE.ConeGeometry(18,28,8),mat(0x0a0f15));m.position.set(side*20,9,-35);m.scale.z=1.7;world.add(m)}
const stone=mat(0x292a2c);for(let i=0;i<28;i++)box(3.6-i*.025,.18,.8,stone,0,i*.12,8-i*1.25);
for(let i=0;i<12;i++)box(6,.38,.72,mat(0x292a2c),0,1.7+i*.32,-8-i*.72);

const red=mat(0x6f1d19,.7,0x250503,.15);
function torii(z,s=1){const g=new THREE.Group();for(const x of[-2.6,2.6]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.27,.34,6*s,10),red);p.position.set(x,3*s,0);g.add(p)}
const a=new THREE.Mesh(new THREE.BoxGeometry(6.5*s,.32*s,.42*s),red);a.position.y=6*s;g.add(a);
const b=new THREE.Mesh(new THREE.BoxGeometry(5.6*s,.28*s,.38*s),red);b.position.y=5.15*s;g.add(b);g.position.z=z;world.add(g)}
torii(-4,1);torii(-18,.8);torii(-34,.62);

const wood=mat(0x191817,.92),roofMat=mat(0x111316,.78);
function temple(z){const g=new THREE.Group();
const base=new THREE.Mesh(new THREE.BoxGeometry(11,.55,6),wood);base.position.y=2.1;g.add(base);
const floor=new THREE.Mesh(new THREE.BoxGeometry(12,.3,6.8),mat(0x2b211b));floor.position.y=1.55;g.add(floor);
for(const x of[-5,-3,-1,1,3,5]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,4.7,8),wood);p.position.set(x,4.3,-2.6);g.add(p);const q=p.clone();q.position.z=2.6;g.add(q)}
const roof=new THREE.Mesh(new THREE.ConeGeometry(8,2.5,4),roofMat);roof.rotation.y=Math.PI/4;roof.scale.z=.7;roof.position.y=7;g.add(roof);
for(const x of[-3,-1,1,3]){const glow=mat(0xd49a56,.5,0xc56c28,2);const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.25,2.3),glow);panel.position.set(x,4.1,-2.91);g.add(panel)}
g.position.z=z;world.add(g)}
temple(-45);

const moon=new THREE.Mesh(new THREE.SphereGeometry(4.2,48,48),new THREE.MeshBasicMaterial({color:0xa83b30}));
moon.position.set(12,18,-58);world.add(moon);

const lanterns=[],lanternWood=mat(0x171310);
function lantern(x,z){const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,1.6,6),lanternWood);pole.position.y=.8;g.add(pole);
const body=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.5,8),mat(0x3b3027,.7,0x9d4f22,1.8));body.position.y=1.55;g.add(body);
const top=new THREE.Mesh(new THREE.ConeGeometry(.32,.16,8),lanternWood);top.position.y=1.88;g.add(top);g.position.set(x,0,z);world.add(g);lanterns.push(g)}
for(let i=0;i<22;i++)lantern(i%2?-3.8:3.8,5-i*2.5);

function tree(x,z,s=1){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(.12*s,.25*s,4*s,7),mat(0x171310));t.position.y=2*s;g.add(t);
for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.SphereGeometry((1.1-i*.15)*s,10,8),mat(0x111b18));c.scale.y=.55;c.position.set((i%2-.5)*1.4*s,3.5*s+i*.5,0);g.add(c)}g.position.set(x,0,z);world.add(g)}
for(let i=0;i<26;i++)tree((Math.random()>.5?1:-1)*(6+Math.random()*10),-2-Math.random()*62,.7+Math.random()*.8);

const rainN=1700,rp=new Float32Array(rainN*3);
for(let i=0;i<rainN;i++){rp[i*3]=(Math.random()-.5)*45;rp[i*3+1]=Math.random()*28;rp[i*3+2]=Math.random()*-75+8}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute("position",new THREE.BufferAttribute(rp,3));
world.add(new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x9aa9ba,size:.055,transparent:true,opacity:.46})));

const leafN=160,lp=new Float32Array(leafN*3),lv=[];
for(let i=0;i<leafN;i++){lp[i*3]=(Math.random()-.5)*28;lp[i*3+1]=Math.random()*16;lp[i*3+2]=Math.random()*-70;lv.push(.015+Math.random()*.035)}
const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute("position",new THREE.BufferAttribute(lp,3));
world.add(new THREE.Points(leafGeo,new THREE.PointsMaterial({color:0x9b4b2e,size:.11,transparent:true,opacity:.72})));

let scrollP=0,current=0;
function update(){const max=document.documentElement.scrollHeight-innerHeight;scrollP=max>0?scrollY/max:0;current+=(scrollP-current)*.055;
camera.position.x=Math.sin(current*Math.PI*2)*1.1;camera.position.y=5.8+Math.sin(current*Math.PI*1.5)*1.3;camera.position.z=23-current*78;
camera.rotation.y=Math.sin(current*Math.PI*2)*.035;camera.rotation.x=-.03+Math.sin(current*Math.PI)*.018;
world.rotation.y=Math.sin(current*Math.PI*2)*.025;warm.position.z=-current*45;moon.position.x=12+Math.sin(current*3)*3;
document.querySelector("#profileProgress").style.width=(scrollP*100)+"%";
const active=["about","info","tools","support"][Math.min(3,Math.max(0,Math.floor(scrollP*5)))];document.querySelectorAll("[data-profile-nav]").forEach(a=>a.classList.toggle("active",a.dataset.profileNav===active))}
addEventListener("scroll",update,{passive:true});

function particles(t){for(let i=0;i<rainN;i++){rp[i*3+1]-=.22;if(rp[i*3+1]<0){rp[i*3+1]=28;rp[i*3+2]=Math.random()*-75+8}}rainGeo.attributes.position.needsUpdate=true;
for(let i=0;i<leafN;i++){lp[i*3+1]-=lv[i];lp[i*3]+=Math.sin(t*.001+i)*.008;lp[i*3+2]+=.025;if(lp[i*3+1]<0){lp[i*3+1]=15;lp[i*3+2]=-65}}leafGeo.attributes.position.needsUpdate=true}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6))});
const clock=new THREE.Clock();function loop(){requestAnimationFrame(loop);const t=clock.getElapsedTime();particles(t*1000);lanterns.forEach((l,i)=>{const s=1+Math.sin(t*2+i)*.025;l.scale.setScalar(s)});renderer.render(scene,camera)}update();loop();
