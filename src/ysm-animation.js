import { sampleChannel } from './animation.js';

// YSM's Molang math.sin/cos accept degrees (see YSM MathBinding/Sin/Cos),
// unlike JavaScript's native radian-based trigonometry.
const math={pi:Math.PI,e:Math.E,sin:v=>Math.sin(v*Math.PI/180),cos:v=>Math.cos(v*Math.PI/180),tan:v=>Math.tan(v*Math.PI/180),asin:Math.asin,acos:Math.acos,atan:Math.atan,atan2:Math.atan2,sqrt:Math.sqrt,abs:Math.abs,floor:Math.floor,ceil:Math.ceil,round:Math.round,pow:Math.pow,exp:Math.exp,log:Math.log,min:Math.min,max:Math.max,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t,to_radians:v=>v*Math.PI/180,to_degrees:v=>v*180/Math.PI};
const expressionCache=new Map();
const proxyCache=new WeakMap();
const makeProxy=(target={})=>{
  if(proxyCache.has(target))return proxyCache.get(target);
  const proxy=new Proxy(target,{get(o,k){
    if(k in o){const value=o[k];return value&&typeof value==='object'?makeProxy(value):value;}
    if(k===Symbol.toPrimitive)return ()=>0;
    if(k==='valueOf')return ()=>0;
    if(k==='toString')return ()=>"0";
    if(typeof k==='symbol')return undefined;
    return o[k]=makeProxy({});
  },set(o,k,v){o[k]=v;return true;}});
  proxyCache.set(target,proxy);proxyCache.set(proxy,proxy);return proxy;
};
export function createYsmAnimationContext(){
  const variables=makeProxy({roaming:{hx:0,dj:0,k:0}}),ysm=makeProxy({'has_boots':0,'has_helmet':0,'has_chest_plate':0,'has_leggings':0,'food_level':20,'head_yaw':0,'head_pitch':0}),query=makeProxy({'health':20,'health_percent':100,'max_health':20,'armor_value':0,'body_y_rotation':0,'eye_target_y_rotation':0,'head_x_rotation':0,'anim_time':0,'life_time':0}),ctrl=makeProxy({playing_extra_animation:0});
  const context={v:variables,variable:variables,ysm,query,q:query,ctrl,math,time:0,lifeTime:0,physics:new Map(),boneRotationResolver:null};
  // YSM's secondary motion is stateful. Keep the same spring instance per
  // named Molang function across frames, just like its PhysicsManager.
  ysm.second_order=(name,input,frequency=1,coefficient=1,response=1)=>{
    const key=String(name??'');if(!key)return 0;
    const state=context.physics.get(key);
    if(!state){context.physics.set(key,{input:Number(input)||0,inputFunction:0,lastSimulation:0,lastSimulationDot:0,frequency:Number(frequency),coefficient:Number(coefficient),response:Number(response)});return Number(input)||0;}
    state.input=Number(input)||0;state.frequency=Number(frequency);state.coefficient=Number(coefficient);state.response=Number(response);
    return state.lastSimulation;
  };
  ysm.bone_rot=name=>context.boneRotationResolver?.(String(name??''))||{x:0,y:0,z:0};
  return context;
}

