/* VOF Órdenes (versión GitHub) – pestaña VALIDAR IA: revisión de la orden con las fotos del acta.
   - Las fotos se sacan del PDF del acta (sin IA). Se guardan en este navegador (IndexedDB) y en Drive:
     VOF CAMP/FOTOS/<orden>/foto_001.jpg … + acta.jpg (el acta recortada). La próxima vez cargan al instante.
   - 14 ítems de revisión, cada uno Conforme / No conforme / No aplica + observación. Cada foto se asocia a su ítem.
   - Visor grande en 3 columnas: acta recortada · foto (zoom con la rueda, arrastrar, girar) · ítems.
   - Todo se guarda al instante en la base del puente (vchk/<orden>): lo ve todo el equipo, desde cualquier PC.
   - "Finalizar orden" la cierra (fecha, hora y quién); se puede reabrir.
   - La IA solo se usa para leer el serial del medidor INSTALADO cuando el código de barras no se lee. */
(function(){
var X=window.VOFX;if(!X)return;
var $=X.$,esc=X.esc,toast=X.toast;
var ITEMS_DEF=[['cono_fachada','Cono y fachada'],['papelografo','Papelógrafo'],['sellos_medidor','Sellos y medidor encontrado'],['pruebas','Pruebas'],
 ['trasera','Parte trasera del medidor'],['irregularidad','Datos de irregularidad'],['mat_inst','Material instalado'],['mat_desm','Material desmontado'],
 ['mano_obra','Mano de obra'],['resguardo','Acta de resguardo'],['digitacion','Digitación online'],['comentario','Comentario'],
 ['censo','Censo - consumo proyectado'],['accesible','Medidor accesible']];
var ITEMS=ITEMS_DEF.slice(),TN={};
function ponerItems(l){if(Array.isArray(l)&&l.length)ITEMS=l.filter(function(t){return t&&t[0]&&t[1]}).map(function(t){return[String(t[0]),String(t[1])]});
 TN={};ITEMS_DEF.concat(ITEMS).forEach(function(t){TN[t[0]]=t[1]})}
ponerItems(null);
try{ponerItems(JSON.parse(localStorage.getItem('vof_items')||'null'))}catch(e){}
var EST={C:'Conforme',NC:'No conforme',NA:'No aplica'};
var SER={CONFORME:'Serial conforme','NO CONFORME':'Serial no conforme','SIN LEER':'Serial sin leer','NO APLICA':'Sin cambio de medidor'};
var sec=document.createElement('section');sec.id='tChk';sec.hidden=true;
var ref=$('tVid')||$('tHis');ref.parentNode.insertBefore(sec,ref);
sec.innerHTML=
 '<div class="khd"><b>Validar IA · revisión de la orden</b><span class="mu" id="kInfo">Carga el resultado para ver las órdenes.</span><span style="flex:1"></span>'+
 '<label class="kan">Analista <select id="kAna"><option value="">— escoge —</option></select></label>'+
 '<button class="b s" id="kPdf" type="button">Abrir PDF del computador</button><input type="file" id="kFi" accept=".pdf" hidden></div>'+
 '<div class="kf"><div class="kseg" id="kDia"><button type="button" data-v="hoy">Hoy</button><button type="button" data-v="ayer">Ayer</button><button type="button" data-v="" class="on">Todos</button></div>'+
 '<div class="kseg" id="kEst"></div>'+
 '<select id="kTec" aria-label="Técnico"><option value="">Técnico: todos</option></select>'+
 '<select id="kMo" aria-label="Mano de obra"><option value="">Mano de obra: todas</option></select>'+
 '<input type="search" id="kQ" placeholder="Buscar orden, NIC o técnico" aria-label="Buscar orden"></div>'+
 '<div class="kf ks2" id="kAsigF"><span class="mu sm">Órdenes:</span><div class="kseg" id="kAsig"></div></div>'+
 '<div class="kf ks2"><span class="mu sm">Seriales del medidor instalado:</span><div class="kseg" id="kSer"></div>'+
 '<button class="b s" id="kVer" type="button">Verificar seriales</button><span class="mu sm" id="kVerI"></span></div>'+
 '<div class="kbox"><aside class="klst" id="kLst"></aside><div class="kdet" id="kDet"></div></div>'+
 '<div class="klb" id="kLb" hidden><div class="klbw" id="kLbW">'+
  '<aside class="klba" id="kLbA"><div class="klbah"><b>Acta</b><span class="mu sm">rueda = zoom</span><span style="flex:1"></span><button type="button" id="kAZ" title="Ajustar al ancho">Ancho</button><button type="button" id="kAC" title="Ver el acta completa">Completa</button><button type="button" id="kAO" title="Ocultar el acta">Ocultar ◂</button></div>'+
  '<div class="kst ka" id="kASt"><div class="kzw" id="kAZW"><img id="kAI" alt="Acta recortada" draggable="false"></div><div class="kamsg" id="kAMsg"></div></div></aside>'+
  '<div class="klbf"><div class="kzb"><button type="button" id="kAM" hidden>▸ Acta</button>'+
   '<button type="button" data-z="-" title="Alejar">−</button><button type="button" data-z="+" title="Acercar">+</button><button type="button" data-z="0" title="Ver la foto completa">Ajustar</button>'+
   '<button type="button" data-r="-90" title="Girar a la izquierda">⟲</button><button type="button" data-r="90" title="Girar a la derecha">⟳</button>'+
   '<span class="kcap" id="kLbC"></span><span style="flex:1"></span><button type="button" id="kLbPdf">PDF</button><button type="button" class="kx" id="kLbX" aria-label="Cerrar">✕</button></div>'+
   '<div class="kst" id="kSt"><div class="kzw" id="kZW"><img id="kLbI" alt="Foto del acta" draggable="false"></div><div class="kesp" id="kEsp"></div>'+
   '<button type="button" class="kav p" id="kLbP" aria-label="Foto anterior">‹</button><button type="button" class="kav n" id="kLbN" aria-label="Foto siguiente">›</button></div></div>'+
  '<div class="klbp" id="kLbPan"></div></div></div>'+
 '<div class="kpdfov" id="kPdfOv" hidden><div class="kpdfh"><b id="kPdfT">PDF</b><span class="mu sm" id="kPdfM"></span><span style="flex:1"></span><a class="b s" id="kPdfD" download>Descargar</a><button type="button" class="b s" id="kPdfX">✕ Cerrar</button></div><iframe id="kPdfF" title="PDF del acta"></iframe></div>';

var ORD=[],K={},CUR=null,FILT={dia:'',est:'',tec:'',mo:'',q:'',ser:'',asig:'mios'},LOCKS={},ANAS=[],DRV=null,arr=false,LBI=-1,VER=null;
try{K=JSON.parse(localStorage.getItem('vof_chk2')||'{}')||{}}catch(e){K={}}
var ANA0='';try{ANA0=localStorage.getItem('vof_analista')||''}catch(e){}
try{ANAS=JSON.parse(localStorage.getItem('vof_analistas')||'[]')||[]}catch(e){ANAS=[]}
function ana(){return($('kAna').value||'').trim()}
function pintarAnas(){var v=ana()||ANA0,h='<option value="">— escoge tu nombre —</option>'+ANAS.map(function(a){return'<option'+(a.n===v?' selected':'')+'>'+esc(a.n)+'</option>'}).join('');
 if(v&&!ANAS.some(function(a){return a.n===v}))h+='<option selected>'+esc(v)+'</option>';$('kAna').innerHTML=h}
pintarAnas();
$('kAna').onchange=function(){ANA0=ana();try{localStorage.setItem('vof_analista',ana())}catch(e){}FILT.asig='mios';lista();if(CUR)abrir(CUR.o)};
function misTecs(){var n=ana(),a=ANAS.filter(function(x){return x.n===n})[0];return a&&a.tecs&&a.tecs.length?a.tecs:null}
function asignado(t){for(var i=0;i<ANAS.length;i++)if((ANAS[i].tecs||[]).indexOf(t)>=0)return ANAS[i].n;return''}
function guardarLocal(){try{localStorage.setItem('vof_chk2',JSON.stringify(K))}catch(e){}}
function rv(r,k){var v=r[k];return v==null?'':String(v).trim()}
function fk(f){var m=String(f).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2):''}
function dk(d){return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)}
function L(s){return String(s==null?'':s).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^0+/,'')}
function igual(a,b){a=L(a);b=L(b);if(!a||!b||b.length<4)return null;return a===b||(b.length>=6&&(a.indexOf(b)>=0||b.indexOf(a)>=0))}
function kk(o){var k=K[o]||(K[o]={t:0});if(!k.fotos)k.fotos={};if(!k.items)k.items={};return k}
function itemsCon(k){var it=(k||{}).items||{};return ITEMS.filter(function(t){return(it[t[0]]||{}).e}).length}
function est(o){var k=K[o];if(!k)return'PENDIENTE';if(k.fin)return'FINALIZADA';
 if(itemsCon(k))return'EN REVISIÓN';var f=k.fotos||{};return Object.keys(f).some(function(i){return f[i].item})?'EN REVISIÓN':'PENDIENTE'}
function fechaCorta(t){try{return new Date(t).toLocaleString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return''}}
function sello(m){m.por=ana();m.t=Date.now()}
function guardar(o){o=o||CUR.o;var k=kk(o);k.ana=ana()||k.ana;k.t=Date.now();guardarLocal();subir(o);lista()}

/* ---------- base del puente (compartida) ---------- */
function db(){return X.db&&X.db()}
var tG={};
function subir(o){var d=db();if(!d)return;clearTimeout(tG[o]);tG[o]=setTimeout(function(){var k=K[o];if(!k)return;
 d.doc('vchk/'+o).set(JSON.parse(JSON.stringify(k))).then(function(){$('kInfo').dataset.err=''},function(){toast('No se pudo guardar en la nube; quedó en este navegador y se reintenta.',true);setTimeout(function(){subir(o)},15000)})},900)}
async function bajarTodo(){var d=db();if(!d)return;
 try{var r=await Promise.race([d.collection('vchk').get(),new Promise(function(ok){setTimeout(function(){ok(null)},20000)})]);if(!r)return;
  r.docs.forEach(function(x){var v=x.data()||{};if(v.resp&&!v.fotos)return;               /* formato viejo de pasos: se ignora */
   if(!K[x.id]||(v.t||0)>=(K[x.id].t||0))K[x.id]=v});guardarLocal();lista();
  var ae=document.activeElement;if(CUR&&!LBabierto()&&!(ae&&$('kDet').contains(ae)&&/INPUT|TEXTAREA/.test(ae.tagName)))pintar();if(!rsec.hidden)rvPintar()}catch(e){}}
