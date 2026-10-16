import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRButton} from "three/addons/webxr/VRButton.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {VRMLoaderPlugin,VRMUtils} from "@pixiv/three-vrm";
import {POSES,EXPR,roleFor,poseFor,boneName} from "./poses.js?v=2";
if(/[?&]emu\b/.test(location.search)){try{const m=await import("https://esm.sh/iwer@2");const d=new m.XRDevice(m.metaQuest3);d.installRuntime({forceInstall:true});window.xrDev=d}catch(e){console.warn("emulator failed",e)}}
const WORKER="https://grokchan-api.kampfguy.workers.dev",CHAR="kanya",SPEAKER=6,NAME="Kanya-Chan",ACC="#ff5fa2";
const $=id=>document.getElementById(id),log=window.vrLog=[];const L=(...a)=>{log.push(a.join(" "));console.log("[vr]",...a)};
// ---------- renderer / scene ----------
const cv=$("c"),renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:"high-performance",stencil:false});
const QUEST=/OculusBrowser|Quest/i.test(navigator.userAgent);renderer.setPixelRatio(Math.min(devicePixelRatio,QUEST?1:1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.xr.enabled=true;renderer.xr.setFramebufferScaleFactor(QUEST?0.8:0.9);renderer.shadowMap.enabled=false;renderer.xr.setFoveation(1);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1a1520);
const cam=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.05,60);cam.position.set(0,1.45,0.35);
const rig=new THREE.Group();rig.add(cam);scene.add(rig);
scene.add(new THREE.HemisphereLight(0xfff4ec,0x3a2c38,1.5));const sun=new THREE.DirectionalLight(0xffe6c8,1.6);sun.position.set(-1.5,3,1.5);scene.add(sun);
// curved classroom backdrop (one draw call) + floor + blob shadow
const tex=new THREE.TextureLoader().load("bg-classroom.jpg",t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;t.generateMipmaps=true});
const R=5.5,arc=2.3,back=new THREE.Mesh(new THREE.CylinderGeometry(R,R,R*arc/(16/9),48,1,true,Math.PI-arc/2,arc),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,toneMapped:false}));
back.position.set(0,R*arc/(16/9)/2-0.35,0);back.scale.x=-1;scene.add(back);
const floor=new THREE.Mesh(new THREE.CircleGeometry(R,48),new THREE.MeshLambertMaterial({color:0x5e4330}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const bc=document.createElement("canvas");bc.width=bc.height=128;{const g=bc.getContext("2d"),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,"rgba(0,0,0,.55)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,128,128)}
const blob=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(bc),transparent:true,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.position.set(0,0.005,-1.2);scene.add(blob);
const orbit=new OrbitControls(cam,cv);orbit.target.set(0.3,1.25,-1.1);orbit.enableDamping=true;orbit.minDistance=0.6;orbit.maxDistance=4;orbit.update();
addEventListener("resize",()=>{if(renderer.xr.isPresenting)return;renderer.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
// ---------- character ----------
let vrm=null,bones={},NP={},headB=null,neckB=null;const lookT=new THREE.Object3D();scene.add(lookT);
const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
loader.load("grokchan.vrm",g=>{vrm=g.userData.vrm;VRMUtils.removeUnnecessaryVertices?.(g.scene);VRMUtils.combineSkeletons?.(g.scene);VRMUtils.rotateVRM0(vrm);
 vrm.scene.position.set(0,0,-1.2);vrm.scene.traverse(o=>{o.frustumCulled=false;o.castShadow=o.receiveShadow=false});scene.add(vrm.scene);
 const all=new Set();for(const P of Object.values(POSES))for(const k in P)all.add(boneName(k));
 for(const n of all){const b=vrm.humanoid.getNormalizedBoneNode(n);if(b)bones[n]=b}
 for(const n in POSES)NP[n]=poseFor(CHAR,n);headB=bones.head||vrm.humanoid.getNormalizedBoneNode("head");neckB=bones.neck;
 if(vrm.lookAt)vrm.lookAt.target=lookT;$("st").textContent="online";window.vrReady=true;L("model ready")},
 p=>{if(p.total)$("st").textContent="loading "+Math.round(p.loaded/p.total*100)+"%"},e=>{$("st").textContent="model failed";L("model error",e)});
// ---------- chat panel (canvas texture) ----------
const PW=1024,PH=1280,pc=document.createElement("canvas");pc.width=PW;pc.height=PH;const pg=pc.getContext("2d");
const ptex=new THREE.CanvasTexture(pc);ptex.colorSpace=THREE.SRGBColorSpace;ptex.anisotropy=4;
const panel=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.775),new THREE.MeshBasicMaterial({map:ptex,transparent:true,toneMapped:false}));
panel.position.set(0.78,1.38,-0.95);panel.rotation.y=-0.55;scene.add(panel);
const msgs=[];let draft="",statusTxt="";
function rr(x,y,w,h,r){pg.beginPath();pg.roundRect(x,y,w,h,r)}
function runs(line){const out=[];const re=/(\*\*[^*]+\*\*|\*[^*]+\*)/g;let i=0,m;while((m=re.exec(line))){if(m.index>i)out.push([line.slice(i,m.index),""]);const t=m[0];out.push(t.startsWith("**")?[t.slice(2,-2),"b"]:[t.slice(1,-1),"i"]);i=m.index+t.length}if(i<line.length)out.push([line.slice(i),""]);return out}
function font(st,sz){return `${st==="i"?"italic ":""}${st==="b"?"700 ":"400 "}${sz}px Inter, "Noto Sans JP", sans-serif`}
function layout(text,maxW,sz){const lines=[];for(let para of text.split(/\n/)){let bullet=/^\s*([-*•]|\d+[.)])\s+/.exec(para);if(bullet)para="• "+para.slice(bullet[0].length);
  if(!para.trim()){lines.push([]);continue}let cur=[],w=0;
  for(const [t,st] of runs(para)){pg.font=font(st,sz);for(const tok of t.split(/(\s+)/)){if(!tok)continue;const tw=pg.measureText(tok).width;
   if(w+tw>maxW&&w>0&&tok.trim()){lines.push(cur);cur=[];w=0}if(!cur.length&&!tok.trim())continue;
   if(tw>maxW){for(const ch of tok){const cw=pg.measureText(ch).width;if(w+cw>maxW){lines.push(cur);cur=[];w=0}cur.push([ch,st,cw]);w+=cw}}else{cur.push([tok,st,tw]);w+=tw}}}
  lines.push(cur)}return lines}
function drawPanel(){pg.clearRect(0,0,PW,PH);rr(0,0,PW,PH,48);pg.fillStyle="rgba(20,16,27,.86)";pg.fill();pg.strokeStyle="rgba(255,255,255,.12)";pg.lineWidth=3;pg.stroke();
 pg.fillStyle="#fff";pg.font=font("b",44);pg.fillText(NAME,48,84);pg.fillStyle=statusTxt?ACC:"#3ddc84";pg.font=font("",30);pg.fillText(statusTxt||"online",48,128,PW-96);
 pg.fillStyle="rgba(255,255,255,.08)";pg.fillRect(40,156,PW-80,2);
 const sz=34,lh=46,maxW=PW-200;const blocks=[];
 for(const m of msgs){const lines=layout(m.text,maxW,sz);blocks.push({m,lines,h:lines.length*lh+36})}
 if(draft){const lines=layout(draft+"▌",maxW,sz);blocks.push({m:{role:"draft"},lines,h:lines.length*lh+36})}
 let y=PH-160;for(let k=blocks.length-1;k>=0&&y>180;k--){const b=blocks[k];y-=b.h+18;const user=b.m.role!=="assistant";
  const bw=Math.min(maxW+40,Math.max(...b.lines.map(l=>l.reduce((a,r)=>a+r[2],0)),60)+40),x=user?PW-48-bw:48;
  rr(x,y,bw,b.h,28);pg.fillStyle=b.m.role==="draft"?"rgba(255,255,255,.08)":user?ACC:"rgba(255,255,255,.1)";pg.fill();
  let ly=y+18+sz;for(const l of b.lines){let lx=x+20;for(const [t,st,w] of l){pg.font=font(st,sz);pg.fillStyle=st==="b"?"#fff":st==="i"?"#e6dcef":"#ece8f1";if(user)pg.fillStyle="#fff";pg.fillText(t,lx,ly);lx+=w}ly+=lh}}
 // header mask
 pg.save();pg.globalCompositeOperation="destination-out";pg.fillStyle="#000";pg.fillRect(0,158,PW,0);pg.restore();
 drawButtons();ptex.needsUpdate=true}
// ---------- buttons (in-panel strip at bottom, raycast via UV) ----------
const BTN=[{id:"kbd",label:"Keyboard"},{id:"mic",label:"Speak"},{id:"mute",label:"Mute"},{id:"recenter",label:"Recentre"}];let hover=null,muted=false,micOn=false;
function drawButtons(){const n=BTN.length,gap=16,w=(PW-96-gap*(n-1))/n,y=PH-130,h=90;BTN.forEach((b,i)=>{b.rect=[48+i*(w+gap),y,w,h];
 const dis=false;rr(...b.rect,26);pg.fillStyle=(b.id==="mute"&&muted)||(b.id==="mic"&&micOn)?ACC:hover===b.id?"rgba(255,255,255,.22)":"rgba(255,255,255,.1)";pg.fill();
 pg.fillStyle=dis?"rgba(255,255,255,.3)":"#fff";pg.font=font("b",32);pg.textAlign="center";pg.fillText(b.id==="mute"&&muted?"Unmute":b.id==="mic"&&micOn?"Listening…":b.label,b.rect[0]+w/2,y+57);pg.textAlign="left"})}
function btnAt(uv){if(!uv)return null;const x=uv.x*PW,y=(1-uv.y)*PH;return BTN.find(b=>b.rect&&x>=b.rect[0]&&x<=b.rect[0]+b.rect[2]&&y>=b.rect[1]&&y<=b.rect[1]+b.rect[3])?.id||null}
function press(id){L("button",id);unlockAudio();
 if(id==="kbd")openKeyboard();
 else if(id==="mic")toggleMic();
 else if(id==="mute"){muted=!muted;audio.muted=muted;drawPanel()}
 else if(id==="recenter")recenter()}
// controllers
const ray=new THREE.Raycaster(),tmpM=new THREE.Matrix4();const ctrls=[0,1].map(i=>{const c=renderer.xr.getController(i);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0xff9bc8,transparent:true,opacity:.7}));line.scale.z=3;c.add(line);c.userData.line=line;
 c.addEventListener("selectstart",()=>{const h=hitPanel(c);if(h)press(h)});rig.add(c);return c});
