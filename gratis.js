/* VOF Órdenes – versión independiente (GitHub Pages):
   - IAG: agente IA con IA gratis (Gemini → Groq → OpenRouter, pasa sola a la siguiente si una falla o se queda sin cupo)
   - GDR: Google Drive directo con "Iniciar sesión con Google" (solo lectura)
   Las claves se guardan solo en este navegador (localStorage), nunca en el código. */
(function(){
'use strict';
function lsG(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
function lsS(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var CFG_K='vof_gratis_cfg';
var DEF={gemKey:'',gemModel:'gemini-flash-latest',gemLite:'gemini-flash-lite-latest',groqKey:'',groqModel:'qwen/qwen3.6-27b',orKey:'',orModel:'openrouter/free',gClient:''};
function cfg(){var c={};try{c=JSON.parse(lsG(CFG_K,'{}'))||{}}catch(e){c={}}Object.keys(DEF).forEach(function(k){if(c[k]==null||String(c[k]).trim()==='')c[k]=DEF[k];else c[k]=String(c[k]).trim()});return c}
function cfgSave(c){lsS(CFG_K,JSON.stringify(c))}

/* ================= IA gratis ================= */
var FRIO={};            /* proveedor -> hasta cuándo no se usa (por cupo agotado o clave mala) */
var ESTADO={};          /* proveedor -> último error, para mostrarlo en la configuración */
function b64(blob){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(String(r.result).replace(/^data:[^,]*,/,''))};r.onerror=no;r.readAsDataURL(blob)})}
function sacaJSON(t){
 t=String(t||'').replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'').trim();
 try{return JSON.parse(t)}catch(e){}
 var a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}
 return null}
function espera(r,txt){
 var ra=r&&r.headers&&r.headers.get&&r.headers.get('retry-after');var s=ra?parseFloat(ra):NaN;
 var m=/retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/.exec(txt||'');if(m)s=parseFloat(m[1]);
 if(/per ?day|perday|daily|RPD|requests per day/i.test(txt||''))return 60*60*1000; /* cupo diario: se descansa una hora y se vuelve a probar */
 return (isFinite(s)&&s>0?s:65)*1000}
async function pedir(url,init,prov){
 var r,txt='';
 try{r=await fetch(url,init)}catch(e){var x=new Error('red');x.code='red';x.det='No se pudo conectar ('+prov+'). Puede ser internet o que el servicio no deje llamarlo desde la página.';throw x}
 txt=await r.text();
 if(r.ok)return txt;
 var er=new Error('http');er.status=r.status;
 if(r.status===429){er.code='cupo';er.ms=espera(r,txt);er.det='Sin cupo por ahora'}
 else if(r.status===401||r.status===403){er.code='clave';er.det='La clave no sirve o no tiene permiso'}
 else if(r.status===413){er.code='grande';er.det='Las fotos pesan demasiado para este proveedor'}
 else if(r.status>=500){er.code='caido';er.det='El servicio no respondió ('+r.status+')'}
 else{er.code='error';var m=/"message"\s*:\s*"([^"]{0,220})/.exec(txt);er.det='Error '+r.status+(m?': '+m[1]:'')}
 throw er}
async function gemini(c,prompt,imgs,eco){
 var parts=[{text:prompt}];for(var i=0;i<imgs.length;i++)parts.push({inline_data:{mime_type:'image/jpeg',data:imgs[i]}});
 var model=eco?c.gemLite:c.gemModel;
 var txt=await pedir('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',
  {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':c.gemKey},
   body:JSON.stringify({contents:[{role:'user',parts:parts}],generationConfig:{temperature:0.2,responseMimeType:'application/json'}})},'Gemini');
 var j=JSON.parse(txt);
 if(!j.candidates||!j.candidates.length){var e=new Error('refused');e.code=j.promptFeedback&&j.promptFeedback.blockReason?'refused':'vacio';e.det='Gemini no devolvió respuesta';throw e}
 return((j.candidates[0].content||{}).parts||[]).map(function(p){return p.text||''}).join('')}
async function openaiLike(url,key,model,prompt,imgs,extra,prov){
 var content=[{type:'text',text:prompt}];imgs.forEach(function(d){content.push({type:'image_url',image_url:{url:'data:image/jpeg;base64,'+d}})});
 var h={'Content-Type':'application/json','Authorization':'Bearer '+key};Object.keys(extra||{}).forEach(function(k){h[k]=extra[k]});
 var txt=await pedir(url,{method:'POST',headers:h,body:JSON.stringify({model:model,temperature:0.2,messages:[{role:'user',content:imgs.length?content:prompt}]})},prov);
 var j=JSON.parse(txt),m=j.choices&&j.choices[0]&&j.choices[0].message;
 if(!m){var e=new Error('vacio');e.code='vacio';e.det=prov+' no devolvió respuesta';throw e}
 return typeof m.content==='string'?m.content:(m.content||[]).map(function(p){return p.text||''}).join('')}