/* ---------- órdenes (del resultado) ---------- */
window.kDatos=function(){
 var A=window.rFilas?window.rFilas():[];
 ORD=A.filter(function(r){var o=rv(r,'Orden'),i=rv(r,'IRREGULARIDAD');return /^\d{6,}$/.test(o)&&i!=='NO SE VALIDA'&&i!=='LIBERADA'&&rv(r,'Resultado')!=='LIBERADA'})
  .map(function(r){return{o:rv(r,'Orden'),nic:rv(r,'NIC'),tec:rv(r,'Técnico'),fecha:rv(r,'Fecha'),hora:rv(r,'Hora'),k:fk(rv(r,'Fecha')),irr:rv(r,'IRREGULARIDAD'),
   mo:rv(r,'Mano de obra').split(/\s*\|\s*/).map(function(x){return x.trim()}).filter(Boolean),medEnc:rv(r,'MEDIDOR ENCONTRADO')}});
 var u={};ORD=ORD.filter(function(x){if(u[x.o])return false;u[x.o]=1;return true});
 ORD.sort(function(a,b){return(a.k+a.hora).localeCompare(b.k+b.hora)});
 var ts={},ms={};ORD.forEach(function(x){if(x.tec)ts[x.tec]=1;x.mo.forEach(function(m){ms[m]=(ms[m]||0)+1})});
 $('kTec').innerHTML='<option value="">Técnico: todos</option>'+Object.keys(ts).sort().map(function(t){return'<option'+(t===FILT.tec?' selected':'')+'>'+esc(t)+'</option>'}).join('');
 var mk=Object.keys(ms).sort(function(a,b){var ia=/^INST/i.test(a),ib=/^INST/i.test(b);return ia!==ib?(ia?-1:1):a.localeCompare(b)});
 $('kMo').innerHTML='<option value="">Mano de obra: todas</option>'+mk.map(function(m){return'<option value="'+esc(m)+'"'+(m===FILT.mo?' selected':'')+'>'+esc(m)+' ('+ms[m]+')</option>'}).join('');
 $('kInfo').textContent=ORD.length?ORD.length+' órdenes con acta en el resultado.':'El resultado no trae órdenes con acta.';
 lista()};
function base(sinEst,sinSer,sinAsig){var mt=misTecs();var h=new Date(),hoy=dk(h);h.setDate(h.getDate()-1);var ayer=dk(h),q=FILT.q.toLowerCase();
 return ORD.filter(function(x){if(FILT.dia==='hoy'&&x.k!==hoy)return false;if(FILT.dia==='ayer'&&x.k!==ayer)return false;
  if(FILT.tec&&x.tec!==FILT.tec)return false;if(FILT.mo&&x.mo.indexOf(FILT.mo)<0)return false;
  if(q&&(x.o+' '+x.nic+' '+x.tec).toLowerCase().indexOf(q)<0)return false;
  if(!sinAsig&&FILT.asig==='mios'&&mt&&mt.indexOf(x.tec)<0)return false;
  if(!sinAsig&&FILT.asig==='sin'&&asignado(x.tec))return false;
  if(!sinEst&&FILT.est&&est(x.o)!==FILT.est)return false;
  if(!sinSer&&FILT.ser){var s=(K[x.o]||{}).serial;if(FILT.ser==='SIN VERIFICAR'?!!s:!(s&&s.res===FILT.ser))return false}
  return true})}
function contadores(){
 var B=base(true,false),c={'':B.length,PENDIENTE:0,'EN REVISIÓN':0,FINALIZADA:0};B.forEach(function(x){c[est(x.o)]++});
 $('kEst').innerHTML=[['','Todas'],['PENDIENTE','Pendientes'],['EN REVISIÓN','En revisión'],['FINALIZADA','Finalizadas']].map(function(e){
  return'<button type="button" data-v="'+e[0]+'" class="'+(FILT.est===e[0]?'on':'')+'">'+e[1]+' <b>'+c[e[0]]+'</b></button>'}).join('');
 var S=base(false,true),s={'':S.length,CONFORME:0,'NO CONFORME':0,'SIN LEER':0,'SIN VERIFICAR':0};
 S.forEach(function(x){var r=(K[x.o]||{}).serial;if(!r)s['SIN VERIFICAR']++;else if(s[r.res]!==undefined)s[r.res]++});
 $('kSer').innerHTML=[['','Todos'],['CONFORME','Conformes'],['NO CONFORME','No conformes'],['SIN LEER','Sin leer'],['SIN VERIFICAR','Sin verificar']].map(function(e){
  return'<button type="button" data-v="'+e[0]+'" class="'+(FILT.ser===e[0]?'on':'')+(e[0]==='NO CONFORME'&&s[e[0]]?' rojo':'')+'">'+e[1]+' <b>'+s[e[0]]+'</b></button>'}).join('');
 var A=base(false,false,true),mt=misTecs(),na={mios:0,sin:0,'':A.length};A.forEach(function(x){if(mt&&mt.indexOf(x.tec)>=0)na.mios++;if(!asignado(x.tec))na.sin++});
 var hayAsig=ANAS.some(function(a){return(a.tecs||[]).length});$('kAsigF').hidden=!hayAsig;
 $('kAsig').innerHTML=(mt?'<button type="button" data-v="mios" class="'+(FILT.asig==='mios'?'on':'')+'">Mis técnicos <b>'+na.mios+'</b></button>':'')+
  '<button type="button" data-v="sin" class="'+(FILT.asig==='sin'?'on':'')+'">Sin asignar <b>'+na.sin+'</b></button>'+
  '<button type="button" data-v="" class="'+(!FILT.asig||(FILT.asig==='mios'&&!mt)?'on':'')+'">Ver todas <b>'+na['']+'</b></button>';
 var fin=c.FINALIZADA;return{fin:fin,tot:B.length}}
function lista(){
 var cc=contadores(),F=base();
 $('kLst').innerHTML='<div class="klh">'+F.length+' órdenes · <b>'+cc.fin+'</b> finalizadas de '+cc.tot+'</div>'+(F.slice(0,500).map(function(x){var e=est(x.o),k=K[x.o]||{},n=itemsCon(k),s=k.serial;
  return'<button type="button" class="kit'+(CUR&&CUR.o===x.o?' on':'')+'" data-o="'+esc(x.o)+'"><b>'+esc(x.o)+'</b> <span class="mu">'+esc(x.fecha.slice(0,5))+' '+esc(x.hora.slice(0,5))+'</span><br><span class="sm">'+esc(x.tec||'(sin técnico)')+'</span><br>'+
   '<span class="ke '+(e==='FINALIZADA'?'ok':e==='EN REVISIÓN'?'wn':'')+'">'+e+'</span>'+(lockDe(x.o)?' <span class="klk" title="La está revisando">🔒 '+esc(lockDe(x.o))+'</span>':'')+(n?' <span class="mu sm">'+n+'/'+ITEMS.length+' ítems</span>':'')+
   (s?' <span class="ksr '+(s.res==='CONFORME'?'ok':s.res==='NO CONFORME'?'er':'')+'">'+(s.res==='CONFORME'?'serial ✓':s.res==='NO CONFORME'?'serial ✗':s.res==='SIN LEER'?'serial ?':'sin cambio')+'</span>':'')+'</button>'}).join('')||'<p class="mu" style="padding:12px">No hay órdenes con estos filtros.</p>')}

/* ================= FOTOS: navegador (IndexedDB) → Drive → PDF ================= */
var IDBP=null;
function idb(){if(!IDBP)IDBP=new Promise(function(ok){try{var r=indexedDB.open('vof_fotos',1);r.onupgradeneeded=function(){r.result.createObjectStore('o')};
 r.onsuccess=function(){ok(r.result)};r.onerror=function(){ok(null)};r.onblocked=function(){ok(null)}}catch(e){ok(null)}});return IDBP}
async function idbGet(o){var d=await idb();if(!d)return null;
 return new Promise(function(ok){try{var q=d.transaction('o').objectStore('o').get(o);q.onsuccess=function(){ok(q.result||null)};q.onerror=function(){ok(null)}}catch(e){ok(null)}})}
async function idbPut(o,v){var d=await idb();if(!d)return;
 await new Promise(function(ok){try{var tx=d.transaction('o','readwrite');tx.objectStore('o').put(v,o);tx.oncomplete=ok;tx.onerror=ok;tx.onabort=ok}catch(e){ok()}});
 var m={};try{m=JSON.parse(localStorage.getItem('vof_fotos_t')||'{}')||{}}catch(e){}m[o]=Date.now();var ks=Object.keys(m);
 if(ks.length>300)ks.sort(function(a,b){return m[a]-m[b]}).slice(0,ks.length-300).forEach(function(x){delete m[x];try{d.transaction('o','readwrite').objectStore('o').delete(x)}catch(e){}});
 try{localStorage.setItem('vof_fotos_t',JSON.stringify(m))}catch(e){}}

/* entradas en memoria: las últimas órdenes vistas (con sus URLs de imagen) */
var MEM={},MEML=[],VER_EN='';
function urlDe(b){return{b:b,u:URL.createObjectURL(b)}}
function soltar(E){(E.fotos||[]).forEach(function(f){URL.revokeObjectURL(f.u)});if(E.acta)URL.revokeObjectURL(E.acta.u)}
function recordar(o){MEML=MEML.filter(function(x){return x!==o});MEML.push(o);var v=0;
 while(MEML.length>7&&v++<20){var x=MEML.shift(),E=MEM[x];if((CUR&&CUR.o===x)||x===VER_EN||(E&&!E.listo)){MEML.push(x);continue}delete MEM[x];if(E)soltar(E)}}
function olvidar(o){var E=MEM[o];if(!E||(CUR&&CUR.o===o)||o===VER_EN)return;delete MEM[o];MEML=MEML.filter(function(x){return x!==o});soltar(E)}
function cargar(o,u8){var E=MEM[o];if(E&&!(u8&&E.err)){recordar(o);return E}
 E=MEM[o]={o:o,u8:u8||null,fotos:[],acta:null,fuente:'',estado:'Buscando las fotos…',listo:false,err:''};
 E.prom=cargarOrden(E).then(function(){E.listo=true;E.estado='';avisar(E)},
  function(e){E.listo=true;E.estado='';E.err=(e&&e.message)||X.drMsg(e)||'No se pudieron cargar las fotos.';avisar(E)});
 recordar(o);return E}
function avisar(E){if(CUR&&CUR.o===E.o)pintarPronto()}
async function cargarOrden(E){var o=E.o,k=kk(o);
 if(!E.u8){
  /* 1. este navegador */
  var v=await idbGet(o);
  if(v&&v.fotos&&v.fotos.length){E.fotos=v.fotos.map(urlDe);if(v.acta)E.acta=urlDe(v.acta);E.fuente='navegador';
   if(v.drive)SUBE[o]=SUBE[o]||{ok:1};else encolarSubida(o);avisar(E)}
  /* 2. Drive (VOF CAMP/FOTOS/<orden>) */
  else if(window.vofPuente&&/^\d{6,12}$/.test(o)){E.estado='Buscando las fotos en Drive…';avisar(E);var j=null;
   try{j=await window.vofPuente('fotos_listar',{orden:o})}catch(e){E.avisoDrive=(e&&e.message)||''}
   if(j&&j.fotos&&j.fotos.length){E.fuente='drive';var L=j.fotos,i;
    for(i=0;i<L.length;i+=3){var r=await window.vofPuente('foto_bajar',{ids:L.slice(i,i+3).map(function(x){return x.id})});
     (r.fotos||[]).forEach(function(f){E.fotos.push(urlDe(b64aBlob(f.blob)))});E.estado='Bajando fotos de Drive: '+E.fotos.length+' de '+L.length+'…';avisar(E)}
    if(j.acta){try{var ra=await window.vofPuente('foto_bajar',{ids:[j.acta]});E.acta=urlDe(b64aBlob(ra.fotos[0].blob));avisar(E)}catch(e){}}
    SUBE[o]={ok:1};await idbPut(o,{fotos:E.fotos.map(function(f){return f.b}),acta:E.acta?E.acta.b:null,drive:!!E.acta})}}}
 /* 3. el PDF del acta: fotos (si no estaban), acta recortada y datos */
 if(!E.fotos.length||!E.acta||!k.acta){
  var sacar=!E.fotos.length;E.estado=sacar?'Abriendo el PDF del acta…':'Recortando el acta…';avisar(E);
  var u8=E.u8||await pdfDe(o);
  var d=await leerPdf(u8,{fotos:sacar,recorte:!E.acta,onFoto:function(b){E.fotos.push(urlDe(b));E.fuente='pdf';E.estado='Sacando las fotos del PDF ('+E.fotos.length+')…';avisar(E)}});
  if(!k.acta){k.acta=datosActa(d);k.t=Date.now();guardarLocal();subir(o)}
  if(d.recorte&&!E.acta){E.acta=urlDe(d.recorte);avisar(E)}
  if(E.fotos.length&&/^\d{6,12}$/.test(o)){await idbPut(o,{fotos:E.fotos.map(function(f){return f.b}),acta:E.acta?E.acta.b:null,drive:false});encolarSubida(o)}}}

