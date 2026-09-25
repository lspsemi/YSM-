import { createIcons, Box, Boxes, BookOpen, Users, Moon, Sun, ArrowLeft, ArrowUpRight, Download, ShoppingBag, Check, Info, Scan, Circle, MessageSquare, Archive, RotateCcw, Maximize, Minimize, Grid2X2, Camera, RotateCw, Play, Pause, PersonStanding, Footprints, MoveUp, ChevronLeft, ChevronRight, ChevronDown, Link, Heart, ShieldCheck, MousePointer2, X, Eye, Sparkles, FileBox, Upload } from 'lucide';
import './style.css';
import { DEFAULT_MODEL_BASE, DEFAULT_MODEL_PAGE, DEFAULT_MODEL_DOWNLOAD } from './model-config.js';

const icons = { Box, Boxes, BookOpen, Users, Moon, Sun, ArrowLeft, ArrowUpRight, Download, ShoppingBag, Check, Info, Scan, Circle, MessageSquare, Archive, RotateCcw, Maximize, Minimize, Grid2X2, Camera, RotateCw, Play, Pause, PersonStanding, Footprints, MoveUp, ChevronLeft, ChevronRight, ChevronDown, Link, Heart, ShieldCheck, MousePointer2, X, Eye, Sparkles, FileBox, Upload };
const icon = name => `<i data-lucide="${name}"></i>`;
const materialIcon = name => `<span class="material-symbol-icon" aria-hidden="true">${name}</span>`;
const external = 'target="_blank" rel="noopener noreferrer"';
const source = DEFAULT_MODEL_PAGE;
const minecraftColors={0:'#000000',1:'#0000aa',2:'#00aa00',3:'#00aaaa',4:'#aa0000',5:'#aa00aa',6:'#ffaa00',7:'#aaaaaa',8:'#555555',9:'#5555ff',a:'#55ff55',b:'#55ffff',c:'#ff5555',d:'#ff55ff',e:'#ffff55',f:'#ffffff'};
function minecraftTextRuns(value){
  const format={color:null,bold:false,italic:false,underline:false,strike:false},runs=[];let buffer='';
  const flush=()=>{if(buffer){runs.push({text:buffer,...format});buffer='';}};
  const reset=()=>{format.color=null;format.bold=false;format.italic=false;format.underline=false;format.strike=false;};
  const source=String(value??'');
  for(let i=0;i<source.length;i++){
    if(source[i]!=='§'||i+1>=source.length){buffer+=source[i];continue;}
    const hex=/^§x(?:§[0-9a-f]){6}/i.exec(source.slice(i));
    if(hex){flush();format.color='#'+[...hex[0].matchAll(/§([0-9a-f])/gi)].map(item=>item[1]).join('');format.bold=false;format.italic=false;format.underline=false;format.strike=false;i+=hex[0].length-1;continue;}
    const code=source[i+1].toLowerCase();if(!/[0-9a-fk-or]/.test(code)){buffer+=source[i];continue;}flush();i++;
    if(minecraftColors[code]){reset();format.color=minecraftColors[code];}
    else if(code==='r')reset();
    else if(code==='l')format.bold=true;else if(code==='o')format.italic=true;else if(code==='n')format.underline=true;else if(code==='m')format.strike=true;
  }
  flush();return runs;
}
const escapeText=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const minecraftRunStyle=run=>[run.color?`color:${run.color}`:'',run.bold?'font-weight:700':'',run.italic?'font-style:italic':'',run.underline||run.strike?`text-decoration:${[run.underline?'underline':'',run.strike?'line-through':''].filter(Boolean).join(' ')}`:''].filter(Boolean).join(';');
const minecraftTextHtml=value=>minecraftTextRuns(value).map(run=>{const style=minecraftRunStyle(run);return `<span${style?` style="${style}"`:''}>${escapeText(run.text)}</span>`;}).join('');
const minecraftTextSvg=value=>minecraftTextRuns(value).map(run=>{const style=minecraftRunStyle(run);return `<tspan${style?` style="${style.replaceAll('color:','fill:')}"`:''}>${escapeText(run.text)}</tspan>`;}).join('');
const stripWheelMarker=value=>String(value??'').replace(/^((?:§x(?:§[0-9a-f]){6}|§[0-9a-fk-or])*)#/i,'$1');

document.querySelector('#app').innerHTML = `
  <header class="site-header"><div class="header-inner">
    <a class="brand" href="./" aria-label="YSM 预览器首页"><span class="brand-symbol">${icon('box')}</span><span>YSM <span class="brand-light">预览器</span></span></a>
    <nav class="top-nav" aria-label="主导航"><a class="current" href="#details">${icon('boxes')}<span>模型</span></a></nav>
    <div class="header-actions"><span class="local-badge"><span></span>本地预览</span><button class="icon-button" id="import-button" aria-label="导入模型文件夹" title="导入模型文件夹">${icon('upload')}</button><input id="model-folder" type="file" webkitdirectory directory multiple hidden><button class="icon-button" id="bag-button" aria-label="打开收藏袋" title="收藏袋">${icon('shopping-bag')}<span id="bag-count" hidden>1</span></button><button class="icon-button" id="theme-button" aria-label="切换到深色模式" title="切换主题">${icon('moon')}</button><a class="original-button" href="${source}" ${external}>访问原站 ${icon('arrow-up-right')}</a></div>
  </div></header>
  <main class="page-shell">
    <div class="breadcrumb"><a href="https://alltheysm.st/models" ${external}>${icon('arrow-left')} 模型库</a><span>/</span><span>模型详情</span><span>/</span><strong id="breadcrumb-model-name">香奈美</strong></div>
    <div class="model-layout">
      <aside class="model-sidebar">
        <div class="cover-wrap"><img class="cover" alt="游戏内人物卡预览" hidden><span class="cover-badge">${icon('box')} YSM MODEL</span><button class="cover-preview" id="cover-preview">${icon('scan')} 查看 3D 预览 ${icon('arrow-up-right')}</button></div>
        <h2 class="cover-caption">游戏内人物卡预览</h2>
        <div class="download-actions"><a class="button primary" href="${DEFAULT_MODEL_DOWNLOAD}?format=ysm" target="_blank" rel="noopener noreferrer">${icon('download')} 下载模型 <span>.ysm</span></a><button class="button secondary" id="collect-button">${icon('shopping-bag')} 加入收藏袋</button><a class="zip-link" href="${DEFAULT_MODEL_DOWNLOAD}?format=zip" target="_blank" rel="noopener noreferrer">下载 ZIP 文件 ${icon('arrow-up-right')}</a></div>
        <div class="sidebar-meta"><span>模型版本</span><strong>1.0 <span class="tiny-dot"></span><em>当前版本</em></strong><span>适用模组</span><strong>Yes Steve Model</strong><span>模型授权</span><strong>CC0 公共领域 ${icon('shield-check')}</strong></div>
        <p class="sidebar-note">${icon('info')} 模型及作者信息来自 All the YSM</p>
      </aside>
      <section class="model-content">
        <div class="title-row"><div><div class="eyebrow">MODEL OVERVIEW <span> / </span> 模型详情</div><h1 id="model-title"><span class="model-name">香奈美</span><span class="default-tag" hidden>默认模型</span></h1><p class="subtitle" id="model-tips">哔哩哔哩作者 AnluoSakura 制作</p></div><span class="model-mark">${icon('box')}</span></div>
        <div class="tabs" role="tablist" aria-label="模型内容"><button role="tab" id="tab-details" aria-controls="details-panel" aria-selected="true" data-tab="details">${icon('info')} 详情</button><button role="tab" id="tab-preview" aria-controls="preview-panel" aria-selected="false" data-tab="preview" tabindex="-1">${icon('scan')} 预览 <span class="tab-pill">3D</span></button><button role="tab" disabled title="本阶段仅实现详情和预览">${icon('message-square')} 评论</button><button role="tab" disabled title="本阶段仅实现详情和预览">${icon('archive')} 发行版</button><span class="tab-indicator" aria-hidden="true"></span></div>
        <div id="details-panel" class="details-panel" role="tabpanel" aria-labelledby="tab-details">
          <section class="detail-section"><div class="section-title"><h2>${icon('users')} 作者</h2><span id="author-count">来自模型包信息</span></div><div class="author-grid" id="author-grid"></div></section>
          <section class="detail-section" id="mod-support-section"><div class="section-title"><h2>${icon('boxes')} 模组动作</h2><span id="mod-count">未提供适配信息</span></div><div class="mod-grid" id="mod-grid"></div></section>
          <section class="detail-section" id="model-links-section"><div class="section-title"><h2>${icon('link')} 相关链接</h2></div><div class="link-grid" id="model-links"></div></section>
          <section class="license-card" id="model-license"><div class="license-symbol">${icon('shield-check')}</div><div class="license-body"><div class="license-title"><h2 id="license-name">许可信息</h2><span>模型授权</span></div><p id="license-description"></p><div class="permissions" id="license-permissions"></div></div><a id="license-link" href="https://creativecommons.org/publicdomain/zero/1.0/" ${external} aria-label="查看授权信息">${icon('arrow-up-right')}</a></section>
        </div>
        <div id="preview-panel" role="tabpanel" aria-labelledby="tab-preview" hidden>
          <div class="preview-heading"><span><span class="tiny-dot"></span>实时模型预览</span><span id="render-status">准备加载</span></div>
          <div class="viewer-shell" id="viewer-shell"><div id="viewport"><canvas id="scene" aria-label="香奈美三维模型，拖动旋转，滚轮缩放"></canvas><div class="loading-state" id="loading-state"><span class="spinner"></span><strong>正在准备模型</strong><span>加载几何、贴图与动画…</span></div><div class="viewer-tools"><button class="icon-button" id="pose-walk" title="走" aria-label="走">${materialIcon('directions_walk')}</button><button class="icon-button" id="pose-run" title="跑" aria-label="跑">${materialIcon('directions_run')}</button><button class="icon-button" id="pose-jump" title="跳" aria-label="跳">${materialIcon('arrow_upward')}</button><button class="icon-button" id="action-wheel-button" title="动作轮盘" aria-label="动作轮盘" aria-haspopup="menu" aria-expanded="false">${materialIcon('donut_large')}</button><button class="wheel-close-button" id="action-wheel-close" type="button" aria-label="关闭动作轮盘" title="关闭轮盘" hidden>×</button><button class="icon-button" id="center-view-button" title="居中视角" aria-label="居中视角">${materialIcon('filter_center_focus')}</button><button class="icon-button" id="reset-pose-button" title="重置姿势" aria-label="重置姿势">${materialIcon('restart_alt')}</button><button class="icon-button" id="fullscreen-button" title="全屏" aria-label="全屏">${materialIcon('fullscreen')}</button><div class="texture-picker" id="texture-picker" hidden><button class="texture-picker-trigger" id="texture-picker-trigger" type="button" aria-label="选择材质" title="选择材质" aria-haspopup="listbox" aria-expanded="false"><span id="texture-current">texture</span>${icon('chevron-down')}</button><div class="texture-picker-options" id="texture-picker-options" role="listbox" aria-label="模型材质" hidden></div></div></div><div class="action-wheel" id="action-wheel" role="menu" aria-label="选择模型动作" hidden></div><div class="view-presets"><button class="selected" data-view="front">正面</button><button data-view="side">侧面</button><button data-view="back">背面</button></div><div class="axis-widget" aria-hidden="true"><span>Y</span><span>Z</span><span>X</span></div><div class="viewport-hint">${icon('mouse-pointer-2')} 拖动旋转 <span>·</span> 滚轮缩放 <span>·</span> 右键平移</div></div>
          <div class="animation-panel"><div class="animation-top"><div class="animation-title">${icon('sparkles')} 动画 <span id="animation-name">待机</span></div><div class="animation-choices"><button data-animation="idle" class="selected">${icon('person-standing')} 待机</button><button data-animation="walk">${icon('footprints')} 行走</button><button data-animation="run">${icon('footprints')} 奔跑</button><button data-animation="jump">${icon('move-up')} 跳跃</button></div></div><div class="timeline-row"><button id="play-button" class="play-button" aria-label="暂停动画">${icon('pause')}</button><span id="time-current">0.00</span><input id="timeline" type="range" min="0" max="3" step="0.001" value="0" aria-label="动画播放进度"><span id="time-duration">3.00 s</span><select id="speed" aria-label="动画播放速度"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></div></div></div>
          <div class="preview-note">${icon('info')} 动画为基础关键帧预览，游戏内的交互效果以实际表现为准。</div>
        </div>
      </section>
    </div>
    <footer><span class="footer-brand">${icon('box')} YSM 预览器</span><span>让每一个模型，都有自己的舞台。</span><a href="${source}" ${external}>参考 All the YSM ${icon('arrow-up-right')}</a></footer>
  </main>
  <div class="toast" id="toast" role="status" hidden></div>
  <dialog id="bag-dialog"><div class="dialog-title"><h2>${icon('shopping-bag')} 收藏袋</h2><button class="icon-button" id="close-bag" aria-label="关闭收藏袋">${icon('x')}</button></div><div id="bag-content"></div><p class="dialog-note">收藏仅保存在当前浏览器。</p></dialog>`;

function refreshIcons() { createIcons({ icons, attrs: { 'stroke-width': 1.7 } }); }
refreshIcons();
refreshIcons();
let viewer, viewerPromise, toastTimer, coverAnimationUrl,coverPixelSize='',coverResizeTimer,coverGenerationQueue=Promise.resolve(),activeModelName='§b[§d§l香奈美§b]§f-§e重制';
let avatarObjectUrls=[];
const safeExternalUrl=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}};
function renderMinecraftText(target,value){
  for(const run of minecraftTextRuns(value)){const span=document.createElement('span');span.className='minecraft-title-text';span.textContent=run.text;if(run.color)span.style.color=run.color;if(run.bold)span.style.fontWeight='700';if(run.italic)span.style.fontStyle='italic';if(run.underline||run.strike)span.style.textDecoration=[run.underline?'underline':'',run.strike?'line-through':''].filter(Boolean).join(' ');target.append(span);}
}
function renderModelMetadata(ysmJson,avatarFiles,isImported=false){
  const metadata=ysmJson?.metadata||{},authors=Array.isArray(metadata.authors)?metadata.authors:[],files=avatarFiles instanceof Map?avatarFiles:new Map();
  for(const url of avatarObjectUrls)URL.revokeObjectURL(url);avatarObjectUrls=[];
  const title=document.querySelector('#model-title'),tag=title.querySelector('.default-tag'),name=metadata.name||'未命名模型',nameText=document.createElement('span');activeModelName=name;nameText.className='model-name';
  renderMinecraftText(nameText,name);title.replaceChildren(nameText,tag);
  const plainName=String(name).replace(/§x(?:§[0-9a-f]){6}/gi,'').replace(/§[0-9a-fk-or]/gi,'').trim();tag.hidden=plainName.toLowerCase()!=='default';
  const breadcrumbName=document.querySelector('#breadcrumb-model-name');breadcrumbName.replaceChildren();renderMinecraftText(breadcrumbName,name);
  document.title=`${plainName||'YSM 模型'} · YSM 预览器`;
  const tips=document.querySelector('#model-tips');tips.replaceChildren();renderMinecraftText(tips,metadata.tips||'未提供模型说明');
  const authorGrid=document.querySelector('#author-grid');authorGrid.replaceChildren();
  for(const author of authors){
    const card=document.createElement('article');card.className='author-card';
    const image=document.createElement('img');image.alt=author.name?`${author.name}的头像`:'作者头像';
    const avatarPath=String(author.avatar||'').replace(/^\.?\//,'').replace(/\\/g,'/');
    const avatarFile=files.get(avatarPath.toLowerCase());
    if(avatarFile){const url=URL.createObjectURL(avatarFile);avatarObjectUrls.push(url);image.src=url;}
    else if(avatarPath&&!isImported)image.src=`${DEFAULT_MODEL_BASE}${avatarPath.split('/').map(encodeURIComponent).join('/')}`;
    else image.hidden=true;
    image.onerror=()=>{image.hidden=true;};
    const copy=document.createElement('div');copy.className='author-copy';
    const name=document.createElement('strong');name.textContent=author.name||'未命名作者';copy.append(name);
    if(author.comment){const comment=document.createElement('p');comment.className='author-comment';comment.textContent=author.comment;copy.append(comment);}
    const role=document.createElement('span');role.className='role-tag';role.textContent=author.role||'作者';
    const contacts=document.createElement('div');contacts.className='author-contacts';
    for(const [platform,value] of Object.entries(author.contact||{})){const href=safeExternalUrl(value);if(!href)continue;const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=platform;link.title=`${author.name||'作者'} · ${platform}`;contacts.append(link);}
    card.append(image,copy,role);if(contacts.childElementCount)card.append(contacts);authorGrid.append(card);
  }
  if(!authors.length){const empty=document.createElement('p');empty.className='author-empty';empty.textContent='这个模型包没有提供作者信息。';authorGrid.append(empty);}
  document.querySelector('#author-count').textContent=authors.length?`${authors.length} 位作者`:'模型未提供作者信息';
  const animationFiles=ysmJson?.files?.player?.animation||{},modCatalog={
    carryon:{title:'搬运',subtitle:'Carry On',image:'/assets/carryon.webp'},
    tac:{title:'永恒枪械工坊',subtitle:'Timeless and Classics Zero',image:'/assets/tac.webp'},
    swem:{title:'SWEM',subtitle:'Star Worm Equestrian Mod'},
    parcool:{title:'ParCool',subtitle:'Parkour mod'},
    slashblade:{title:'SlashBlade',subtitle:'Slash Blade'},
    tlm:{title:'东方女仆',subtitle:'Touhou Little Maid'},
  };
  const modGrid=document.querySelector('#mod-grid');modGrid.replaceChildren();let supportedMods=0;
  for(const [key,definition] of Object.entries(modCatalog)){
    if(!animationFiles[key])continue;supportedMods++;
    const card=document.createElement('div');card.className='mod-card';
    if(definition.image){const image=document.createElement('img');image.src=definition.image;image.alt=`${definition.title}模组图标`;card.append(image);}
    else{const image=document.createElement('span');image.className='link-icon';image.innerHTML=icon('file-box');card.append(image);}
    const copy=document.createElement('div'),name=document.createElement('strong'),subtitle=document.createElement('span'),status=document.createElement('span');
    name.textContent=definition.title;subtitle.textContent=definition.subtitle;copy.append(name,subtitle);status.className='supported';status.innerHTML=icon('check')+' 已适配';card.append(copy,status);modGrid.append(card);
  }
  document.querySelector('#mod-count').textContent=supportedMods?`已适配 ${supportedMods} 个模组`:'模型未提供适配动画';document.querySelector('#mod-support-section').hidden=!supportedMods;
  const linkGrid=document.querySelector('#model-links');linkGrid.replaceChildren();
  const links=metadata.link||{};
  for(const [key,value] of [['home',links.home],['donate',links.donate]]){
    const href=safeExternalUrl(value);if(!href)continue;
    const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';
    const iconWrap=document.createElement('span');iconWrap.className=`link-icon${key==='donate'?' pink':''}`;iconWrap.innerHTML=icon(key==='donate'?'heart':'box');
    const copy=document.createElement('div'),name=document.createElement('strong'),desc=document.createElement('span');
    name.textContent=key==='donate'?'支持作者':'主页';desc.textContent=new URL(href).host;copy.append(name,desc);link.append(iconWrap,copy);link.insertAdjacentHTML('beforeend',icon('arrow-up-right'));linkGrid.append(link);
  }
  document.querySelector('#model-links-section').hidden=!linkGrid.childElementCount;
  const license=metadata.license||{},licenseType=String(license.type||'未提供').trim(),normalized=licenseType.toLowerCase().replace(/[\s_-]/g,'');
  const isCc0=normalized==='cc0'||normalized==='cczero'||normalized==='cc0.0';
  document.querySelector('#license-name').textContent=isCc0?'CC0 公共领域':licenseType;
  document.querySelector('#license-description').textContent=license.desc||(isCc0?'作者放弃权利，可自由使用，无需署名。':'模型包未提供授权说明。');
  const permissions=document.querySelector('#license-permissions');permissions.replaceChildren();
  if(isCc0)for(const label of ['自由分享','允许修改','可商业使用']){const item=document.createElement('span');item.innerHTML=icon('check');item.append(document.createTextNode(` ${label}`));permissions.append(item);}
  const licenseLink=document.querySelector('#license-link');licenseLink.hidden=!isCc0;if(isCc0)licenseLink.href='https://creativecommons.org/publicdomain/zero/1.0/';
  document.querySelector('#model-license').hidden=!licenseType||licenseType==='未提供';
  refreshIcons();
}
fetch(`${DEFAULT_MODEL_BASE}ysm.json`).then(response=>response.ok?response.json():null).then(data=>{if(data)renderModelMetadata(data);}).catch(error=>console.warn('Could not load model details:',error));
function refreshCoverAnimation(instance,force=true) {
  coverGenerationQueue=coverGenerationQueue.catch(()=>{}).then(()=>generateCoverAnimation(instance,force));
  return coverGenerationQueue;
}
async function generateCoverAnimation(instance,force) {
  const cover=document.querySelector('.cover');
  const bounds=cover.closest('.cover-wrap').getBoundingClientRect(),pixelRatio=window.devicePixelRatio||1;
  const width=Math.max(1,Math.round(bounds.width*pixelRatio)),height=Math.max(1,Math.round(bounds.height*pixelRatio)),pixelSize=`${width}x${height}`;
  if(!force&&pixelSize===coverPixelSize)return;
  cover.hidden=true;cover.removeAttribute('src');
  if(coverAnimationUrl){URL.revokeObjectURL(coverAnimationUrl);coverAnimationUrl=null;}
  const task=instance.generateCoverApng({width,height});instance.coverAnimationPromise=task;
  try { const blob=await task;if(!blob)return;const url=URL.createObjectURL(blob);cover.src=url;cover.hidden=false;coverAnimationUrl=url; }
  catch(error) { console.warn('Could not generate preview cover APNG:',error); }
  finally { if(instance.coverAnimationPromise===task)instance.coverAnimationPromise=null; }
  if(coverAnimationUrl)coverPixelSize=pixelSize;
}
const texturePicker=document.querySelector('#texture-picker'),textureTrigger=document.querySelector('#texture-picker-trigger'),textureCurrent=document.querySelector('#texture-current'),textureOptions=document.querySelector('#texture-picker-options');
function refreshTexturePicker(instance){
  const entries=instance?.textureVariants||[];textureOptions.replaceChildren();
  for(const entry of entries){const option=document.createElement('button');option.type='button';option.className='texture-picker-option';option.id=`texture-option-${entries.indexOf(entry)}`;option.dataset.textureId=entry.id;option.setAttribute('role','option');option.setAttribute('aria-selected',String(entry.id===instance.currentTextureId));option.textContent=entry.label;option.onclick=()=>{const changed=viewer?.currentTextureId!==entry.id;if(viewer?.setTexture(entry.id)&&changed)refreshCoverAnimation(viewer);textureCurrent.textContent=entry.label;textureTrigger.setAttribute('aria-activedescendant',option.id);closeTexturePicker();refreshTexturePicker(viewer);};textureOptions.append(option);}
  texturePicker.hidden=entries.length<2;
  const selected=entries.find(entry=>entry.id===instance?.currentTextureId)||entries[0];if(selected){textureCurrent.textContent=selected.label;textureTrigger.setAttribute('aria-activedescendant',`texture-option-${entries.indexOf(selected)}`);}
}
let textureCloseTimer;
function closeTexturePicker(){textureTrigger.setAttribute('aria-expanded','false');if(textureOptions.hidden)return;textureOptions.classList.add('is-closing');clearTimeout(textureCloseTimer);textureCloseTimer=setTimeout(()=>{textureOptions.hidden=true;textureOptions.classList.remove('is-closing');},150);}
textureTrigger.onclick=()=>{const open=textureOptions.hidden;clearTimeout(textureCloseTimer);textureOptions.classList.remove('is-closing');textureOptions.hidden=!open;textureTrigger.setAttribute('aria-expanded',String(open));if(open)textureOptions.querySelector('[aria-selected="true"]')?.focus();};
document.addEventListener('pointerdown',event=>{if(!texturePicker.contains(event.target))closeTexturePicker();});
texturePicker.addEventListener('keydown',event=>{if(event.key==='Escape'){closeTexturePicker();textureTrigger.focus();return;}if(event.key==='ArrowDown'&&textureOptions.hidden){event.preventDefault();textureTrigger.click();}});
function ensureViewer() {
  if(!viewerPromise) viewerPromise=import('./viewer.js').then(async ({ ModelViewer })=>{ const instance=new ModelViewer(document.querySelector('#scene'),document.querySelector('#viewport'),updateTime); await instance.load(); refreshTexturePicker(instance); setTimeout(()=>refreshCoverAnimation(instance),50); return instance; });
  return viewerPromise;
}
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.hidden=true, 3000); }
function getStored(key) { try { return localStorage.getItem(key); } catch { return null; } }
function store(key,value) { try { localStorage.setItem(key,value); } catch { /* The UI also works without persistent storage. */ } }
function setTheme(dark) { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; const b=document.querySelector('#theme-button'); b.innerHTML=icon(dark?'sun':'moon'); b.setAttribute('aria-label',`切换到${dark?'浅':'深'}色模式`); store('ysm-theme',dark?'dark':'light'); viewer?.setTheme(dark); refreshIcons(); }
setTheme(getStored('ysm-theme') === 'dark');
document.querySelector('#theme-button').onclick=()=>setTheme(document.documentElement.dataset.theme!=='dark');
document.querySelector('#import-button').onclick=()=>document.querySelector('#model-folder').click();
document.querySelector('#model-folder').onchange=async (event)=>{
  const files=[...event.target.files]; const byPath=new Map(files.map(file=>[file.webkitRelativePath.split('/').slice(1).join('/'),file]));
  const modelFile=byPath.get('models/main.json'); const textureEntries=[...byPath.entries()].filter(([path])=>/^textures\/.*\.(png|jpg|jpeg|webp)$/i.test(path)).map(([path,file])=>({id:path,path,label:path.split('/').pop().replace(/\.[^.]+$/,''),file}));
  if(!modelFile||!textureEntries.length){toast('文件夹中需要 models/main.json 和 textures 贴图');event.target.value='';return;}
  try { if(!viewerPromise) await selectTab('preview'); viewer=await viewerPromise; viewer.setActive(false); const metadataFile=byPath.get('ysm.json'),metadata=metadataFile?JSON.parse(await metadataFile.text()):{},getPackageFile=path=>byPath.get(String(path||'').replaceAll('\\','/').replace(/^\.\//,'')); let animationFiles=Object.entries(metadata.files?.player?.animation||{}).map(([id,path])=>({id,path,file:getPackageFile(path)})).filter(entry=>entry.file); if(!animationFiles.length)animationFiles=[...byPath.entries()].filter(([path])=>/^animations\/.*\.json$/i.test(path)).map(([path,file])=>({id:path.split('/').pop().replace(/\.animation\.json$/i,''),path,file})); let controllerFiles=(metadata.files?.player?.animation_controllers||[]).map(path=>({path,file:getPackageFile(path)})).filter(entry=>entry.file); if(!controllerFiles.length)controllerFiles=[...byPath.entries()].filter(([path])=>/^controller\/.*\.json$/i.test(path)).map(([path,file])=>({path,file})); const avatarFiles=new Map([...byPath].filter(([path])=>path.toLowerCase().startsWith('avatar/')).map(([path,file])=>[path.toLowerCase(),file])); await viewer.loadFiles({model:modelFile,textures:textureEntries,texture:textureEntries[0]?.file,animationFiles,controllerFiles,metadata:metadataFile}); refreshTexturePicker(viewer); renderModelMetadata(metadata,avatarFiles,true); viewer.setActive(true); document.querySelector('#loading-state').hidden=true; refreshCoverAnimation(viewer); toast('模型文件夹导入成功'); }
  catch(error){console.error(error);toast(`导入失败：${error.message}`);}
  event.target.value='';
};

async function selectTab(name,focus=false) {
  for(const button of document.querySelectorAll('[data-tab]')) { const selected=button.dataset.tab===name; button.setAttribute('aria-selected',selected); button.tabIndex=selected?0:-1; if(selected&&focus)button.focus(); }
  syncTabIndicator();
  const activePanel=document.querySelector(name==='details'?'#details-panel':'#preview-panel');
  document.querySelector('#details-panel').hidden=name!=='details'; document.querySelector('#preview-panel').hidden=name!=='preview';
  activePanel.classList.remove('tab-panel-enter');void activePanel.offsetWidth;activePanel.classList.add('tab-panel-enter');
  history.replaceState(null,'',`#${name}`);
  if(name==='preview') {
    try { viewer=await ensureViewer(); viewer.setTheme(document.documentElement.dataset.theme==='dark'); viewer.setActive(document.querySelector('#preview-panel').hidden===false); document.querySelector('#loading-state').hidden=true; document.querySelector('#render-status').textContent=`已加载 · ${viewer.skeleton?.index?.size||Object.keys(viewer.bones||{}).length} 骨骼`; }
    catch(error) { console.error(error); document.querySelector('#render-status').textContent='加载失败'; const loading=document.querySelector('#loading-state'); loading.innerHTML=`<strong>模型暂时无法加载</strong><span>${String(error?.message||error)}</span><button class="button secondary" id="retry">重新加载</button>`; document.querySelector('#retry').onclick=()=>location.reload(); }
  } else viewer?.setActive(false);
}
function syncTabIndicator(){const selected=document.querySelector('.tabs [data-tab][aria-selected="true"]'),indicator=document.querySelector('.tab-indicator');if(!selected||!indicator)return;indicator.style.width=`${selected.offsetWidth}px`;indicator.style.transform=`translateX(${selected.offsetLeft}px)`;}
document.querySelectorAll('[data-tab]').forEach(button=>{
  button.onclick=event=>{
    const rect=button.getBoundingClientRect(),diameter=Math.max(rect.width,rect.height)*1.5,ripple=document.createElement('span');
    const x=event.detail===0?rect.width/2:event.clientX-rect.left,y=event.detail===0?rect.height/2:event.clientY-rect.top;
    ripple.className='tab-ripple';ripple.style.width=ripple.style.height=`${diameter}px`;ripple.style.left=`${x-diameter/2}px`;ripple.style.top=`${y-diameter/2}px`;
    button.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});selectTab(button.dataset.tab);
  };
  button.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();selectTab(e.key==='Home'?'details':e.key==='End'?'preview':button.dataset.tab==='details'?'preview':'details',true);}};
});
window.addEventListener('resize',syncTabIndicator);requestAnimationFrame(syncTabIndicator);
document.querySelector('.top-nav .current').onclick=e=>{e.preventDefault();selectTab('details');};
document.querySelector('#cover-preview').onclick=()=>selectTab('preview');

