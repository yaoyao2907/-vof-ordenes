/* VOF Órdenes (versión GitHub) – pestaña VALIDAR IA: galería de fotos del acta y revisión foto por foto.
   - Las fotos se sacan del PDF del acta (sin IA) y se guardan en Drive: VOF CAMP/FOTOS/<orden>/foto_01.jpg …
     La próxima vez se cargan de ahí, sin volver a abrir el PDF.
   - En cada foto el analista marca el tipo (conos, fachada…) y Conforme / No conforme + observación.
   - Todo se guarda al instante en la base del puente (vchk/<orden>): lo ve todo el equipo, desde cualquier PC.
   - "Finalizar orden" la cierra (con fecha, hora y quién); se puede reabrir.
   - La IA solo se usa para leer el serial del medidor INSTALADO cuando el código de barras no se lee. */
(function(){
var X=window.VOFX;if(!X)return;
var $=X.$,esc=X.esc,toast=X.toast;
var TIPOS=[['conos','Conos'],['fachada','Fachada'],['papelografo','Papelógrafo'],['pruebas','Pruebas'],['irregularidad','Irregularidad'],
 ['medidor_encontrado','Medidor encontrado'],['medidor_instalado','Medidor instalado'],['bolsa','Bolsa'],['finales','Fotos finales'],['constancia','Constancia'],['otra','Otra']];
var TN={};TIPOS.forEach(function(t){TN[t[0]]=t[1]});
var EST={C:'Conforme',NC:'No conforme'};
var SER={CONFORME:'Serial conforme','NO CONFORME':'Serial no conforme','SIN LEER':'Serial sin leer','NO APLICA':'Sin cambio de medidor'};
var sec=document.createElement('section');sec.id='tChk';sec.hidden=true;
var ref=$('tVid')||$('tHis');ref.parentNode.insertBefore(sec,ref);
sec.innerHTML=
 '<div class="khd"><b>Validar IA · revisión de fotos</b><span class="mu" id="kInfo">Carga el resultado para ver las órdenes.</span><span style="flex:1"></span>'+
 '<label class="kan">Analista <input id="kAna" placeholder="Tu nombre" autocomplete="name"></label>'+
 '<button class="b s" id="kPdf" type="button">Abrir PDF del computador</button><input type="file" id="kFi" accept=".pdf" hidden></div>'+
 '<div class="kf"><div class="kseg" id="kDia"><button type="button" data-v="hoy">Hoy</button><button type="button" data-v="ayer">Ayer</button><button type="button" data-v="" class="on">Todos</button></div>'+
 '<div class="kseg" id="kEst"></div>'+
 '<select id="kTec" aria-label="Técnico"><option value="">Técnico: todos</option></select>'+
 '<select id="kMo" aria-label="Mano de obra"><option value="">Mano de obra: todas</option></select>'+
 '<input type="search" id="kQ" placeholder="Buscar orden, NIC o técnico" aria-label="Buscar orden"></div>'+
 '<div class="kf ks2"><span class="mu sm">Seriales del medidor instalado:</span><div class="kseg" id="kSer"></div>'+
 '<button class="b s" id="kVer" type="button">Verificar seriales</button><span class="mu sm" id="kVerI"></span></div>'+
 '<div class="kbox"><aside class="klst" id="kLst"></aside><div class="kdet" id="kDet"></div></div>'+
 '<div class="klb" id="kLb" hidden><button type="button" class="kx" id="kLbX" aria-label="Cerrar">✕</button>'+
 '<div class="klbw"><div class="klbf"><button type="button" class="kav" id="kLbP" aria-label="Foto anterior">‹</button><img id="kLbI" alt="Foto del acta"><button type="button" class="kav" id="kLbN" aria-label="Foto siguiente">›</button><div class="kcap" id="kLbC"></div></div>'+
 '<div class="klbp" id="kLbPan"></div></div></div>';

var ORD=[],K={},CUR=null,FILT={dia:'',est:'',tec:'',mo:'',q:'',ser:''},DRV=null,arr=false,LBI=-1,VER=null;
try{K=JSON.parse(localStorage.getItem('vof_chk2')||'{}')||{}}catch(e){K={}}
try{$('kAna').value=localStorage.getItem('vof_analista')||''}catch(e){}
function ana(){return($('kAna').value||'').trim()}
$('kAna').onchange=function(){try{localStorage.setItem('vof_analista',ana())}catch(e){}};
function guardarLocal(){try{localStorage.setItem('vof_chk2',JSON.stringify(K))}catch(e){}}
function rv(r,k){var v=r[k];return v==null?'':String(v).trim()}
function fk(f){var m=String(f).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2):''}
function dk(d){return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)}
function L(s){return String(s==null?'':s).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^0+/,'')}
function igual(a,b){a=L(a);b=L(b);if(!a||!b||b.length<4)return null;return a===b||(b.length>=6&&(a.indexOf(b)>=0||b.indexOf(a)>=0))}
function kk(o){return K[o]||(K[o]={fotos:{},t:0})}
function est(o){var k=K[o];if(!k)return'PENDIENTE';if(k.fin)return'FINALIZADA';return k.fotos&&Object.keys(k.fotos).some(function(i){return k.fotos[i].tipo||k.fotos[i].e||k.fotos[i].obs})?'EN REVISIÓN':'PENDIENTE'}
function fechaCorta(t){try{return new Date(t).toLocaleString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return''}}

