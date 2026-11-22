/* VOF Órdenes – pestaña VALIDAR IA: checklist foto por foto (diseño 4, bandeja de pendientes).
   Las fotos salen del PDF del acta (Drive ORDENES o un PDF del computador); la IA (Claude, capacidad sample)
   las ordena por tipo y lee seriales y papelógrafos; el analista marca Sí / No / No aplica en cada paso.
   Las respuestas se guardan en la base de la página (las ve todo el equipo). */
(function(){
var X=window.VOFX;if(!X)return;
var $=X.$,esc=X.esc,toast=X.toast;
var PASOS=[
 {k:'conos',n:'Conos',d:'Señalización de la zona de trabajo'},
 {k:'fachada',n:'Fachada',d:'Frente del predio con el papelógrafo'},
 {k:'papelografo',n:'Papelógrafo',d:'Orden (OS), NIC y fecha escritos'},
 {k:'pruebas',n:'Pruebas',d:'Pinza (voltaje y carga), ABM, equipo patrón y censo'},
 {k:'irregularidad',n:'Irregularidad',d:'Fotos que muestran la anomalía o donde el papelógrafo la escribe'},
 {k:'medidor_encontrado',n:'Medidor encontrado',d:'Serial del medidor que se retira'},
 {k:'medidor_instalado',n:'Medidor instalado',d:'Serial del medidor nuevo'},
 {k:'bolsa',n:'Bolsa de custodia',d:'Serial de la bolsa instalada'},
 {k:'finales',n:'Fotos finales',d:'Servicio normalizado: medidor nuevo instalado y sellado'},
 {k:'constancia',n:'Constancia de visita',d:'Acta en papel: fecha, OS, NIC y hallazgos'},
 {k:'otras',n:'Otras fotos',d:'Las que no entraron en ningún paso'}];
var TIPOS=PASOS.map(function(p){return p.k}).filter(function(k){return k!=='otras'});
var R={SI:'Sí',NO:'No',NA:'No aplica'};
var sec=document.createElement('section');sec.id='tChk';sec.hidden=true;
var ref=$('tVid')||$('tHis');ref.parentNode.insertBefore(sec,ref);
sec.innerHTML=
 '<div class="khd"><span class="dot" id="kDot"></span><b>Validar IA · checklist foto por foto</b><span class="mu" id="kInfo">Carga el resultado para ver las órdenes.</span><span style="flex:1"></span>'+
 '<button class="b s" id="kPdf" type="button">Abrir PDF del computador</button><input type="file" id="kFi" accept=".pdf" hidden></div>'+
 '<div class="kf"><div class="kseg" id="kDia"><button type="button" data-v="hoy">Hoy</button><button type="button" data-v="ayer">Ayer</button><button type="button" data-v="" class="on">Todos</button></div>'+
 '<div class="kseg" id="kEst"><button type="button" data-v="pend" class="on">Pendientes</button><button type="button" data-v="rev">Revisadas</button><button type="button" data-v="">Todas</button></div>'+
 '<select id="kTec" aria-label="Técnico"><option value="">Técnico: todos</option></select><input type="search" id="kQ" placeholder="Buscar orden, NIC o técnico" aria-label="Buscar orden"></div>'+
 '<div class="kbox"><aside class="klst" id="kLst"></aside><div class="kdet" id="kDet"></div></div>'+
 '<div class="klb" id="kLb" hidden><button type="button" class="kx" id="kLbX" aria-label="Cerrar">✕</button><button type="button" class="kav" id="kLbP" aria-label="Anterior">‹</button><img id="kLbI" alt="Foto del acta"><button type="button" class="kav" id="kLbN" aria-label="Siguiente">›</button><div class="kcap" id="kLbC"></div></div>';

var ORD=[],K={},CUR=null,FILT={dia:'',est:'pend',tec:'',q:''},DRV=null,arr=false,LB={l:[],i:0};
try{K=JSON.parse(localStorage.getItem('vof_chk')||'{}')||{}}catch(e){K={}}
function guardarLocal(){try{localStorage.setItem('vof_chk',JSON.stringify(K))}catch(e){}}
function rv(r,k){var v=r[k];return v==null?'':String(v).trim()}
function fk(f){var m=String(f).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2):''}
function dk(d){return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)}
function L(s){return String(s==null?'':s).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^0+/,'')}
function igual(a,b){a=L(a);b=L(b);if(!a||!b||b.length<4)return null;return a===b||(b.length>=6&&(a.indexOf(b)>=0||b.indexOf(a)>=0))}
function est(o){var k=K[o];return k&&k.estado?k.estado:(k&&k.resp&&Object.keys(k.resp).length?'EN REVISIÓN':'PENDIENTE')}

