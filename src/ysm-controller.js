// Controller runtime shaped after the reference ControllerRuntime. The
// bundled model currently declares no controllers, but keeping this layer
// explicit prevents parallel animation layers from being applied as ordinary
// idle keyframes.
export class YsmControllerRuntime {
  constructor(controllers=new Map()){this.controllers=controllers;this.current=new Map();this.entered=new Set();this.reset();}
  reset(){this.current.clear();this.entered.clear();for(const [name,c] of this.controllers)this.current.set(name,c.initial_state||c.initial||'default');}
  update(context={}){for(const [name,c] of this.controllers){let state=c.states?.get(this.current.get(name));if(!state)continue;for(const tr of state.transitions||[]){if(!tr.condition||tr.condition(context)!==0){if(c.states?.has(tr.target)){this.current.set(name,tr.target);state=c.states.get(tr.target);}break;}}}}
  activeAnimations(){const out=[];for(const [name,c] of this.controllers){const s=c.states?.get(this.current.get(name));for(const a of s?.animations||[])if(typeof a==='string')out.push(a);}return out;}
}

export function splitParallelAnimations(animations,prefix){
  return Object.entries(animations||{})
    .filter(([name])=>name.startsWith(prefix))
    .sort(([a],[b])=>Number(a.slice(prefix.length))-Number(b.slice(prefix.length)))
    .map(([,value])=>value);
}

export function controllerAnimationNames(controller,context,evaluate){
  const entries=controller?.states?.[controller.initial_state||controller.initial||'default']?.animations;
  if(!Array.isArray(entries))return null;
  const names=[];
  for(const entry of entries){
    if(typeof entry==='string'){names.push(entry);continue;}
    if(!entry||typeof entry!=='object')continue;
    for(const [name,condition] of Object.entries(entry)){
      if(typeof condition!=='string'||evaluate(condition,context)!==0)names.push(name);
    }
  }
  return names;
}