/* ---------- base del puente (compartida) ---------- */
function db(){return X.db&&X.db()}
var tG={};
function subir(o){var d=db();if(!d)return;clearTimeout(tG[o]);tG[o]=setTimeout(function(){var k=K[o];if(!k)return;
 d.doc('vchk/'+o).set(JSON.parse(JSON.stringify(k))).then(function(){$('kInfo').dataset.err=''},function(){toast('No se pudo guardar en la nube; quedó en este navegador y se reintenta.',true);setTimeout(function(){subir(o)},15000)})},900)}
async function bajarTodo(){var d=db();if(!d)return;
 try{var r=await Promise.race([d.collection('vchk').get(),new Promise(function(ok){setTimeout(function(){ok(null)},20000)})]);if(!r)return;
  r.docs.forEach(function(x){var v=x.data()||{};if(v.resp&&!v.fotos)return;               /* formato viejo de pasos: se ignora */
   if(!K[x.id]||(v.t||0)>=(K[x.id].t||0))K[x.id]=v});guardarLocal();lista();if(CUR&&!LBabierto())pintar()}catch(e){}}
function LBabierto(){return!$('kLb').hidden}

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
function base(sinEst,sinSer){var h=new Date(),hoy=dk(h);h.setDate(h.getDate()-1);var ayer=dk(h),q=FILT.q.toLowerCase();
 return ORD.filter(function(x){if(FILT.dia==='hoy'&&x.k!==hoy)return false;if(FILT.dia==='ayer'&&x.k!==ayer)return false;
  if(FILT.tec&&x.tec!==FILT.tec)return false;if(FILT.mo&&x.mo.indexOf(FILT.mo)<0)return false;
  if(q&&(x.o+' '+x.nic+' '+x.tec).toLowerCase().indexOf(q)<0)return false;
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
 var fin=c.FINALIZADA;return{fin:fin,tot:B.length}}
function lista(){
 var cc=contadores(),F=base();
 $('kLst').innerHTML='<div class="klh">'+F.length+' órdenes · <b>'+cc.fin+'</b> finalizadas de '+cc.tot+'</div>'+(F.slice(0,500).map(function(x){var e=est(x.o),k=K[x.o]||{},n=Object.keys(k.fotos||{}).filter(function(i){return k.fotos[i].tipo||k.fotos[i].e}).length,s=k.serial;
  return'<button type="button" class="kit'+(CUR&&CUR.o===x.o?' on':'')+'" data-o="'+esc(x.o)+'"><b>'+esc(x.o)+'</b> <span class="mu">'+esc(x.fecha.slice(0,5))+' '+esc(x.hora.slice(0,5))+'</span><br><span class="sm">'+esc(x.tec||'(sin técnico)')+'</span><br>'+
   '<span class="ke '+(e==='FINALIZADA'?'ok':e==='EN REVISIÓN'?'wn':'')+'">'+e+'</span>'+(n?' <span class="mu sm">'+n+' foto'+(n>1?'s':'')+' marcada'+(n>1?'s':'')+'</span>':'')+
   (s?' <span class="ksr '+(s.res==='CONFORME'?'ok':s.res==='NO CONFORME'?'er':'')+'">'+(s.res==='CONFORME'?'serial ✓':s.res==='NO CONFORME'?'serial ✗':s.res==='SIN LEER'?'serial ?':'sin cambio')+'</span>':'')+'</button>'}).join('')||'<p class="mu" style="padding:12px">No hay órdenes con estos filtros.</p>')}

/* ---------- fotos: Drive (FOTOS/<orden>) o el PDF del acta ---------- */
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
async function leerPdf(u8){
 if(typeof pdfjsLib==='undefined')throw new Error('No cargó el lector de PDF.');
 var pdf=await pdfjsLib.getDocument({data:new Uint8Array(u8),verbosity:0}).promise,fotos=[],vis={},O=pdfjsLib.OPS;
 var acta=null,lin=[];try{lin=await X.pdfLines(pdf);acta=X.parseActa(lin,'acta.pdf')}catch(e){acta=null}
 var bolsa='';try{lin.forEach(function(p){p.forEach(function(l,i){if(/MATERIAL SERIADO INSTALADO/i.test(l.cells.join(' '))){var nx=(p[i+1]||{cells:[]}).cells.join(' ');var m=/\b([A-Z]{2,4}\d{5,})\b/.exec(nx);if(m)bolsa=m[1]}})})}catch(e){}
 for(var p=1;p<=pdf.numPages;p++){var pg=await pdf.getPage(p),ops=await pg.getOperatorList();
  for(var i=0;i<ops.fnArray.length;i++){var f=ops.fnArray[i];if(f!==O.paintImageXObject&&f!==O.paintJpegXObject)continue;
   var id=ops.argsArray[i][0];if(vis[id])continue;vis[id]=1;
   var img=await new Promise(function(ok){var src=String(id).indexOf('g_')===0?pg.commonObjs:pg.objs;try{src.get(id,ok)}catch(e){ok(null)}setTimeout(function(){ok(null)},8000)});
   if(!img)continue;var c=aCanvas(img);if(!c)continue;var mn=Math.min(c.width,c.height),ar=Math.max(c.width,c.height)/mn;
   if(mn<300||ar>2.1)continue;                                        /* logos y firmas */
   var h=huella(c);if(vis[h])continue;vis[h]=1;
   var b=await aBlob(c,1400,0.86);if(b)fotos.push({b:b,u:URL.createObjectURL(b),pag:p})}
  pg.cleanup()}
 pdf.destroy();return{fotos:fotos,acta:acta||{},bolsa:bolsa}}

function b64aBlob(s){var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:'image/jpeg'})}
async function blobA64(b){var u=new Uint8Array(await b.arrayBuffer()),s='',i;for(i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
function nombreFoto(i){return'foto_'+String(i+1).padStart(3,'0')+'.jpg'}
function datosActa(d){var a=d.acta||{};return{nic:a.nic||'',fecha:a.fecha||'',tec:a.tecnico||'',medEnc:a.medEnc||'',medInst:a.medInst||'',cambioMed:a.cambioMed||'',bolsa:d.bolsa||'',
 irr:(a.irr||[]).map(function(i){return i.n+' '+i.nombre})}}
var PRE={},PREL=[],SUB={};
function preparar(o){if(PRE[o])return PRE[o];
 PRE[o]=(async function(){
  var k=kk(o),fotos=[],fuente='';
  if(window.vofPuente){try{var j=await window.vofPuente('fotos_bajar',{orden:o});
   fotos=(j.fotos||[]).map(function(f){var b=b64aBlob(f.blob);return{b:b,u:URL.createObjectURL(b)}});if(fotos.length)fuente='drive'}catch(e){}}
  if(!fotos.length||!k.acta){var u8=await pdfDe(o),d=await leerPdf(u8);
   if(!k.acta){k.acta=datosActa(d);k.t=Date.now();guardarLocal();subir(o)}
   if(!fotos.length){fotos=d.fotos;fuente='pdf';subirFotos(o,fotos)}else d.fotos.forEach(function(f){URL.revokeObjectURL(f.u)})}
  return{fotos:fotos,fuente:fuente}})();
 PRE[o].catch(function(){delete PRE[o]});
 PREL.push(o);var v=0;while(PREL.length>6&&v++<12){var x=PREL.shift();if(CUR&&CUR.o===x){PREL.push(x);continue}var q=PRE[x];delete PRE[x];if(q)q.then(function(d){d.fotos.forEach(function(f){URL.revokeObjectURL(f.u)})},function(){})}
 return PRE[o]}
async function subirFotos(o,fotos){if(!window.vofPuente||SUB[o]||!fotos.length)return;SUB[o]=1;
 try{for(var i=0;i<fotos.length;i+=5){var lote=[];for(var j=i;j<Math.min(i+5,fotos.length);j++)lote.push({nombre:nombreFoto(j),blob:await blobA64(fotos[j].b)});
   await window.vofPuente('fotos_subir',{orden:o,fotos:lote})}
  if(CUR&&CUR.o===o){CUR.fuente='drive';pintarCab()}}
 catch(e){delete SUB[o]}}
function precargar(){if(!CUR)return;var F=base().filter(function(y){return est(y.o)!=='FINALIZADA'}),i=F.findIndex(function(y){return y.o===CUR.o});
 F.slice(i+1,i+3).forEach(function(y){preparar(y.o).catch(function(){})})}

/* ---------- abrir orden ---------- */
window.kAbrir=function(o){if(!arr)window.kMostrar();abrir(o)};
async function abrir(o,u8){
 var x=ORD.filter(function(y){return y.o===o})[0]||{o:o,nic:'',tec:'',fecha:'',hora:'',irr:'',mo:[]};
 CUR={o:o,x:x,fotos:[],cargando:'Cargando las fotos…'};lista();pintar();
 try{var d;
  if(u8){var dd=await leerPdf(u8);var k=kk(o);if(!k.acta){k.acta=datosActa(dd);k.t=Date.now();guardarLocal();subir(o)}d={fotos:dd.fotos,fuente:'pdf'};if(/^\d{6,}$/.test(o))subirFotos(o,dd.fotos)}
  else d=await preparar(o);
  if(!CUR||CUR.o!==o)return;CUR.fotos=d.fotos;CUR.fuente=d.fuente;CUR.cargando='';
  var a=(K[o]||{}).acta||{};if(!x.nic)x.nic=a.nic;if(!x.fecha)x.fecha=a.fecha;if(!x.tec)x.tec=a.tec;
  pintar();precargar()}
 catch(e){if(CUR&&CUR.o===o){CUR.cargando='';CUR.error=(e&&e.message)||X.drMsg(e)||'Error al leer el acta.';pintar()}}}

/* ---------- pintar ---------- */
function obligatorios(a){var r=['conos','fachada','papelografo','finales','constancia'];
 if(a.cambioMed==='SI')r.push('medidor_encontrado','medidor_instalado');if(a.bolsa)r.push('bolsa');if((a.irr||[]).length)r.push('irregularidad');return r}
function cabecera(){var x=CUR.x,k=K[CUR.o]||{},e=est(CUR.o);
 return'<div class="kch" id="kCab"><b>Orden '+esc(x.o)+'</b><span class="mu">NIC '+esc(x.nic)+' · '+esc(x.tec)+' · '+esc(x.fecha)+' '+esc(x.hora)+'</span>'+
  '<span class="ke big '+(e==='FINALIZADA'?'ok':e==='EN REVISIÓN'?'wn':'')+'">'+e+'</span>'+
  (k.fin?'<span class="mu sm">Cerrada por '+esc(k.fin.por||'?')+' el '+esc(fechaCorta(k.fin.t))+'</span>':'')+
  '<span style="flex:1"></span><span class="mu sm">'+(CUR.fuente==='drive'?'Fotos guardadas en Drive ✓':CUR.fuente==='pdf'?'Fotos sacadas del PDF (guardándolas en Drive…)':'')+'</span>'+
  '<button type="button" class="kpdf" id="kVerPdf">PDF</button></div>'}
function pintarCab(){var c=$('kCab');if(c&&CUR&&!CUR.cargando)c.outerHTML=cabecera()}
function serialHtml(){var k=K[CUR.o]||{},a=k.acta||{},s=k.serial;
 var t='<div class="kser"><div><span class="mu sm">Serial medidor instalado (acta)</span><b>'+esc(a.cambioMed==='SI'?(a.medInst||'—'):'No se cambió medidor')+'</b></div>';
 if(s)t+='<div><span class="mu sm">Leído '+(s.via==='barras'?'del código de barras':'por la IA')+'</span><b>'+esc(s.leido||'—')+'</b></div><span class="ksr big '+(s.res==='CONFORME'?'ok':s.res==='NO CONFORME'?'er':'')+'">'+esc(SER[s.res]||s.res)+'</span>'+
  (s.foto>=0?'<button type="button" class="b s" data-ir="'+s.foto+'">Ver foto '+(s.foto+1)+'</button>':'')+(s.aviso?'<span class="mu sm">'+esc(s.aviso)+'</span>':'');
 t+='<button type="button" class="b s" id="kSer1">'+(s?'Volver a verificar':'Verificar serial')+'</button></div>';return t}
function chip(i){var m=((K[CUR.o]||{}).fotos||{})[i];if(!m)return'<span class="kchip nada">Sin marcar</span>';
 return'<span class="kchip '+(m.e==='NC'?'nc':m.e==='C'?'c':'')+'">'+esc(TN[m.tipo]||'Sin tipo')+(m.e?' · '+(m.e==='C'?'✓':'✗'):'')+'</span>'}
function resumen(){var k=K[CUR.o]||{},f=k.fotos||{},a=k.acta||{},por={},nc=[],sin=0;
 CUR.fotos.forEach(function(_,i){var m=f[i];if(!m||!m.tipo){sin++;return}var p=por[m.tipo]||(por[m.tipo]={c:0,nc:0,n:0});p.n++;if(m.e==='C')p.c++;else if(m.e==='NC'){p.nc++;nc.push(i)}});
 var falta=obligatorios(a).filter(function(t){return!por[t]});
 var h='<div class="kres"><h3>Resumen de la orden</h3><div class="kresg">'+TIPOS.map(function(t){var p=por[t[0]];
  return'<div class="kri'+(p?'':' vacio')+(falta.indexOf(t[0])>=0?' falta':'')+'"><span>'+t[1]+'</span><b>'+(p?p.n:0)+'</b>'+(p?'<em>'+(p.c?p.c+' ✓ ':'')+(p.nc?'<i>'+p.nc+' ✗</i>':'')+'</em>':(falta.indexOf(t[0])>=0?'<em>falta</em>':''))+'</div>'}).join('')+'</div>';
 if(falta.length)h+='<p class="kfalta">Faltan fotos de: <b>'+falta.map(function(t){return TN[t]}).join(', ')+'</b></p>';
 if(sin)h+='<p class="mu">'+sin+' foto'+(sin>1?'s':'')+' sin marcar.</p>';
 if(nc.length)h+='<div class="knc"><b>No conformes</b>'+nc.map(function(i){var m=f[i];return'<button type="button" class="knci" data-ir="'+i+'">Foto '+(i+1)+' · '+esc(TN[m.tipo]||'')+(m.obs?' — '+esc(m.obs):'')+'</button>'}).join('')+'</div>';
 h+='<div class="kfin">'+(k.fin?'<button type="button" class="kbt no big" id="kReab">Reabrir orden</button><span class="mu sm">Resultado: <b>'+esc(k.fin.res||'')+'</b></span>':
  '<button type="button" class="kbt si big" id="kFin">✓ Finalizar orden</button><span class="mu sm">'+(falta.length||sin?'Puedes finalizarla igual; quedará con lo que falta anotado.':'Todo marcado.')+'</span>')+'</div></div>';return h}
function pintar(){
 if(!CUR){$('kDet').innerHTML='<div class="kvac"><b>Escoge una orden de la lista</b><p class="mu">Salen todas las fotos del acta. Dale clic a una para verla grande y marcar qué es y si está conforme. Todo se guarda solo en la nube.</p></div>';return}
 if(CUR.cargando){$('kDet').innerHTML='<div class="kvac"><span class="spin"></span> '+esc(CUR.cargando)+'</div>';return}
 if(CUR.error){$('kDet').innerHTML='<div class="kvac"><b>No se pudo abrir el acta</b><p class="mu">'+esc(CUR.error)+'</p></div>';return}
 var k=K[CUR.o]||{},a=k.acta||{};
 $('kDet').innerHTML=cabecera()+
  ((a.irr||[]).length?'<div class="mu sm">Anomalías del acta: <b>'+esc(a.irr.join(' · '))+'</b></div>':'<div class="mu sm">El acta no reporta anomalía.</div>')+
  serialHtml()+
  '<div class="kgal">'+CUR.fotos.map(function(f,i){var m=(k.fotos||{})[i];return'<button type="button" class="kth'+(m&&m.e==='NC'?' nc':m&&m.e==='C'?' c':'')+'" data-f="'+i+'"><img src="'+f.u+'" alt="Foto '+(i+1)+'" loading="lazy"><span class="kn">'+(i+1)+'</span>'+chip(i)+'</button>'}).join('')+'</div>'+
  resumen()}

/* ---------- visor grande con panel ---------- */
function lbAbrir(i){LBI=i;$('kLb').hidden=false;lbPintar()}
function lbPintar(){var f=CUR&&CUR.fotos[LBI];if(!f)return;var k=kk(CUR.o),m=k.fotos[LBI]||{};
 $('kLbI').src=f.u;$('kLbC').textContent='Foto '+(LBI+1)+' de '+CUR.fotos.length+' · orden '+CUR.o;
 $('kLbPan').innerHTML='<div class="kpt2">Foto '+(LBI+1)+'</div><div class="mu sm">¿Qué es?</div><div class="ktip">'+TIPOS.map(function(t){return'<button type="button" data-t="'+t[0]+'" class="'+(m.tipo===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('')+'</div>'+
  '<div class="mu sm">Estado</div><div class="kbts"><button type="button" class="kbt si'+(m.e==='C'?' on':'')+'" data-e="C">✓ Conforme</button><button type="button" class="kbt no'+(m.e==='NC'?' on':'')+'" data-e="NC">✗ No conforme</button></div>'+
  '<textarea id="kObs" rows="3" placeholder="Observación (opcional)">'+esc(m.obs||'')+'</textarea>'+
  '<div class="knav"><button type="button" class="b s" data-n="-1">← Anterior</button><button type="button" class="b s" data-n="1">Siguiente →</button></div>'+
  '<button type="button" class="b s kbor" id="kBor">Borrar marca de esta foto</button>'+
  '<div class="mu sm">Teclas: ← → pasar · C conforme · N no conforme · Esc cerrar</div>'+(k.fin?'<div class="kmsg">La orden está finalizada: si cambias algo, reábrela.</div>':'')}
function marcar(cambio,avanzar){var k=kk(CUR.o),m=k.fotos[LBI]||(k.fotos[LBI]={});Object.assign(m,cambio);m.por=ana();m.t=Date.now();k.t=Date.now();guardarLocal();subir(CUR.o);
 if(avanzar&&m.tipo&&LBI<CUR.fotos.length-1){LBI++}lbPintar();lista()}
function lbCerrar(){$('kLb').hidden=true;pintar()}
$('kLbX').onclick=lbCerrar;$('kLbP').onclick=function(){if(LBI>0){LBI--;lbPintar()}};$('kLbN').onclick=function(){if(LBI<CUR.fotos.length-1){LBI++;lbPintar()}};
$('kLb').onclick=function(e){if(e.target===this)lbCerrar()};
$('kLbPan').onclick=function(e){var t=e.target.closest('button');if(!t)return;
 if(t.dataset.t)marcar({tipo:t.dataset.t},false);
 else if(t.dataset.e){var k=kk(CUR.o),m=k.fotos[LBI]||{};marcar({e:m.e===t.dataset.e?'':t.dataset.e},m.e!==t.dataset.e&&t.dataset.e==='C');if(t.dataset.e==='NC'&&$('kObs'))$('kObs').focus()}
 else if(t.dataset.n){var n=LBI+(+t.dataset.n);if(n>=0&&n<CUR.fotos.length){LBI=n;lbPintar()}}
 else if(t.id==='kBor'){var k2=kk(CUR.o);delete k2.fotos[LBI];k2.t=Date.now();guardarLocal();subir(CUR.o);lbPintar();lista()}};
$('kLbPan').oninput=function(e){if(e.target.id==='kObs'){var k=kk(CUR.o),m=k.fotos[LBI]||(k.fotos[LBI]={});m.obs=e.target.value;m.t=Date.now();k.t=Date.now();guardarLocal();subir(CUR.o)}};

/* ---------- finalizar / reabrir ---------- */
function finalizar(){var k=kk(CUR.o);if(!ana()){toast('Escribe tu nombre en "Analista" arriba para cerrar la orden.',true);$('kAna').focus();return}
 var f=k.fotos||{},nc=Object.keys(f).filter(function(i){return f[i].e==='NC'}).length,falta=obligatorios(k.acta||{}).filter(function(t){return!Object.keys(f).some(function(i){return f[i].tipo===t})});
 k.fin={t:Date.now(),por:ana(),res:nc||falta.length?'CON NOVEDAD ('+(nc?nc+' no conforme'+(nc>1?'s':''):'')+(nc&&falta.length?', ':'')+(falta.length?'faltan '+falta.map(function(t){return TN[t]}).join(', '):'')+')':'CONFORME'};
 k.t=Date.now();guardarLocal();subir(CUR.o);toast('Orden '+CUR.o+' finalizada');
 var F=base().filter(function(y){return y.o!==CUR.o&&est(y.o)!=='FINALIZADA'});if(F.length)abrir(F[0].o);else{pintar();lista()}}
function reabrir(){var k=kk(CUR.o);delete k.fin;k.t=Date.now();guardarLocal();subir(CUR.o);pintar();lista()}

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
 var d=await preparar(o),k=kk(o),a=k.acta||{};
 if(a.cambioMed!=='SI'){k.serial={res:'NO APLICA',acta:'',leido:'',foto:-1,via:'',t:Date.now()};k.t=Date.now();guardarLocal();subir(o);return k.serial}
 var marc=Object.keys(k.fotos||{}).filter(function(i){return k.fotos[i].tipo==='medidor_instalado'}).map(Number);
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
  try{var r=await verificarSerial(L[i].o);c[r.res]=(c[r.res]||0)+1;n++;if(r.reintentar&&/claves/i.test(r.aviso||'')){$('kVerI').textContent='Paré: '+r.aviso;break}}catch(e){}
  lista();if(CUR&&CUR.o===L[i].o&&!LBabierto())pintar()}
 $('kVerI').textContent=$('kVerI').textContent.indexOf('Paré')===0?$('kVerI').textContent:(n+' verificadas: '+c.CONFORME+' conformes, '+c['NO CONFORME']+' no conformes, '+c['SIN LEER']+' sin leer'+(c['NO APLICA']?', '+c['NO APLICA']+' sin cambio de medidor':'')+'.');
 VER=null;$('kVer').textContent='Verificar seriales'}

/* ---------- eventos ---------- */
$('kLst').onclick=function(e){var b=e.target.closest('.kit');if(b)abrir(b.getAttribute('data-o'))};
$('kDet').onclick=async function(e){var t=e.target;
 var f=t.closest('.kth');if(f){lbAbrir(+f.getAttribute('data-f'));return}
 var ir=t.closest('[data-ir]');if(ir){lbAbrir(+ir.getAttribute('data-ir'));return}
 if(t.id==='kFin')finalizar();else if(t.id==='kReab')reabrir();
 else if(t.id==='kSer1'){var o=CUR.o;t.disabled=true;t.textContent='Verificando…';delete kk(o).serial;try{await verificarSerial(o)}catch(x){toast('No se pudo verificar: '+((x&&x.message)||''),true)}if(CUR&&CUR.o===o)pintar();lista()}
 else if(t.id==='kVerPdf'){var w=window.open('','_blank');try{var u8=await pdfDe(CUR.o);var url=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));if(w)w.location=url;else location.href=url}catch(x){if(w)w.close();toast((x&&x.message)||'No se pudo abrir el PDF',true)}}};
document.addEventListener('keydown',function(e){if(sec.hidden||!LBabierto())return;if(/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')){if(e.key==='Escape')e.target.blur();return}
 if(e.key==='Escape')lbCerrar();else if(e.key==='ArrowRight'){if(LBI<CUR.fotos.length-1){LBI++;lbPintar()}}else if(e.key==='ArrowLeft'){if(LBI>0){LBI--;lbPintar()}}
 else if(e.key.toLowerCase()==='c')marcar({e:'C'},true);else if(e.key.toLowerCase()==='n'){marcar({e:'NC'},false);if($('kObs'))$('kObs').focus()}else return;e.preventDefault()});
function seg(id,key){$(id).onclick=function(e){var b=e.target.closest('button');if(!b)return;FILT[key]=b.getAttribute('data-v');if(id==='#kDia'||id==='kDia')[].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});lista()}}
seg('kDia','dia');seg('kEst','est');seg('kSer','ser');
$('kTec').onchange=function(){FILT.tec=this.value;lista()};$('kMo').onchange=function(){FILT.mo=this.value;lista()};
var tq;$('kQ').oninput=function(){var v=this.value;clearTimeout(tq);tq=setTimeout(function(){FILT.q=v.trim();lista()},180)};
$('kVer').onclick=verificarLote;
$('kPdf').onclick=function(){$('kFi').click()};
$('kFi').onchange=async function(){var f=this.files[0];this.value='';if(!f)return;var o=(f.name.match(/\d{6,}/)||[''])[0]||('archivo-'+Date.now());abrir(o,new Uint8Array(await f.arrayBuffer()))};
window.kMostrar=function(){if(!arr){arr=true;bajarTodo();window.kDatos();setInterval(function(){if(!sec.hidden&&!LBabierto()&&!VER)bajarTodo()},120000)}lista();if(!CUR)pintar()};
pintar();
})();