function hitPanel(c){tmpM.identity().extractRotation(c.matrixWorld);ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(tmpM);
 const h=ray.intersectObject(panel)[0];c.userData.line.scale.z=h?h.distance:3;return h?btnAt(h.uv):null}
// mouse / touch on the panel outside VR
cv.addEventListener("click",e=>{if(renderer.xr.isPresenting)return;const v=new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(v,cam);const h=ray.intersectObject(panel)[0];if(h){const b=btnAt(h.uv);if(b)press(b)}});
function recenter(){if(renderer.xr.isPresenting){const xc=renderer.xr.getCamera(),p=new THREE.Vector3();xc.getWorldPosition(p);
  const e=new THREE.Euler().setFromQuaternion(xc.getWorldQuaternion(new THREE.Quaternion()),"YXZ");rig.rotation.y-=e.y;rig.position.x-=p.x;rig.position.z-=p.z-0.0}
 else{cam.position.set(0.3,1.45,1.0);orbit.target.set(0.3,1.25,-1.1);orbit.update()}}
// ---------- input: keyboard + speech ----------
let SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;window.vrCaps={xr:null,speech:!!SR};$("mic").hidden=false;
let rec=null,srFails=0,noteT=0;
function note(msg,sec=6){statusTxt=msg;$("st").textContent=msg;clearTimeout(noteT);noteT=setTimeout(()=>{if(statusTxt===msg)setStatus("")},sec*1000);drawPanel()}
function typeFallback(why){L("speech fallback",why);micOn=false;$("mic").classList.remove("on");
 const vr=renderer.xr.isPresenting;note(why+(vr?" — use Keyboard (or exit VR to type)":" — type your message below"),8);
 if(!vr){const q=$("q");q.value=draft;q.focus()}else{openKeyboard()}}