/* ---------- base de la página (compartida) ---------- */
function db(){return X.db&&X.db()}
var tGuardar={};
function subir(o){var d=db();if(!d)return;clearTimeout(tGuardar[o]);tGuardar[o]=setTimeout(function(){
 var k=K[o];if(!k)return;try{d.doc('vchk/'+o).set(JSON.parse(JSON.stringify(k))).then(null,function(){toast('No se pudo guardar en la página; quedó en este navegador.',true)})}catch(e){}},700)}
async function bajarTodo(){var d=db();if(!d)return;
 try{var r=await Promise.race([d.collection('vchk').get(),new Promise(function(ok){setTimeout(function(){ok(null)},10000)})]);if(!r)return;
  r.docs.forEach(function(x){var v=x.data()||{};if(!K[x.id]||(v.t||0)>=(K[x.id].t||0))K[x.id]=v});guardarLocal();lista()}catch(e){}}

/* ---------- órdenes (del resultado) ---------- */
window.kDatos=function(){
 var A=window.rFilas?window.rFilas():[];
 ORD=A.filter(function(r){var o=rv(r,'Orden'),i=rv(r,'IRREGULARIDAD');return /^\d{6,}$/.test(o)&&i!=='NO SE VALIDA'&&i!=='LIBERADA'&&rv(r,'Resultado')!=='LIBERADA'})
  .map(function(r){return{o:rv(r,'Orden'),nic:rv(r,'NIC'),tec:rv(r,'Técnico'),fecha:rv(r,'Fecha'),hora:rv(r,'Hora'),k:fk(rv(r,'Fecha')),irr:rv(r,'IRREGULARIDAD'),tipo:rv(r,'TIPO DE IRRE'),medEnc:rv(r,'MEDIDOR ENCONTRADO')}});
 var u={};ORD=ORD.filter(function(x){if(u[x.o])return false;u[x.o]=1;return true});
 ORD.sort(function(a,b){return(a.k+a.hora).localeCompare(b.k+b.hora)});
 var ts={};ORD.forEach(function(x){if(x.tec)ts[x.tec]=1});
 $('kTec').innerHTML='<option value="">Técnico: todos</option>'+Object.keys(ts).sort().map(function(t){return'<option'+(t===FILT.tec?' selected':'')+'>'+esc(t)+'</option>'}).join('');
 $('kInfo').textContent=ORD.length?ORD.length+' órdenes con acta en el resultado.':'El resultado no trae órdenes con acta.';
 lista()};
function filtradas(){var h=new Date(),hoy=dk(h);h.setDate(h.getDate()-1);var ayer=dk(h);var q=FILT.q.toLowerCase();
 return ORD.filter(function(x){if(FILT.dia==='hoy'&&x.k!==hoy)return false;if(FILT.dia==='ayer'&&x.k!==ayer)return false;
  var e=est(x.o);if(FILT.est==='pend'&&(e==='CONFORME'||e==='NO CONFORME'))return false;if(FILT.est==='rev'&&!(e==='CONFORME'||e==='NO CONFORME'))return false;
  if(FILT.tec&&x.tec!==FILT.tec)return false;if(q&&(x.o+' '+x.nic+' '+x.tec).toLowerCase().indexOf(q)<0)return false;return true})}
function lista(){
 var F=filtradas();
 $('kLst').innerHTML='<div class="klh">'+F.length+' órdenes</div>'+(F.slice(0,400).map(function(x){var e=est(x.o),k=K[x.o]||{},n=Object.keys(k.resp||{}).length;
  return'<button type="button" class="kit'+(CUR&&CUR.o===x.o?' on':'')+'" data-o="'+esc(x.o)+'"><b>'+esc(x.o)+'</b> <span class="mu">'+esc(x.fecha.slice(0,5))+' '+esc(x.hora.slice(0,5))+'</span><br><span class="sm">'+esc(x.tec||'(sin técnico)')+'</span>'+
   '<span class="kpr"><i style="width:'+Math.round(n*100/PASOS.length)+'%"></i></span><span class="ke '+(e==='CONFORME'?'ok':e==='NO CONFORME'?'er':e==='EN REVISIÓN'?'wn':'')+'">'+e+'</span></button>'}).join('')||'<p class="mu" style="padding:12px">No hay órdenes con estos filtros.</p>')}

