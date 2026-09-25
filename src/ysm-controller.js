function compareControllerNames(a,b){return String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});}

export function mergeControllerFiles(files=[]){
  const merged={};
  for(const file of files){
    const controllers=file?.animation_controllers||file?.['minecraft:animation_controllers']||{};
    for(const [name,controller] of Object.entries(controllers))merged[name]=controller;
  }
  return merged;
}

// Convert Bedrock/YSM controller JSON into the same ordered state structure
// used by YSM's ControllerRuntime. Controller/state ordering matters because
// the first true transition wins.
export function normalizeControllers(rawControllers={}){
  const normalized=new Map();
  for(const [name,controller] of Object.entries(rawControllers||{}).sort(([a],[b])=>compareControllerNames(a,b))){
    const states=new Map();
    for(const [stateName,state] of Object.entries(controller?.states||{})){
      const transitions=[];
      for(const entry of state?.transitions||[]){
        if(!entry||typeof entry!=='object')continue;
        for(const [target,condition] of Object.entries(entry))transitions.push({target,condition:String(condition??'')});
      }
      states.set(stateName,{animations:Array.isArray(state?.animations)?state.animations:[],transitions,on_entry:Array.isArray(state?.on_entry)?state.on_entry:[],on_exit:Array.isArray(state?.on_exit)?state.on_exit:[]});
    }
    normalized.set(name,{initial_state:controller?.initial_state||controller?.initial||'default',states});
  }
  return normalized;
}

export class YsmControllerRuntime {
  constructor(controllers=new Map()){
    this.controllers=controllers instanceof Map?controllers:normalizeControllers(controllers);
    this.current=new Map();this.entered=new Set();this.reset();
  }
  reset(){
    this.current.clear();this.entered.clear();
    for(const [name,controller] of this.controllers)this.current.set(name,controller.initial_state||'default');
  }
  update(context={},evaluate=()=>0,execute=()=>{}){
    for(const [name,controller] of this.controllers){
      let stateName=this.current.get(name),state=controller.states?.get(stateName);if(!state)continue;
      if(!this.entered.has(name)){execute(state.on_entry,context);this.entered.add(name);}
      for(const transition of state.transitions||[]){
        if(transition.condition&&evaluate(transition.condition,context)===0)continue;
        const next=controller.states?.get(transition.target);if(!next)continue;
        execute(state.on_exit,context);this.current.set(name,transition.target);stateName=transition.target;state=next;execute(state.on_entry,context);break;
      }
    }
  }
  activeAnimations(context={},evaluate=()=>0){
    const result=[];
    for(const [controllerName,controller] of this.controllers){
      const state=controller.states?.get(this.current.get(controllerName));
      for(const entry of state?.animations||[]){
        if(typeof entry==='string'){if(entry)result.push({controller:controllerName,name:entry});continue;}
        if(!entry||typeof entry!=='object')continue;
        for(const [name,condition] of Object.entries(entry))if(name&&(typeof condition!=='string'||evaluate(condition,context)!==0))result.push({controller:controllerName,name});
      }
    }
    return result;
  }
}

export function splitParallelAnimations(animations,prefix){
  return Object.entries(animations||{})
    .filter(([name])=>name.startsWith(prefix))
    .sort(([a],[b])=>compareControllerNames(a,b))
    .map(([,value])=>value);
}