// Matches YSM PhysicsManager.update() plus SecondOrder.update(). Called once
// before evaluating each rendered frame, so every expression sees the same
// spring state and keyframes remain independent of the number of bones.
export function advanceYsmPhysics(context,timeStep){
  if(!context?.physics||!(timeStep>0))return;
  for(const state of context.physics.values()){
    const frequency=Math.max(0.001,Math.min(5,Number.isFinite(state.frequency)?state.frequency:1));
    const coefficient=Math.max(0,Math.min(1,Number.isFinite(state.coefficient)?state.coefficient:1));
    const response=Number.isFinite(state.response)?state.response:1;
    const k1=coefficient/Math.PI/frequency;
    const k2=1/(2*Math.PI*frequency)/(2*Math.PI*frequency);
    const k3=response*coefficient/2/Math.PI/frequency;
    const inputDot=(state.input-state.inputFunction)/timeStep;
    state.inputFunction=state.input;
    const maxTimeStep=Math.sqrt(4*k2+k1*k1)-k1;
    const cycles=Math.max(1,Math.ceil(timeStep/Math.max(maxTimeStep,1e-6)));
    const dt=timeStep/cycles;
    for(let i=0;i<cycles;i++){
      state.lastSimulation+=dt*state.lastSimulationDot;
      state.lastSimulationDot+=dt*(k3*inputDot+state.input-state.lastSimulation-k1*state.lastSimulationDot)/k2;
    }
  }
}
function evalExpr(expr,ctx){
  if(typeof expr==='number')return expr;
  if(typeof expr==='boolean')return expr?1:0;
  if(typeof expr!=='string'||!expr.trim())return 0;
  const source=expr.trim();
  if(expressionCache.has(source)){try{return expressionCache.get(source)(ctx.v,ctx.ysm,ctx.query,ctx.ctrl,math);}catch{return 0;}}
  try{const fn=new Function('v','ysm','query','ctrl','math',`return (${source.replace(/\bq\./g,'query.')});`);expressionCache.set(source,fn);return fn(ctx.v,ctx.ysm,ctx.query,ctx.ctrl,math)??0;}catch{expressionCache.set(source,()=>0);return 0;}
}
export function evaluateMolang(expression,context){
  const value=evalExpr(expression,context);
  return typeof value==='boolean'?(value?1:0):Number(value)||0;
}
function evaluated(value,ctx,fallback){
  if(Array.isArray(value))return value.map(v=>Number(evalExpr(v,ctx))||0);
  if(value&&typeof value==='object'){
    if('post'in value||'pre'in value)return {...value,...('post'in value?{post:evaluated(value.post,ctx,fallback)}:{}),...('pre'in value?{pre:evaluated(value.pre,ctx,fallback)}:{})};
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='lerp_mode'?v:evaluated(v,ctx,fallback)]));
  }
  if(value===undefined)return fallback;
  const n=Number(evalExpr(value,ctx));return Number.isFinite(n)?n:fallback;
}
function executeTimeline(animation,time,ctx,states){
  if(!animation.timeline||typeof animation.timeline!=='object')return;
  const length=Number(animation.animation_length)||0,loop=animation.loop===true||animation.loop==='true';
  let state=states.get(animation);if(!state){state={last:-1,cycle:0};states.set(animation,state);}
  let current=time,cycle=0;
  if(loop&&length>0){cycle=Math.floor(time/length);current=time%length;}
  const events=Object.entries(animation.timeline).map(([t,expr])=>({t:Number(t),expr:Array.isArray(expr)?expr:[expr]})).filter(e=>Number.isFinite(e.t)).sort((a,b)=>a.t-b.t);
  const run=(event)=>{for(const statement of event.expr){if(typeof statement!=='string')continue;const s=statement.trim();if(!s||s.startsWith("'")||s.startsWith('"'))continue;try{new Function('v','ysm','query','ctrl','math',s.replace(/\bq\./g,'query.'))(ctx.v,ctx.ysm,ctx.query,ctx.ctrl,math);}catch{}}};
  if(state.last<0){for(const e of events)if(e.t<=current)run(e);}
  else if(cycle!==state.cycle||current<state.last){for(const e of events)if(e.t>state.last||e.t<=current)run(e);}
  else for(const e of events)if(e.t>state.last&&e.t<=current)run(e);
  state.last=current;state.cycle=cycle;
}

// Mirrors reference Model.pose(): apply timeline expressions, then write each
// sampled channel into the shared skeleton parameter buffer.
export class YsmAnimationPlayer {
  constructor(skeleton){this.skeleton=skeleton;this.timelineStates=new WeakMap();}
  apply(animation,time,context=createYsmAnimationContext()){
    if(!animation)return;
    const length=Number(animation.animation_length)||0,loops=animation.loop===true||animation.loop==='true';
    const t=length?(loops?((time%length)+length)%length:Math.min(Math.max(time,0),length)):time;
    context.time=t;context.query.anim_time=t;context.query.life_time=context.lifeTime??time;
    executeTimeline(animation,time,context,this.timelineStates);
    const params=this.skeleton.params,index=this.skeleton.index,rest=this.skeleton.rest;
    for(const [name,channels] of Object.entries(animation.bones||{})){
      const id=index.get(name);if(id===undefined)continue;
      const p=id*9,r=id*3;
      if(channels.rotation!==undefined){const v=sampleChannel(evaluated(channels.rotation,context,[0,0,0]),t,[0,0,0]);params[p]=rest[r]-v[0]*Math.PI/180;params[p+1]=rest[r+1]-v[1]*Math.PI/180;params[p+2]=rest[r+2]+v[2]*Math.PI/180;}
      if(channels.position!==undefined){const v=sampleChannel(evaluated(channels.position,context,[0,0,0]),t,[0,0,0]);params[p+3]=v[0];params[p+4]=v[1];params[p+5]=v[2];}
      if(channels.scale!==undefined){const v=sampleChannel(evaluated(channels.scale,context,[1,1,1]),t,[1,1,1]);params[p+6]=v[0];params[p+7]=v[1];params[p+8]=v[2];}
    }
  }
}