/* ---------- subida a Drive: en fila, una foto por llamada ---------- */
var SQ=[],SQon=false,SUBE={};
function encolarSubida(o){if(!window.vofPuente||!/^\d{6,12}$/.test(o))return;if(SQ.indexOf(o)<0)SQ.push(o);SUBE[o]={txt:'En fila para guardar en Drive…'};corrSub()}
function refrescaSub(o){if(CUR&&CUR.o===o)pintarCab()}
async function conReintento(fn){for(var n=0;;n++){try{return await fn()}catch(e){if(n>=2||(e&&e.codigo==='clave'))throw e;await new Promise(function(r){setTimeout(r,2500*(n+1))})}}}
async function corrSub(){if(SQon)return;SQon=true;
 while(SQ.length){var o=SQ.shift(),st=SUBE[o]={txt:'Guardando en Drive…'};refrescaSub(o);
  try{var v=await idbGet(o);if(!v||!v.fotos||!v.fotos.length){delete SUBE[o];continue}
   var j=await conReintento(function(){return window.vofPuente('fotos_listar',{orden:o})}),hay={};(j.fotos||[]).forEach(function(x){hay[x.nombre]=1});
   var T=v.fotos.map(function(b,i){return{nombre:nombreFoto(i),b:b}}).filter(function(x){return!hay[x.nombre]});
   if(v.acta&&!j.acta)T.push({nombre:'acta.jpg',b:v.acta});
   for(var i=0;i<T.length;i++){st.txt='Guardando en Drive: '+(i+1)+' de '+T.length+'…';refrescaSub(o);
    var b64=await blobA64(T[i].b),nom=T[i].nombre;
    await conReintento(function(){return window.vofPuente('fotos_subir',{orden:o,fotos:[{nombre:nom,blob:b64}]})})}
   v.drive=!!v.acta;await idbPut(o,v);SUBE[o]={ok:1}}
  catch(e){SUBE[o]={err:(e&&e.message)||'error desconocido'}}
  refrescaSub(o)}
 SQon=false}

/* ---------- precarga en fila: una orden a la vez, todas las que siguen en la lista ---------- */
var GEN=0;
async function filaPrecarga(gen){if(!CUR)return;
 var F=base().filter(function(y){return est(y.o)!=='FINALIZADA'}),i=F.findIndex(function(y){return y.o===CUR.o}),sig=F.slice(i+1);
 for(var n=0;n<sig.length;n++){var o=sig[n].o;if(gen!==GEN)return;
  if(MEM[o]&&MEM[o].listo)continue;
  var v=await idbGet(o);if(v&&v.fotos&&v.fotos.length&&v.acta&&(K[o]||{}).acta)continue;     /* ya está lista en el navegador */
  if(gen!==GEN)return;
  var E=cargar(o);await E.prom;
  if(!(CUR&&CUR.o===o))olvidar(o)}}                                                          /* queda en el navegador; se suelta de la memoria */

/* ---------- PDF ---------- */
async function pdfDe(o){
 if(!X.mcp())throw new Error('No hay conexión con el Drive: escribe la clave del equipo arriba, o usa "Abrir PDF del computador".');
 if(!DRV||Date.now()-DRV.t>300000){var l=await X.drLista(X.DR.ord);DRV={t:Date.now(),m:{}};l.forEach(function(f){DRV.m[String(f.title||'').replace(/\.pdf$/i,'')]=f})}
 var f=DRV.m[o];if(!f)throw new Error('No está el PDF '+o+'.pdf en la carpeta ORDENES.');
 return X.drBytes(f.id,[37,80,68,70])}
function aCanvas(img){var c=document.createElement('canvas');
 if(img.bitmap){c.width=img.bitmap.width;c.height=img.bitmap.height;c.getContext('2d').drawImage(img.bitmap,0,0);return c}
 var w=img.width,h=img.height,d=img.data;if(!d||!w||!h)return null;c.width=w;c.height=h;var cx=c.getContext('2d'),id=cx.createImageData(w,h),p=id.data,n=w*h;
 if(img.kind===3||d.length===n*4)p.set(d.subarray(0,n*4));
 else if(img.kind===2||d.length===n*3){for(var i=0,j=0;i<n;i++,j+=3){p[i*4]=d[j];p[i*4+1]=d[j+1];p[i*4+2]=d[j+2];p[i*4+3]=255}}
 else{var rb=(w+7)>>3;for(var y=0;y<h;y++)for(var x=0;x<w;x++){var v=(d[y*rb+(x>>3)]>>(7-(x&7)))&1?255:0,q=(y*w+x)*4;p[q]=p[q+1]=p[q+2]=v;p[q+3]=255}}
 cx.putImageData(id,0,0);return c}
function huella(c){var t=document.createElement('canvas');t.width=t.height=10;var cx=t.getContext('2d');cx.drawImage(c,0,0,10,10);var d=cx.getImageData(0,0,10,10).data,s='';for(var i=0;i<d.length;i+=4)s+=((d[i]+d[i+1]+d[i+2])/48|0).toString(16);return c.width+'x'+c.height+s}
function aBlob(c,lado,q){var e=Math.min(1,lado/Math.max(c.width,c.height)),t=document.createElement('canvas');t.width=Math.round(c.width*e);t.height=Math.round(c.height*e);t.getContext('2d').drawImage(c,0,0,t.width,t.height);
 return new Promise(function(r){t.toBlob(r,'image/jpeg',q)})}
async function leerPdf(u8,op){op=op||{};
 if(typeof pdfjsLib==='undefined')throw new Error('No cargó el lector de PDF.');
 var pdf=await pdfjsLib.getDocument({data:new Uint8Array(u8),verbosity:0}).promise,vis={},O=pdfjsLib.OPS,n=0;
 var acta=null,lin=[];try{lin=await X.pdfLines(pdf);acta=X.parseActa(lin,'acta.pdf')}catch(e){acta=null}
 var bolsa='';try{lin.forEach(function(p){p.forEach(function(l,i){if(/MATERIAL SERIADO INSTALADO/i.test(l.cells.join(' '))){var nx=(p[i+1]||{cells:[]}).cells.join(' ');var m=/\b([A-Z]{2,4}\d{5,})\b/.exec(nx);if(m)bolsa=m[1]}})})}catch(e){}
 var recorte=null;if(op.recorte){try{recorte=await recortarActa(pdf)}catch(e){recorte=null}}
 if(op.fotos)for(var p=1;p<=pdf.numPages;p++){var pg=await pdf.getPage(p),ops=await pg.getOperatorList();
  for(var i=0;i<ops.fnArray.length;i++){var f=ops.fnArray[i];if(f!==O.paintImageXObject&&f!==O.paintJpegXObject)continue;
   var id=ops.argsArray[i][0];if(vis[id])continue;vis[id]=1;
   var img=await new Promise(function(ok){var src=String(id).indexOf('g_')===0?pg.commonObjs:pg.objs;try{src.get(id,ok)}catch(e){ok(null)}setTimeout(function(){ok(null)},8000)});
   if(!img)continue;var c=aCanvas(img);if(!c)continue;var mn=Math.min(c.width,c.height),ar=Math.max(c.width,c.height)/mn;
   if(mn<40)continue;                                                  /* solo se saltan puntitos minúsculos */
   var h=huella(c);if(vis[h])continue;vis[h]=1;
   var b=await aBlob(c,2400,0.92);if(b){n++;if(op.onFoto)op.onFoto(b)}}
  pg.cleanup()}
 pdf.destroy();return{n:n,acta:acta||{},bolsa:bolsa,recorte:recorte}}

/* El acta "recortada": solo las tablas (encabezado, medidor encontrado, sellos, pruebas, censo, irregularidad,
   medidor instalado, trabajos, materiales, observaciones), sin logo, sin textos legales y sin las fotos. */
var CORTA_TXT=/^\s*(A LOS \d|NOTA\s*:|EL CLIENTE\/USUARIO SOLICITA|EN CASO DE)/;
var SIGUE_TXT=/(DATOS DEL MEDIDOR|SELLOS|PRUEBAS REALIZADAS|PRUEBAS DE FUNCIONAMIENTO|CENSO DE CARGA|IRREGULARIDAD|TRABAJOS EJECUTADOS|MATERIAL |CONTROL OPERACIONAL|OBSERVACIONES)/;
async function recortarActa(pdf){
 var ESC=2.2,trozos=[],fin=false,ini=false;
 for(var p=1;p<=Math.min(pdf.numPages,4)&&!fin;p++){
  var pg=await pdf.getPage(p),vp1=pg.getViewport({scale:1}),tc=await pg.getTextContent(),L=[];
  tc.items.forEach(function(it){if(!it.str||!it.str.trim())return;var h=Math.abs(it.transform[3])||it.height||8,y=vp1.height-it.transform[5]-h;
   var l=null;for(var q=0;q<L.length;q++)if(Math.abs(L[q].y-y)<2.5){l=L[q];break}
   if(!l){l={y:y,b:y+h,t:''};L.push(l)}l.t+=' '+it.str;l.b=Math.max(l.b,y+h);l.y=Math.min(l.y,y)});
  L.sort(function(a,b){return a.y-b.y});
  var bandas=[],cur=null,dentro=ini;
  for(var i=0;i<L.length;i++){var T=X.nrm?X.nrm(L[i].t).toUpperCase():L[i].t.toUpperCase();
   if(/SOPORTE FOTOGRAFICO|^\s*FIRMAS\b|REGISTRO FOTOGRAFICO/.test(T)){fin=true;break}
   if(/P.{1,3}GINA \d+ DE \d+/.test(T)){cur=null;continue}
   if(!ini){if(/CIUDAD/.test(T)){ini=dentro=true}else continue}
   if(CORTA_TXT.test(T))dentro=false;else if(!dentro&&T.length<90&&SIGUE_TXT.test(T))dentro=true;
   if(!dentro){cur=null;continue}
   if(cur)cur.b=L[i].b;else{cur={y:L[i].y,b:L[i].b};bandas.push(cur)}}
  if(!bandas.length){pg.cleanup();continue}
  var vp=pg.getViewport({scale:ESC}),cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  var g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);
  await pg.render({canvasContext:g,viewport:vp}).promise;
  bandas.forEach(function(b){var y0=Math.max(0,(b.y-4)*ESC),y1=Math.min(cv.height,(b.b+4)*ESC);if(y1-y0>6)trozos.push({c:cv,y:y0,h:y1-y0})});
  pg.cleanup()}
 if(!trozos.length){var pg1=await pdf.getPage(1),v1=pg1.getViewport({scale:ESC}),c1=document.createElement('canvas');c1.width=Math.ceil(v1.width);c1.height=Math.ceil(v1.height);
  var g1=c1.getContext('2d');g1.fillStyle='#fff';g1.fillRect(0,0,c1.width,c1.height);await pg1.render({canvasContext:g1,viewport:v1}).promise;trozos.push({c:c1,y:0,h:c1.height})}
 var mx=Math.round(22*ESC),W=trozos[0].c.width-2*mx,H=0;trozos.forEach(function(t){H+=t.h});
 var out=document.createElement('canvas');out.width=W;out.height=Math.ceil(H);var go=out.getContext('2d'),y=0;go.fillStyle='#fff';go.fillRect(0,0,W,out.height);
 trozos.forEach(function(t){go.drawImage(t.c,mx,t.y,W,t.h,0,y,W,t.h);y+=t.h});
 return new Promise(function(r){out.toBlob(r,'image/jpeg',0.85)})}
