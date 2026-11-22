/* VOF Órdenes – versión GitHub.
   1) Carpeta: en vez de Google Drive conectado, la página lee la carpeta "VOF CAMP" del computador
      (la de Google Drive para escritorio, G:\Mi unidad\VOF CAMP). Se escoge una vez y se vuelve a leer sola.
   2) IA: claves propias (5 de Gemini, 5 de OpenRouter y 5 de Cloudflare). Si una se queda sin cupo o falla,
      pasa sola a la siguiente. Las claves se guardan SOLO en este navegador.
   Este archivo crea window.claude.use('mcp' | 'sample' | 'db') para que el resto de la página funcione igual. */
(function(){
/* ---------------- carpeta VOF CAMP ---------------- */
var SUB={'1jU_HN4gxf3tzOAeyxKnxpwQ6xah7T8PF':'RESULTADO','1Tw3kYQt7lgzFfrJ6d3qnmZXeejOEYRNC':'ORDENES',
 '19opjY75bx_G5XCfeF72Vyd3dLfKgttIJ':'CAMBIOS REALIZADOS','1EuXjhfuWCKHaDk1sWxoQWWlHvi5RqyFQ':'VIDEOS'};
var RAIZ=null,PERM='';
function idb(){return new Promise(function(ok,no){var r=indexedDB.open('vof_gh',1);r.onupgradeneeded=function(){r.result.createObjectStore('k')};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function idbGet(k){var d=await idb();return new Promise(function(ok){var t=d.transaction('k').objectStore('k').get(k);t.onsuccess=function(){ok(t.result)};t.onerror=function(){ok(null)}})}
async function idbSet(k,v){var d=await idb();return new Promise(function(ok){var t=d.transaction('k','readwrite');t.objectStore('k').put(v,k);t.oncomplete=ok;t.onerror=ok})}
var LISTO=(async function(){
 try{RAIZ=window.__VOF_RAIZ?await window.__VOF_RAIZ:await idbGet('raiz')}catch(e){RAIZ=null}   /* __VOF_RAIZ: solo para pruebas */
 if(RAIZ&&RAIZ.queryPermission){try{PERM=await RAIZ.queryPermission({mode:'read'})}catch(e){PERM=''}}
})();
async function sub(nombre){if(!RAIZ)throw{code:'server_not_connected'};
 if(RAIZ.name.toUpperCase()===nombre)return RAIZ;
 try{return await RAIZ.getDirectoryHandle(nombre)}catch(e){var err=new Error('No está la carpeta '+nombre+' dentro de '+RAIZ.name);err.code='tool_error';throw err}}
function b64(buf){var u=new Uint8Array(buf),s='',i;for(i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
var MCP={callTool:async function(srv,tool,input){
 if(PERM!=='granted')throw{code:'server_not_connected'};
 if(tool==='search_files'){var m=/parentId = '([^']+)'/.exec(input.query||''),nom=m&&SUB[m[1]];if(!nom)return{payload:{files:[]}};
  var d=await sub(nom),out=[];
  for await(var e of d.values()){if(e.kind!=='file')continue;try{var f=await e.getFile();out.push({id:'local:'+nom+'/'+e.name,title:e.name,modifiedTime:new Date(f.lastModified).toISOString(),fileSize:String(f.size)})}catch(x){}}
  out.sort(function(a,b){return b.modifiedTime.localeCompare(a.modifiedTime)});return{payload:{files:out}}}
 if(tool==='download_file_content'){var p=String(input.fileId||'').replace(/^local:/,'').split('/'),dd=await sub(p[0]);
  var fh=await dd.getFileHandle(p.slice(1).join('/')),ff=await fh.getFile();return{blob:b64(await ff.arrayBuffer())}}
 throw{code:'tool_error'}}};
async function conectar(){
 if(!window.showDirectoryPicker){alerta('Este navegador no deja escoger carpetas. Usa Chrome o Edge, o el botón "Abrir carpeta del computador".');return}
 try{var h=RAIZ&&PERM==='prompt'?RAIZ:await window.showDirectoryPicker({id:'vofcamp',mode:'read'});
  var p=await h.requestPermission({mode:'read'});if(p!=='granted')return;
  await idbSet('raiz',h);location.reload()}catch(e){}}
function alerta(t){var d=document.getElementById('ghAviso');if(d){d.querySelector('span').textContent=t;d.hidden=false}}

/* ---------------- IA con claves propias ---------------- */
var PROV=[
 {k:'gemini',n:'Google Gemini',modelo:'gemini-2.5-flash',max:16,ayuda:'Clave de aistudio.google.com (empieza por AIza…)'},
 {k:'openrouter',n:'OpenRouter',modelo:'qwen/qwen2.5-vl-72b-instruct:free',max:6,ayuda:'Clave de openrouter.ai/keys (sk-or-…); usa un modelo que diga "vision"'},
 {k:'cloudflare',n:'Cloudflare Workers AI',modelo:'@cf/meta/llama-3.2-11b-vision-instruct',max:1,ayuda:'Token de API + ID de cuenta. Ojo: Cloudflare puede bloquear llamadas desde el navegador'}];
var CFG={};try{CFG=JSON.parse(localStorage.getItem('vof_ia_claves')||'{}')||{}}catch(e){CFG={}}
PROV.forEach(function(p){var c=CFG[p.k]=CFG[p.k]||{};c.claves=(c.claves||[]).concat(['','','','','']).slice(0,5);if(!c.modelo)c.modelo=p.modelo});
function guardarCfg(){try{localStorage.setItem('vof_ia_claves',JSON.stringify(CFG))}catch(e){}}
var FRIO={};                    /* clave que falló -> hora hasta la que no se usa */
function slots(){var s=[];PROV.forEach(function(p){CFG[p.k].claves.forEach(function(c,i){if(c&&c.trim())s.push({p:p,c:c.trim(),i:i,id:p.k+i})})});return s}
function hayIA(){return slots().length>0}
async function blob64(b){return b64(await b.arrayBuffer())}
async function pedir(sl,texto,imgs){
 var p=sl.p,mod=CFG[p.k].modelo||p.modelo,r,j;
 if(p.k==='gemini'){
  var parts=[{text:texto}];for(var i=0;i<imgs.length;i++)parts.push({inline_data:{mime_type:imgs[i].type||'image/jpeg',data:await blob64(imgs[i])}});
  r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(mod)+':generateContent?key='+encodeURIComponent(sl.c),
   {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:parts}],generationConfig:{temperature:0,responseMimeType:'application/json'}})});
  j=await r.json().catch(function(){return{}});if(!r.ok)throw{st:r.status,msg:(j.error&&j.error.message)||r.statusText};
  return((((j.candidates||[])[0]||{}).content||{}).parts||[]).map(function(x){return x.text||''}).join('')}
 var cont=[{type:'text',text:texto}];for(var k=0;k<imgs.length;k++)cont.push({type:'image_url',image_url:{url:'data:image/jpeg;base64,'+await blob64(imgs[k])}});
 var url=p.k==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':'https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(CFG.cloudflare.cuenta||'')+'/ai/v1/chat/completions';
 var hd={'Content-Type':'application/json','Authorization':'Bearer '+sl.c};if(p.k==='openrouter'){hd['HTTP-Referer']=location.origin;hd['X-Title']='VOF Ordenes'}
 r=await fetch(url,{method:'POST',headers:hd,body:JSON.stringify({model:mod,temperature:0,max_tokens:1500,messages:[{role:'user',content:cont}]})});
 j=await r.json().catch(function(){return{}});if(!r.ok)throw{st:r.status,msg:(j.error&&(j.error.message||j.error))||(j.errors&&j.errors[0]&&j.errors[0].message)||r.statusText};
 var m=((j.choices||[])[0]||{}).message||{};return typeof m.content==='string'?m.content:(m.content||[]).map(function(x){return x.text||''}).join('')}