/* ---------- PDF: texto y fotos ---------- */
async function pdfDe(o){
 if(!X.mcp())throw new Error('La carpeta VOF CAMP no está conectada: toca "Conectar carpeta VOF CAMP" arriba, o usa "Abrir PDF del computador".');
 if(!DRV||Date.now()-DRV.t>300000){var l=await X.drLista(X.DR.ord);DRV={t:Date.now(),m:{}};l.forEach(function(f){DRV.m[String(f.title||'').replace(/\.pdf$/i,'')]=f})}
 var f=DRV.m[o];if(!f)throw new Error('No está el PDF '+o+'.pdf en la carpeta ORDENES.');
 return X.drBytes(f.id,[37,80,68,70])}
/* precarga: PDF + fotos de las siguientes órdenes, para que abran de una */
var PRE={},PREL=[];
function preparar(o){if(PRE[o])return PRE[o];
 PRE[o]=pdfDe(o).then(function(u8){var url=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));return leerPdf(u8).then(function(d){d.pdfUrl=url;return d})}).then(function(d){return d},function(e){delete PRE[o];throw e});
 PREL.push(o);var vueltas=0;while(PREL.length>5&&vueltas++<10){var v=PREL.shift();if(CUR&&CUR.o===v){PREL.push(v);continue}var q=PRE[v];delete PRE[v];if(q)q.then(function(d){d.fotos.forEach(function(f){URL.revokeObjectURL(f.u)})},function(){})}
 return PRE[o]}
function precargar(){if(!CUR||!X.mcp())return;var F=filtradas().filter(function(y){var e=est(y.o);return e!=='CONFORME'&&e!=='NO CONFORME'}),i=F.findIndex(function(y){return y.o===CUR.o});
 var sig=F.slice(i+1,i+4);if(!sig.length)return;
 (async function(){for(var k=0;k<sig.length;k++){try{var d=await preparar(sig[k].o);if(k===0)await clasificarDe(sig[k].o,d,true)}catch(e){}}})()}
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

/* ---------- IA: ordenar fotos y leer datos ---------- */
var PROMPT='Eres analista de calidad de Grupo SYM (contratista de Air-e, energía). Te paso las fotos de UNA visita, numeradas en el orden en que vienen (foto 1 = la primera imagen adjunta).\n'+
 'Clasifica CADA foto en uno de estos tipos:\n conos (conos/cinta de señalización), fachada (frente del predio), papelografo (el cartel/hoja que sostiene el técnico con OS, NIC y fecha; úsalo solo si la foto es sobre todo el papelógrafo), '+
 'pruebas (pinza amperimétrica midiendo voltaje o carga, equipo patrón EmsiTech/ABM conectado o su pantalla, app con % de error, calculadora del censo de carga), irregularidad (muestra la anomalía reportada o el papelógrafo la escribe), '+
 'medidor_encontrado (el medidor VIEJO que se retira, o sus sellos), medidor_instalado (el medidor NUEVO, con su serial o código de barras), bolsa (bolsa de custodia), finales (cómo quedó el servicio normalizado: medidor nuevo instalado y sellado, acometida arreglada), '+
 'constancia (la hoja "Constancia de visita" o el acta en papel, por delante o por detrás), descartar (logos, firmas, pantallazos sin relación), otras (no encaja en nada).\n'+
 'Además lee lo que se vea. Responde SOLO un JSON: {"fotos":[{"i":1,"tipo":"conos"}...],"lecturas":{"conos_visibles":true|false|null,"fachada_visible":true|false|null,'+
 '"papel_os":"","papel_nic":"","papel_fecha":"","pct_error":"","medidor_equipo":"","anomalia_visible":true|false|null,"anomalia_texto":"","med_encontrado":"","med_instalado":"","bolsa":"",'+
 '"finales_ok":true|false|null,"const_fecha":"","const_os":"","const_nic":"","const_hallazgos":[]}}. Usa null o "" en lo que no se vea. No inventes números: copia solo lo que se lee.\n'+
 'Datos del acta (para saber qué buscar, no para copiarlos): orden {O}; anomalías del acta: {A}.';