let collected=getStored('ysm-collected')==='true';
function updateCollection() { const b=document.querySelector('#collect-button');b.innerHTML=icon(collected?'check':'shopping-bag')+(collected?'已加入收藏袋':'加入收藏袋');b.classList.toggle('collected',collected);b.setAttribute('aria-pressed',collected);document.querySelector('#bag-count').hidden=!collected;refreshIcons(); }
document.querySelector('#collect-button').onclick=()=>{collected=!collected;store('ysm-collected',collected);updateCollection();toast(collected?'已加入收藏袋':'已从收藏袋移除');};updateCollection();
const dialog=document.querySelector('#bag-dialog');
document.querySelector('#bag-button').onclick=()=>{const content=document.querySelector('#bag-content');content.replaceChildren();if(collected){const item=document.createElement('div');item.className='bag-item';const image=document.createElement('img');image.src=document.querySelector('.cover').src;image.alt='当前模型预览';const copy=document.createElement('div'),name=document.createElement('strong'),version=document.createElement('p');renderMinecraftText(name,activeModelName);version.textContent='模型 · 1.0';copy.append(name,version);const download=document.createElement('a');download.className='button primary';download.href=`${DEFAULT_MODEL_DOWNLOAD}?format=zip`;download.target='_blank';download.rel='noopener noreferrer';download.insertAdjacentHTML('beforeend',icon('download')+' ZIP');item.append(image,copy,download);content.append(item);}else content.innerHTML='<div class="empty-bag">收藏袋还是空的<br><span>把喜欢的模型加入收藏，方便下次查看。</span></div>';refreshIcons();dialog.showModal();};
document.querySelector('#close-bag').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};