function b64aBlob(s){var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:'image/jpeg'})}
async function blobA64(b){var u=new Uint8Array(await b.arrayBuffer()),s='',i;for(i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
function nombreFoto(i){return'foto_'+String(i+1).padStart(3,'0')+'.jpg'}
function datosActa(d){var a=d.acta||{};return{nic:a.nic||'',fecha:a.fecha||'',tec:a.tecnico||'',medEnc:a.medEnc||'',medInst:a.medInst||'',cambioMed:a.cambioMed||'',bolsa:d.bolsa||'',
 irr:(a.irr||[]).map(function(i){return i.n+' '+i.nombre})}}
/* ================= QUIÉN REVISA CADA ORDEN (vlock/<orden> en el puente) ================= */
function lockDe(o){var l=LOCKS[o];if(!l||!l.por||l.por===ana())return'';return Date.now()-(l.t||0)<180000?l.por:''}
async function leerLocks(){if(!window.vofPuente)return;try{var j=await window.vofPuente('db_lista',{coleccion:'vlock'}),m={};(j.docs||[]).forEach(function(d){m[d.id]=d.datos||{}});LOCKS=m;lista()}catch(e){}}
var ULT=Date.now(),TOM='';
['pointerdown','keydown','wheel','mousemove'].forEach(function(ev){document.addEventListener(ev,function(){ULT=Date.now()},{passive:true})});
async function tomarOrden(o){
 if(!window.vofPuente||!/^\d{6,12}$/.test(o))return{tomada:true};
 if(!ana())return{tomada:false,sinNombre:true};
 try{var j=await window.vofPuente('tomar',{orden:o,quien:ana()});
  if(j.tomada){LOCKS[o]={por:ana(),t:Date.now()};TOM=o}else if(j.por)LOCKS[o]={por:j.por,t:Date.now(),desde:j.desde};return j}
 catch(e){return{tomada:true,aviso:(e&&e.message)||''}}}                     /* si el puente falla, no se frena el trabajo */
function soltarOrden(o){if(!o)return;if(TOM===o)TOM='';if(LOCKS[o]&&LOCKS[o].por===ana())delete LOCKS[o];
 if(window.vofPuente&&ana())window.vofPuente('tomar',{orden:o,quien:ana(),soltar:true}).catch(function(){})}
setInterval(function(){if(!TOM)return;
 if(Date.now()-ULT<600000){var o0=TOM;window.vofPuente('tomar',{orden:o0,quien:ana()}).then(function(j){if(j&&j.tomada===false&&j.por){TOM='';LOCKS[o0]={por:j.por,t:Date.now()};
  if(CUR&&CUR.o===o0){CUR.ro='El administrador le pasó esta orden a '+j.por+' — solo puedes mirarla.';pintar();if(LBabierto())lbPanel()}lista()}}).catch(function(){})}
 else{var o=TOM;soltarOrden(o);if(CUR&&CUR.o===o){CUR.ro='La orden se soltó por 10 minutos sin actividad. Vuelve a abrirla para seguir revisando.';pintar();if(LBabierto())lbPanel()}}},60000);
setInterval(function(){if(!sec.hidden&&!document.hidden)leerLocks()},60000);
window.addEventListener('pagehide',function(){if(TOM&&window.vofAviso)window.vofAviso('tomar',{orden:TOM,quien:ana(),soltar:true})});
function puedo(){if(CUR&&CUR.ro){toast(CUR.ro,true);return false}return true}
async function liberarAdmin(){var o=CUR.o,c=prompt('Clave de administrador para liberar la orden '+o+':');if(!c)return;
 if(!ana()){toast('Escoge primero tu nombre en "Analista".',true);return}
 try{var j=await window.vofPuente('tomar',{orden:o,quien:ana(),forzar:true,admin:c});if(j.tomada){TOM=o;LOCKS[o]={por:ana(),t:Date.now()};if(CUR&&CUR.o===o){CUR.ro='';pintar();lista()}toast('Orden liberada: ahora la tienes tú.')}}
 catch(e){toast((e&&e.message)||'No se pudo liberar',true)}}

/* ================= ABRIR Y PINTAR ================= */
window.kAbrir=function(o){if(!arr)window.kMostrar();abrir(o)};
function abrir(o,u8){GEN++;var gen=GEN;
 var x=ORD.filter(function(y){return y.o===o})[0]||{o:o,nic:'',tec:'',fecha:'',hora:'',irr:'',mo:[]};
 if(LBabierto())lbCerrar(true);
 if(TOM&&TOM!==o)soltarOrden(TOM);
 CUR={o:o,x:x,ro:'Revisando si otro analista tiene esta orden…'};var E=cargar(o,u8);lista();pintar();
 tomarOrden(o).then(function(j){if(!CUR||CUR.o!==o)return;
  CUR.ro=j.tomada?'':j.sinNombre?'Escoge tu nombre en "Analista" arriba para revisar esta orden.':'En revisión por '+j.por+(j.desde?' desde las '+new Date(j.desde).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}):'')+' — solo puedes mirarla.';
  pintar();lista();if(LBabierto())lbPanel()});
 E.prom.then(function(){if(gen!==GEN||!CUR||CUR.o!==o)return;completar();pintar();filaPrecarga(gen)})}
function E_(){return CUR&&MEM[CUR.o]||{fotos:[],listo:false,estado:'Cargando…'}}
function completar(){var a=(K[CUR.o]||{}).acta||{},x=CUR.x;if(!x.nic)x.nic=a.nic||'';if(!x.fecha)x.fecha=a.fecha||'';if(!x.tec)x.tec=a.tec||''}
var tPin=0;
function pintarPronto(){if(tPin)return;tPin=setTimeout(function(){tPin=0;
 var ae=document.activeElement;if(ae&&$('kDet').contains(ae)&&/INPUT|TEXTAREA/.test(ae.tagName)){pintarCab();pintarPronto();return}
 pintar();if(LBabierto())lbRefrescar()},180)}
function fuenteTxt(E){var s=SUBE[CUR.o]||{};
 var de=E.fuente==='navegador'?'Fotos de este navegador':E.fuente==='drive'?'Fotos de Drive':E.fuente==='pdf'?'Fotos sacadas del PDF':'';
 var dr=s.err?'<span class="kerr">⚠ No se guardaron en Drive: '+esc(s.err)+' <button type="button" class="b s" id="kReSub">Reintentar</button></span>':
  s.txt?'<span class="mu sm">'+esc(s.txt)+'</span>':s.ok?'<span class="kok">Guardadas en Drive ✓</span>':'';
 return(de?'<span class="mu sm">'+de+'</span>':'')+dr}
function cabecera(){var x=CUR.x,k=K[CUR.o]||{},e=est(CUR.o),E=E_();
 return'<div class="kch" id="kCab"><b>Orden '+esc(x.o)+'</b><span class="mu">NIC '+esc(x.nic)+' · '+esc(x.tec)+' · '+esc(x.fecha)+' '+esc(x.hora)+'</span>'+
  '<span class="ke big '+(e==='FINALIZADA'?'ok':e==='EN REVISIÓN'?'wn':'')+'">'+e+'</span>'+
  (k.fin?'<span class="mu sm">Cerrada por '+esc(k.fin.por||'?')+' el '+esc(fechaCorta(k.fin.t))+'</span>':'')+
  '<span style="flex:1"></span>'+fuenteTxt(E)+'<button type="button" class="kpdf" id="kVerPdf">PDF</button></div>'+
  (CUR.ro?'<div class="kro">🔒 '+esc(CUR.ro)+(/En revisión por/.test(CUR.ro)?' <button type="button" class="b s" id="kLib">Liberar (admin)</button>':'')+'</div>':'')}
function pintarCab(){var c=$('kCab');if(c&&CUR)c.outerHTML=cabecera()}
function serialHtml(){var k=K[CUR.o]||{},a=k.acta||{},s=k.serial;
 var t='<div class="kser"><div><span class="mu sm">Serial medidor instalado (acta)</span><b>'+esc(a.cambioMed==='SI'?(a.medInst||'—'):a.cambioMed?'No se cambió medidor':'—')+'</b></div>';
 if(s)t+='<div><span class="mu sm">Leído '+(s.via==='barras'?'del código de barras':'por la IA')+'</span><b>'+esc(s.leido||'—')+'</b></div><span class="ksr big '+(s.res==='CONFORME'?'ok':s.res==='NO CONFORME'?'er':'')+'">'+esc(SER[s.res]||s.res)+'</span>'+
  (s.foto>=0?'<button type="button" class="b s" data-ir="'+s.foto+'">Ver foto '+(s.foto+1)+'</button>':'')+(s.aviso?'<span class="mu sm">'+esc(s.aviso)+'</span>':'');
 t+='<button type="button" class="b s" id="kSer1">'+(s?'Volver a verificar':'Verificar serial')+'</button></div>';return t}
function itemDe(i){return(((K[CUR.o]||{}).fotos||{})[i]||{}).item||''}
function rotDe(i){return(((K[CUR.o]||{}).fotos||{})[i]||{}).rot||0}
function chip(i){var it=itemDe(i);if(!it)return'<span class="kchip nada">Sin ítem</span>';var e=(((K[CUR.o]||{}).items||{})[it]||{}).e;
 return'<span class="kchip '+(e==='NC'?'nc':e==='C'?'c':e==='NA'?'na':'')+'">'+esc(TN[it]||it)+(e?' · '+(e==='C'?'✓':e==='NC'?'✗':'N/A'):'')+'</span>'}

