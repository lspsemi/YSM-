import * as THREE from 'three';

// CPU port of the reference viewer's wt.computeMatrices(). Angles are stored
// in radians and positions are Bedrock model units.
export class YsmSkeleton {
  constructor(bones) {
    this.bones=bones;
    this.count=bones.length;
    this.index=new Map(bones.map((b,i)=>[b.name,i]));
    this.pivots=new Float32Array(this.count*3);
    this.rest=new Float32Array(this.count*3);
    this.parent=new Int32Array(this.count);
    for(let i=0;i<this.count;i++){
      const b=bones[i], p=b.pivot||[0,0,0], r=b.rotation||[0,0,0];
      this.pivots.set(p,i*3); this.rest.set(r,i*3);
      this.parent[i]=b.parentIdx ?? (b.parent&&this.index.has(b.parent)?this.index.get(b.parent):-1);
    }
    this.params=new Float32Array(this.count*9);
    this.matrices=new Float32Array(this.count*16);
    this.normalMatrices=new Float32Array(this.count*9);
    this.visible=new Uint8Array(this.count);
    this.reset();
  }
  reset(){
    for(let i=0;i<this.count;i++){const p=i*9,r=i*3;this.params[p]=this.rest[r];this.params[p+1]=this.rest[r+1];this.params[p+2]=this.rest[r+2];this.params[p+3]=this.params[p+4]=this.params[p+5]=0;this.params[p+6]=this.params[p+7]=this.params[p+8]=1;}
  }
  computeMatrices(rootPose=new THREE.Matrix4()){
    const out=this.matrices;
    const matrix4=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
    for(let s=0;s<this.count;s++){
      const o=s*16, pa=this.parent[s];
      if(pa<0) out.set(rootPose.elements,o); else out.copyWithin(o,pa*16,pa*16+16);
      const q=s*9,n=this.params, piv=this.pivots;
      let P=out[o],F=out[o+1],j=out[o+2],k=out[o+3],T=out[o+4],B=out[o+5],N=out[o+6],G=out[o+7],Q=out[o+8],D=out[o+9],$=out[o+10],X=out[o+11];
      const M=piv[s*3],I=piv[s*3+1],v=piv[s*3+2];
      const sx=n[q+6],sy=n[q+7],sz=n[q+8];
      this.visible[s]=(sx===0&&sy===0&&sz===0)||(pa>=0&&!this.visible[pa])?0:1;
      const R=(-n[q+3]+M)/16,L=(n[q+4]+I)/16,S=(n[q+5]+v)/16;
      out[o+12]+=P*R+T*L+Q*S;out[o+13]+=F*R+B*L+D*S;out[o+14]+=j*R+N*L+$*S;out[o+15]+=k*R+G*L+X*S;
      const rz=n[q+2],ry=n[q+1],rx=n[q];
      if(rz){const c=Math.cos(rz),s=Math.sin(rz),a=P,b=F,c2=j,d=k;P=a*c+T*s;F=b*c+B*s;j=c2*c+N*s;k=d*c+G*s;T=T*c-a*s;B=B*c-b*s;N=N*c-c2*s;G=G*c-d*s;}
      if(ry){const c=Math.cos(ry),s=Math.sin(ry),a=P,b=F,c2=j,d=k;P=a*c-Q*s;F=b*c-D*s;j=c2*c-$*s;k=d*c-X*s;Q=a*s+Q*c;D=b*s+D*c;$=c2*s+$*c;X=d*s+X*c;}
      if(rx){const c=Math.cos(rx),s=Math.sin(rx),a=T,b=B,c2=N,d=G;T=a*c+Q*s;B=b*c+D*s;N=c2*c+$*s;G=d*c+X*s;Q=Q*c-a*s;D=D*c-b*s;$=$*c-c2*s;X=X*c-d*s;}
      // YSM's renderers apply animated bone scale after rotation. A bone is
      // hidden (and its descendants skipped) only when all three axes are 0.
      P*=sx;F*=sx;j*=sx;k*=sx;T*=sy;B*=sy;N*=sy;G*=sy;Q*=sz;D*=sz;$*=sz;X*=sz;
      out[o]=P;out[o+1]=F;out[o+2]=j;out[o+3]=k;out[o+4]=T;out[o+5]=B;out[o+6]=N;out[o+7]=G;out[o+8]=Q;out[o+9]=D;out[o+10]=$;out[o+11]=X;
      const J=-M/16,it=-I/16,rt=-v/16;out[o+12]+=P*J+T*it+Q*rt;out[o+13]+=F*J+B*it+D*rt;out[o+14]+=j*J+N*it+$*rt;out[o+15]+=k*J+G*it+X*rt;
      normalMatrix.getNormalMatrix(matrix4.fromArray(out,o));this.normalMatrices.set(normalMatrix.elements,s*9);
    }
    return out;
  }
}