async function clasificar(){
 var S=X.sample&&X.sample();if(!CUR||!CUR.fotos.length)return;
 if(!S){CUR.msg='No hay claves de IA: toca "Claves de IA" arriba. Mientras tanto las fotos quedan en "Otras fotos".';pintar();return}
 var o=CUR.o;CUR.msg='La IA está ordenando '+CUR.fotos.length+' fotos…';pintar();
 try{await clasificarDe(o,{fotos:CUR.fotos,acta:CUR.acta||{}});if(CUR&&CUR.o===o&&CUR.msg){CUR.msg='';pintar()}}
 catch(e){if(CUR&&CUR.o===o){CUR.msg=(e&&e.message)||'La IA no respondió: las fotos quedan en "Otras fotos".';pintar()}}}
var IAP={};
function clasificarDe(o,d,fondo){if(IAP[o])return IAP[o];IAP[o]=clasificarDe2(o,d,fondo);IAP[o].then(function(){delete IAP[o]},function(){delete IAP[o]});return IAP[o]}
async function clasificarDe2(o,d,fondo){var k=K[o]||(K[o]={resp:{},notas:{}});if(k.ia&&k.ia.n===d.fotos.length)return;
 var S=X.sample&&X.sample();if(!S||!d.fotos.length)return;var lim=await S.limits().catch(function(){return null}),max=lim&&lim.images?lim.images.maxCount:0;if(!max)return;
 var anom=(d.acta.irr||[]).map(function(i){return i.n+' '+i.nombre}).join(' · ')||'SIN ANOMALÍA',tipos={},lec={};
 for(var i=0;i<d.fotos.length;i+=max){var lote=d.fotos.slice(i,i+max);var blobs=await Promise.all(lote.map(achicar));
  var p=PROMPT.replace('{O}',o).replace('{A}',anom)+(d.fotos.length>max?'\nOjo: van las fotos '+(i+1)+' a '+(i+lote.length)+' de '+d.fotos.length+'; numera desde '+(i+1)+'.':'');
  var j=await S.json(p,{images:blobs});mezclar(j,tipos,lec,d.fotos.length)}
 k.ia={n:d.fotos.length,tipos:tipos,lec:lec,t:Date.now()};k.t=Date.now();guardarLocal();subir(o);if(CUR&&CUR.o===o)aplicarIA()}
function achicar(f){return new Promise(function(ok){var im=new Image();im.onload=function(){var c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);aBlob(c,900,0.8).then(ok)};im.onerror=function(){ok(f.b)};im.src=f.u})}
function mezclar(j,tipos,lec,n){(j&&j.fotos||[]).forEach(function(x){var m=+x.i;if(m>=1&&m<=n&&TIPOS.concat(['descartar','otras']).indexOf(x.tipo)>=0)tipos[m-1]=x.tipo});
 var l=j&&j.lecturas||{};Object.keys(l).forEach(function(c){var v=l[c];if(v!==null&&v!==''&&!(Array.isArray(v)&&!v.length)&&(lec[c]===undefined||lec[c]===null||lec[c]===''))lec[c]=v})}
function aplicarIA(){var k=K[CUR.o]||{};CUR.tipos=(k.ia&&k.ia.tipos)||{};CUR.lec=(k.ia&&k.ia.lec)||{};CUR.msg='';pintar()}
function fotosPaso(pk){if(!CUR)return[];var t=CUR.tipos||{},sin=!Object.keys(t).length;
 return CUR.fotos.map(function(f,i){return{f:f,i:i}}).filter(function(x){var ti=t[x.i];if(sin)return pk==='otras';return pk==='otras'?(!ti||ti==='otras'):ti===pk})}