/* lista de los 14 ítems (sirve en el visor y en el resumen) */
function itemsHtml(lb){var k=K[CUR.o]||{},it=k.items||{},fm=k.fotos||{},n=E_().fotos.length,cnt={};
 Object.keys(fm).forEach(function(i){var t=fm[i].item;if(t&&(+i<n||!n))cnt[t]=(cnt[t]||0)+1});
 var act=lb?itemDe(LBI):'';
 return'<div class="kits">'+ITEMS.map(function(t){var m=it[t[0]]||{},e=m.e||'',id=t[0];
  return'<div class="kir'+(e==='C'?' c':e==='NC'?' nc':e==='NA'?' na':'')+(act===id?' act':'')+'">'+
   '<button type="button" class="kin" data-it="'+id+'" title="'+(lb?'Esta foto es de: ':'Ver las fotos de: ')+esc(t[1])+'">'+(act===id?'📷 ':'')+esc(t[1])+(cnt[id]?' <small>'+cnt[id]+'</small>':'')+'</button>'+
   '<span class="kie"><button type="button" data-ie="C" data-id="'+id+'" class="'+(e==='C'?'on':'')+'" title="Conforme">✓</button>'+
   '<button type="button" data-ie="NC" data-id="'+id+'" class="'+(e==='NC'?'on':'')+'" title="No conforme">✗</button>'+
   '<button type="button" data-ie="NA" data-id="'+id+'" class="'+(e==='NA'?'on':'')+'" title="No aplica">N/A</button></span></div>'}).join('')+'</div>'}
function obsHtml(lb){var k=K[CUR.o]||{};return'<label class="kobs"><b>Observaciones de la orden</b><textarea data-obsg="1" rows="'+(lb?4:5)+'" placeholder="Escribe aquí todo lo que encontraste en la orden"'+(CUR.ro?' readonly':'')+'>'+esc(k.obs||'')+'</textarea></label>'}
function fotosDeItem(id){var f=(K[CUR.o]||{}).fotos||{},n=E_().fotos.length;return Object.keys(f).filter(function(i){return f[i].item===id&&+i<n}).map(Number).sort(function(a,b){return a-b})}
function resumen(){var k=K[CUR.o]||{},it=k.items||{},hechos=itemsCon(k),nc=ITEMS.filter(function(t){return(it[t[0]]||{}).e==='NC'});
 var h='<div class="kres"><h3>Revisión de la orden <span class="mu sm">'+hechos+' de '+ITEMS.length+' ítems con estado</span></h3>'+itemsHtml(false)+obsHtml(false);
 if(nc.length)h+='<div class="knc"><b>No conformes</b>'+nc.map(function(t){var fs=fotosDeItem(t[0]);
  return'<div class="knci"><b>'+esc(t[1])+'</b>'+fs.map(function(i){return' <button type="button" class="kfb" data-ir="'+i+'">foto '+(i+1)+'</button>'}).join('')+'</div>'}).join('')+'</div>';
 h+='<div class="kfin">'+(k.fin?'<button type="button" class="kbt no big" id="kReab">Reabrir orden</button><span class="mu sm">Resultado: <b>'+esc(k.fin.res||'')+'</b></span>':
  (CUR.ro?'':'<button type="button" class="kbt si big" id="kFin">✓ Finalizar orden</button>')+'<span class="mu sm">'+(hechos<ITEMS.length?'Faltan '+(ITEMS.length-hechos)+' ítems sin estado.':'Los 14 ítems tienen estado.')+'</span>')+'</div></div>';return h}
function pintar(){
 if(!CUR){$('kDet').innerHTML='<div class="kvac"><b>Escoge una orden de la lista</b><p class="mu">Salen todas las fotos del acta. Dale clic a una para verla grande junto al acta recortada y marcar los 14 ítems. Todo se guarda solo en la nube.</p></div>';return}
 var E=E_(),k=K[CUR.o]||{},a=k.acta||{};
 if(!E.fotos.length&&!E.listo){$('kDet').innerHTML=cabecera()+'<div class="kvac"><span class="spin"></span> '+esc(E.estado||'Cargando…')+'</div>';return}
 if(!E.fotos.length&&E.err){$('kDet').innerHTML=cabecera()+'<div class="kvac"><b>No se pudo abrir el acta</b><p class="mu">'+esc(E.err)+'</p></div>';return}
 $('kDet').innerHTML=cabecera()+
  ((a.irr||[]).length?'<div class="mu sm">Anomalías del acta: <b>'+esc(a.irr.join(' · '))+'</b></div>':'<div class="mu sm">El acta no reporta anomalía.</div>')+
  serialHtml()+
  (E.listo?'':'<div class="kprog"><span class="spin"></span> '+esc(E.estado||'')+'</div>')+
  (!E.fotos.length?'<p class="mu">El acta no trae fotos.</p>':'')+
  '<div class="kgal">'+E.fotos.map(function(f,i){var it=itemDe(i),e=(((k.items||{})[it])||{}).e,r=rotDe(i);
   return'<button type="button" class="kth'+(e==='NC'?' nc':e==='C'?' c':'')+'" data-f="'+i+'"><img src="'+f.u+'" alt="Foto '+(i+1)+'" loading="lazy"'+(r?' style="transform:rotate('+r+'deg)"':'')+'><span class="kn">'+(i+1)+'</span>'+chip(i)+'</button>'}).join('')+'</div>'+
  resumen()}

/* clics en la lista de ítems (visor o resumen) */
function clicItems(e,lb){var t=e.target.closest('button');if(!t)return false;
 if((t.dataset.it&&lb)||t.dataset.ie){if(!puedo())return true}
 if(t.dataset.it){var id=t.dataset.it;
  if(lb){var k=kk(CUR.o),m=k.fotos[LBI]||(k.fotos[LBI]={});m.item=m.item===id?'':id;sello(m);guardar();lbPanel();pintarMini()}
  else{var fs=fotosDeItem(id);if(fs.length)lbAbrir(fs[0]);else toast('Ninguna foto está marcada como "'+TN[id]+'". Abre una foto y toca el ítem.')}
  return true}
 if(t.dataset.ie){var id2=t.dataset.id,k2=kk(CUR.o);k2.items=k2.items||{};var m2=k2.items[id2]||(k2.items[id2]={});
  m2.e=m2.e===t.dataset.ie?'':t.dataset.ie;sello(m2);
  if(lb&&m2.e){var mf=k2.fotos[LBI]||(k2.fotos[LBI]={});mf.item=id2;sello(mf)}            /* la foto en la que estás queda de ese ítem */
  guardar();if(lb)lbPanel();else pintar();return true}
 return false}
function inputObs(e){if(!e.target.dataset||!e.target.dataset.obsg||CUR.ro)return;var k=kk(CUR.o);k.obs=e.target.value;k.ana=ana();k.t=Date.now();guardarLocal();subir(CUR.o);
 var otro=(e.target.closest('#kLbPan')?$('kDet'):$('kLbPan')).querySelector('[data-obsg]');if(otro)otro.value=k.obs}
function pintarMini(){}
/* ================= VISOR GRANDE: acta · foto (zoom/giro) · ítems ================= */
var ACTA_OCULTA=false;try{ACTA_OCULTA=localStorage.getItem('vof_acta_oculta')==='1'}catch(e){}
function LBabierto(){return!$('kLb').hidden}
function lbAbrir(i){LBI=i;$('kLb').hidden=false;document.body.style.overflow='hidden';ZA.z.listo=false;lbActa();lbFoto();lbPanel();setTimeout(function(){ZA.ajustar();ZF.ajustar()},40)}
function lbCerrar(sinPintar){$('kLb').hidden=true;document.body.style.overflow='';if(!sinPintar)pintar()}
function lbRefrescar(){var E=E_();if(LBI>=E.fotos.length)LBI=Math.max(0,E.fotos.length-1);lbActa();if(!$('kLbI').getAttribute('src'))lbFoto();lbCap()}
function lbCap(){var E=E_();$('kLbC').textContent='Foto '+(LBI+1)+' de '+E.fotos.length+(E.listo?'':'…')+' · orden '+CUR.o}
function lbActa(){var E=E_();$('kLbW').classList.toggle('sinacta',ACTA_OCULTA);$('kAM').hidden=!ACTA_OCULTA;
 var im=$('kAI'),u=E.acta&&E.acta.u;
 if(u){$('kAMsg').innerHTML='';if(im.dataset.u!==u){im.dataset.u=u;im.src=u}else if(!ACTA_OCULTA)setTimeout(function(){if(!ZA.z.listo)ZA.ajustar()},30)}
 else{im.dataset.u='';im.removeAttribute('src');$('kAMsg').innerHTML=E.listo?'<p class="mu sm">No se pudo recortar el acta. Usa el botón PDF.</p>':'<p class="mu sm"><span class="spin"></span> Recortando el acta…</p>'}}
function lbFoto(){var E=E_(),f=E.fotos[LBI];if(!f){$('kLbI').removeAttribute('src');lbCap();return}
 var im=$('kLbI');if(im.getAttribute('src')===f.u)ZF.ajustar();else im.src=f.u;lbCap();
 $('kLbP').disabled=LBI<=0;$('kLbN').disabled=LBI>=E.fotos.length-1}
function lbPanel(){var k=K[CUR.o]||{},it=itemDe(LBI);
 $('kLbPan').innerHTML='<div class="kpt2">Foto '+(LBI+1)+' <span class="mu sm">'+(it?'es de: <b>'+esc(TN[it])+'</b>':'toca el ítem al que pertenece')+'</span></div>'+itemsHtml(true)+
  '<div class="knav"><button type="button" class="b s" data-n="-1">← Anterior</button><button type="button" class="b s" data-n="1">Siguiente →</button></div>'+
  obsHtml(true)+
  '<div class="mu sm">Marcar ✓ ✗ N/A deja esta foto en ese ítem. Teclas: ← → pasar · rueda = zoom · C / N / A = estado del ítem de esta foto · R girar · Esc cerrar</div>'+
  (CUR.ro?'<div class="kro">🔒 '+esc(CUR.ro)+'</div>':'')+(k.fin?'<div class="kmsg">La orden está finalizada: si cambias algo, reábrela.</div>':'')}
function lbIr(n){var E=E_();if(n<0||n>=E.fotos.length)return;LBI=n;lbFoto();lbPanel()}

