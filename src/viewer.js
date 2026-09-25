import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBedrockModel } from './bedrock.js';
import { YsmControllerRuntime, controllerAnimationNames } from './ysm-controller.js';
import { YsmSkeleton } from './skeleton.js';
import { YsmAnimationPlayer, createYsmAnimationContext, advanceYsmPhysics, evaluateMolang } from './ysm-animation.js';
import { encodeApng } from './apng.js';
import { DEFAULT_MODEL_BASE } from './model-config.js';

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}

async function loadLegacyTexture(url) {
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  const bitmap=await createImageBitmap(await response.blob());
  const scanCanvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(bitmap.width,bitmap.height):Object.assign(document.createElement('canvas'),{width:bitmap.width,height:bitmap.height});
  const scanContext=scanCanvas.getContext('2d',{willReadFrequently:true});
  scanContext.drawImage(bitmap,0,0);
  const pixels=scanContext.getImageData(0,0,bitmap.width,bitmap.height).data;
  let hasTranslucency=false;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0&&pixels[i]<255){hasTranslucency=true;break;}
  const texture=new THREE.Texture(bitmap);
  texture.flipY=false;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;
  texture.needsUpdate=true;
  return {texture,hasTranslucency};
}

export class ModelViewer {
  constructor(canvas, viewport, onTime) {
    this.canvas=canvas; this.viewport=viewport; this.onTime=onTime;
    this.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.speed=1; this.time=0; this.elapsedTime=0; this.active=false; this.animationName='idle';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(32,1,0.01,100);
    this.controls=new OrbitControls(this.camera,canvas);
    // Match the reference viewer: rotation and dragging stop immediately.
    this.controls.enableDamping=false;
    // The reference viewer handles wheel input itself: normalize the browser
    // delta mode, clamp one event's step, then scale camera distance by 1.15.
    // Disable OrbitControls' own wheel handling so the zoom is only applied once.
    this.controls.enableZoom=false;
    this.controls.minDistance=0.5; this.controls.maxDistance=20;
    this.onWheel=event=>{
      event.preventDefault();
      const unit=event.deltaMode===1?1/3:event.deltaMode===2?1:1/100;
      const exponent=THREE.MathUtils.clamp(event.deltaY*unit,-4,4);
      const distance=THREE.MathUtils.clamp(this.controls.getDistance()*Math.pow(1.15,exponent),0.5,20);
      const offset=this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(distance);
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    };
    canvas.addEventListener('wheel',this.onWheel,{passive:false});
    this.controls.autoRotateSpeed=1.3; this.controls.maxPolarAngle=Math.PI*0.92;
    this.grid=new THREE.GridHelper(16,64,0xd3bfd3,0xe3d5e2);
    this.grid.material.transparent=true; this.grid.material.opacity=0.5;
    this.grid.position.y=-0.035; this.scene.add(this.grid);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x8d728d,2.8));
    const light=new THREE.DirectionalLight(0xffffff,1.8); light.position.set(-3,7,5); this.scene.add(light);
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(viewport);
    this.lastTime=0; this.tick=this.tick.bind(this);
  }

  async load() {
    const source=this.fileMap;
    this.time=0;this.elapsedTime=0;
    const [model, animation, extraAnimation, metadata, controllerData] = await Promise.all([
      source ? source.model.text().then(JSON.parse) : loadJson(`${DEFAULT_MODEL_BASE}models/main.json`),
      source?.animation ? source.animation.text().then(JSON.parse) : (source ? Promise.resolve({animations:{}}) : loadJson(`${DEFAULT_MODEL_BASE}animations/main.animation.json`)),
      source?.extraAnimation ? source.extraAnimation.text().then(JSON.parse) : (source ? Promise.resolve({animations:{}}) : loadJson(`${DEFAULT_MODEL_BASE}animations/extra.animation.json`).catch(()=>({animations:{}}))),
      source?.metadata ? source.metadata.text().then(JSON.parse) : loadJson(`${DEFAULT_MODEL_BASE}ysm.json`).catch(()=>({})),
      source ? Promise.resolve({}) : loadJson(`${DEFAULT_MODEL_BASE}controller/main_controllers.json`).catch(()=>({})),
    ]);
  const variants=textureSources(source,metadata,DEFAULT_MODEL_BASE);
    this.textureVariants=(await Promise.all(variants.map(async entry=>{
      let objectUrl;
      try{
        const url=entry.file?(objectUrl=URL.createObjectURL(entry.file)):entry.url;
        return {...entry,...await loadLegacyTexture(url)};
      }catch(error){console.warn(`Could not load texture ${entry.label}:`,error);return null;}
      finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
    }))).filter(Boolean);
    if(!this.textureVariants.length)throw new Error('模型包中没有可加载的贴图');
    const preferred=String(metadata.properties?.default_texture||'').trim().toLowerCase();
    const selectedByName=this.textureVariants.find(entry=>[entry.id,entry.label,entry.path].some(value=>String(value||'').toLowerCase()===preferred));
    const declaredTexture=metadata.files?.player?.texture;
    const firstDeclared=Array.isArray(declaredTexture)?declaredTexture[0]:declaredTexture;
    const declaredPath=typeof firstDeclared==='string'?firstDeclared:firstDeclared?.uv;
    const declaredKey=String(declaredPath||'').replaceAll('\\','/').replace(/^\/+/, '').toLowerCase();
    const selectedByDeclaration=this.textureVariants.find(entry=>String(entry.path||'').replaceAll('\\','/').toLowerCase()===declaredKey);
    const selected=selectedByName||selectedByDeclaration||this.textureVariants[0];
    this.currentTextureId=selected.id;
    // The original asset is unlit pixel artwork, so retain its authored colors.
    this.material=new THREE.MeshLambertMaterial({map:selected.texture,side:THREE.FrontSide,alphaTest:0.99,transparent:false,depthWrite:true});
    // YSM keeps depth writes enabled in its blended alpha pass. Disabling
    // them here lets translucent rear bone surfaces leak through front seams.
    this.translucentMaterial=new THREE.MeshLambertMaterial({map:selected.texture,side:THREE.FrontSide,alphaTest:0.1,transparent:true,depthWrite:true});
    this.translucentMaterial.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\n#ifdef USE_ALPHATEST\nif ( diffuseColor.a >= 0.99 ) discard;\n#endif');
    };
    this.translucentMaterial.visible=selected.hasTranslucency;
    this.root=buildBedrockModel({bedrockModel:model['minecraft:geometry'][0]},[this.material,this.translucentMaterial]);
    installGpuSkinning(this.material,this.root.userData.boneTexture);
    installGpuSkinning(this.translucentMaterial,this.root.userData.boneTexture);
    this.bones=this.root.userData.bones; this.animations={...(animation.animations||{}),...(extraAnimation.animations||{})};
    this.skeleton=new YsmSkeleton(this.root.userData.skeletonBones);
    this.animationPlayer=new YsmAnimationPlayer(this.skeleton);
    this.animationContext=createYsmAnimationContext();
    this.bindAnimationContext(this.animationContext);
    const controllers=controllerData.animation_controllers||{};
    this.parallelController=controllers['player.parallel_0']||null;
    this.preParallelController=controllers['player.pre_parallel_0']||null;
    // YSM's folder schema places properties at the document root. Also accept
    // older metadata-wrapped exports so plugin options are not silently lost.
    const props=metadata.properties||metadata.metadata?.properties||{};
    this.customAnimationSlots=props.extra_animation&&typeof props.extra_animation==='object'?props.extra_animation:{};
    this.customAnimationGroups=Array.isArray(props.extra_animation_classify)?props.extra_animation_classify:[];
    this.customAnimationButtons=Array.isArray(props.extra_animation_buttons)?props.extra_animation_buttons:[];
    const slotNames=new Set();
    const collectSlotNames=value=>{if(typeof value==='string')slotNames.add(value);else if(Array.isArray(value))value.forEach(collectSlotNames);else if(value&&typeof value==='object')Object.entries(value).forEach(([key,item])=>{slotNames.add(key);collectSlotNames(item);});};
    collectSlotNames(this.customAnimationSlots);
    this.extraAnimationNames=new Set([...slotNames].filter(name=>Object.hasOwn(this.animations,name)));
    this.previewAnimationName=typeof props.preview_animation==='string'?props.preview_animation.trim():'';
    this.disablePreviewRotation=isYsmFlagEnabled(props.disable_preview_rotation??props.disablePreviewRotation);
    const widthScale=Number.isFinite(Number(props.width_scale))?Number(props.width_scale):0.7;
    const heightScale=Number.isFinite(Number(props.height_scale))?Number(props.height_scale):0.7;
    // IGeoRenderer applies height_scale to X/Z and width_scale to Y.
    this.modelScale=new THREE.Vector3(heightScale,widthScale,heightScale);
    this.rootPose=new THREE.Matrix4().makeScale(this.modelScale.x,this.modelScale.y,this.modelScale.z);
    this.controllerRuntime=new YsmControllerRuntime(new Map());
    this.scene.add(this.root);
    // Render the authored model pose first. Animation sampling is kept out of
    // the base render path because YSM's Molang helper layers are not
    // equivalent to Blockbench keyframes.
    this.applyFrame(); this.reset(); this.resize();
    this.renderer.render(this.scene,this.camera);
  }

  async loadFiles(fileMap) {
    if(this.coverAnimationPromise)await this.coverAnimationPromise.catch(()=>{});
    if(this.root){ this.scene.remove(this.root); this.root.traverse(node=>node.geometry?.dispose()); this.root.userData.boneTexture?.dispose(); this.root=null; }
    this.material?.dispose();this.translucentMaterial?.dispose();
    for(const entry of this.textureVariants||[]){entry.texture.dispose();entry.texture.image?.close?.();}
    this.textureVariants=[];this.material=null;this.translucentMaterial=null;
    this.fileMap=fileMap;
    await this.load();
  }

  get duration() { return this.animations?.[this.animationName]?.animation_length || 1; }
  get autoRotate() { return this.controls.autoRotate; }
  set autoRotate(value) { this.controls.autoRotate=value; }
  get showGrid() { return this.grid.visible; }
  set showGrid(value) { this.grid.visible=value; }
  setTexture(id) {
    const entry=this.textureVariants?.find(item=>item.id===id);if(!entry||!this.material)return false;
    this.currentTextureId=entry.id;this.material.map=entry.texture;this.material.needsUpdate=true;
    if(this.translucentMaterial){this.translucentMaterial.map=entry.texture;this.translucentMaterial.visible=entry.hasTranslucency;this.translucentMaterial.needsUpdate=true;}
    this.renderer.render(this.scene,this.camera);return true;
  }
  setTheme(dark) {
    this.grid.material.color.set(dark?0x826b89:0xffffff);
    this.grid.material.opacity=dark?0.3:0.5;
    if(this.root)this.renderer.render(this.scene,this.camera);
  }
  resize() {
    const {width,height}=this.viewport.getBoundingClientRect();
    if(!width||!height)return;
    this.camera.aspect=width/height; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);
  }
  reset() {
    // The source viewer frames the character around its torso rather than
    // the ground plane, which keeps the model visually centered in the tall
    // preview surface.
    this.controls.reset();this.controls.target.set(0,1.28,0);
    const distance=Math.max(6.8,4.5/Math.max(this.camera.aspect,0.6));
    this.camera.position.set(0,1.65,-distance);
    this.controls.update();
  }
  setView(view) {
    const distance=this.camera.position.distanceTo(this.controls.target);
    const center=this.controls.target;
    if(view==='side')this.camera.position.set(center.x+distance,center.y,center.z);
    else this.camera.position.set(center.x,center.y+0.25,center.z+(view==='back'?distance:-distance));
    this.controls.update();
  }
  setAnimation(name) { if(!this.animations[name])return;this.animationName=name;this.time=0;this.playing=true;this.applyFrame(); }
  bindAnimationContext(context) {
    context.boneRotationResolver=name=>{
      const id=this.skeleton?.index.get(name);if(id===undefined)return {x:0,y:0,z:0};
      const p=id*9,r=id*3,params=this.skeleton.params,rest=this.skeleton.rest;
      return {x:(rest[r]-params[p])*180/Math.PI,y:(rest[r+1]-params[p+1])*180/Math.PI,z:(params[p+2]-rest[r+2])*180/Math.PI};
    };
  }
  getMolangValue(expression) {
    const match=String(expression||'').trim().match(/^(?:v|variable)\.([\w$]+(?:\.[\w$]+)*)/);
    if(!match)return 0;
    let value=this.animationContext?.v;
    for(const key of match[1].split('.'))value=value?.[key];
    const number=Number(value);return Number.isFinite(number)?number:0;
  }
  setMolangVariable(expression,value) {
    const match=String(expression||'').trim().match(/^(?:v|variable)\.([\w$]+(?:\.[\w$]+)*)\s*(?:=\s*[-+]?\d+(?:\.\d+)?)?$/);
    if(!match)return false;
    const path=match[1].split('.');let target=this.animationContext?.v;
    if(!target)return false;
    for(const key of path.slice(0,-1))target=target[key];
    const inlineValue=String(expression).match(/=\s*([-+]?\d+(?:\.\d+)?)/);
    target[path.at(-1)]=inlineValue?Number(inlineValue[1]):value;
    this.applyFrame();this.renderer.render(this.scene,this.camera);return true;
  }
  async generateCoverApng({width=300,height=400,fps=25}={}) {
    const animationName=this.previewAnimationName&&this.animations?.[this.previewAnimationName]?this.previewAnimationName:null;
    if(!animationName)return null;
    const animation=this.animations[animationName];
    const duration=Math.max(.1,Number(animation?.animation_length)||1),count=Math.max(2,Math.min(150,Math.ceil(duration*fps)));
    const saved={time:this.time,elapsedTime:this.elapsedTime,animationName:this.animationName,playing:this.playing,active:this.active,animationPlayer:this.animationPlayer,animationContext:this.animationContext,controllerCurrent:new Map(this.controllerRuntime?.current||[]),controllerEntered:new Set(this.controllerRuntime?.entered||[]),rotation:this.root.rotation.clone(),position:this.root.position.clone(),scale:this.root.scale.clone(),rootPose:this.rootPose.clone(),visibility:this.root.userData.getBoneVisibility(),grid:this.grid.visible};
    this.setActive(false);this.playing=false;this.animationName=animationName;this.animationPlayer=new YsmAnimationPlayer(this.skeleton);this.animationContext=createYsmAnimationContext();this.bindAnimationContext(this.animationContext);this.grid.visible=false;
    // Match ModelPreviewRenderer.renderLivingEntityPreview and ModelButton:
    // the source button is 52x90, clips the preview to 52x70, and draws at
    // GUI scale 30. The entity yaw is 200° (or 180° when rotation is disabled),
    // while the ordinary front pose is 180°; the renderer also pitches the
    // outer preview transform by -10° (or 0° when disabled).
    const previewPose=previewCardPose(this.disablePreviewRotation);
    const outputPerGuiPixel=width/52,guiHeight=height/outputPerGuiPixel;
    this.rootPose.identity();
    this.root.scale.set(this.modelScale.x*30,this.modelScale.y*30,this.modelScale.z*30);
    const previewTilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),THREE.MathUtils.degToRad(previewPose.pitch));
    const previewYawRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(previewPose.yawOffset));
    this.root.quaternion.copy(previewTilt).multiply(previewYawRotation);
    // ModelButton renders at y + height/2 + 20 in a 90px button, so the
    // character's ground line is 65 GUI pixels from the clipped preview top.
    const previewBaseline=previewPose.baseline;
    // root.position is in GUI render units; only the canvas projection uses
    // outputPerGuiPixel. Multiplying here moves the model out of the frame.
    this.root.position.set(0,guiHeight/2-previewBaseline,0);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
    // This is a fixed GUI-scale orthographic view, not a perspective camera
    // fitted to guessed character bounds. At 300px output width, 52 GUI pixels
    // map directly to the generated cover width; the 70px scissor maps to its
    // full visible height.
    const camera=new THREE.OrthographicCamera(-26,26,guiHeight/2,-guiHeight/2,0.01,5000);
    // Bedrock's model front faces -Z; the GUI renderer's Z flip is handled
    // here by viewing the unmirrored model from its front side.
    camera.position.set(0,0,-1000);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
    const surface=document.createElement('canvas');surface.width=width;surface.height=height;const ctx=surface.getContext('2d',{willReadFrequently:true});const frames=[];
    try{
      // Sampling the animation twice keeps the camera stable for the whole
      // loop, rather than fitting only its first pose.
      this.animationPlayer=new YsmAnimationPlayer(this.skeleton);this.animationContext=createYsmAnimationContext();
      this.controllerRuntime?.reset();
      for(let i=0;i<count;i++){if(i>0)advanceYsmPhysics(this.animationContext,1/fps);this.elapsedTime=i/fps;this.time=i/count*duration;this.applyFrame();renderer.render(this.scene,camera);ctx.clearRect(0,0,width,height);ctx.drawImage(canvas,0,0,width,height);frames.push(ctx.getImageData(0,0,width,height));}
      return await encodeApng(frames,width,height,1000/fps);
    } finally {
      renderer.dispose();
      for(let i=0;i<saved.visibility.length;i++)if(saved.visibility[i])this.root.userData.setBoneVisible(this.root.userData.skeletonBones[i].name,true);
      for(let i=0;i<saved.visibility.length;i++)if(!saved.visibility[i])this.root.userData.setBoneVisible(this.root.userData.skeletonBones[i].name,false);
      this.root.rotation.copy(saved.rotation);this.root.position.copy(saved.position);this.root.scale.copy(saved.scale);this.rootPose.copy(saved.rootPose);if(this.controllerRuntime){this.controllerRuntime.current=saved.controllerCurrent;this.controllerRuntime.entered=saved.controllerEntered;}this.time=saved.time;this.elapsedTime=saved.elapsedTime;this.animationName=saved.animationName;this.playing=saved.playing;this.animationPlayer=saved.animationPlayer;this.animationContext=saved.animationContext;this.grid.visible=saved.grid;this.applyFrame();this.setActive(saved.active);
    }
  }
  seek(time) { this.time=Math.max(0,Math.min(time,this.duration));this.playing=false;this.applyFrame();this.onTime(this.time,this.duration); }
  setActive(active) {
    if(this.active===active)return; this.active=active;
    if(active){this.resize();this.lastTime=performance.now();this.frame=requestAnimationFrame(this.tick);}
    else cancelAnimationFrame(this.frame);
  }
  tick(now) {
    if(!this.active)return;
    const delta=Math.max(0,Math.min((now-this.lastTime)/1000,0.1));this.lastTime=now;
    if(!document.hidden){
      if(this.playing){const elapsed=delta*this.speed;this.time=(this.time+elapsed)%this.duration;this.elapsedTime+=elapsed;advanceYsmPhysics(this.animationContext,elapsed);}
      this.applyFrame();this.controls.update(delta);this.renderer.render(this.scene,this.camera);
      this.onTime(this.time,this.duration);
    }
    this.frame=requestAnimationFrame(this.tick);
  }
  applyFrame() {
    if(!this.skeleton||!this.root)return;
    // Same order as the source Model.pose(): reset, pre-parallel, controller
    // animations, selected animation, parallel, then bone matrices/upload.
    this.skeleton.reset();
    const context=this.animationContext;
    context.time=this.time;context.lifeTime=this.elapsedTime;context.query.anim_time=this.time;context.query.life_time=this.elapsedTime;
    context.ctrl.playing_extra_animation=this.extraAnimationNames?.has(this.animationName)?1:0;
    const applyController=(controller,fallback,controllerTime)=>{
      context.query.anim_time=controllerTime;
      const names=controllerAnimationNames(controller,context,evaluateMolang);
      for(const name of names||fallback){const clip=this.animations?.[name];if(clip)this.animationPlayer.apply(clip,controllerTime,context);}
    };
    // YSM runs every parallel slot in its own controller. These spring/sine
    // layers keep advancing while the selected walk/run/jump clip loops.
    applyController(this.preParallelController,Object.keys(this.animations||{}).filter(name=>name.startsWith('pre_parallel')),this.elapsedTime);
    this.controllerRuntime?.update({time:this.time,'query.anim_time':this.time,'query.life_time':this.elapsedTime});
    for(const name of this.controllerRuntime?.activeAnimations?.()||[]){const clip=this.animations?.[name];if(clip)this.animationPlayer.apply(clip,this.elapsedTime,context);}
    const main=this.animations?.[this.animationName];if(main)this.animationPlayer.apply(main,this.time,context);
    applyController(this.parallelController,Object.keys(this.animations||{}).filter(name=>name.startsWith('parallel')),this.elapsedTime);
    const matrices=this.skeleton.computeMatrices(this.rootPose);
    this.root.userData.setAnimationBoneVisibility(this.skeleton.visible);
    this.root.userData.updateBoneTexture(matrices,this.skeleton.normalMatrices);
  }
  screenshot() {
    this.renderer.render(this.scene,this.camera);
    const a=document.createElement('a');a.download=`堤雅-${this.animationName}.png`;a.href=this.canvas.toDataURL('image/png');a.click();
  }
  dispose() {
    this.setActive(false);this.resizeObserver.disconnect();this.canvas.removeEventListener('wheel',this.onWheel);this.controls.dispose();
    this.root?.traverse(o=>o.geometry?.dispose());this.root?.userData.boneTexture?.dispose();this.material?.dispose();this.translucentMaterial?.dispose();
    for(const entry of this.textureVariants||[]){entry.texture.dispose();entry.texture.image?.close?.();}
    this.grid.geometry.dispose();this.grid.material.dispose();this.renderer.dispose();
  }
}