/* ---------- comparación y sugerencia por paso ---------- */
function chequeos(pk){var a=CUR.acta||{},l=CUR.lec||{},x=CUR.x||{},nf=fotosPaso(pk).length,r=[],sug=null;
 function fila(q,ac,ia,ok){r.push({q:q,a:ac,i:ia,ok:ok})}
 var tf=function(v){return v===true?'Sí se ve':v===false?'No se ve':''};
 if(pk==='conos'){fila('Se ven los conos y la cinta','',tf(l.conos_visibles),l.conos_visibles);sug=!nf?'NO':l.conos_visibles===false?'NO':'SI'}
 else if(pk==='fachada'){fila('Se ve la fachada con el papelógrafo','',tf(l.fachada_visible),l.fachada_visible);sug=!nf?'NO':l.fachada_visible===false?'NO':'SI'}
 else if(pk==='papelografo'){var a1=igual(x.o,l.papel_os),a2=igual(x.nic,l.papel_nic);fila('OS escrita',x.o,l.papel_os,a1);fila('NIC escrito',x.nic,l.papel_nic,a2);fila('Fecha',x.fecha,l.papel_fecha,null);
  sug=a1===false||a2===false?'NO':a1&&a2?'SI':null}
 else if(pk==='pruebas'){fila('% de error del equipo patrón','',l.pct_error,null);var me=igual(x.medEnc||a.medEnc,l.medidor_equipo);fila('Medidor en el equipo = medidor encontrado',x.medEnc||a.medEnc,l.medidor_equipo,me);sug=!nf?'NA':me===false?'NO':'SI'}
 else if(pk==='irregularidad'){var sinA=!CUR.anom||/SIN ANOMAL/i.test(CUR.anom);fila('Anomalía del acta',CUR.anom||'SIN ANOMALÍA','',null);fila('Se ve o está escrita en la foto','',(tf(l.anomalia_visible)+(l.anomalia_texto?' · '+l.anomalia_texto:'')),l.anomalia_visible);
  sug=sinA?'NA':l.anomalia_visible===true?'SI':l.anomalia_visible===false||!nf?'NO':null}
 else if(pk==='medidor_encontrado'){var ac=x.medEnc||a.medEnc,ok=igual(ac,l.med_encontrado);fila('Serial',ac,l.med_encontrado,ok);sug=ok===false?'NO':ok?'SI':!nf?'NO':null}
 else if(pk==='medidor_instalado'){var cm=a.cambioMed==='SI',ok2=igual(a.medInst,l.med_instalado);fila('Se cambió medidor',cm?'SI':'NO','',null);if(cm)fila('Serial',a.medInst,l.med_instalado,ok2);sug=!cm?'NA':ok2===false?'NO':ok2?'SI':null}
 else if(pk==='bolsa'){var ok3=igual(CUR.bolsa,l.bolsa);fila('Serial',CUR.bolsa||'(el acta no trae bolsa)',l.bolsa,CUR.bolsa?ok3:null);sug=!CUR.bolsa?'NA':ok3===false?'NO':ok3?'SI':null}
 else if(pk==='finales'){fila('Servicio normalizado, medidor nuevo sellado','',tf(l.finales_ok),l.finales_ok);sug=!nf?'NO':l.finales_ok===false?'NO':'SI'}
 else if(pk==='constancia'){var h=(CUR.irrN||[]).join(', '),hi=(l.const_hallazgos||[]).join(', '),c1=igual(x.o,l.const_os),c2=igual(x.nic,l.const_nic),c3=h||hi?(h===hi):null;
  fila('Fecha',x.fecha,l.const_fecha,null);fila('OS',x.o,l.const_os,c1);fila('NIC',x.nic,l.const_nic,c2);fila('Hallazgos marcados',h||'ninguno',hi,c3);
  sug=!nf?'NO':(c1===false||c2===false||c3===false)?'NO':(c1&&c2)?'SI':null}
 else{sug=nf?null:'NA'}
 return{rows:r,sug:sug}}