/* zoom con la rueda (donde está el puntero), arrastrar, doble clic y girar: sirve para la foto y para el acta */
function Zoomer(st,zw,im,op){var z={s:1,tx:0,ty:0,bw:0,bh:0,min:1,ini:1,cont:1,listo:false},arr=null;
 function poner(){var W=st.clientWidth,H=st.clientHeight,cw=z.bw*z.s,ch=z.bh*z.s;
  z.tx=cw<=W?(W-cw)/2:Math.min(0,Math.max(W-cw,z.tx));z.ty=ch<=H?(H-ch)/2:Math.min(0,Math.max(H-ch,z.ty));
  zw.style.transform='translate('+z.tx+'px,'+z.ty+'px) scale('+z.s+')';st.classList.toggle('zoom',cw>W+1||ch>H+1)}
 function ajustar(modo){var W=st.clientWidth,H=st.clientHeight,w=im.naturalWidth,h=im.naturalHeight;if(!w||!W||!H){z.listo=false;return}
  var r=op.rot?op.rot():0,g=r%180!==0;z.bw=g?h:w;z.bh=g?w:h;z.cont=Math.min(W/z.bw,H/z.bh);var anc=W/z.bw;
  z.min=Math.min(z.cont,anc);z.ini=op.ancho?anc:z.cont;z.s=modo==='cont'?z.cont:z.ini;z.tx=0;z.ty=0;z.listo=true;
  zw.style.width=z.bw+'px';zw.style.height=z.bh+'px';im.style.width=w+'px';im.style.height=h+'px';
  im.style.left=(z.bw-w)/2+'px';im.style.top=(z.bh-h)/2+'px';im.style.transform='rotate('+r+'deg)';poner()}
 function en(f,mx,my){if(!z.listo)return;var ns=Math.max(z.min,Math.min(Math.max(z.ini,z.cont)*12,z.s*f));if(Math.abs(ns-z.s)<1e-9)return;
  z.tx=mx-(mx-z.tx)*(ns/z.s);z.ty=my-(my-z.ty)*(ns/z.s);z.s=ns;poner()}
 function centro(f){en(f,st.clientWidth/2,st.clientHeight/2)}
 st.addEventListener('wheel',function(e){e.preventDefault();var r=st.getBoundingClientRect();en(e.deltaY<0?1.2:1/1.2,e.clientX-r.left,e.clientY-r.top)},{passive:false});
 st.addEventListener('pointerdown',function(e){if(e.button!==0||!st.classList.contains('zoom')||e.target.closest('button'))return;arr={x:e.clientX,y:e.clientY,tx:z.tx,ty:z.ty};st.setPointerCapture(e.pointerId);st.classList.add('arr')});
 st.addEventListener('pointermove',function(e){if(!arr)return;z.tx=arr.tx+e.clientX-arr.x;z.ty=arr.ty+e.clientY-arr.y;poner()});
 function fin(){arr=null;st.classList.remove('arr')}st.addEventListener('pointerup',fin);st.addEventListener('pointercancel',fin);
 st.addEventListener('dblclick',function(e){if(e.target.closest('button'))return;var r=st.getBoundingClientRect();
  if(z.s>z.cont*1.02)ajustar('cont');else en(op.ancho&&z.ini>z.s*1.05?z.ini/z.s:2.5,e.clientX-r.left,e.clientY-r.top)});
 im.addEventListener('load',function(){ajustar()});
 return{ajustar:ajustar,centro:centro,z:z}}
var ZF=Zoomer($('kSt'),$('kZW'),$('kLbI'),{rot:function(){return CUR?rotDe(LBI):0}});
var ZA=Zoomer($('kASt'),$('kAZW'),$('kAI'),{ancho:true});
function zAjustar(){ZF.ajustar()}function zCentro(f){ZF.centro(f)}
function girar(g){if(!puedo())return;var k=kk(CUR.o),m=k.fotos[LBI]||(k.fotos[LBI]={});m.rot=(((m.rot||0)+g)%360+360)%360;k.t=Date.now();guardarLocal();subir(CUR.o);ZF.ajustar()}
window.addEventListener('resize',function(){if(LBabierto()){ZF.ajustar();ZA.ajustar()}});
document.querySelector('#kLb .kzb').onclick=function(e){var t=e.target.closest('button');if(!t)return;
 if(t.dataset.z==='+')zCentro(1.4);else if(t.dataset.z==='-')zCentro(1/1.4);else if(t.dataset.z==='0')ZF.ajustar();
 else if(t.dataset.r)girar(+t.dataset.r);else if(t.id==='kAM'){ACTA_OCULTA=false;try{localStorage.setItem('vof_acta_oculta','0')}catch(x){}lbActa();setTimeout(function(){ZF.ajustar();ZA.ajustar()},30)}
 else if(t.id==='kLbX')lbCerrar();else if(t.id==='kLbPdf')verPdf(CUR.o)};
$('kAO').onclick=function(){ACTA_OCULTA=true;try{localStorage.setItem('vof_acta_oculta','1')}catch(x){}lbActa();setTimeout(function(){ZF.ajustar()},30)};
$('kAZ').onclick=function(){ZA.ajustar()};$('kAC').onclick=function(){ZA.ajustar('cont')};
$('kLbP').onclick=function(){lbIr(LBI-1)};$('kLbN').onclick=function(){lbIr(LBI+1)};
$('kLbPan').onclick=function(e){if(clicItems(e,true))return;var t=e.target.closest('button');if(t&&t.dataset.n)lbIr(LBI+(+t.dataset.n))};
$('kLbPan').oninput=inputObs;

/* ---------- PDF dentro de la página (sin pestaña nueva) ---------- */
var PDFU='';
async function verPdf(o){var ov=$('kPdfOv');ov.hidden=false;$('kPdfT').textContent='Acta '+o;$('kPdfM').textContent='Cargando el PDF…';$('kPdfF').removeAttribute('src');
 try{var u8=await pdfDe(o);if(ov.hidden)return;if(PDFU)URL.revokeObjectURL(PDFU);PDFU=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));
  $('kPdfF').src=PDFU;$('kPdfD').href=PDFU;$('kPdfD').download=o+'.pdf';$('kPdfM').textContent=''}
 catch(x){$('kPdfM').textContent=(x&&x.message)||'No se pudo abrir el PDF'}}
$('kPdfX').onclick=function(){$('kPdfOv').hidden=true;$('kPdfF').removeAttribute('src')};

/* ---------- finalizar / reabrir ---------- */
function finalizar(){if(!puedo())return;var k=kk(CUR.o);if(!ana()){toast('Escoge tu nombre en "Analista" arriba para cerrar la orden.',true);$('kAna').focus();return}
 var it=k.items||{},nc=ITEMS.filter(function(t){return(it[t[0]]||{}).e==='NC'}),falta=ITEMS.length-itemsCon(k);
 if(falta&&!confirm('Faltan '+falta+' ítems sin estado. ¿Finalizar la orden igual?'))return;
 k.fin={t:Date.now(),por:ana(),res:nc.length?'CON NOVEDAD ('+nc.map(function(t){return t[1]}).join(', ')+')':falta?'SIN NOVEDAD · '+falta+' ítems sin revisar':'CONFORME'};
 k.ana=ana();k.t=Date.now();guardarLocal();subir(CUR.o);toast('Orden '+CUR.o+' finalizada');
 var F=base().filter(function(y){return y.o!==CUR.o&&est(y.o)!=='FINALIZADA'&&!lockDe(y.o)});if(F.length)abrir(F[0].o);else{soltarOrden(CUR.o);CUR.ro='Orden finalizada.';pintar();lista()}}
function reabrir(){if(CUR.ro==='Orden finalizada.'){CUR.ro='';tomarOrden(CUR.o)}if(!puedo())return;var k=kk(CUR.o);delete k.fin;k.t=Date.now();guardarLocal();subir(CUR.o);pintar();lista()}

/* ---------- seriales: código de barras (ZXing) y, si no se lee, IA ---------- */
var ZX=null;
function lectorZX(){if(ZX||typeof ZXing==='undefined')return ZX;var h=new Map();h.set(ZXing.DecodeHintType.TRY_HARDER,true);
 h.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.CODE_128,ZXing.BarcodeFormat.CODE_39,ZXing.BarcodeFormat.ITF,ZXing.BarcodeFormat.EAN_13]);ZX=new ZXing.MultiFormatReader();ZX.setHints(h);return ZX}
function trozo(im,x,y,w,h,e,rot){var c=document.createElement('canvas'),W=Math.round(w*e),H=Math.round(h*e);if(rot){c.width=H;c.height=W}else{c.width=W;c.height=H}var g=c.getContext('2d');if(rot){g.translate(H,0);g.rotate(Math.PI/2)}g.drawImage(im,x,y,w,h,0,0,W,H);return c}
function decZX(c){var r=lectorZX();if(!r)return null;try{return r.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.HTMLCanvasElementLuminanceSource(c)))).getText()}catch(e){return null}}
async function barras(f,afondo){var im=new Image();im.src=f.u;try{await im.decode()}catch(e){return[]}var W=im.width,H=im.height,out={};
 for(var rot=0;rot<2;rot++){var v=decZX(trozo(im,0,0,W,H,1,rot));if(v)out[v]=1;
  if(afondo){for(var n=2;n<=3;n++){var tw=W/n*1.5,th=H/n*1.5;for(var i=0;i<n;i++)for(var j=0;j<n;j++){var x=Math.max(0,Math.min(W-tw,i*W/n-tw*0.17)),y=Math.max(0,Math.min(H-th,j*H/n-th*0.17));
   var v2=decZX(trozo(im,x,y,Math.min(tw,W),Math.min(th,H),n>2?2:1.5,rot));if(v2)out[v2]=1}}}
  await new Promise(function(r){setTimeout(r,0)})}
 return Object.keys(out)}
function achicar(f,lado){return new Promise(function(ok){var im=new Image();im.onload=function(){var c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);aBlob(c,lado,0.8).then(ok)};im.onerror=function(){ok(f.b)};im.src=f.u})}
var PROMPT_SERIAL='Eres analista de calidad de una empresa de energía. Te paso fotos de UNA visita (foto 1 = la primera imagen adjunta). '+
 'Busca el medidor NUEVO que quedó INSTALADO (no el viejo que se retira) y lee su número de serie impreso en el frente o debajo del código de barras. '+
 'Responde SOLO un JSON: {"fotos":[],"lecturas":{"serial_instalado":"","foto":0}} con el serial tal como se lee y el número de la foto donde lo leíste. '+
 'Si no se ve con seguridad, deja serial_instalado vacío. No inventes ni completes dígitos.';
async function verificarSerial(o){
 var E=cargar(o);VER_EN=o;await E.prom;if(!E.fotos.length)throw new Error(E.err||'La orden no tiene fotos.');
 var d=E,k=kk(o),a=k.acta||{};
 if(a.cambioMed!=='SI'){k.serial={res:'NO APLICA',acta:'',leido:'',foto:-1,via:'',t:Date.now()};k.t=Date.now();guardarLocal();subir(o);return k.serial}
 var marc=Object.keys(k.fotos||{}).filter(function(i){return k.fotos[i].item==='mat_inst'&&+i<d.fotos.length}).map(Number);
 var orden=marc.concat(d.fotos.map(function(_,i){return i}).filter(function(i){return marc.indexOf(i)<0}));
 for(var x=0;x<orden.length;x++){var i=orden[x],cs=await barras(d.fotos[i],marc.indexOf(i)>=0);
  for(var c=0;c<cs.length;c++)if(igual(a.medInst,cs[c])){k.serial={res:'CONFORME',acta:a.medInst,leido:cs[c],foto:i,via:'barras',t:Date.now()};k.t=Date.now();guardarLocal();subir(o);return k.serial}}
 var S=X.sample&&X.sample(),res={res:'SIN LEER',acta:a.medInst,leido:'',foto:-1,via:'ia',t:Date.now()};
 if(!S){res.aviso='El código de barras no se leyó y no hay claves de IA.'}
 else{var sel=marc.length?marc:d.fotos.map(function(_,i){return i}).slice(0,40);
  try{var imgs=await Promise.all(sel.map(function(i){return achicar(d.fotos[i],marc.length?1400:900)}));
   var j=await S.json(PROMPT_SERIAL,{images:imgs}),l=(j&&j.lecturas)||{},sr=String(l.serial_instalado||'').trim();
   if(sr){var ok=igual(a.medInst,sr);res.leido=sr;res.res=ok===false?'NO CONFORME':ok?'CONFORME':'SIN LEER';var fn=+l.foto;if(fn>=1&&fn<=sel.length)res.foto=sel[fn-1]}}
  catch(e){res.aviso=(e&&e.message)||'La IA no respondió.';res.reintentar=1}}
 if(!res.reintentar){k.serial=res;k.t=Date.now();guardarLocal();subir(o)}return res}
