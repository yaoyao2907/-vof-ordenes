/* VOF Órdenes – versión GitHub conectada al Google Drive de Yair por un Apps Script (el "puente").
   - La dirección del puente va en config.js (window.VOF_PUENTE).
   - Cada analista escribe una sola vez la clave del equipo; queda guardada en su navegador.
   - Archivos: el puente lee VOF CAMP con la cuenta de Yair (RESULTADO, ORDENES, CAMBIOS REALIZADOS, VIDEOS).
   - Datos compartidos: lo que se marca en Validar IA y en Videos lo guarda el puente para todo el equipo.
   - IA: el puente usa las claves de Gemini / OpenRouter / Cloudflare guardadas en el Apps Script
     y rota solo cuando una se queda sin cupo. Los analistas no ven las claves.
   Este archivo crea window.claude.use('mcp' | 'db' | 'sample') para que el resto de la página funcione igual. */
(function(){
var URL_P=(window.VOF_PUENTE||'').trim();if(!/^https?:\/\//.test(URL_P))URL_P='';
var CLAVE='';try{CLAVE=localStorage.getItem('vof_clave_equipo')||''}catch(e){}
var ESTADO={ok:false,err:'',ia:null,ult:'',iaErr:''};

async function puente(accion,datos){
 if(!URL_P)throw{code:'server_not_connected',message:'Falta la dirección del puente en config.js'};
 var cuerpo=Object.assign({accion:accion,clave:CLAVE},datos||{});
 var r=await fetch(URL_P,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(cuerpo),redirect:'follow'});
 var j=await r.json().catch(function(){return{ok:false,error:'El puente no respondió bien (HTTP '+r.status+')'}});
 if(!j.ok){var e=new Error(j.error||'Error del puente');e.code=j.codigo==='clave'?'not_granted':'tool_error';e.codigo=j.codigo;throw e}
 return j}

/* ---- conexión: se prueba la clave una vez al cargar ---- */
var LISTO=(async function(){
 if(!URL_P||!CLAVE)return;
 try{var j=await puente('ping');ESTADO.ok=true;ESTADO.ia=j.ia}
 catch(e){ESTADO.err=e.codigo==='clave'?'La clave del equipo no es correcta.':(e.message||'No se pudo conectar con el puente.')}
})();

/* ---- Drive (mcp) ---- */
var MCP={callTool:async function(srv,tool,input){
 if(tool==='search_files'){var m=/parentId = '([^']+)'/.exec(input.query||'');if(!m)return{payload:{files:[]}};
  var j=await puente('listar',{carpeta:m[1]});return{payload:{files:j.files||[]}}}
 if(tool==='download_file_content'){var j2=await puente('bajar',{id:input.fileId});return{blob:j2.blob}}
 throw{code:'tool_error'}}};

/* ---- base compartida (db) ---- */
function docApi(ruta){return{
 get:async function(){if(/^snap/.test(ruta))return{exists:false,data:function(){return null}};var j=await puente('db_get',{ruta:ruta});var d=j.datos;return{exists:!!j.existe,id:ruta.split('/').pop(),data:function(){return d}}},
 set:async function(d){if(/^snap/.test(ruta))return;await puente('db_set',{ruta:ruta,datos:JSON.parse(JSON.stringify(d))})},
 delete:async function(){if(/^snap/.test(ruta))return;await puente('db_del',{ruta:ruta})}}}
function colApi(c){var q={orderBy:function(){return q},limit:function(){return q},where:function(){return q},
 get:async function(){if(/^snap/.test(c))return{docs:[]};var j=await puente('db_lista',{coleccion:c});
  return{docs:(j.docs||[]).map(function(x){return{id:x.id,data:function(){return x.datos}}})}},
 doc:function(id){return docApi(c+'/'+id)}};return q}
var DB={doc:docApi,collection:colApi};