/* ---------- pintar ---------- */
function pintar(){
 if(!CUR){$('kDet').innerHTML='<div class="kvac"><b>Escoge una orden de la lista</b><p class="mu">Se abre su acta, la IA ordena las fotos por tipo y tú vas marcando Sí, No o No aplica en cada paso. Teclas: S, N, A y las flechas.</p></div>';return}
 var k=K[CUR.o]||{resp:{},notas:{}},x=CUR.x,P=CUR.paso;
 var st='<div class="kstp">'+PASOS.concat([{n:'Resumen'}]).map(function(p,i){var r=p.k?k.resp[p.k]:null,c=i===P?'kcur':r==='SI'?'ok':r==='NO'?'er':r==='NA'?'na':'';
  return'<button type="button" class="ks '+c+'" data-p="'+i+'"><span>'+(r==='SI'?'✓':r==='NO'?'✗':r==='NA'?'—':i+1)+'</span><em>'+esc(p.n)+'</em></button>'}).join('')+'</div>';
 var cab='<div class="kch"><b>Orden '+esc(x.o)+'</b><span class="mu">NIC '+esc(x.nic)+' · '+esc(x.tec)+' · '+esc(x.fecha)+' '+esc(x.hora)+'</span>'+(CUR.link?'<a class="kpdf" href="'+esc(CUR.link)+'" target="_blank" rel="noopener">PDF</a>':'')+
  '<button type="button" class="b s" id="kRe">Volver a ordenar con IA</button></div>';
 if(CUR.cargando){$('kDet').innerHTML=cab+st+'<div class="kvac"><span class="spin"></span> '+esc(CUR.cargando)+'</div>';return}
 if(CUR.error){$('kDet').innerHTML=cab+st+'<div class="kvac"><b>No se pudo abrir el acta</b><p class="mu">'+esc(CUR.error)+'</p></div>';return}
 var msg=CUR.msg?'<div class="kmsg">'+esc(CUR.msg)+'</div>':'';
 if(P>=PASOS.length){var todos=PASOS.every(function(p){return k.resp[p.k]}),mal=PASOS.filter(function(p){return k.resp[p.k]==='NO'});
  $('kDet').innerHTML=cab+st+msg+'<div class="kpt"><span class="knum">RESUMEN</span><h2>'+(todos?(mal.length?'Orden NO CONFORME: '+mal.length+' paso'+(mal.length>1?'s':'')+' en No':'Orden conforme: '+PASOS.length+' de '+PASOS.length):'Faltan pasos por marcar')+'</h2></div>'+
   '<table class="kck"><tr><th>#</th><th>Paso</th><th>Respuesta</th><th>Nota</th></tr>'+PASOS.map(function(p,i){var r=k.resp[p.k];return'<tr><td>'+(i+1)+'</td><td><b>'+esc(p.n)+'</b></td><td>'+(r?'<span class="kr '+r.toLowerCase()+'">'+R[r]+'</span>':'<span class="mu">sin marcar</span>')+'</td><td class="mu">'+esc((k.notas||{})[p.k]||'')+'</td></tr>'}).join('')+'</table>'+
   '<div class="kfin"><button type="button" class="kbt si big" id="kApr"'+(todos?'':' disabled')+'>✓ Guardar orden y pasar a la siguiente</button><span class="mu sm">Queda '+(mal.length?'NO CONFORME':'CONFORME')+' y la ve todo el equipo en la página.'+(k.por?' Última revisión: '+esc(k.por):'')+'</span></div>';
  return}
 var p=PASOS[P],fs=fotosPaso(p.k),c=chequeos(p.k),r=k.resp[p.k];
 var g=fs.length?'<div class="kfot n'+Math.min(fs.length,6)+'">'+fs.map(function(y,j){return'<button type="button" class="kth" data-f="'+j+'"><img src="'+y.f.u+'" alt="Foto '+(y.i+1)+'"><span>'+(y.i+1)+'</span></button>'}).join('')+'</div>':'<div class="kvac sm"><b>No hay fotos de '+esc(p.n.toLowerCase())+'</b>'+(Object.keys(CUR.tipos||{}).length?'':'<p class="mu">La IA todavía no ha ordenado las fotos.</p>')+'</div>';
 var t=c.rows.length?'<table class="kck"><tr><th>Qué se revisa</th><th>Dice el acta</th><th>Leyó la IA</th></tr>'+c.rows.map(function(z){return'<tr><td>'+esc(z.q)+'</td><td class="ka">'+(esc(z.a)||'<span class=mu>—</span>')+'</td><td class="'+(z.ok===true?'kok':z.ok===false?'kno':'')+'">'+(esc(z.i)||'<span class=mu>—</span>')+'</td></tr>'}).join('')+'</table>':'';
 var bt=['SI','NO','NA'].map(function(v){return'<button type="button" class="kbt '+v.toLowerCase()+' big'+(r===v?' on':'')+(c.sug===v&&!r?' sug':'')+'" data-r="'+v+'">'+(v==='SI'?'✓ Sí':v==='NO'?'✗ No':'— No aplica')+'</button>'}).join('');
 $('kDet').innerHTML=cab+st+msg+'<div class="kpt"><span class="knum">PASO '+(P+1)+' DE '+PASOS.length+'</span><h2>'+esc(p.n)+'</h2><span class="mu">'+esc(p.d)+' · '+fs.length+' foto'+(fs.length===1?'':'s')+'</span></div>'+g+
  '<div class="kbot"><div>'+t+'</div><div class="kact"><div class="kq">¿'+esc(p.n)+' conforme?</div><div class="kbts">'+bt+'</div>'+
  (c.sug&&!r?'<div class="mu sm">Sugerido por la IA: <b>'+R[c.sug]+'</b> (borde punteado)</div>':'')+
  (r==='NO'?'<textarea id="kNota" rows="2" placeholder="¿Qué está mal? (opcional)">'+esc((k.notas||{})[p.k]||'')+'</textarea>':'')+
  '<div class="knav"><button type="button" class="b s" id="kAnt"'+(P?'':' disabled')+'>← Anterior</button><button type="button" class="b s" id="kSig">Siguiente →</button><span class="mu sm">Teclas S / N / A</span></div></div></div>'}