async function verificarLote(){
 if(VER){VER.parar=true;return}
 var L=base().filter(function(x){var s=(K[x.o]||{}).serial;return!s}),n=0,c={CONFORME:0,'NO CONFORME':0,'SIN LEER':0,'NO APLICA':0};
 if(!L.length){toast('Las órdenes filtradas ya tienen el serial verificado.');return}
 VER={parar:false};$('kVer').textContent='Detener';
 for(var i=0;i<L.length&&!VER.parar;i++){$('kVerI').textContent='Verificando '+(i+1)+' de '+L.length+' (orden '+L[i].o+')…';
  try{var r=await verificarSerial(L[i].o);VER_EN='';c[r.res]=(c[r.res]||0)+1;n++;if(r.reintentar&&/claves/i.test(r.aviso||'')){$('kVerI').textContent='Paré: '+r.aviso;break}}catch(e){}
  lista();if(CUR&&CUR.o===L[i].o&&!LBabierto())pintar()}
 $('kVerI').textContent=$('kVerI').textContent.indexOf('Paré')===0?$('kVerI').textContent:(n+' verificadas: '+c.CONFORME+' conformes, '+c['NO CONFORME']+' no conformes, '+c['SIN LEER']+' sin leer'+(c['NO APLICA']?', '+c['NO APLICA']+' sin cambio de medidor':'')+'.');
 VER=null;$('kVer').textContent='Verificar seriales'}

/* ================= CONFIGURACIÓN (⚙): CHECKLIST Y ANALISTAS, guardados en el puente ================= */
async function cargarCfg(){var d=db();if(!d)return;
 try{var r=await Promise.all([d.doc('cfg/checklist').get(),d.doc('cfg/analistas').get()]);
  if(r[0].exists){var c=r[0].data()||{};if(c.items&&c.items.length){ponerItems(c.items);try{localStorage.setItem('vof_items',JSON.stringify(ITEMS))}catch(e){}}}
  if(r[1].exists)ANAS=((r[1].data()||{}).l||[]).filter(function(a){return a&&a.n});
  else if(ANA0&&!ANAS.length){ANAS=[{n:ANA0,tecs:[]}];guardarAnas()}
  try{localStorage.setItem('vof_analistas',JSON.stringify(ANAS))}catch(e){}
  pintarAnas();lista();if(CUR&&!LBabierto())pintar();cfgPintar();if(!rsec.hidden)rvPintar()}catch(e){}}
function guardarItems(){try{localStorage.setItem('vof_items',JSON.stringify(ITEMS))}catch(e){}var d=db();
 if(d)d.doc('cfg/checklist').set({items:ITEMS,t:Date.now(),por:ana()}).catch(function(){toast('No se pudo guardar el checklist en la nube',true)});
 lista();if(CUR&&!LBabierto())pintar();cfgPintar()}
function guardarAnas(){try{localStorage.setItem('vof_analistas',JSON.stringify(ANAS))}catch(e){}var d=db();
 if(d)d.doc('cfg/analistas').set({l:ANAS,t:Date.now()}).catch(function(){toast('No se pudo guardar la lista de analistas en la nube',true)});
 pintarAnas();lista();cfgPintar()}
function slug(t){var s=(X.nrm?X.nrm(t):t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,30)||'item',b=s,n=2;
 while(ITEMS.concat(ITEMS_DEF).some(function(x){return x[0]===s}))s=b+'_'+(n++);return s}
function todosTecs(){var t={};(ORD.length?ORD:(window.rFilas?window.rFilas():[]).map(function(r){return{tec:rv(r,'Técnico')}})).forEach(function(x){if(x.tec)t[x.tec]=1});
 ANAS.forEach(function(a){(a.tecs||[]).forEach(function(x){t[x]=1})});return Object.keys(t).sort()}
var CFG='est',ABIERTO=-1;
function cfgPintar(){var b=document.getElementById('cfgBox');if(!b||CFG==='est')return;
 if(CFG==='chk'){b.innerHTML='<p class="mu sm">Ítems que se revisan en cada orden, en este orden. Se guarda en la nube para todo el equipo. Quitar un ítem no borra lo que ya se marcó en órdenes viejas.</p>'+
  ITEMS.map(function(t,i){return'<div class="cfr"><span class="cfn">'+(i+1)+'</span><input data-ren="'+i+'" value="'+esc(t[1])+'" aria-label="Nombre del ítem">'+
   '<button type="button" data-up="'+i+'" title="Subir"'+(i?'':' disabled')+'>↑</button><button type="button" data-dn="'+i+'" title="Bajar"'+(i<ITEMS.length-1?'':' disabled')+'>↓</button><button type="button" data-del="'+i+'" title="Quitar" class="cfx">✕</button></div>'}).join('')+
  '<div class="cfa"><input id="cfNew" placeholder="Nombre del ítem nuevo"><button type="button" id="cfAdd">Agregar</button></div>'+
  '<button type="button" class="cfl" id="cfRes">Volver a la lista original de 14</button>';return}
 var T=todosTecs();
 b.innerHTML='<p class="mu sm">Analistas del equipo y los técnicos que le tocan a cada uno. En Validar IA cada analista ve primero las órdenes de sus técnicos.</p>'+
  (ANAS.length?'':'<p class="mu">Todavía no hay analistas.</p>')+
  ANAS.map(function(a,i){var n=(a.tecs||[]).length;
   return'<div class="cfan"><div class="cfr"><b class="cfnm">'+esc(a.n)+'</b><span class="mu sm">'+n+' técnico'+(n===1?'':'s')+'</span>'+
    '<button type="button" data-ver="'+i+'">'+(ABIERTO===i?'Cerrar':'Asignar técnicos')+'</button><button type="button" data-dela="'+i+'" class="cfx" title="Quitar analista">✕</button></div>'+
    (ABIERTO===i?'<div class="cft">'+(T.length?T.map(function(t){var de=ANAS.filter(function(x,j){return j!==i&&(x.tecs||[]).indexOf(t)>=0}).map(function(x){return x.n});
     return'<label><input type="checkbox" data-a="'+i+'" data-t="'+esc(t)+'"'+((a.tecs||[]).indexOf(t)>=0?' checked':'')+'> '+esc(t)+(de.length?' <small>(de '+esc(de.join(', '))+')</small>':'')+'</label>'}).join(''):'<p class="mu sm">Carga el resultado para ver la lista de técnicos.</p>')+'</div>':'')+'</div>'}).join('')+
  '<div class="cfa"><input id="cfANew" placeholder="Nombre del analista nuevo"><button type="button" id="cfAAdd">Agregar</button></div>'}
function montarCfg(){var pan=document.getElementById('estPan');if(!pan){setTimeout(montarCfg,300);return}if(document.getElementById('cfgTabs'))return;
 var eh=pan.querySelector('.eh b');if(eh)eh.textContent='Configuración';
 var tabs=document.createElement('div');tabs.className='tabs';tabs.id='cfgTabs';
 tabs.innerHTML='<button type="button" data-c="est" class="on">Estilos</button><button type="button" data-c="chk">Checklist</button><button type="button" data-c="ana">Analistas</button>';
 var box=document.createElement('div');box.id='cfgBox';box.style.display='none';
 var est=[].slice.call(pan.children).filter(function(x){return!x.classList.contains('eh')});
 pan.insertBefore(tabs,pan.children[1]);pan.appendChild(box);
 tabs.onclick=function(e){var b=e.target.closest('button');if(!b)return;CFG=b.dataset.c;[].forEach.call(tabs.children,function(x){x.classList.toggle('on',x===b)});
  est.forEach(function(x){x.style.display=CFG==='est'?'':'none'});box.style.display=CFG==='est'?'none':'';if(CFG!=='est'){cfgPintar();cargarCfg()}};
 box.onclick=function(e){var t=e.target.closest('button');if(!t)return;var i;
  if(t.dataset.up){i=+t.dataset.up;ITEMS.splice(i-1,0,ITEMS.splice(i,1)[0]);guardarItems()}
  else if(t.dataset.dn){i=+t.dataset.dn;ITEMS.splice(i+1,0,ITEMS.splice(i,1)[0]);guardarItems()}
  else if(t.dataset.del){i=+t.dataset.del;if(ITEMS.length<2){toast('Deja al menos un ítem.',true);return}if(confirm('¿Quitar "'+ITEMS[i][1]+'" del checklist?')){ITEMS.splice(i,1);guardarItems()}}
  else if(t.id==='cfAdd'){var v=($('cfNew').value||'').trim();if(!v)return;ITEMS.push([slug(v),v]);TN[ITEMS[ITEMS.length-1][0]]=v;guardarItems();setTimeout(function(){var n=$('cfNew');if(n)n.focus()},50)}
  else if(t.id==='cfRes'){if(confirm('¿Volver a los 14 ítems originales?')){ITEMS=ITEMS_DEF.slice();ponerItems(ITEMS);guardarItems()}}
  else if(t.dataset.ver){i=+t.dataset.ver;ABIERTO=ABIERTO===i?-1:i;cfgPintar()}
  else if(t.dataset.dela){i=+t.dataset.dela;if(confirm('¿Quitar al analista '+ANAS[i].n+'?')){ANAS.splice(i,1);ABIERTO=-1;guardarAnas()}}
  else if(t.id==='cfAAdd'){var n=($('cfANew').value||'').trim();if(!n)return;if(ANAS.some(function(a){return a.n.toLowerCase()===n.toLowerCase()})){toast('Ese analista ya está.',true);return}ANAS.push({n:n,tecs:[]});guardarAnas()}};
 box.onchange=function(e){var t=e.target;
  if(t.dataset.ren){var v=t.value.trim();if(v){ITEMS[+t.dataset.ren][1]=v;TN[ITEMS[+t.dataset.ren][0]]=v;guardarItems()}}
  else if(t.dataset.a){var a=ANAS[+t.dataset.a];a.tecs=a.tecs||[];var tc=t.dataset.t,k=a.tecs.indexOf(tc);if(t.checked&&k<0)a.tecs.push(tc);if(!t.checked&&k>=0)a.tecs.splice(k,1);guardarAnas()}};
 box.onkeydown=function(e){if(e.key!=='Enter')return;if(e.target.id==='cfNew')$('cfAdd').click();else if(e.target.id==='cfANew')$('cfAAdd').click()}}
montarCfg();

/* ================= PESTAÑA REVISIONES: lo revisado, con una columna por ítem del checklist ================= */
var rsec=document.createElement('section');rsec.id='tRev';rsec.hidden=true;var rref=$('tCri');rref.parentNode.insertBefore(rsec,rref);
rsec.innerHTML='<div class="khd"><b>Revisiones</b><span class="mu" id="rvInfo"></span><span style="flex:1"></span><button class="b s" id="rvXls" type="button">Exportar a Excel</button></div>'+
 '<div class="kf"><div class="kseg" id="rvDia"><button type="button" data-v="hoy">Hoy</button><button type="button" data-v="ayer">Ayer</button><button type="button" data-v="" class="on">Todos</button></div>'+
 '<input type="date" id="rvFe" title="Día de la revisión" aria-label="Día de la revisión"><select id="rvAna" aria-label="Analista"></select><select id="rvTec" aria-label="Técnico"></select>'+
 '<div class="kseg" id="rvEst"></div><input type="search" id="rvQ" placeholder="Buscar orden, NIC o técnico" aria-label="Buscar"></div>'+
 '<div class="rvw"><table class="rvt" id="rvT"></table></div>';