function openKeyboard(){const q=$("q");q.value=draft;try{q.focus({preventScroll:true});q.click?.()}catch{}
 // Quest browser may not raise its system keyboard during an immersive session; prompt() is the reliable fallback there
 if(renderer.xr.isPresenting)setTimeout(()=>{if(renderer.xr.isPresenting){let t=null;try{t=prompt("Message Kanya-Chan:",draft)}catch{}if(t&&t.trim()){draft="";q.value="";send(t.trim())}}},400)}
function toggleMic(){if(micOn){try{rec?.stop()}catch{}return}
 if(!SR||srFails>=2){typeFallback(SR?"Voice input keeps failing":"Voice input isn't supported in this browser");return}
 try{rec=new SR()}catch(e){SR=null;typeFallback("Voice input unavailable");return}
 rec.lang="en-US";rec.interimResults=true;rec.maxAlternatives=1;let got=false,failed=false;
 rec.onresult=e=>{got=true;let t="";for(const r of e.results)t+=r[0].transcript;draft=t;drawPanel();if(e.results[e.results.length-1].isFinal){const q=draft.trim();draft="";if(q)send(q)}};
 rec.onerror=e=>{L("speech error",e.error);failed=true;if(e.error==="no-speech"){note("Didn't hear anything — try again",4);return}
  if(e.error==="aborted")return;srFails++;if(e.error==="not-allowed"||e.error==="service-not-allowed")srFails=2;
  typeFallback({"not-allowed":"Microphone permission denied","service-not-allowed":"Voice input blocked","network":"Voice service unreachable","audio-capture":"No microphone found"}[e.error]||("Voice input error: "+e.error))};
 rec.onend=()=>{const was=micOn;micOn=false;$("mic").classList.remove("on");if(was&&!got&&!failed)note("Didn't catch that — try again or use Keyboard",5);if(statusTxt==="listening…")setStatus("");drawPanel()};
 micOn=true;$("mic").classList.add("on");note("listening…",15);
 try{rec.start()}catch(e){L("speech start",e.message);srFails++;typeFallback("Couldn't start voice input")}}