function updateTime(time,duration) { document.querySelector('#timeline').max=duration;document.querySelector('#timeline').value=time;document.querySelector('#time-current').textContent=time.toFixed(2);document.querySelector('#time-duration').textContent=`${duration.toFixed(2)} s`; }
function needViewer() { if(!viewer){toast('模型正在加载，请稍候');return false;}return true; }
const animationEntries=()=>Object.keys(viewer?.animations||{}).filter(name=>!/(?:^|[._-])(?:parallel|pre_parallel)(?:[._-]|$)/i.test(name));
const findAnimation=kind=>{
  const names=animationEntries().filter(name=>{
    const clip=viewer.animations[name];return Object.keys(clip?.bones||{}).length>0||Object.keys(clip?.timeline||{}).length>0;
  });
  if(kind==='walk'||kind==='run'||kind==='jump'){
    const words={walk:'(?:walk|walking|行走|走路)',run:'(?:run|running|奔跑|跑步)',jump:'(?:jump|jumping|跳跃|跳)'}[kind];
    // Movement buttons represent ordinary locomotion. Prefer the model's
    // explicit normal/default clip and ignore vehicle, mount, and mod poses.
    const special=/(?:开车|驾驶|骑乘|载具|vehicle|riding|swem:|tac:|parcool:|slashblade:)/i;
    const candidates=names.filter(name=>new RegExp(words,'i').test(name)&&!special.test(name));
    const normal=candidates.find(name=>/(?:^|[._ -])(?:normal|default|普通|正常)(?:$|[._ -])/i.test(name));
    const standard=candidates.find(name=>new RegExp(`^(?:${words})$`,'i').test(name));
    return standard||normal||candidates[0];
  }
  const patterns={idle:[/(?:^|[._-])idle(?:$|[._-])/i,/待机|站立/]};
  return names.find(name=>patterns[kind]?.some(pattern=>pattern.test(name)));
};
function activateAnimation(name,label){if(!name){toast(`当前模型没有${label}动画`);return false;}viewer.setAnimation(name);document.querySelector('#animation-name').textContent=label;document.querySelectorAll('[data-animation]').forEach(button=>button.classList.toggle('selected',button.dataset.animation===name));document.querySelectorAll('#pose-walk,#pose-run,#pose-jump').forEach(button=>button.classList.toggle('active',button.id===`pose-${label==='走'?'walk':label==='跑'?'run':label==='跳'?'jump':''}`));syncPlay();return true;}
let actionWheelPage=0,actionWheelPath=[],actionWheelSettings=null;
const wheelText=value=>minecraftTextRuns(value).map(run=>run.text).join('').trim();
const wheelEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function getWheelEntries(){
  if(actionWheelPath.length){const group=viewer.customAnimationGroups.find(item=>String(item.id)===actionWheelPath.at(-1));return Object.entries(group?.extra_animation||{}).map(([id,label])=>({id,label:wheelText(label)?String(label):id}));}
  return Object.entries(viewer?.customAnimationSlots||{}).map(([id,label])=>({id,label:wheelText(label)?String(label):id}));
}
function getWheelGroup(id){const key=String(id).replace(/^#/,'');return viewer?.customAnimationGroups?.find(group=>String(group.id)===key);}
function getWheelForm(id){const key=wheelText(id).replace(/^#/,'');return viewer?.customAnimationButtons?.find(button=>String(button.id)===key);}
function renderWheelSettings(form){
  const wheel=document.querySelector('#action-wheel'),forms=Array.isArray(form?.config_forms)?form.config_forms:[];
  actionWheelSettings=form;const fields=forms.map((field,index)=>{
    const plainTitle=wheelEscape(wheelText(field.title)||`设置 ${index+1}`),title=minecraftTextHtml(wheelText(field.title)?field.title:`设置 ${index+1}`),description=minecraftTextHtml(field.description||''),path=wheelEscape(field.value||'');
    if(field.type==='range'){
      const min=Number(field.min??0),max=Number(field.max??1),step=Number(field.step??0.01),current=Number(viewer.getMolangValue(path));
      const value=Number.isFinite(current)&&current>=min&&current<=max?current:min;
      const fill=max>min?Math.max(0,Math.min(100,(value-min)/(max-min)*100)):0;
      return `<label class="wheel-setting range-setting"><span>${title}</span><output class="range-value-current">${value}</output><div class="material-slider" style="--range-fill:${fill}%;--thumb-position:${fill}%"><div class="material-slider-track"><span class="material-slider-inactive"></span><span class="material-slider-active"></span></div><input class="material-slider-input" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-wheel-value="${path}" aria-label="${plainTitle}"><div class="material-slider-thumb"><div class="range-value-indicator-container"><output class="range-value-bubble" aria-hidden="true"><span class="range-value-bubble-text">${value}</span></output></div><span class="material-slider-thumb-knob"></span></div></div>${description?`<small>${description}</small>`:''}</label>`;
    }
    if(field.type==='checkbox')return `<label class="wheel-setting check-setting"><input type="checkbox" data-wheel-value="${path}" aria-label="${plainTitle}" ${Number(viewer.getMolangValue(path))?'checked':''}><span>${title}</span>${description?`<small>${description}</small>`:''}</label>`;
    if(field.type==='radio'){
      const options=Object.entries(field.labels||{}),selected=options.find(([,expr])=>Number(viewer.getMolangValue(String(expr).split('=')[0]))===Number(String(expr).split('=').at(-1)))?.[0];
      return `<fieldset class="wheel-setting radio-setting"><legend>${title}</legend><div>${options.map(([label,expr],i)=>`<label><input type="radio" name="wheel-radio-${index}" data-wheel-expression="${wheelEscape(expr)}" ${label===selected||(!selected&&i===0)?'checked':''}><span>${minecraftTextHtml(label)}</span></label>`).join('')}</div>${description?`<small>${description}</small>`:''}</fieldset>`;
    }
    return '';
  }).join('');
  wheel.innerHTML=`<section class="wheel-settings" aria-label="${wheelEscape(wheelText(form?.name||form?.id))}"><header><strong>${minecraftTextHtml(form?.name||form?.id)}</strong><button type="button" data-wheel-settings-close aria-label="关闭设置">${icon('x')}</button></header><div class="wheel-settings-fields">${fields||'<p>此选项没有可调节的设置</p>'}</div></section>`;
  wheel.querySelector('[data-wheel-settings-close]').onclick=()=>{actionWheelSettings=null;renderActionWheel();};
  wheel.querySelectorAll('[data-wheel-value]').forEach(input=>{
    if(input.type==='range'){
      const slider=input.closest('.material-slider');
      input.addEventListener('pointerdown',()=>slider.classList.add('is-adjusting'));
      input.addEventListener('focus',()=>slider.classList.add('is-adjusting'));
      input.addEventListener('blur',()=>slider.classList.remove('is-adjusting'));
      input.addEventListener('pointerup',()=>setTimeout(()=>slider.classList.remove('is-adjusting'),450));
      const syncSlider=()=>{const ratio=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min)||1);slider.style.setProperty('--range-fill',`${ratio*100}%`);slider.style.setProperty('--thumb-position',`${4+ratio*Math.max(0,slider.clientWidth-8)}px`);slider.querySelector('.range-value-bubble-text').textContent=input.value;};
      syncSlider();input.addEventListener('input',syncSlider);
    }
    input.addEventListener('input',()=>{const value=input.type==='checkbox'?(input.checked?1:0):Number(input.value);if(viewer.setMolangVariable(input.dataset.wheelValue,value)){const current=input.closest('.range-setting')?.querySelector('.range-value-current');if(current)current.textContent=String(value);}});
  });
  wheel.querySelectorAll('[data-wheel-expression]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)viewer.setMolangVariable(input.dataset.wheelExpression,0);}));
  refreshIcons();
}
function fitActionWheelControls(){
  const controls=document.querySelector('#action-wheel .action-wheel-controls'),breadcrumbs=controls?.querySelector('.wheel-breadcrumbs');if(!controls||!breadcrumbs||controls.closest('[hidden]'))return;
  const style=getComputedStyle(controls),children=[...controls.children],gaps=(Number.parseFloat(style.gap)||0)*Math.max(0,children.length-1),fixed=children.filter(child=>child!==breadcrumbs).reduce((width,child)=>width+child.getBoundingClientRect().width,0)+gaps+(Number.parseFloat(style.paddingLeft)||0)+(Number.parseFloat(style.paddingRight)||0)+2;
  const available=Math.max(0,window.innerWidth-20),pathWidth=Math.min(breadcrumbs.scrollWidth,Math.max(0,available-fixed));
  breadcrumbs.style.maxWidth=`${pathWidth}px`;controls.style.width=`${Math.min(available,fixed+pathWidth)}px`;
}
function renderActionWheel(){
  const wheel=document.querySelector('#action-wheel');if(actionWheelSettings){renderWheelSettings(actionWheelSettings);return;}
  const entries=getWheelEntries(),pageSize=8,pageCount=Math.max(1,Math.ceil(entries.length/pageSize));actionWheelPage=Math.min(actionWheelPage,pageCount-1);
  const pageEntries=entries.slice(actionWheelPage*pageSize,(actionWheelPage+1)*pageSize),polar=(radius,angle)=>[120+Math.cos(angle)*radius,120+Math.sin(angle)*radius],gearButtons=[];
  const sectors=Array.from({length:8},(_,index)=>{
    const start=-Math.PI/2-Math.PI/8+index*Math.PI/4,end=start+Math.PI/4,[ix,iy]=polar(36,start),[ox,oy]=polar(110.4,start),[ex,ey]=polar(110.4,end),[fx,fy]=polar(36,end),[tx,ty]=polar(82.8,(start+end)/2),[gx,gy]=polar(48,(start+end)/2),entry=pageEntries[index];
    const d=`M ${ix} ${iy} L ${ox} ${oy} A 110.4 110.4 0 0 1 ${ex} ${ey} L ${fx} ${fy} A 36 36 0 0 0 ${ix} ${iy} Z`;
    if(!entry)return `<g class="wheel-sector-empty"><path d="${d}"/></g>`;
    const styledLabel=stripWheelMarker(entry.label),displayLabel=wheelText(styledLabel).replace(/^#/,'')||entry.id,label=wheelEscape(displayLabel),form=getWheelForm(entry.label),group=getWheelGroup(entry.id),animation=viewer.animations?.[entry.id]?entry.id:(viewer.animations?.[displayLabel]?displayLabel:'');
    const isFolder=!!group||entry.id.startsWith('#'),hint=isFolder?'进入子目录':animation?`播放 ${displayLabel}`:'打开设置';
    if(form)gearButtons.push(`<button type="button" class="wheel-sector-gear-button" data-wheel-settings="${wheelEscape(form.id)}" style="left:${gx/240*100}%;top:${gy/240*100}%" aria-label="${label} 设置" title="${label} 设置">⚙</button>`);
    const isPlaying=animation&&viewer.animationName===animation;
    return `<g class="wheel-sector${isFolder?' wheel-sector-folder':''}${isPlaying?' is-playing':''}" role="menuitem" tabindex="0" data-wheel-entry="${wheelEscape(entry.id)}" aria-label="${label}，${wheelEscape(hint)}"${isPlaying?' aria-current="true"':''}><title>${label} · ${wheelEscape(hint)}</title><path d="${d}"/><text x="${tx}" y="${ty+3}" text-anchor="middle">${minecraftTextSvg(styledLabel)}</text></g>`;
  }).join('');
  const breadcrumbs=[{id:'',label:'根目录'},...actionWheelPath.map(id=>{const group=viewer.customAnimationGroups.find(item=>String(item.id)===String(id));return{id:String(id),label:group?.name||id};})];
  const breadcrumbMarkup=breadcrumbs.map((crumb,index)=>{
    const label=wheelText(crumb.label)||String(crumb.id||'根目录'),isCurrent=index===breadcrumbs.length-1;
    const content=minecraftTextHtml(crumb.label||label),aria=wheelEscape(label);
    return `${index?'<span class="wheel-crumb-separator" aria-hidden="true">/</span>':''}${isCurrent?`<span class="wheel-crumb is-current" aria-current="location" aria-label="${aria}">${content}</span>`:`<button type="button" class="wheel-crumb" data-wheel-depth="${index-1}" aria-label="返回${aria}">${content}</button>`}`;
  }).join('');
  const controls=pageCount>1||actionWheelPath.length?`<div class="action-wheel-controls"><nav class="wheel-breadcrumbs" aria-label="动作轮盘路径">${breadcrumbMarkup}</nav><button type="button" id="wheel-prev" aria-label="上一页" ${actionWheelPage===0?'disabled':''}>${icon('chevron-left')}</button><span class="wheel-page-indicator">${actionWheelPage+1} / ${pageCount}</span><button type="button" id="wheel-next" aria-label="下一页" ${actionWheelPage>=pageCount-1?'disabled':''}>${icon('chevron-right')}</button></div>`:'';
  const empty=entries.length?'':`<div class="action-wheel-empty">没有可用的额外动作</div>`;
  wheel.innerHTML=`${controls}<svg class="action-wheel-svg" viewBox="0 0 240 240" role="menu" aria-label="额外动作">${sectors}</svg>${gearButtons.join('')}${empty}`;
  fitActionWheelControls();
  refreshIcons();
  wheel.querySelectorAll('[data-wheel-entry]').forEach(item=>{
    const activate=()=>{const id=item.dataset.wheelEntry,entry=entries.find(value=>value.id===id),group=getWheelGroup(id);if(group){actionWheelPath.push(String(group.id));actionWheelPage=0;renderActionWheel();return;}const entryLabel=wheelText(stripWheelMarker(entry?.label)),animation=viewer.animations?.[id]?id:(viewer.animations?.[entryLabel]?entryLabel:'');if(animation){activateAnimation(animation,entryLabel||animation);renderActionWheel();return;}const form=getWheelForm(entry?.label);if(form)renderWheelSettings(form);};
    item.onclick=()=>activate();item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}};
  });
  wheel.querySelectorAll('[data-wheel-settings]').forEach(item=>{const open=event=>{event.stopPropagation();const form=getWheelForm(item.dataset.wheelSettings);if(form)renderWheelSettings(form);};item.onclick=open;item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(event);}};});
  wheel.querySelectorAll('[data-wheel-depth]').forEach(item=>item.addEventListener('click',()=>{const depth=Number(item.dataset.wheelDepth);actionWheelPath=depth<0?[]:actionWheelPath.slice(0,depth+1);actionWheelPage=0;renderActionWheel();}));
  wheel.querySelector('#wheel-prev')?.addEventListener('click',()=>{actionWheelPage--;renderActionWheel();});
  wheel.querySelector('#wheel-next')?.addEventListener('click',()=>{actionWheelPage++;renderActionWheel();});
  document.querySelector('#action-wheel-close').onclick=closeActionWheel;
}
function closeActionWheel(){document.querySelector('#action-wheel').hidden=true;document.querySelector('#action-wheel-button').setAttribute('aria-expanded','false');document.querySelector('#action-wheel-close').hidden=true;actionWheelPath=[];actionWheelPage=0;actionWheelSettings=null;}
function positionWheelClose(){const toolbar=document.querySelector('.viewer-tools').getBoundingClientRect(),button=document.querySelector('#action-wheel-button').getBoundingClientRect();document.querySelector('#action-wheel-close').style.right=`${Math.max(0,toolbar.right-button.right-1)}px`;}
document.querySelector('#pose-walk').onclick=()=>needViewer()&&activateAnimation(findAnimation('walk'),'走');
document.querySelector('#pose-run').onclick=()=>needViewer()&&activateAnimation(findAnimation('run'),'跑');
document.querySelector('#pose-jump').onclick=()=>needViewer()&&activateAnimation(findAnimation('jump'),'跳');
document.querySelector('#action-wheel-button').onclick=()=>{if(!needViewer())return;const wheel=document.querySelector('#action-wheel');if(!wheel.hidden){closeActionWheel();return;}renderActionWheel();wheel.hidden=false;fitActionWheelControls();document.querySelector('#action-wheel-button').setAttribute('aria-expanded','true');positionWheelClose();document.querySelector('#action-wheel-close').hidden=false;};
window.addEventListener('resize',fitActionWheelControls);
document.querySelector('#center-view-button').onclick=()=>{if(!needViewer())return;viewer.reset();document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('selected',button.dataset.view==='front'));};
document.querySelector('#reset-pose-button').onclick=()=>{if(!needViewer())return;const idle=findAnimation('idle');if(idle)activateAnimation(idle,'待机');else{viewer.time=0;viewer.applyFrame();viewer.onTime(viewer.time,viewer.duration);}};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('#action-wheel').hidden){closeActionWheel();document.querySelector('#action-wheel-button').focus();}});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(!needViewer())return;viewer.setView(b.dataset.view);document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('selected',v===b));});
document.querySelectorAll('[data-animation]').forEach(b=>b.onclick=()=>{if(!needViewer())return;viewer.setAnimation(b.dataset.animation);document.querySelectorAll('[data-animation]').forEach(v=>v.classList.toggle('selected',v===b));document.querySelector('#animation-name').textContent=b.textContent.trim();syncPlay();});
function syncPlay(){const b=document.querySelector('#play-button');b.innerHTML=icon(viewer.playing?'pause':'play');b.setAttribute('aria-label',viewer.playing?'暂停动画':'播放动画');refreshIcons();}
document.querySelector('#play-button').onclick=()=>{if(needViewer()){viewer.playing=!viewer.playing;syncPlay();}};
document.querySelector('#timeline').oninput=e=>{if(needViewer()){viewer.seek(Number(e.target.value));syncPlay();}};
document.querySelector('#speed').onchange=e=>{if(needViewer())viewer.speed=Number(e.target.value);};
document.querySelector('#fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#viewer-shell').requestFullscreen();}catch{toast('当前浏览器不支持全屏预览');}};
document.addEventListener('fullscreenchange',()=>{const b=document.querySelector('#fullscreen-button');const label=document.fullscreenElement?'退出全屏':'全屏';b.innerHTML=materialIcon(document.fullscreenElement?'fullscreen_exit':'fullscreen');b.setAttribute('aria-label',label);b.title=label;refreshIcons();});
window.addEventListener('resize',()=>{if(!document.querySelector('#action-wheel').hidden)positionWheelClose();});
window.addEventListener('resize',()=>{clearTimeout(coverResizeTimer);coverResizeTimer=setTimeout(()=>{if(viewer)refreshCoverAnimation(viewer,false);},180);},{passive:true});
if(location.hash==='#preview')selectTab('preview');else ensureViewer().catch(error=>console.warn('Local model preview could not be initialized:',error));