function json(t){var m=/\{[\s\S]*\}/.exec(String(t||''));if(!m)throw{code:'bad_json'};return JSON.parse(m[0])}
function juntar(a,b){if(!a)return b;if(!b)return a;var o={fotos:(a.fotos||[]).concat(b.fotos||[]),lecturas:Object.assign({},b.lecturas||{})};
 var la=a.lecturas||{};Object.keys(la).forEach(function(k){var v=la[k];if(v!==null&&v!==''&&!(Array.isArray(v)&&!v.length))o.lecturas[k]=v});return o}
var ESTADO={ult:'',err:''};
/* misma forma que la capacidad sample de Claude: sample.limits() y sample.json(texto,{images}) */
var sample=async function(t){return{text:JSON.stringify(await sample.json(t,{}))}};
sample.limits=async function(){var s=slots();return{images:{maxCount:s.length?s[0].p.max:0}}};
sample.json=async function(texto,opt){
 var imgs=(opt&&opt.images)||[],intentos=0,ult=null;
 while(true){var ahora=Date.now(),s=slots().filter(function(x){return!(FRIO[x.id]>ahora)});
  if(!s.length){ESTADO.err=ult?(ult.msg||ult.st):'sin claves';throw{code:'rate_limited',message:'Todas las claves están sin cupo o fallaron: '+ESTADO.err}}
  var sl=s[0];
  try{var res;
   if(imgs.length>sl.p.max){                                   /* el proveedor acepta menos fotos: se parte el lote */
    var base=+((/numera desde (\d+)/.exec(texto)||[0,1])[1]);
    for(var i=0;i<imgs.length;i+=sl.p.max){var lote=imgs.slice(i,i+sl.p.max);
     var tx=texto.replace(/\nOjo: van las fotos[^\n]*/,'')+'\nOjo: van las fotos '+(base+i)+' a '+(base+i+lote.length-1)+'; numera desde '+(base+i)+'.';
     res=juntar(res,json(await pedir(sl,tx,lote)))}}
   else res=json(await pedir(sl,texto,imgs));
   ESTADO.ult=sl.p.n+' · clave '+(sl.i+1);ESTADO.err='';pinta();return res}
  catch(e){ult=e;var st=e&&e.st;
   FRIO[sl.id]=Date.now()+(st===429?10*60000:st===401||st===403?24*3600000:2*60000);   /* sin cupo 10 min; clave mala 1 día; otro error 2 min */
   ESTADO.err=sl.p.n+' clave '+(sl.i+1)+': '+(e.msg||e.message||e.code||'falló');pinta();
   if(++intentos>20)throw{code:'rate_limited',message:ESTADO.err}}}};