/* ---- IA (misma forma que la capacidad sample de Claude) ---- */
function hayIA(){var ia=ESTADO.ia;if(!ia)return false;return Object.keys(ia).some(function(p){return(ia[p].guardadas||[]).some(Boolean)})}
async function b64(b){var u=new Uint8Array(await b.arrayBuffer()),s='',i;for(i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
var sample=async function(t){return{text:JSON.stringify(await sample.json(t,{}))}};
sample.limits=async function(){return{images:{maxCount:16}}};
sample.json=async function(texto,opt){
 var imgs=await Promise.all(((opt&&opt.images)||[]).map(b64));
 try{var j=await puente('ia',{texto:texto,imagenes:imgs});ESTADO.ult=j.usado||'';ESTADO.iaErr=j.aviso||'';pinta();return j.datos}
 catch(e){ESTADO.iaErr=e.message||'falló';pinta();throw{code:'rate_limited',message:ESTADO.iaErr}}};

window.vofPuente=function(a,d){return puente(a,d)};
window.vofListo=function(){return LISTO.then(function(){return ESTADO.ok})};
window.vofIA=function(){return hayIA()};
window.claude={use:async function(n){await LISTO;if(!ESTADO.ok)return null;
 if(n==='mcp')return MCP;if(n==='db')return DB;if(n==='sample')return hayIA()?sample:null;return null}};

/* ---- barra de arriba y ventanas ---- */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function pinta(){var e=document.getElementById('ghIA');if(!e)return;
 if(!ESTADO.ok){e.textContent='';return}
 var n=0;if(ESTADO.ia)Object.keys(ESTADO.ia).forEach(function(p){n+=(ESTADO.ia[p].guardadas||[]).filter(Boolean).length});
 e.textContent=n?('IA: '+n+' clave'+(n>1?'s':'')+(ESTADO.ult?' · usando '+ESTADO.ult:'')+(ESTADO.iaErr?' · ⚠ '+ESTADO.iaErr:'')):'IA: sin claves (las pone el administrador)'}
function modalClaves(){var m=document.getElementById('ghCfg'),ia=ESTADO.ia||{};
 m.querySelector('.ghb').innerHTML='<label class="ghadm">Clave de administrador<input type="password" id="ghAdm" autocomplete="off"></label>'+
  Object.keys(ia).map(function(p){var x=ia[p]||{guardadas:[]};
  return'<fieldset><legend>'+esc(x.nombre||p)+'</legend>'+[0,1,2,3,4].map(function(i){var g=(x.guardadas||[])[i];
   return'<label>Clave '+(i+1)+(g?' <b class="ghok">guardada</b>':'')+'<input type="password" autocomplete="off" data-p="'+p+'" data-i="'+i+'" placeholder="'+(g?'(dejar igual)':'pega la clave')+'"></label>'}).join('')+
   (p==='cloudflare'?'<label>ID de cuenta<input type="text" data-p="cloudflare" data-c="cuenta" value="'+esc(x.cuenta||'')+'"></label>':'')+
   '<label>Modelo<input type="text" data-p="'+p+'" data-c="modelo" value="'+esc(x.modelo||'')+'"></label></fieldset>'}).join('')+
  '<p class="mu">Escribe <b>-</b> en una clave para borrarla. Las claves se guardan en tu Apps Script; los analistas no las ven.</p><p class="ghmsg" id="ghMsg"></p>';
 m.hidden=false}
async function guardarClaves(){var m=document.getElementById('ghCfg'),c={};
 [].forEach.call(m.querySelectorAll('input[data-p]'),function(i){var p=i.getAttribute('data-p');c[p]=c[p]||{claves:['','','','','']};
  if(i.hasAttribute('data-i'))c[p].claves[+i.getAttribute('data-i')]=i.value.trim();else c[p][i.getAttribute('data-c')]=i.value.trim()});
 var msg=document.getElementById('ghMsg');msg.textContent='Guardando…';
 try{var j=await puente('claves_guardar',{admin:document.getElementById('ghAdm').value,cambios:c});var habia=hayIA();ESTADO.ia=j.ia;pinta();msg.textContent='Guardado.';
  if(habia!==hayIA())setTimeout(function(){location.reload()},600);else setTimeout(function(){m.hidden=true},700)}
 catch(e){msg.textContent=e.codigo==='admin'?'La clave de administrador no es correcta.':(e.message||'No se pudo guardar.')}}
async function entrar(){var i=document.getElementById('ghClave'),v=(i.value||'').trim();if(!v)return;CLAVE=v;
 var b=document.getElementById('ghEnt');b.disabled=true;b.textContent='Entrando…';
 try{await puente('ping');try{localStorage.setItem('vof_clave_equipo',v)}catch(e){}location.reload()}
 catch(e){b.disabled=false;b.textContent='Entrar';aviso(e.codigo==='clave'?'Esa clave no es correcta.':(e.message||'No se pudo conectar.'))}}
function aviso(t){var d=document.getElementById('ghAviso');if(d){d.querySelector('span').textContent=t;d.hidden=!t}}

document.addEventListener('DOMContentLoaded',async function(){
 await LISTO;
 var bar=document.createElement('div');bar.id='ghBar';
 bar.innerHTML=ESTADO.ok?
  '<span class="ghok">● Conectado al Drive de VOF CAMP</span><button type="button" id="ghCla">Claves de IA</button><span id="ghIA"></span><button type="button" id="ghSal" class="ghsal">Salir</button>':
  '<b>Clave del equipo</b><input type="password" id="ghClave" placeholder="Escribe la clave del equipo" autocomplete="current-password"><button type="button" id="ghEnt">Entrar</button>';
 bar.innerHTML+='<div id="ghAviso" hidden><span></span></div>';
 document.body.insertBefore(bar,document.body.firstChild);
 var m=document.createElement('div');m.id='ghCfg';m.hidden=true;
 m.innerHTML='<div class="ghw"><div class="ghh"><b>Claves de IA</b><span class="mu">Se usan en orden: Gemini 1→5, Groq 1→5, OpenRouter 1→5, Cloudflare 1→5. Si una se queda sin cupo o falla, pasa sola a la siguiente.</span></div><div class="ghb"></div>'+
  '<div class="ghf"><button type="button" id="ghGua">Guardar</button><button type="button" id="ghCer">Cerrar</button></div></div>';
 document.body.appendChild(m);
 m.onclick=function(e){if(e.target===m)m.hidden=true};
 document.getElementById('ghCer').onclick=function(){m.hidden=true};
 document.getElementById('ghGua').onclick=guardarClaves;
 if(ESTADO.ok){document.getElementById('ghCla').onclick=modalClaves;
  document.getElementById('ghSal').onclick=function(){try{localStorage.removeItem('vof_clave_equipo')}catch(e){}location.reload()};pinta()}
 else{document.getElementById('ghEnt').onclick=entrar;document.getElementById('ghClave').onkeydown=function(e){if(e.key==='Enter')entrar()};
  aviso(!URL_P?'Falta poner la dirección del Apps Script en config.js (pasos en el README).':ESTADO.err||'Escribe la clave del equipo para ver la información.')}
});
})();