function isYsmFlagEnabled(value){
  return value===true||value===1||(typeof value==='string'&&/^(?:true|1)$/i.test(value.trim()));
}

function installGpuSkinning(material,boneTexture){
  const previousCompile=material.onBeforeCompile;
  const previousCacheKey=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=shader=>{
    previousCompile?.(shader,material.renderer);
    shader.uniforms.ysmBoneTexture={value:boneTexture};
    shader.uniforms.ysmBoneTextureHeight={value:boneTexture.image.height};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float ysmBoneIndex;
uniform sampler2D ysmBoneTexture;
uniform float ysmBoneTextureHeight;
varying float vYsmBoneVisible;
vec4 ysmBoneTexel(float column){return texture2D(ysmBoneTexture,vec2((column+0.5)/8.0,(ysmBoneIndex+0.5)/ysmBoneTextureHeight));}`);
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
mat3 ysmBoneNormal=mat3(ysmBoneTexel(4.0).xyz,ysmBoneTexel(5.0).xyz,ysmBoneTexel(6.0).xyz);
objectNormal=normalize(ysmBoneNormal*objectNormal);
vYsmBoneVisible=ysmBoneTexel(7.0).r;`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
mat4 ysmBoneMatrix=mat4(ysmBoneTexel(0.0),ysmBoneTexel(1.0),ysmBoneTexel(2.0),ysmBoneTexel(3.0));
transformed=(ysmBoneMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vYsmBoneVisible;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vYsmBoneVisible<0.5)discard;');
  };
  material.customProgramCacheKey=()=>`${previousCacheKey()}|ysm-gpu-skin-v1`;
}