/* ---------------- window.claude para la página ---------------- */
window.claude={use:async function(n){await LISTO;
 if(n==='mcp')return PERM==='granted'?MCP:null;
 if(n==='sample')return hayIA()?sample:null;
 return null}};

/* ---------------- barra y ventana de configuración ---------------- */
function pinta(){var e=document.getElementById('ghIA');if(!e)return;var n=slots().length;
 e.textContent=n?('IA: '+n+' clave'+(n>1?'s':'')+(ESTADO.ult?' · usando '+ESTADO.ult:'')+(ESTADO.err?' · ⚠ '+ESTADO.err:'')):'IA: sin claves'}
function modal(){
 var m=document.getElementById('ghCfg');
 m.querySelector('.ghb').innerHTML=PROV.map(function(p){var c=CFG[p.k];
  return'<fieldset><legend>'+p.n+'</legend><p class="mu">'+p.ayuda+'</p>'+c.claves.map(function(v,i){return'<label>Clave '+(i+1)+'<input type="password" autocomplete="off" data-p="'+p.k+'" data-i="'+i+'" value="'+String(v).replace(/"/g,'&quot;')+'"></label>'}).join('')+
   (p.k==='cloudflare'?'<label>ID de cuenta<input type="text" data-p="cloudflare" data-c="cuenta" value="'+String(c.cuenta||'').replace(/"/g,'&quot;')+'"></label>':'')+
   '<label>Modelo<input type="text" data-p="'+p.k+'" data-c="modelo" value="'+String(c.modelo||'').replace(/"/g,'&quot;')+'"></label></fieldset>'}).join('');
 m.hidden=false}
document.addEventListener('DOMContentLoaded',async function(){
 await LISTO;
 var bar=document.createElement('div');bar.id='ghBar';
 bar.innerHTML='<button type="button" id="ghCar">'+(PERM==='granted'?'Carpeta: '+RAIZ.name+' ✓':PERM==='prompt'?'Dar permiso a la carpeta '+RAIZ.name:'Conectar carpeta VOF CAMP')+'</button>'+
  '<button type="button" id="ghCla">Claves de IA</button><span id="ghIA"></span>'+
  '<div id="ghAviso" hidden><span></span> <button type="button" onclick="this.parentNode.hidden=true">✕</button></div>';
 document.body.insertBefore(bar,document.body.firstChild);
 var m=document.createElement('div');m.id='ghCfg';m.hidden=true;
 m.innerHTML='<div class="ghw"><div class="ghh"><b>Claves de IA</b><span class="mu">Se usan en orden: Gemini 1→5, OpenRouter 1→5, Cloudflare 1→5. Si una se queda sin cupo o falla, pasa sola a la siguiente. Se guardan solo en este navegador.</span></div><div class="ghb"></div>'+
  '<div class="ghf"><button type="button" id="ghGua">Guardar</button><button type="button" id="ghCer">Cerrar</button></div></div>';
 document.body.appendChild(m);
 document.getElementById('ghCar').onclick=conectar;
 document.getElementById('ghCla').onclick=modal;
 document.getElementById('ghCer').onclick=function(){m.hidden=true};
 m.onclick=function(e){if(e.target===m)m.hidden=true};
 document.getElementById('ghGua').onclick=function(){var tenia=hayIA();
  [].forEach.call(m.querySelectorAll('input'),function(i){var p=CFG[i.getAttribute('data-p')];if(i.hasAttribute('data-i'))p.claves[+i.getAttribute('data-i')]=i.value.trim();else p[i.getAttribute('data-c')]=i.value.trim()});
  guardarCfg();FRIO={};m.hidden=true;pinta();if(tenia!==hayIA())location.reload()};
 pinta();
 if(PERM!=='granted')alerta(PERM==='prompt'?'Toca "Dar permiso a la carpeta" para leer los Excel y las actas.':'Toca "Conectar carpeta VOF CAMP" y escoge G:\\Mi unidad\\VOF CAMP.');
});
})();