/* cuántas fotos aguanta cada proveedor (Groq: máximo 3 imágenes y unos 4 MB por petición) */
function recorta(imgs,maxN,maxB){var out=[],t=0;for(var i=0;i<imgs.length&&out.length<maxN;i++){if(t+imgs[i].length>maxB&&out.length)break;out.push(imgs[i]);t+=imgs[i].length}return out}
function nota(n,total){return n<total?'\n\nNOTA DEL SISTEMA: por el límite de este proveedor solo se adjuntan las primeras '+n+' de las '+total+' imágenes. Lo que no veas puede estar en las que faltan: márcalo DUDOSO, no NO.':''}
var PROV=[
 {id:'gem',nom:'Gemini',tiene:function(c){return!!c.gemKey},run:function(c,p,im,eco){return gemini(c,p,im,eco)}},
 {id:'groq',nom:'Groq',tiene:function(c){return!!c.groqKey},run:function(c,p,im){var r=recorta(im,3,3.6e6);return openaiLike('https://api.groq.com/openai/v1/chat/completions',c.groqKey,c.groqModel,p+nota(r.length,im.length),r,null,'Groq')}},
 {id:'or',nom:'OpenRouter',tiene:function(c){return!!c.orKey},run:function(c,p,im){var r=recorta(im,4,8e6);return openaiLike('https://openrouter.ai/api/v1/chat/completions',c.orKey,c.orModel,p+nota(r.length,im.length),r,{'HTTP-Referer':location.origin,'X-Title':'VOF Ordenes'},'OpenRouter')}}
];
var IAG={ultimo:'',
 limits:function(){return Promise.resolve({images:{maxCount:8}})},
 hayClaves:function(){var c=cfg();return PROV.some(function(p){return p.tiene(c)})},
 json:async function(prompt,opt){
  opt=opt||{};var c=cfg(),imgs=[];
  for(var i=0;i<(opt.images||[]).length;i++){try{imgs.push(await b64(opt.images[i]))}catch(e){}}
  var lista=PROV.filter(function(p){return p.tiene(c)});
  if(!lista.length)throw{code:'sin_claves'};
  var cupo=false,ultimo=null,now=Date.now();
  var vivos=lista.filter(function(p){return!(FRIO[p.id]>now)});
  if(!vivos.length){throw{code:'rate_limited'}}
  for(var k=0;k<vivos.length;k++){var p=vivos[k];
   try{var t=await p.run(c,prompt,imgs,opt.modelTier==='quick');var j=sacaJSON(t);
    if(!j){var e=new Error('json');e.code='json';e.det=p.nom+' respondió en un formato que no se pudo leer';throw e}
    ESTADO[p.id]='OK '+new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});IAG.ultimo=p.nom;return j}
   catch(e){ultimo=e;ESTADO[p.id]=(e.det||e.message||'Error')+' · '+new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
    if(e.code==='cupo'){cupo=true;FRIO[p.id]=Date.now()+e.ms}
    else if(e.code==='clave')FRIO[p.id]=Date.now()+10*60*1000;
    else if(e.code==='refused'&&k===vivos.length-1)throw{code:'refused'}}}
  if(cupo)throw{code:'rate_limited'};
  throw{code:'proveedores',det:ultimo&&ultimo.det}},
 probar:async function(){var c=cfg(),out=[];
  for(var i=0;i<PROV.length;i++){var p=PROV[i];if(!p.tiene(c)){out.push([p.nom,'—','Sin clave']);continue}
   try{var t=await p.run(c,'Responde solo con este JSON exacto: {"ok":true}',[]);out.push([p.nom,sacaJSON(t)?'✓':'?',sacaJSON(t)?'Funciona':'Respondió, pero no en JSON: '+String(t).slice(0,80)])}
   catch(e){out.push([p.nom,'✗',e.det||e.message||'Error'])}}
  return out},
 estado:function(){return ESTADO}
};
window.IAG=IAG;