// Mirror the two ModelPreviewRenderer branches used by YSM's model picker.
// With disable_preview_rotation enabled, the model faces straight forward and
// the source renderer adds its 5.5 GUI-unit vertical offset; the authored
// preview animation still runs in either branch.
function previewCardPose(disableRotation){
  return disableRotation?{yawOffset:0,pitch:0,baseline:70.5}:{yawOffset:-20,pitch:10,baseline:65};
}

function extendCoverBounds(bounds,geometry,matrix){
  const p=geometry.attributes.position.array,point=new THREE.Vector3();
  for(const group of geometry.groups){if(!group.count)continue;const first=(group.start/6)*4,last=first+(group.count/6)*4;for(let v=first;v<last;v++){const i=v*3;point.set(p[i],p[i+1],p[i+2]).applyMatrix4(matrix);bounds.expandByPoint(point);}}
}

function textureSources(source,metadata,defaultBase=DEFAULT_MODEL_BASE){
  if(source){
    const provided=Array.isArray(source.textures)?source.textures:source.texture?[{file:source.texture}]:[];
    return provided.map((entry,index)=>{
      const file=entry.file||entry;
      const path=entry.path||file.webkitRelativePath?.split('/').slice(1).join('/')||file.name||`texture-${index+1}`;
      return {id:entry.id||path,path,label:entry.label||textureLabel(path),file};
    });
  }
  const declared=metadata.files?.player?.texture;
  const entries=Array.isArray(declared)?declared:declared?[declared]:['textures/素体512.png'];
  return entries.map((entry,index)=>{
    const raw=typeof entry==='string'?entry:entry?.uv;
    if(typeof raw!=='string')return null;
    const path=raw.replaceAll('\\','/').replace(/^\/+/, '');
    if(path.split('/').includes('..'))return null;
    return {id:entry?.id||path,path,label:entry?.name||textureLabel(path),url:`${defaultBase}${path}`};
  }).filter(Boolean);
}

function textureLabel(path){
  const name=String(path).split(/[\\/]/).pop()||String(path);
  return name.replace(/\.[^.]+$/,'');
}