/* ---------- abrir orden ---------- */
window.kAbrir=function(o){if(!arr)window.kMostrar();abrir(o)};
async function abrir(o,u8){
 var x=ORD.filter(function(y){return y.o===o})[0]||{o:o,nic:'',tec:'',fecha:'',hora:'',irr:'',tipo:''};
 var k=K[o]||{};CUR={o:o,x:x,paso:PASOS.findIndex(function(p){return!(k.resp||{})[p.k]}),fotos:[],tipos:{},lec:{},cargando:'Abriendo el acta…'};if(CUR.paso<0)CUR.paso=PASOS.length;
 lista();pintar();
 try{var d;if(u8){CUR.cargando='Sacando las fotos del acta…';pintar();d=await leerPdf(u8);d.pdfUrl=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}))}else{if(!PRE[o]){CUR.cargando='Abriendo el acta y sacando las fotos…';pintar()}d=await preparar(o)}
  if(!CUR||CUR.o!==o)return;CUR.link=d.pdfUrl;
  CUR.fotos=d.fotos;CUR.acta=d.acta;CUR.bolsa=d.bolsa;CUR.irrN=(d.acta.irr||[]).map(function(i){return i.n}).sort(function(a,b){return a-b});
  CUR.anom=(d.acta.irr||[]).map(function(i){return i.n+' '+i.nombre}).join(' · ')||(x.irr&&x.irr!=='SIN ANOMALÍA'?x.irr:'');
  if(!x.nic&&d.acta.nic)x.nic=d.acta.nic;if(!x.fecha&&d.acta.fecha)x.fecha=d.acta.fecha;if(!x.medEnc&&d.acta.medEnc)x.medEnc=d.acta.medEnc;if(!x.tec&&d.acta.tecnico)x.tec=d.acta.tecnico;
  CUR.cargando='';aplicarIA();if(!(K[o]&&K[o].ia&&K[o].ia.n===CUR.fotos.length))clasificar();precargar()}
 catch(e){if(CUR&&CUR.o===o){CUR.cargando='';CUR.error=(e&&e.message)||X.drMsg(e)||'Error al leer el PDF.';pintar()}}}
function responder(v){if(!CUR||CUR.paso>=PASOS.length)return;var o=CUR.o,p=PASOS[CUR.paso].k,k=K[o]||(K[o]={resp:{},notas:{}});k.resp=k.resp||{};
 k.resp[p]=v;k.t=Date.now();delete k.estado;guardarLocal();subir(o);if(v!=='NO')CUR.paso++;pintar();lista()}