/* ================= Google Drive directo ================= */
var TOK=null,TOKEXP=0,tc=null,cbs=[],conectadoUnaVez=false;
var API='https://www.googleapis.com/drive/v3/files';
function gisListo(){return!!(window.google&&google.accounts&&google.accounts.oauth2)}
function pedirToken(){return new Promise(function(ok,no){
 var c=cfg();if(!c.gClient)return no({code:'sin_client'});
 if(!gisListo())return no({code:'sin_gis'});
 if(!tc||tc._cid!==c.gClient){tc=google.accounts.oauth2.initTokenClient({client_id:c.gClient,scope:'https://www.googleapis.com/auth/drive.readonly',callback:function(){}});tc._cid=c.gClient}
 tc.callback=function(r){if(r&&r.access_token){TOK=r.access_token;TOKEXP=Date.now()+((+r.expires_in||3600)-120)*1000;lsS('vof_gd_ok','1');ok(TOK)}else no({code:'needs_reauth'})};
 tc.error_callback=function(){no({code:'needs_reauth'})};
 tc.requestAccessToken({prompt:lsG('vof_gd_ok','')==='1'?'':'consent'})})}
function tok(){if(TOK&&Date.now()<TOKEXP)return TOK;TOK=null;pintaBoton();throw{code:'needs_reauth'}}
async function gget(url,buf){
 var t=tok(),r;
 try{r=await fetch(url,{headers:{Authorization:'Bearer '+t}})}catch(e){throw{code:'server_unavailable',retryable:true,retryAfterMs:2500}}
 if(r.status===401){TOK=null;pintaBoton();throw{code:'needs_reauth'}}
 if(r.status===429||r.status>=500)throw{code:'rate_limited',retryable:true,retryAfterMs:3000};
 if(r.status===404)throw{code:'tool_error'};
 if(r.status===403){var x=await r.text();throw{code:/rateLimit|userRateLimit/i.test(x)?'rate_limited':'not_granted',retryable:/rateLimit/i.test(x)}}
 if(!r.ok)throw{code:'tool_error'};
 return buf?new Uint8Array(await r.arrayBuffer()):r.json()}
var GDR={srv:'Google Drive',
 conectado:function(){return!!(TOK&&Date.now()<TOKEXP)},
 alConectar:function(fn){cbs.push(fn);if(GDR.conectado())fn(false)},
 conectar:async function(){
  try{await pedirToken()}
  catch(e){var c=e&&e.code;if(c==='sin_client'){abrirCfg('Para conectar Google Drive primero pega aquí tu ID de cliente de Google (Client ID).');return}
   aviso(c==='sin_gis'?'No cargó el inicio de sesión de Google. Revisa tu internet y recarga la página.':'No se pudo iniciar sesión con Google.',true);return}
  pintaBoton();var primera=!conectadoUnaVez;conectadoUnaVez=true;
  aviso(primera?'Google Drive conectado':'Google Drive reconectado');
  cbs.forEach(function(fn){try{fn(!primera)}catch(e){}})},
 bytes:async function(id){return gget(API+'/'+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true',true)},
 callTool:async function(srv,tool,input){
  input=input||{};
  if(tool==='search_files'){
   var m=/parentId\s*=\s*'([^']+)'/.exec(input.query||''),q=m?"'"+m[1]+"' in parents and trashed = false":'trashed = false';
   var u=API+'?q='+encodeURIComponent(q)+'&pageSize='+(input.pageSize||100)+'&orderBy='+encodeURIComponent('modifiedTime desc')+
    '&fields='+encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size)')+'&supportsAllDrives=true&includeItemsFromAllDrives=true'+
    (input.pageToken?'&pageToken='+encodeURIComponent(input.pageToken):'');
   var j=await gget(u);
   return{payload:{files:(j.files||[]).map(function(f){return{id:f.id,title:f.name,mimeType:f.mimeType,modifiedTime:f.modifiedTime,viewUrl:f.webViewLink||('https://drive.google.com/file/d/'+f.id+'/view'),fileSize:f.size}}),nextPageToken:j.nextPageToken||null}}}
  if(tool==='download_file_content'){var b=await GDR.bytes(input.fileId),s='';for(var i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));return{blob:btoa(s)}}
  throw{code:'tool_error'}}
};
window.GDR=GDR;

