import * as THREE from 'three';

// Convert Bedrock geometry into the same bind-pose vertex space and per-bone
// quad order used by the reference WebGL renderer. Bone transforms are applied
// later from one Skeleton matrix array; there is no Three.js bone hierarchy.
export function buildBedrockModel(model, material) {
  const g=model.bedrockModel||model['minecraft:geometry']?.[0]||model;
  const desc=g.description||{}, tw=desc.texture_width||64, th=desc.texture_height||64;
  const bones=Array.isArray(g.bones)?g.bones:[], names=new Map();
  bones.forEach((b,i)=>{if(!names.has(b.name))names.set(b.name,i);});
  const skeletonBones=bones.map(b=>({
    name:String(b.name||''), parentIdx:b.parent&&names.has(b.parent)?names.get(b.parent):-1,
    pivot:[-component(b.pivot,0),component(b.pivot,1),component(b.pivot,2)],
    rotation:[-component(b.rotation,0)*Math.PI/180,-component(b.rotation,1)*Math.PI/180,component(b.rotation,2)*Math.PI/180],
  }));
  const positions=[],normals=[],uvs=[],indices=[],vertexBones=[];
  const boneGroups=new Map(); let vertex=0;
  bones.forEach((bone,bi)=>{
    const group=new THREE.Group();group.name=bone.name||'';group.userData.boneIndex=bi;boneGroups.set(bone.name,group);
    for(const cube of bone.cubes||[]){
      const origin=cube.origin||[0,0,0],size=cube.size||[0,0,0],inf=Number(cube.inflate??bone.inflate??0),mirror=cube.mirror===undefined?bone.mirror===true:cube.mirror===true;
      const x1=(-component(origin,0)-component(size,0)-inf)/16, y1=(component(origin,1)-inf)/16, z1=(component(origin,2)-inf)/16;
      const x2=(-component(origin,0)+inf)/16, y2=(component(origin,1)+component(size,1)+inf)/16, z2=(component(origin,2)+component(size,2)+inf)/16;
      const matrix=cubeMatrix(cube.pivot||[0,0,0],cube.rotation||[0,0,0]);
      const normalMatrix=inverse3(matrix), faces=resolveFaces(cube,size);
      for(const faceName of ['north','south','east','west','up','down']){
        let f=faces[faceName]; if(!f)continue;
        if(mirror){if(faceName==='east')f=faces.west;else if(faceName==='west')f=faces.east;}
        if(!f)continue;
        const corners=faceCorners(faceName,x1,y1,z1,x2,y2,z2), uv=makeUv(f,tw,th,mirror);
        const n=transformNormal(normalMatrix,...faceNormal(faceName));
        for(const p of corners){const v=transformPoint(matrix,...p);positions.push(v[0],v[1],v[2]);normals.push(n[0],n[1],n[2]);vertexBones.push(bi);}
        uvs.push(...uv);indices.push(vertex,vertex+1,vertex+2,vertex,vertex+2,vertex+3);vertex+=4;
      }
    }
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  // Both alpha passes can draw the full index buffer. Bone visibility is
  // tested in the skinning shader, avoiding two WebGL draw calls per bone.
  geometry.addGroup(0,indices.length,0);geometry.addGroup(0,indices.length,1);
  geometry.setAttribute('ysmBoneIndex',new THREE.Float32BufferAttribute(vertexBones,1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  const boneTextureData=new Float32Array(bones.length*8*4);
  const boneTexture=new THREE.DataTexture(boneTextureData,8,Math.max(bones.length,1),THREE.RGBAFormat,THREE.FloatType);
  boneTexture.magFilter=THREE.NearestFilter;boneTexture.minFilter=THREE.NearestFilter;boneTexture.generateMipmaps=false;boneTexture.needsUpdate=true;
  const root=new THREE.Group();root.add(mesh);
  root.userData.bones=boneGroups;root.userData.skeletonBones=skeletonBones;root.userData.mesh=mesh;root.userData.boneTexture=boneTexture;
  const visibility=new Uint8Array(bones.length).fill(1);
  let animationVisibility=null;
  root.userData.getBoneVisibility=()=>new Uint8Array(visibility);
  const syncBoneVisibility=()=>{
    const data=boneTexture.image.data;
    for(let bi=0;bi<bones.length;bi++)data[bi*32+28]=visibility[bi]&&(!animationVisibility||animationVisibility[bi])?1:0;
    boneTexture.needsUpdate=true;
  };
  root.userData.setBoneVisible=(name,visible)=>{const id=names.get(name);if(id===undefined)return;for(let i=0;i<bones.length;i++){let p=i,descendant=false;while(p>=0){if(p===id){descendant=true;break;}p=skeletonBones[p]?.parentIdx??-1;}if(descendant)visibility[i]=visible?1:0;}syncBoneVisibility();};
  root.userData.setAnimationBoneVisibility=mask=>{let changed=!animationVisibility||animationVisibility.length!==mask.length;if(!changed)for(let i=0;i<mask.length;i++)if(animationVisibility[i]!==mask[i]){changed=true;break;}if(changed){animationVisibility=new Uint8Array(mask);syncBoneVisibility();}};
  root.userData.syncBoneVisibility=syncBoneVisibility;
  root.userData.updateBoneTexture=(matrices,normalMatrices)=>{
    const data=boneTexture.image.data;
    for(let bi=0;bi<bones.length;bi++){
      const base=bi*32,m=bi*16,n=bi*9;
      for(let j=0;j<16;j++)data[base+j]=matrices[m+j];
      for(let j=0;j<9;j++)data[base+16+j]=normalMatrices[n+j];
    }
    boneTexture.needsUpdate=true;
  };
  root.userData.syncBoneVisibility();
  return root;
}

function component(v,i){return Array.isArray(v)&&Number.isFinite(+v[i])?+v[i]:0;}
function cubeMatrix(pivot,rotation){
  const m=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],q=Math.PI/180;
  translate(m,-component(pivot,0)/16,component(pivot,1)/16,component(pivot,2)/16);
  rotateZ(m,component(rotation,2)*q);rotateY(m,-component(rotation,1)*q);rotateX(m,-component(rotation,0)*q);
  translate(m,component(pivot,0)/16,-component(pivot,1)/16,-component(pivot,2)/16);return m;
}
function translate(m,x,y,z){m[12]+=m[0]*x+m[4]*y+m[8]*z;m[13]+=m[1]*x+m[5]*y+m[9]*z;m[14]+=m[2]*x+m[6]*y+m[10]*z;}
function rotateX(m,a){const s=Math.sin(a),c=Math.cos(a),a4=m[4],a5=m[5],a6=m[6],a7=m[7],b4=m[8],b5=m[9],b6=m[10],b7=m[11];m[4]=a4*c+b4*s;m[5]=a5*c+b5*s;m[6]=a6*c+b6*s;m[7]=a7*c+b7*s;m[8]=b4*c-a4*s;m[9]=b5*c-a5*s;m[10]=b6*c-a6*s;m[11]=b7*c-a7*s;}
function rotateY(m,a){const s=Math.sin(a),c=Math.cos(a),a0=m[0],a1=m[1],a2=m[2],a3=m[3],b8=m[8],b9=m[9],b10=m[10],b11=m[11];m[0]=a0*c-b8*s;m[1]=a1*c-b9*s;m[2]=a2*c-b10*s;m[3]=a3*c-b11*s;m[8]=a0*s+b8*c;m[9]=a1*s+b9*c;m[10]=a2*s+b10*c;m[11]=a3*s+b11*c;}
function rotateZ(m,a){const s=Math.sin(a),c=Math.cos(a),a0=m[0],a1=m[1],a2=m[2],a3=m[3],b4=m[4],b5=m[5],b6=m[6],b7=m[7];m[0]=a0*c+b4*s;m[1]=a1*c+b5*s;m[2]=a2*c+b6*s;m[3]=a3*c+b7*s;m[4]=b4*c-a0*s;m[5]=b5*c-a1*s;m[6]=b6*c-a2*s;m[7]=b7*c-a3*s;}
function transformPoint(m,x,y,z){return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
function inverse3(m){const a=m[0],b=m[1],c=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10],A=e*i-f*h,B=f*g-i*d,C=d*h-e*g,det=a*A+b*B+c*C||1;return [A/det,(-b*i+c*h)/det,(b*f-c*e)/det,B/det,(a*i-c*g)/det,(-a*f+c*d)/det,C/det,(-a*h+b*g)/det,(a*e-b*d)/det];}
function transformNormal(m,x,y,z){let a=m[0]*x+m[3]*y+m[6]*z,b=m[1]*x+m[4]*y+m[7]*z,c=m[2]*x+m[5]*y+m[8]*z,l=Math.hypot(a,b,c)||1;return [a/l,b/l,c/l];}
function faceNormal(n){return ({north:[0,0,-1],south:[0,0,1],east:[1,0,0],west:[-1,0,0],up:[0,1,0],down:[0,-1,0]})[n];}
function faceCorners(n,x1,y1,z1,x2,y2,z2){const o=[x1,y1,z1],l=[x1,y1,z2],u=[x1,y2,z1],h=[x1,y2,z2],f=[x2,y1,z1],p=[x2,y1,z2],d=[x2,y2,z1],b=[x2,y2,z2];return ({west:[h,u,o,l],east:[d,b,p,f],north:[u,d,f,o],south:[b,h,l,p],up:[h,b,d,u],down:[o,f,p,l]})[n];}
function resolveFaces(cube,size){if(cube.uv&&!Array.isArray(cube.uv))return cube.uv;const uv=Array.isArray(cube.uv)?cube.uv:[0,0],[w,h,d]=size;return {north:{uv:[uv[0]+d,uv[1]+d],uv_size:[w,h]},south:{uv:[uv[0]+d+w+d,uv[1]+d],uv_size:[w,h]},east:{uv:[uv[0],uv[1]+d],uv_size:[d,h]},west:{uv:[uv[0]+d+w,uv[1]+d],uv_size:[d,h]},up:{uv:[uv[0]+d,uv[1]],uv_size:[w,d]},down:{uv:[uv[0]+d+w,uv[1]+d],uv_size:[w,-d]}};}
function makeUv(face,tw,th,mirror){const uv=face.uv||[0,0],sz=face.uv_size||[0,0];let u0=component(uv,0)/tw,u1=(component(uv,0)+component(sz,0))/tw,v0=component(uv,1)/th,v1=(component(uv,1)+component(sz,1))/th;if(!mirror)[u0,u1]=[u1,u0];return [u0,v0,u1,v0,u1,v1,u0,v1];}