function aprobar(){var o=CUR.o,k=K[o];if(!k)return;var mal=PASOS.some(function(p){return k.resp[p.k]==='NO'});k.estado=mal?'NO CONFORME':'CONFORME';
 k.t=Date.now();k.por=new Date().toLocaleString('es-CO',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});guardarLocal();subir(o);toast('Orden '+o+': '+k.estado);
 var F=filtradas().filter(function(y){var e=est(y.o);return y.o!==o&&e!=='CONFORME'&&e!=='NO CONFORME'});if(F.length)abrir(F[0].o);else{CUR=null;pintar();lista()}}

/* ---------- visor grande ---------- */
function lbAbrir(l,i){LB={l:l,i:i};$('kLb').hidden=false;lbPintar()}
function lbPintar(){var y=LB.l[LB.i];if(!y)return;$('kLbI').src=y.f.u;$('kLbC').textContent='Foto '+(y.i+1)+' · '+(LB.i+1)+' de '+LB.l.length+' · página '+y.f.pag+' del acta'}
function lbMover(d){LB.i=(LB.i+d+LB.l.length)%LB.l.length;lbPintar()}
$('kLbX').onclick=function(){$('kLb').hidden=true};$('kLbP').onclick=function(){lbMover(-1)};$('kLbN').onclick=function(){lbMover(1)};
$('kLb').onclick=function(e){if(e.target===this)this.hidden=true};

/* ---------- eventos ---------- */
$('kLst').onclick=function(e){var b=e.target.closest('.kit');if(b)abrir(b.getAttribute('data-o'))};
$('kDet').onclick=function(e){var t=e.target;
 var s=t.closest('.ks');if(s&&CUR){CUR.paso=+s.getAttribute('data-p');pintar();return}
 var r=t.closest('.kbt[data-r]');if(r){responder(r.getAttribute('data-r'));return}
 var f=t.closest('.kth');if(f){lbAbrir(fotosPaso(PASOS[CUR.paso].k),+f.getAttribute('data-f'));return}
 if(t.id==='kAnt'&&CUR.paso>0){CUR.paso--;pintar()}else if(t.id==='kSig'){CUR.paso=Math.min(PASOS.length,CUR.paso+1);pintar()}
 else if(t.id==='kApr')aprobar();
 else if(t.id==='kRe'&&CUR&&CUR.fotos.length){var k=K[CUR.o];if(k)delete k.ia;clasificar()}};
$('kDet').oninput=function(e){if(e.target.id==='kNota'&&CUR){var k=K[CUR.o];k.notas=k.notas||{};k.notas[PASOS[CUR.paso].k]=e.target.value;k.t=Date.now();guardarLocal();subir(CUR.o)}};
document.addEventListener('keydown',function(e){if(sec.hidden)return;if(!$('kLb').hidden){if(e.key==='Escape')$('kLb').hidden=true;else if(e.key==='ArrowRight')lbMover(1);else if(e.key==='ArrowLeft')lbMover(-1);return}
 if(!CUR||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;var c=e.key.toLowerCase();
 if(c==='s')responder('SI');else if(c==='n')responder('NO');else if(c==='a')responder('NA');else if(e.key==='ArrowRight'){CUR.paso=Math.min(PASOS.length,CUR.paso+1);pintar()}else if(e.key==='ArrowLeft'&&CUR.paso>0){CUR.paso--;pintar()}else return;e.preventDefault()});
function seg(id,key){$(id).onclick=function(e){var b=e.target.closest('button');if(!b)return;FILT[key]=b.getAttribute('data-v');[].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});lista()}}
seg('kDia','dia');seg('kEst','est');
$('kTec').onchange=function(){FILT.tec=this.value;lista()};
var tq;$('kQ').oninput=function(){var v=this.value;clearTimeout(tq);tq=setTimeout(function(){FILT.q=v.trim();lista()},180)};
$('kPdf').onclick=function(){$('kFi').click()};
$('kFi').onchange=async function(){var f=this.files[0];this.value='';if(!f)return;var o=(f.name.match(/\d{6,}/)||[''])[0]||('archivo-'+Date.now());
 abrir(o,new Uint8Array(await f.arrayBuffer()))};
window.kMostrar=function(){if(!arr){arr=true;bajarTodo();window.kDatos()}$('kDot').classList.toggle('vivo',!!(X.sample&&X.sample()));lista();pintar()};
pintar();
})();