/* ================= Interfaz: botones y panel de configuración ================= */
var css=document.createElement('style');
css.textContent='#gBar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#gBar .b{display:inline-flex;align-items:center;gap:6px}#gBar .b i{width:8px;height:8px;border-radius:50%;background:var(--er);display:inline-block}#gBar .b.ok i{background:var(--ok)}'+
 '#gCfg{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:20;padding:16px}#gCfg[hidden]{display:none!important}'+
 '#gCfg .gp{background:var(--card);border:1px solid var(--ac);border-radius:8px;padding:18px 20px;width:min(720px,100%);max-height:92vh;overflow:auto}'+
 '#gCfg h3{margin:0 0 4px;color:var(--ac);font-size:14px;letter-spacing:.05em;text-transform:uppercase}#gCfg h4{margin:16px 0 6px}'+
 '#gCfg label{display:block;font-size:11px;color:var(--mu);margin:8px 0 3px;text-transform:uppercase;letter-spacing:.05em}'+
 '#gCfg input{width:100%;background:var(--bg);border:1px solid var(--ln);border-radius:6px;padding:7px 10px;color:var(--tx)}'+
 '#gCfg .g2c{display:grid;grid-template-columns:1.4fr 1fr;gap:10px}#gCfg a{color:var(--ac)}#gCfg .gmsg{color:var(--wn);margin:6px 0 0}'+
 '#gCfg table{width:100%;margin-top:8px}#gCfg td{padding:5px 8px;font-size:12px}#gCfg .gst{font-size:11px;color:var(--mu)}';
