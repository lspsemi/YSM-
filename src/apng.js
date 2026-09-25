const PNG_SIGNATURE=Uint8Array.of(137,80,78,71,13,10,26,10);
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});

export async function encodeApng(frames,width,height,delayMs){
  if(!frames.length)throw new Error('APNG requires at least one frame');
  if(width<1||height<1||frames.some(frame=>frame.width!==width||frame.height!==height))throw new Error('APNG frames must have matching dimensions');
  if(typeof CompressionStream==='undefined')throw new Error('This browser does not support lossless APNG compression');

  const chunks=[PNG_SIGNATURE];
  const ihdr=new Uint8Array(13);write32(ihdr,0,width);write32(ihdr,4,height);ihdr.set([8,6,0,0,0],8);
  chunks.push(pngChunk('IHDR',ihdr));
  const actl=new Uint8Array(8);write32(actl,0,frames.length);write32(actl,4,0);chunks.push(pngChunk('acTL',actl));

  const [delayNumerator,delayDenominator]=fraction(delayMs/1000);
  let sequence=0;
  for(let i=0;i<frames.length;i++){
    const fctl=new Uint8Array(26);write32(fctl,0,sequence++);write32(fctl,4,width);write32(fctl,8,height);write32(fctl,12,0);write32(fctl,16,0);
    write16(fctl,20,delayNumerator);write16(fctl,22,delayDenominator);fctl[24]=0;fctl[25]=0;
    chunks.push(pngChunk('fcTL',fctl));
    const compressed=await compress(frameData(frames[i],width,height));
    if(i===0)chunks.push(pngChunk('IDAT',compressed));
    else{const fdat=new Uint8Array(compressed.length+4);write32(fdat,0,sequence++);fdat.set(compressed,4);chunks.push(pngChunk('fdAT',fdat));}
  }
  chunks.push(pngChunk('IEND',new Uint8Array()));
  return new Blob(chunks,{type:'image/apng'});
}

function frameData(frame,width,height){
  const rowSize=width*4,data=new Uint8Array((rowSize+1)*height);
  for(let y=0;y<height;y++){const target=y*(rowSize+1);data[target]=0;data.set(frame.data.subarray(y*rowSize,(y+1)*rowSize),target+1);}
  return data;
}

async function compress(data){
  const stream=new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function pngChunk(type,data){
  const name=new TextEncoder().encode(type),out=new Uint8Array(data.length+12);
  write32(out,0,data.length);out.set(name,4);out.set(data,8);write32(out,out.length-4,crc32(out.subarray(4,out.length-4)));return out;
}

function crc32(data){let crc=0xffffffff;for(const byte of data)crc=CRC_TABLE[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function write16(data,offset,value){data[offset]=(value>>>8)&255;data[offset+1]=value&255;}
function write32(data,offset,value){data[offset]=(value>>>24)&255;data[offset+1]=(value>>>16)&255;data[offset+2]=(value>>>8)&255;data[offset+3]=value&255;}
function fraction(value){
  let x=value,h0=0,h1=1,k0=1,k1=0;
  for(let i=0;i<32;i++){
    const a=Math.floor(x),h=a*h1+h0,k=a*k1+k0;
    if(h>65535||k>65535)break;
    if(Math.abs(h/k-value)<1e-10||Math.abs(x-a)<1e-12)return[Math.max(1,h),Math.max(1,k)];
    h0=h1;h1=h;k0=k1;k1=k;x=1/(x-a);
  }
  return[Math.max(1,h1),Math.max(1,k1)];
}