var RVF={dia:'',fe:'',ana:'',tec:'',est:'',q:''};
function rvFilas(){var M={};ORD.forEach(function(x){M[x.o]=x});
 return Object.keys(K).filter(function(o){return /^\d{6,}$/.test(o)&&est(o)!=='PENDIENTE'||(K[o]&&K[o].obs)}).map(function(o){var k=K[o],x=M[o]||{},a=k.acta||{},it=k.items||{};
  var por=k.fin?k.fin.por:k.ana;if(!por){var u=0;Object.keys(it).forEach(function(i){if((it[i].t||0)>u){u=it[i].t;por=it[i].por}})}
  return{o:o,nic:x.nic||a.nic||'',tec:x.tec||a.tec||'',fecha:x.fecha||a.fecha||'',ana:por||'',est:est(o),res:k.fin?k.fin.res:'',t:k.fin?k.fin.t:k.t,
   items:it,nc:ITEMS.filter(function(t){return(it[t[0]]||{}).e==='NC'}).map(function(t){return t[1]}),obs:k.obs||'',ser:k.serial?k.serial.res:''}})
  .sort(function(a,b){return(b.t||0)-(a.t||0)})}
function rvFiltradas(L){var h=new Date(),hoy=dk(h);h.setDate(h.getDate()-1);var ayer=dk(h),q=RVF.q.toLowerCase();
 return L.filter(function(r){var d=r.t?dk(new Date(r.t)):'';if(RVF.dia==='hoy'&&d!==hoy)return false;if(RVF.dia==='ayer'&&d!==ayer)return false;
  if(RVF.fe&&d!==RVF.fe.replace(/-/g,''))return false;if(RVF.ana&&r.ana!==RVF.ana)return false;if(RVF.tec&&r.tec!==RVF.tec)return false;if(RVF.est&&r.est!==RVF.est)return false;
  if(q&&(r.o+' '+r.nic+' '+r.tec+' '+r.ana).toLowerCase().indexOf(q)<0)return false;return true})}
var EC={C:'✓',NC:'✗',NA:'N/A'},EX={C:'CONFORME',NC:'NO CONFORME',NA:'NO APLICA'};
function rvPintar(){var L=rvFiltradas(rvFilas()),A=rvFilas(),an={},te={},c={'':A.length,'EN REVISIÓN':0,FINALIZADA:0};
 A.forEach(function(r){if(r.ana)an[r.ana]=1;if(r.tec)te[r.tec]=1;c[r.est]=(c[r.est]||0)+1});
 $('rvAna').innerHTML='<option value="">Analista: todos</option>'+Object.keys(an).sort().map(function(a){return'<option'+(a===RVF.ana?' selected':'')+'>'+esc(a)+'</option>'}).join('');
 $('rvTec').innerHTML='<option value="">Técnico: todos</option>'+Object.keys(te).sort().map(function(a){return'<option'+(a===RVF.tec?' selected':'')+'>'+esc(a)+'</option>'}).join('');
 $('rvEst').innerHTML=[['','Todas'],['EN REVISIÓN','En revisión'],['FINALIZADA','Finalizadas']].map(function(e){return'<button type="button" data-v="'+e[0]+'" class="'+(RVF.est===e[0]?'on':'')+'">'+e[1]+' <b>'+(c[e[0]]||0)+'</b></button>'}).join('');
 $('rvInfo').textContent=L.length+' de '+A.length+' órdenes revisadas';
 $('rvT').innerHTML='<thead><tr><th>Orden</th><th>NIC</th><th>Técnico</th><th>Fecha visita</th><th>Analista</th><th>Revisada</th><th>Estado</th><th>Resultado</th>'+
  ITEMS.map(function(t){return'<th class="rvi" title="'+esc(t[1])+'">'+esc(t[1])+'</th>'}).join('')+'<th>No conformes</th><th>Serial</th><th>Observaciones</th></tr></thead><tbody>'+
  (L.slice(0,1500).map(function(r){return'<tr data-o="'+esc(r.o)+'"><td><b>'+esc(r.o)+'</b></td><td>'+esc(r.nic)+'</td><td>'+esc(r.tec)+'</td><td>'+esc(String(r.fecha).slice(0,10))+'</td><td>'+esc(r.ana)+'</td><td>'+esc(r.t?fechaCorta(r.t):'')+'</td>'+
   '<td><span class="ke '+(r.est==='FINALIZADA'?'ok':'wn')+'">'+r.est+'</span></td><td>'+esc(r.res)+'</td>'+
   ITEMS.map(function(t){var e=(r.items[t[0]]||{}).e||'';return'<td class="rve '+(e==='C'?'c':e==='NC'?'nc':e==='NA'?'na':'')+'">'+(EC[e]||'')+'</td>'}).join('')+
   '<td class="rvnc">'+esc(r.nc.join(', '))+'</td><td>'+esc(r.ser)+'</td><td class="rvob">'+esc(r.obs)+'</td></tr>'}).join('')||'<tr><td colspan="'+(11+ITEMS.length)+'" class="mu" style="padding:14px">No hay revisiones con estos filtros.</td></tr>')+'</tbody>'}
window.revMostrar=function(){if(!ORD.length&&window.kDatos)window.kDatos();rvPintar();bajarTodo().then(rvPintar);cargarCfg()};
$('rvT').onclick=function(e){var tr=e.target.closest('tr[data-o]');if(!tr)return;X.ir('chk');window.kAbrir(tr.getAttribute('data-o'))};
$('rvDia').onclick=function(e){var b=e.target.closest('button');if(!b)return;RVF.dia=b.dataset.v;[].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});rvPintar()};
$('rvEst').onclick=function(e){var b=e.target.closest('button');if(!b)return;RVF.est=b.dataset.v;rvPintar()};
$('rvFe').onchange=function(){RVF.fe=this.value;rvPintar()};$('rvAna').onchange=function(){RVF.ana=this.value;rvPintar()};$('rvTec').onchange=function(){RVF.tec=this.value;rvPintar()};
var tq2;$('rvQ').oninput=function(){var v=this.value;clearTimeout(tq2);tq2=setTimeout(function(){RVF.q=v.trim();rvPintar()},180)};
$('rvXls').onclick=function(){if(typeof XLSX==='undefined'){toast('No cargó la librería de Excel.',true);return}var L=rvFiltradas(rvFilas());if(!L.length){toast('No hay filas para exportar.',true);return}
 var H=['Orden','NIC','Técnico','Fecha visita','Analista','Revisada','Estado','Resultado'].concat(ITEMS.map(function(t){return t[1]}),['No conformes','Serial','Observaciones']);
 var A=[H].concat(L.map(function(r){return[r.o,r.nic,r.tec,r.fecha,r.ana,r.t?fechaCorta(r.t):'',r.est,r.res].concat(ITEMS.map(function(t){return EX[(r.items[t[0]]||{}).e]||''}),[r.nc.join(', '),r.ser,r.obs])}));
 var ws=XLSX.utils.aoa_to_sheet(A);ws['!cols']=H.map(function(h,i){return{wch:i<8?14:i>=H.length-3?40:12}});var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Revisiones');
 XLSX.writeFile(wb,'revisiones_'+dk(new Date())+'.xlsx')};

/* ---------- eventos ---------- */
$('kLst').onclick=function(e){var b=e.target.closest('.kit');if(b)abrir(b.getAttribute('data-o'))};
$('kDet').onclick=async function(e){var t=e.target;
 var f=t.closest('.kth');if(f){lbAbrir(+f.getAttribute('data-f'));return}
 var ir=t.closest('[data-ir]');if(ir){lbAbrir(+ir.getAttribute('data-ir'));return}
 if(t.closest('.kits')&&clicItems(e,false))return;
 if(t.id==='kFin')finalizar();else if(t.id==='kReab')reabrir();
 else if(t.id==='kLib')liberarAdmin();
 else if(t.id==='kReSub'){encolarSubida(CUR.o);pintarCab()}
 else if(t.id==='kSer1'){var o=CUR.o;t.disabled=true;t.textContent='Verificando…';delete kk(o).serial;try{await verificarSerial(o)}catch(x){toast('No se pudo verificar: '+((x&&x.message)||''),true)}VER_EN='';if(CUR&&CUR.o===o)pintar();lista()}
 else if(t.id==='kVerPdf')verPdf(CUR.o)};
$('kDet').oninput=inputObs;
document.addEventListener('keydown',function(e){
 if(!$('kPdfOv').hidden&&e.key==='Escape'){$('kPdfX').click();return}
 if(sec.hidden||!LBabierto())return;if(/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')){if(e.key==='Escape'||e.key==='Enter')e.target.blur();return}
 var kx=e.key.toLowerCase();
 if(e.key==='Escape')lbCerrar();else if(e.key==='ArrowRight')lbIr(LBI+1);else if(e.key==='ArrowLeft')lbIr(LBI-1);
 else if(kx==='r')girar(90);else if(e.key==='+')zCentro(1.4);else if(e.key==='-')zCentro(1/1.4);
 else if(kx==='c'||kx==='n'||kx==='a'){if(!puedo())return;var it=itemDe(LBI);if(!it){toast('Primero toca a qué ítem pertenece esta foto.');return}
  var k=kk(CUR.o);k.items=k.items||{};var m=k.items[it]||(k.items[it]={}),v=kx==='c'?'C':kx==='n'?'NC':'NA';m.e=v;sello(m);guardar();lbPanel()}
 else return;e.preventDefault()});
function seg(id,key){$(id).onclick=function(e){var b=e.target.closest('button');if(!b)return;FILT[key]=b.getAttribute('data-v');if(id==='kDia')[].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});lista()}}
seg('kDia','dia');seg('kEst','est');seg('kSer','ser');seg('kAsig','asig');
$('kTec').onchange=function(){FILT.tec=this.value;lista()};$('kMo').onchange=function(){FILT.mo=this.value;lista()};
var tq;$('kQ').oninput=function(){var v=this.value;clearTimeout(tq);tq=setTimeout(function(){FILT.q=v.trim();lista()},180)};
$('kVer').onclick=verificarLote;
$('kPdf').onclick=function(){$('kFi').click()};
$('kFi').onchange=async function(){var f=this.files[0];this.value='';if(!f)return;var o=(f.name.match(/\d{6,}/)||[''])[0]||('archivo-'+Date.now());var u8=new Uint8Array(await f.arrayBuffer());if(MEM[o]&&!MEM[o].fotos.length)olvidar(o);abrir(o,u8)};
window.kMostrar=function(){if(!arr){arr=true;bajarTodo();cargarCfg();leerLocks();window.kDatos();setInterval(function(){if(!sec.hidden&&!LBabierto()&&!VER)bajarTodo()},120000)}lista();if(!CUR)pintar()};
pintar();
})();