$("mic").onclick=toggleMic;
$("q").addEventListener("input",()=>{draft=$("q").value;drawPanel()});
$("f").onsubmit=e=>{e.preventDefault();const q=$("q").value.trim();$("q").value="";draft="";$("q").blur();if(q)send(q)};
// ---------- audio + lip-sync ----------
const audio=new Audio();audio.crossOrigin="anonymous";audio.setAttribute("playsinline","");let actx=null,an=null,abuf=null,talkUntil=0,speaking=false,mouth=0;
function unlockAudio(){try{if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)();const src=actx.createMediaElementSource(audio);an=actx.createAnalyser();an.fftSize=512;abuf=new Uint8Array(an.fftSize);src.connect(an);an.connect(actx.destination)}if(actx.state!=="running")actx.resume()}catch(e){L("audio",e.message)}}
addEventListener("pointerdown",unlockAudio,{once:true,capture:true});
function level(){if(!an||!speaking)return 0;an.getByteTimeDomainData(abuf);let s=0;for(const v of abuf){const d=(v-128)/128;s+=d*d}return Math.min(1,Math.sqrt(s/abuf.length)*5)}
// ---------- chat ----------
let hist=[],talkPose=null,busy=false,curURL=null;
function freeAudio(){if(curURL){try{audio.pause()}catch{}audio.removeAttribute("src");audio.load?.();URL.revokeObjectURL(curURL);curURL=null}}
function setStatus(s){statusTxt=s;$("st").textContent=s||"online";drawPanel()}
function splitJa(r){const m=r.match(/<ja>([\s\S]*?)(?:<\/ja>|$)/i);let en=r,ja="";if(m){ja=m[1];en=r.slice(0,m.index)+r.slice(m.index+m[0].length)}
 return{en:en.replace(/<\/?ja>?/gi,"").trim(),ja:ja.replace(/<[^>]*>?/g,"").replace(/[*_~`#<>]+/g,"").replace(/[\p{Extended_Pictographic}\uFE0F\u200d]/gu,"").trim()}}
const pw=()=>localStorage.getItem("gc_pw")||"";
async function send(q){unlockAudio();msgs.push({role:"user",text:q});if(msgs.length>30)msgs.splice(0,msgs.length-30);if(hist.length>40)hist.splice(0,hist.length-40);hist.push({role:"user",content:q});setStatus("typing…");
 try{const r=await fetch(WORKER+"/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":pw()},body:JSON.stringify({messages:hist.slice(-20),character:CHAR})});
  const o=await r.json();if(r.status===401){msgs.pop();hist.pop();setStatus("");showGate(true);return}if(!r.ok)throw new Error(o.error||r.status);
  hist.push({role:"assistant",content:o.reply});const sp=splitJa(o.reply);L("reply",sp.en.length,"ja",sp.ja.length);
  const show=()=>{msgs.push({role:"assistant",text:sp.en});drawPanel()};
  if(muted||!sp.ja){show();talk(Math.min(6,Math.max(3,sp.en.length*0.05)));setStatus("");return}
  setStatus("typing…");const t0=performance.now();
  try{const a=await fetch(WORKER+"/tts",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":pw()},body:JSON.stringify({text:sp.ja,speaker:SPEAKER})});
   if(!a.ok||!/audio/.test(a.headers.get("content-type")||""))throw new Error("tts "+a.status);
   const b=await a.blob();freeAudio();audio.src=curURL=URL.createObjectURL(b);L("tts ok",b.size,Math.round(performance.now()-t0)+"ms");
   audio.onplaying=()=>{show();speaking=true;talk(Infinity);setStatus("speaking…");window.vrSpoke=true};
   audio.onended=()=>{speaking=false;talkUntil=0;setStatus("");freeAudio()};await audio.play()}
  catch(e){L("tts fail",e.message);freeAudio();speaking=false;show();talk(Math.min(6,Math.max(3,sp.en.length*0.05)));setStatus("")}}
 catch(e){msgs.push({role:"assistant",text:"*(connection problem: "+e.message+")*"});setStatus("")}}
function talk(sec){talkUntil=sec===Infinity?Infinity:performance.now()/1000+sec;talkPose=Math.random()<0.5?roleFor(CHAR,"talkA"):roleFor(CHAR,"talkB");window.vrTalkPose=talkPose}
// ---------- gate ----------
function showGate(bad){$("gate").hidden=false;$("gerr").hidden=!bad;$("pw").value=pw();setTimeout(()=>$("pw").focus(),50)}
$("gf").onsubmit=e=>{e.preventDefault();const v=$("pw").value.trim();if(!v)return;localStorage.setItem("gc_pw",v);$("gate").hidden=true;unlockAudio()};
// PW_DISABLED if(!pw())showGate();
// ---------- XR button ----------
navigator.xr?.isSessionSupported?.("immersive-vr").then(ok=>{window.vrCaps.xr=ok;L("xr supported",ok)}).catch(()=>{window.vrCaps.xr=false});
if(!navigator.xr){window.vrCaps.xr=false}
const vb=VRButton.createButton(renderer,{optionalFeatures:["local-floor","bounded-floor"]});$("xrslot").append(vb);
renderer.xr.addEventListener("sessionstart",()=>{L("session start");rig.position.set(0,0,0);cam.position.set(0,0,0);unlockAudio()});
renderer.xr.addEventListener("sessionend",()=>{cam.position.set(0.3,1.45,1.0);orbit.update()});
// ---------- animate ----------
const clock=new THREE.Clock(),Z0=[0,0,0],tv=new THREE.Vector3(),hq=new THREE.Quaternion(),hp=new THREE.Vector3(),dv=new THREE.Vector3();let th=0,nextBlink=2,blinkT=-1;
drawPanel();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),0.1),t=clock.elapsedTime;
 if(!renderer.xr.isPresenting)orbit.update();
 if(renderer.xr.isPresenting)for(const c of ctrls){const h=hitPanel(c);if(h!==hover&&c===ctrls[1]){hover=h;drawPanel()}}
 if(vrm){const now=performance.now()/1000,talking=now<talkUntil;th+=((talking?1:0)-th)*Math.min(1,dt*12);
  const idle=roleFor(CHAR,"idle"),A=NP[idle]||{},C=NP[talkPose||roleFor(CHAR,"talkA")]||{};
  for(const k in bones){const a=A[k]||Z0,c=C[k]||Z0;bones[k].rotation.set(a[0]+(c[0]-a[0])*th,a[1]+(c[1]-a[1])*th,a[2]+(c[2]-a[2])*th)}
  const br=Math.sin(t*1.6);if(bones.chest)bones.chest.rotation.x+=br*0.02;if(bones.leftUpperArm)bones.leftUpperArm.rotation.z+=br*0.015;if(bones.rightUpperArm)bones.rightUpperArm.rotation.z-=br*0.015;
  // look at the user's head (eyes via VRM lookAt, plus a clamped head turn)
  const xc=renderer.xr.isPresenting?renderer.xr.getCamera():cam;xc.getWorldPosition(tv);lookT.position.copy(tv);
  if(headB){headB.getWorldPosition(hp);const d=dv.copy(tv).sub(hp);const yaw=Math.max(-0.6,Math.min(0.6,Math.atan2(d.x,d.z))),pitch=Math.max(-0.35,Math.min(0.35,-Math.atan2(d.y,Math.hypot(d.x,d.z))));
   headB.rotation.y+=yaw*0.55;headB.rotation.x+=pitch*0.55;if(neckB){neckB.rotation.y+=yaw*0.25;neckB.rotation.x+=pitch*0.25}}
  const em=vrm.expressionManager,set=(n,v)=>em?.getExpression(n)&&em.setValue(n,v);
  if(t>nextBlink&&blinkT<0)blinkT=0;let b=0;if(blinkT>=0){blinkT+=dt;b=Math.sin(Math.min(1,blinkT/0.15)*Math.PI);if(blinkT>=0.15){blinkT=-1;nextBlink=t+2+Math.random()*3}}set("blink",b);
  const lv=speaking?level():talking?(0.3+0.3*Math.sin(t*18)):0;mouth+=(lv-mouth)*Math.min(1,dt*18);set("aa",mouth*0.9);set("oh",mouth*0.25);
  set("happy",talking?0.25:0.08);
  vrm.update(dt)}
 renderer.render(scene,cam)});
window.vrSend=send;