document.head.appendChild(css);
function $(i){return document.getElementById(i)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function aviso(m,e){var t=$('toast');if(!t)return;t.textContent=m;t.className='on'+(e?' er':'');clearTimeout(aviso.t);aviso.t=setTimeout(function(){t.className=''},4500)}
function pintaBoton(){var b=$('gDrv');if(!b)return;var ok=GDR.conectado();b.classList.toggle('ok',ok);b.classList.toggle('s',ok);
 b.innerHTML='<i></i>'+(ok?'Drive conectado':(conectadoUnaVez||lsG('vof_gd_ok','')==='1'?'Reconectar Google Drive':'Conectar Google Drive'))}
setInterval(pintaBoton,30000);
function campo(id,lab,ph,tipo){return'<label for="'+id+'">'+lab+'</label><input id="'+id+'" type="'+(tipo||'text')+'" autocomplete="off" spellcheck="false" placeholder="'+esc(ph||'')+'">'}
function montarUI(){
 var hd=document.querySelector('header');if(!hd||$('gBar'))return;
 var bar=document.createElement('div');bar.id='gBar';
 bar.innerHTML='<button class="b" id="gDrv" type="button"></button><button class="b s" id="gAbr" type="button">⚙ IA y Drive</button>';
 hd.insertBefore(bar,$('st'));
 var p=document.createElement('div');p.id='gCfg';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');
 p.innerHTML='<div class="gp"><h3>IA gratis y Google Drive</h3><p class="mu" style="margin:0">Las claves se guardan solo en este navegador. No quedan en el código de la página ni se suben a GitHub.</p><p class="gmsg" id="gMsg" hidden></p>'+
  '<h4>1. Gemini (principal)</h4><p class="mu" style="margin:0">Clave gratis en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></p>'+
  '<div class="g2c"><div>'+campo('gGemK','Clave de Gemini','AIza…','password')+'</div><div>'+campo('gGemM','Modelo',DEF.gemModel)+'</div></div>'+campo('gGemL','Modelo para "IA económica"',DEF.gemLite)+
  '<h4>2. Groq (respaldo)</h4><p class="mu" style="margin:0">Clave gratis en <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a> · máximo 3 páginas de fotos por orden</p>'+
  '<div class="g2c"><div>'+campo('gGroK','Clave de Groq','gsk_…','password')+'</div><div>'+campo('gGroM','Modelo',DEF.groqModel)+'</div></div>'+
  '<h4>3. OpenRouter (último recurso)</h4><p class="mu" style="margin:0">Clave gratis en <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a></p>'+
  '<div class="g2c"><div>'+campo('gOrK','Clave de OpenRouter','sk-or-…','password')+'</div><div>'+campo('gOrM','Modelo',DEF.orModel)+'</div></div>'+
  '<h4>Google Drive</h4><p class="mu" style="margin:0">ID de cliente OAuth (tipo "Aplicación web") de <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud → Credenciales</a>. En "Orígenes autorizados de JavaScript" pon <b id="gOri"></b></p>'+
  campo('gCli','ID de cliente de Google','123456-abc.apps.googleusercontent.com')+
  '<div class="tb" style="margin-top:14px"><button class="b" id="gGua" type="button">Guardar</button><button class="b s" id="gPro" type="button">Probar las IA</button><button class="b s" id="gCer" type="button">Cerrar</button></div>'+
  '<div id="gRes"></div></div>';
 document.body.appendChild(p);
 $('gOri').textContent=location.origin;
 $('gDrv').onclick=function(){GDR.conectar()};
 $('gAbr').onclick=function(){abrirCfg()};
 $('gCer').onclick=function(){p.hidden=true};
 p.addEventListener('click',function(e){if(e.target===p)p.hidden=true});
 document.addEventListener('keydown',function(e){if(e.key==='Escape')p.hidden=true});
 $('gGua').onclick=function(){guardar();aviso('Configuración guardada');p.hidden=true;if(window.VOFG_alGuardar)window.VOFG_alGuardar()};
 $('gPro').onclick=async function(){guardar();var b=this;b.disabled=true;b.textContent='Probando…';$('gRes').innerHTML='';
  try{var r=await IAG.probar();$('gRes').innerHTML='<table>'+r.map(function(x){return'<tr><td><b>'+esc(x[0])+'</b></td><td>'+esc(x[1])+'</td><td>'+esc(x[2])+'</td></tr>'}).join('')+'</table>'}catch(e){}
  b.disabled=false;b.textContent='Probar las IA'};
 pintaBoton()}
var MAP=[['gGemK','gemKey'],['gGemM','gemModel'],['gGemL','gemLite'],['gGroK','groqKey'],['gGroM','groqModel'],['gOrK','orKey'],['gOrM','orModel'],['gCli','gClient']];
function guardar(){var c={};MAP.forEach(function(m){c[m[1]]=$(m[0]).value.trim()});cfgSave(c)}
function abrirCfg(msg){var c=cfg(),raw={};try{raw=JSON.parse(lsG(CFG_K,'{}'))||{}}catch(e){}
 MAP.forEach(function(m){$(m[0]).value=raw[m[1]]||(/Key|gClient/.test(m[1])?'':c[m[1]])});
 $('gMsg').hidden=!msg;$('gMsg').textContent=msg||'';
 var st=IAG.estado();$('gRes').innerHTML=Object.keys(st).length?'<p class="gst">Último resultado: '+PROV.filter(function(p){return st[p.id]}).map(function(p){return esc(p.nom)+': '+esc(st[p.id])}).join(' · ')+'</p>':'';
 $('gCfg').hidden=false;$('gGemK').focus()}
window.VOFG={abrirCfg:abrirCfg,cfg:cfg};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montarUI);else montarUI();
})();
/* ===== Google Drive por Apps Script (sin Google Cloud) ===== */
(function(){
var K='vof_apps_script',G=window.GDR;if(!G)return;
function cfg(){try{return JSON.parse(localStorage.getItem(K)||'{}')||{}}catch(e){return{}}}
async function llamar(q){
 var c=cfg();if(!c.url)throw{code:'server_not_connected'};
 var r,j;
 try{r=await fetch(c.url+'?k='+encodeURIComponent(c.k||'')+'&'+q)}catch(e){throw{code:'server_unavailable',retryable:true,retryAfterMs:3000}}
 try{j=await r.json()}catch(e){throw{code:'server_unavailable'}}
 if(j.error)throw{code:j.error==='clave'?'not_granted':'tool_error'};
 return j}
G.conectado=function(){return!!cfg().url};
G.bytes=async function(id){var j=await llamar('op=get&id='+encodeURIComponent(id));var b=atob(j.b64),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
G.callTool=async function(srv,tool,input){
 input=input||{};
 if(tool==='search_files'){
  if(input.pageToken)return{payload:{files:[],nextPageToken:null}};
  var m=/parentId\s*=\s*'([^']+)'/.exec(input.query||'');
  var j=await llamar('op=list&id='+encodeURIComponent(m?m[1]:''));
  return{payload:{files:j.files||[],nextPageToken:null}}}
 if(tool==='download_file_content'){var j2=await llamar('op=get&id='+encodeURIComponent(input.fileId));return{blob:j2.b64}}
 throw{code:'tool_error'}};
G.conectar=async function(){
 var c=cfg();
 var url=prompt('Pega la URL de tu Apps Script (termina en /exec):',c.url||'');if(!url)return;
 var k=prompt('Pega la clave que pusiste en el Apps Script:',c.k||'');if(k==null)return;
 localStorage.setItem(K,JSON.stringify({url:url.trim(),k:k.trim()}));
 try{await llamar('op=ping');alert('Google Drive conectado. La página se va a recargar.');location.reload()}
 catch(e){localStorage.removeItem(K);alert(e&&e.code==='not_granted'?'La clave no coincide con la del Apps Script.':'No se pudo conectar. Revisa la URL del Apps Script.')}};
})();
