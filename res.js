/* VOF Órdenes – cuadro de RESULTADO (lee el último Excel de VOF CAMP/RESULTADO) */
(function(){
var X=window.VOFX;if(!X)return;
var $=X.$,esc=X.esc,toast=X.toast,drMsg=X.drMsg,drLista=X.drLista,drBytes=X.drBytes,DR=X.DR,ir=X.ir;

/* ---------- plantilla de la pestaña ---------- */
var COLS=[ /* [clave en el Excel, título corto, clase, ancho relativo, título completo] — orden de la plantilla VOF CAMP */
 ['_est','Estado','est',5.6,'Estado en Validar'],['_pdf','PDF','pdf',2.3],['Hora','Hora','nw',4.4],['Orden','Orden','st3',5.6],['NIC','NIC','nw',4.6],['Técnico','Técnico','a',7.6],['Proceso','Proceso','nw',4.6],['Tipo Orden','Tipo orden','nw',4.2],
 ['IRREGULARIDAD','Irregularidad','a',8.4],['TIPO DE IRRE','Tipo de irre','w',9],
 ['APLICA PARE','PARE','',2.8,'Aplica PARE'],['SE NECESITA VIDEO','Nec. video','',2.8,'Se necesita video'],['LO SUBIÓ AL APLICATIVO','Subió video','',2.8,'Lo subió al aplicativo'],['APOYO CARRO CANASTA','Canasta','',3,'Apoyo carro canasta'],
 ['NOVEDAD IRREGULARIDAD','Novedad irreg.','w',7,'Novedad irregularidad'],['Resultado','Resultado','',5],['Cobro mal','Cobro mal','',3.2],
 ['Mano de obra cobrada mal','M. obra cobrada mal','w',6.2,'Mano de obra cobrada mal'],['Materiales cobrados mal','Materiales cobrados mal','w',6.2],['Detalle','Detalle','w',7.4],
 ['_alertas','Alertas','',5.2],['_crit','Criterio','',3.8]];
var ANCHO=COLS.reduce(function(a,c){return a+c[3]},0);
$('tRes').innerHTML=
 '<div class="rhd"><span class="dot" id="rDot"></span><b id="rArch">Resultado</b><span class="mu" id="rInfo">Buscando el último resultado en VOF CAMP/RESULTADO…</span><span style="flex:1"></span>'+
 '<button class="b s" id="rCol" type="button" aria-expanded="true">▲ Ocultar cuadros</button><button class="b s" id="rAct" type="button">Actualizar</button><button class="b s" id="rAbr" type="button">Abrir Excel del computador</button><input type="file" id="rFi" accept=".xlsx" hidden></div>'+
 '<div class="rf" id="rF" hidden>'+
  '<div class="rdia" id="rDia" role="group" aria-label="Día"><button type="button" data-d="" class="on">Todos</button><button type="button" data-d="hoy">Hoy</button><button type="button" data-d="ayer">Ayer</button></div>'+'<span class="fdr"><label>Desde <input type="date" id="rDes"></label><label>Hasta <input type="date" id="rHas"></label></span>'+
  '<label>Criterio <select id="rSCri"></select></label><label>Técnico <select id="rSTec"></select></label><label>Alertas <select id="rSAle"></select></label>'+
  '<input type="search" id="rQ" placeholder="Buscar orden, NIC o técnico" aria-label="Buscar en el resultado">'+
  '<button class="b s" id="rLim" type="button" hidden>Quitar filtros</button></div>'+
 '<div class="rvac" id="rVac"><div><p style="font-size:18px;margin:0 0 6px"><b>Esperando el resultado</b></p><p class="mu" style="margin:0">Con Google Drive conectado, el cuadro trae solo el Excel más reciente de <b>G:\\Mi unidad\\VOF CAMP\\RESULTADO</b> y se actualiza cada vez que el script lo cambia.<br>Si no, usa "Abrir Excel del computador" o arrastra el resultado aquí.</p></div></div>'+
 '<div class="rdash" id="rDash" hidden>'+
  '<div class="rk rcu" id="rK"></div>'+
  '<div class="rg rcu">'+
   '<div class="card"><h3>Resultado</h3><div class="cb"><div class="don" id="rDon"></div></div></div>'+
   '<div class="card"><h3>Por técnico <span class="mu" style="font-weight:400;text-transform:none;letter-spacing:0">(los de más NO CUMPLE)</span></h3><div class="cb" id="rTec"></div></div>'+
   '<div class="card"><h3>Criterios que más fallan</h3><div class="cb" id="rCri"></div></div>'+
   '<div class="card"><h3>Campaña vs PQR</h3><div class="cb" id="rPro"></div></div></div>'+
  '<div class="card rt"><div class="tb"><h3 style="margin:0" id="rTt">Órdenes</h3><span style="flex:1"></span><span class="mu" style="font-size:11px">Clic en un título para ordenar · clic en la orden para abrirla en Validar</span></div>'+
   '<div class="cb" id="rTw"><table><colgroup>'+COLS.map(function(c){return'<col style="width:'+(c[3]*100/ANCHO).toFixed(2)+'%">'}).join('')+'</colgroup><thead><tr id="rTh"></tr><tr id="rTf" class="tf"></tr></thead><tbody id="rTb"></tbody></table>'+
   '<p class="mu" id="rPg" style="margin:8px 0 0;font-size:11px"></p><button class="b s" id="rMas" type="button" hidden>Mostrar más</button></div></div>'+
 '</div>';

/* ---------- datos ---------- */
var CF={};
var RS={A:[],crit:[],archivo:'',fecha:null,id:'',mod:''},rFil={k:'todas',tec:'',res:'',pro:'',dia:'',cri:'',ale:''},rOrd={c:'',d:-1};
var rBusy=false,rTimer=null,rLimN=200,PDFS={},pdfBusy=false,pdfMod='';
function rv(r,k){var v=r[k];return v==null?'':String(v).trim()}
function rNum(n){return(n||0).toLocaleString('es-CO')}
function rPct(a,b){return b?Math.round(a*100/b)+'%':'0%'}
function hoyTxt(){var d=new Date();return('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear()}
function fKey(f){var m=String(f).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2):''}
function rLeer(bytes){
 if(typeof XLSX==='undefined')throw new Error('lib');
 var wb=XLSX.read(bytes,{type:'array'});
 var ws=wb.Sheets['Acciones'];if(!ws)throw new Error('hoja');
 var A=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
 var crit=[];
 if(wb.Sheets['Resumen'])XLSX.utils.sheet_to_json(wb.Sheets['Resumen'],{defval:'',raw:false}).forEach(function(r){
  var c=rv(r,'Concepto'),m=c.match(/^([CRAT]\d\d)\s+(.*)$/),n=parseInt(rv(r,'Cantidad'),10);
  if(m&&n>0){var ya=crit.filter(function(x){return x.c===m[1]})[0];if(ya)ya.n+=n;else crit.push({c:m[1],t:m[2],n:n})}});
 A.forEach(function(r){
  var cs={};(rv(r,'Detalle')+'\n'+rv(r,'Incumplimientos')).replace(/\b([CRAT]\d\d)\b/g,function(_,c){cs[c]=1});
  r._crit=Object.keys(cs).sort().join(' ');r._tags=rTags(r);r._alertas=r._tags.map(function(t){return t[1]}).join(' ');r._fk=fKey(rv(r,'Fecha'))});
 return{A:A,crit:crit}}
function rTags(r){
 var t=[],irr=rv(r,'IRREGULARIDAD'),est=rv(r,'Estado orden');
 if(est||rv(r,'Resultado')==='LIBERADA')t.push(['pu',/CAMBI/i.test(est)?'CAMBIÓ':'LIBERADA']);
 if(rv(r,'Cobro mal'))t.push(['er','COBRO MAL']);
 var p=rv(r,'APLICA PARE');if(p==='SÍ'||p==='SI')t.push(['er','PARE']);else if(p==='VALIDAR')t.push(['wn','PARE?']);
 if(/^S[IÍ]$/.test(rv(r,'SE NECESITA VIDEO'))&&rv(r,'LO SUBIÓ AL APLICATIVO')!=='SÍ')t.push(['wn','SIN VIDEO']);
 if(rv(r,'NOVEDAD IRREGULARIDAD'))t.push(['ac','NOVEDAD']);
 if(irr==='SIN ACTA')t.push(['wn','SIN ACTA']);
 if(/^S[IÍ]$/.test(rv(r,'APOYO CARRO CANASTA')))t.push(['ok','CANASTA']);
 return t}
function tiene(r,tag){return r._tags.some(function(t){return t[1]===tag})}
function rEsAlerta(r){var res=rv(r,'Resultado');return res==='NO CUMPLE'||res==='REVISAR'||res==='LIBERADA'||r._tags.some(function(t){return t[1]!=='CANASTA'})}
var R_KS=[
 ['todas','Órdenes','',function(){return true}],
 ['CUMPLE','Cumple','ok',function(r){return rv(r,'Resultado')==='CUMPLE'}],
 ['REVISAR','Revisar','wn',function(r){return rv(r,'Resultado')==='REVISAR'}],
 ['NO CUMPLE','No cumple','er',function(r){return rv(r,'Resultado')==='NO CUMPLE'}],
 ['cobro','Cobro mal','er',function(r){return!!rv(r,'Cobro mal')}],
 ['lib','Liberadas / cambiaron','pu',function(r){return tiene(r,'LIBERADA')||tiene(r,'CAMBIÓ')}],
 ['pare','Aplica PARE','er',function(r){return tiene(r,'PARE')||tiene(r,'PARE?')}],
 ['video','Video pendiente','wn',function(r){return tiene(r,'SIN VIDEO')}],
 ['nov','Novedad acta','ac',function(r){return tiene(r,'NOVEDAD')}],
 ['canasta','Carro canasta','ok',function(r){return tiene(r,'CANASTA')}],
 ['alerta','Con alerta','ac',rEsAlerta]];
var ALE=[['','Todas'],['_cualquiera','Cualquier alerta'],['COBRO MAL','Cobro mal'],['PARE','PARE'],['PARE?','PARE: validar'],['SIN VIDEO','Sin video'],['NOVEDAD','Novedad del acta'],['SIN ACTA','Sin acta'],['LIBERADA','Liberada'],['CAMBIÓ','Cambió'],['CANASTA','Carro canasta']];
function rK(k){return R_KS.filter(function(x){return x[0]===k})[0]}
function diasRef(){var hoy=fKey(hoyTxt()),ks={};RS.A.forEach(function(r){if(r._fk)ks[r._fk]=1});var l=Object.keys(ks).sort();
 return{hoy:hoy,ayer:l.filter(function(k){return k<hoy}).pop()||''}}
function rRango(r){var de=($('rDes').value||'').replace(/-/g,''),ha=($('rHas').value||'').replace(/-/g,'');if(de&&(!r._fk||r._fk<de))return false;if(ha&&(!r._fk||r._fk>ha))return false;return true}
function rDiaFil(){var d=diasRef();return RS.A.filter(function(r){return rRango(r)&&(rFil.dia==='hoy'?r._fk===d.hoy:rFil.dia==='ayer'?r._fk===d.ayer:true)})}
/* filtros de la barra (aplican a todo el cuadro) */
function rBase(){
 var d=diasRef(),q=($('rQ').value||'').trim().toLowerCase();
 return RS.A.filter(function(r){
  if(rFil.dia==='hoy'&&r._fk!==d.hoy)return false;
  if(rFil.dia==='ayer'&&r._fk!==d.ayer)return false;
  if(!rRango(r))return false;
  if(rFil.cri&&(' '+r._crit+' ').indexOf(' '+rFil.cri+' ')<0)return false;
  if(rFil.tec&&rv(r,'Técnico')!==rFil.tec)return false;
  if(rFil.ale==='_cualquiera'&&!rEsAlerta(r))return false;
  if(rFil.ale&&rFil.ale!=='_cualquiera'&&!tiene(r,rFil.ale))return false;
  if(q&&(rv(r,'Orden')+' '+rv(r,'NIC')+' '+rv(r,'Técnico')).toLowerCase().indexOf(q)<0)return false;
  return true})}
function rTabFiltro(B){var f=rK(rFil.k)||rK('todas');return B.filter(function(r){
 if(!f[3](r))return false;if(rFil.res&&rv(r,'Resultado')!==rFil.res)return false;if(rFil.pro&&rv(r,'Proceso')!==rFil.pro)return false;return true})}
var R_COL={'CUMPLE':'var(--ok)','REVISAR':'var(--wn)','NO CUMPLE':'var(--er)','LIBERADA':'var(--pu)'};
function opciones(){
 var d=diasRef(),cnt=function(fn){return RS.A.filter(fn).length};
 [].forEach.call($('rDia').children,function(b){var k=b.getAttribute('data-d');b.classList.toggle('on',k===rFil.dia);
  b.title=k==='hoy'?(d.hoy?'Hoy ('+cnt(function(r){return r._fk===d.hoy})+' órdenes)':''):k==='ayer'?(d.ayer?d.ayer.slice(6)+'/'+d.ayer.slice(4,6)+'/'+d.ayer.slice(0,4)+' ('+cnt(function(r){return r._fk===d.ayer})+' órdenes)':'Sin órdenes de ayer'):'Todos los días'});
 var DA=rDiaFil(),cnt2=function(fn){return DA.filter(fn).length};
 var cs={};DA.forEach(function(r){r._crit.split(' ').forEach(function(c){if(c)cs[c]=(cs[c]||0)+1})});
 var txt={};RS.crit.forEach(function(x){txt[x.c]=x.t});
 if(rFil.cri&&!cs[rFil.cri])cs[rFil.cri]=0;
 $('rSCri').innerHTML='<option value="">Todos</option>'+Object.keys(cs).sort().map(function(c){return'<option value="'+c+'"'+(rFil.cri===c?' selected':'')+'>'+c+(txt[c]?' · '+esc(txt[c].slice(0,48)):'')+' ('+cs[c]+')</option>'}).join('');
 var ts={};DA.forEach(function(r){var t=rv(r,'Técnico');if(t)ts[t]=(ts[t]||0)+1});
 if(rFil.tec&&!ts[rFil.tec])ts[rFil.tec]=0;
 $('rSTec').innerHTML='<option value="">Todos</option>'+Object.keys(ts).sort().map(function(t){return'<option value="'+esc(t)+'"'+(rFil.tec===t?' selected':'')+'>'+esc(t)+' ('+ts[t]+')</option>'}).join('');
 $('rSAle').innerHTML=ALE.map(function(a){var n=a[0]===''?'':' ('+(a[0]==='_cualquiera'?cnt2(rEsAlerta):cnt2(function(r){return tiene(r,a[0])}))+')';return'<option value="'+esc(a[0])+'"'+(rFil.ale===a[0]?' selected':'')+'>'+esc(a[1])+n+'</option>'}).join('')}
function rPintar(){
 var hay=RS.A.length>0;$('rVac').hidden=hay;$('rDash').hidden=!hay;$('rF').hidden=!hay;if(!hay)return;
 opciones();
 var A=rBase(),N=A.length;
 $('rK').innerHTML=R_KS.map(function(x){var n=A.filter(x[3]).length;
  return'<button type="button" class="k '+x[2]+(rFil.k===x[0]?' on':'')+'" data-k="'+x[0]+'"><small>'+esc(x[1])+'</small><b>'+rNum(n)+'</b><i>'+(x[0]==='todas'?(N===RS.A.length?esc(RS.archivo):'de '+rNum(RS.A.length)+' con los filtros'):rPct(n,N)+' de las órdenes')+'</i></button>'}).join('');
 var cats=['CUMPLE','REVISAR','NO CUMPLE','LIBERADA'],cnt={};cats.forEach(function(c){cnt[c]=A.filter(function(r){return rv(r,'Resultado')===c}).length});
 var R=52,C=2*Math.PI*R,acc=0,arcs='';
 cats.forEach(function(c){var n=cnt[c];if(!n||!N)return;var l=C*n/N;arcs+='<circle r="'+R+'" cx="65" cy="65" fill="none" stroke="'+R_COL[c]+'" stroke-width="18" stroke-dasharray="'+l+' '+(C-l)+'" stroke-dashoffset="'+(-acc)+'" transform="rotate(-90 65 65)" data-r="'+c+'" style="cursor:pointer"><title>'+c+': '+n+'</title></circle>';acc+=l});
 $('rDon').innerHTML='<svg width="130" height="130" viewBox="0 0 130 130" role="img" aria-label="Resultado de las órdenes"><circle r="'+R+'" cx="65" cy="65" fill="none" stroke="var(--bg)" stroke-width="18"/>'+arcs+
  '<text x="65" y="62" text-anchor="middle" fill="var(--tx)" font-size="22" font-weight="800">'+rPct(cnt['CUMPLE'],N)+'</text><text x="65" y="80" text-anchor="middle" fill="var(--mu)" font-size="10">cumple</text></svg>'+
  '<div class="lg">'+cats.filter(function(c){return cnt[c]}).map(function(c){return'<span data-r="'+c+'"'+(rFil.res===c?' style="color:var(--ac)"':'')+'><i style="background:'+R_COL[c]+'"></i>'+c+' <b>'+rNum(cnt[c])+'</b></span>'}).join('')+'</div>';
 var T={};A.forEach(function(r){var t=rv(r,'Técnico')||'(sin técnico)';if(!T[t])T[t]={c:0,w:0,e:0,n:0};T[t].n++;var s=rv(r,'Resultado');if(s==='CUMPLE')T[t].c++;else if(s==='REVISAR')T[t].w++;else if(s==='NO CUMPLE')T[t].e++});
 var tl=Object.keys(T).sort(function(a,b){return T[b].e-T[a].e||T[b].w-T[a].w||T[b].n-T[a].n});
 var mx=Math.max.apply(null,tl.map(function(t){return T[t].n}).concat([1]));
 $('rTec').innerHTML=tl.map(function(t){var x=T[t],w=function(n){return(n*100/mx)+'%'};
  return'<div class="br'+(rFil.tec===t?' on':'')+'" data-t="'+esc(t)+'" title="'+esc(t)+': '+x.e+' no cumple, '+x.w+' revisar, '+x.c+' cumple"><span>'+esc(t)+'</span><div><i style="width:'+w(x.e)+';background:var(--er)"></i><i style="width:'+w(x.w)+';background:var(--wn)"></i><i style="width:'+w(x.c)+';background:var(--ok)"></i></div><b>'+x.e+'</b></div>'}).join('')||'<p class="mu">Sin órdenes.</p>';
 var cc={};A.forEach(function(r){r._crit.split(' ').forEach(function(c){if(c)cc[c]=(cc[c]||0)+1})});
 var txt={};RS.crit.forEach(function(x){txt[x.c]=x.t});
 var cr=Object.keys(cc).sort(function(a,b){return cc[b]-cc[a]}),cm=Math.max.apply(null,cr.map(function(c){return cc[c]}).concat([1]));
 $('rCri').innerHTML=cr.length?cr.map(function(c){var col=c[0]==='C'||c[0]==='T'?'var(--er)':'var(--wn)';
  return'<div class="br'+(rFil.cri===c?' on':'')+'" data-c="'+c+'" title="'+esc(txt[c]||c)+'"><span><b style="color:'+col+'">'+c+'</b> '+esc(txt[c]||'')+'</span><div><i style="width:'+(cc[c]*100/cm)+'%;background:'+col+'"></i></div><b>'+cc[c]+'</b></div>'}).join(''):'<p class="mu">Sin incumplimientos por criterio.</p>';
 var P={};A.forEach(function(r){var p=rv(r,'Proceso')||'—';if(!P[p])P[p]={n:0};P[p].n++;var s=rv(r,'Resultado');P[p][s]=(P[p][s]||0)+1;if(rv(r,'Cobro mal'))P[p].cm=(P[p].cm||0)+1});
 $('rPro').innerHTML='<div class="pr">'+Object.keys(P).sort().map(function(p){var x=P[p];
  return'<div data-p="'+esc(p)+'" style="cursor:pointer'+(rFil.pro===p?';color:var(--ac)':'')+'"><div class="row"><b>'+esc(p==='CAMPANA'?'CAMPAÑA':p)+'</b><span>'+rNum(x.n)+' órdenes · <span style="color:var(--er)">'+(x.cm||0)+' cobro mal</span></span></div><div class="stk">'+
   cats.map(function(c){return x[c]?'<i style="width:'+(x[c]*100/x.n)+'%;background:'+R_COL[c]+'" title="'+c+': '+x[c]+'"></i>':''}).join('')+'</div><div class="row mu" style="margin-top:3px"><span>'+rPct(x['CUMPLE']||0,x.n)+' cumple</span><span>'+(x['NO CUMPLE']||0)+' no cumple · '+(x['REVISAR']||0)+' revisar</span></div></div>'}).join('')+'</div>';
 rTabla();cfPintar()}
function estDe(r){var o=rv(r,'Orden'),e=window.kEstado?window.kEstado(o):'';if(!e&&pyLib(r))e='LIBERADA';return e}
function pyLib(r){return rv(r,'Resultado')==='LIBERADA'||rv(r,'IRREGULARIDAD')==='LIBERADA'||/LIBERAD/i.test(rv(r,'Estado orden'))}
function valor(r,c){
 if(c==='_est')return estDe(r);
 if(c==='Hora')return rv(r,'Hora');
 if(c==='Fecha')return r._fk;
 if(c==='Orden'||c==='NIC'){var n=parseFloat(rv(r,c));return isNaN(n)?rv(r,c):n}
 return rv(r,c)}
function cfVal(r,k){if(k==='_est')return[estDe(r)];if(k==='_pdf')return[PDFS[rv(r,'Orden')]?'CON PDF':'SIN PDF'];if(k==='_alertas')return r._tags.map(function(t){return t[1]});if(k==='_crit')return r._crit.split(' ').filter(Boolean);return[rv(r,k)]}
function cfPasa(r,salta){for(var k in CF){var f=CF[k];if(!f||k===salta)continue;var vs=cfVal(r,k);
  if(f.t==='s'){if(f.v==='(vacío)'?vs.some(function(x){return x}):vs.indexOf(f.v)<0)return false}
  else{var q=f.v.toLowerCase();if(!vs.some(function(x){return x.toLowerCase().indexOf(q)>=0}))return false}}return true}
var CF_TXT={'Hora':1,'Orden':1,'NIC':1,'TIPO DE IRRE':1,'OBSERVACION IRREGULARIDAD':1,'NOVEDAD IRREGULARIDAD':1,'Mano de obra cobrada mal':1,'Materiales cobrados mal':1,'Detalle':1};
function cfPintar(){
 var BASE=rTabFiltro(rBase());
 $('rTf').innerHTML=COLS.map(function(c){var k=c[0];
  var actual=CF[k];
  if(CF_TXT[k])return'<th><input type="search" data-f="'+esc(k)+'" placeholder="Filtrar" aria-label="Filtrar '+esc(c[4]||c[1])+'" value="'+esc(actual?actual.v:'')+'"></th>';
  var cnt={},vacio=0;BASE.filter(function(r){return cfPasa(r,k)}).forEach(function(r){var vs=cfVal(r,k);if(!vs.length||!vs.some(function(x){return x}))vacio++;vs.forEach(function(x){if(x)cnt[x]=(cnt[x]||0)+1})});
  if(actual&&actual.t==='s'&&actual.v!=='(vacío)'&&!cnt[actual.v])cnt[actual.v]=0;
  var ks=Object.keys(cnt).sort(function(a,b){return a.localeCompare(b,'es',{numeric:true})});
  if(ks.length>60)return'<th><input type="search" data-f="'+esc(k)+'" placeholder="Filtrar" aria-label="Filtrar '+esc(c[4]||c[1])+'" value="'+esc(actual?actual.v:'')+'"></th>';
  return'<th><select data-f="'+esc(k)+'" aria-label="Filtrar '+esc(c[4]||c[1])+'"'+(actual?' class="on"':'')+'><option value="">'+(c[3]<4?'▾':'Todos')+'</option>'+ks.map(function(x){return'<option value="'+esc(x)+'"'+(actual&&actual.v===x?' selected':'')+'>'+esc(x)+' ('+cnt[x]+')</option>'}).join('')+(vacio?'<option value="(vacío)"'+(actual&&actual.v==='(vacío)'?' selected':'')+'>(vacío) ('+vacio+')</option>':'')+'</select></th>'}).join('');
 setTimeout(cfTop,0)}
function cfTop(){var h=$('rTh').offsetHeight;if(!h)return;[].forEach.call($('rTf').children,function(th){th.style.top=(h-1)+'px'})}
if(window.ResizeObserver){try{new ResizeObserver(function(){cfTop()}).observe($('rTh'))}catch(e){}}
function rTabla(){
 var l=rTabFiltro(rBase()).filter(function(r){return cfPasa(r)}),f=rK(rFil.k);
 var ex=[rFil.res,rFil.pro&&(rFil.pro==='CAMPANA'?'CAMPAÑA':rFil.pro)].filter(Boolean);
 $('rTt').textContent=(f&&f[0]!=='todas'?f[1]:'Órdenes')+(ex.length?' · '+ex.join(' · '):'')+' ('+rNum(l.length)+')';
 $('rLim').hidden=!(rFil.res||rFil.pro||rFil.k!=='todas'||rFil.dia||rFil.cri||rFil.tec||rFil.ale||$('rQ').value||Object.keys(CF).some(function(k){return CF[k]}));
 if(rOrd.c){var c=rOrd.c,d=rOrd.d;l=l.slice().sort(function(a,b){var x=valor(a,c),y=valor(b,c);
   if(c==='Fecha'&&x===y){x=rv(a,'Hora');y=rv(b,'Hora')}
   if(typeof x==='number'&&typeof y==='number')return(x-y)*d;return String(x).localeCompare(String(y),'es',{numeric:true})*d})}
 else{var orden={'NO CUMPLE':0,'REVISAR':1,'LIBERADA':2,'CUMPLE':3};
  l=l.slice().sort(function(a,b){var oa=orden[rv(a,'Resultado')],ob=orden[rv(b,'Resultado')];return(oa==null?9:oa)-(ob==null?9:ob)||(rv(b,'Cobro mal')?1:0)-(rv(a,'Cobro mal')?1:0)})}
 $('rTh').innerHTML=COLS.map(function(c){var s=c[0]!=='_pdf',on=rOrd.c===c[0];
  return'<th class="'+c[2]+(s?' so':'')+(on?' on':'')+'"'+(s?' data-c="'+esc(c[0])+'" tabindex="0" title="Ordenar por '+esc(c[4]||c[1])+'"':'')+'>'+esc(c[1])+(on?(rOrd.d<0?' ▼':' ▲'):'')+'</th>'}).join('');
 $('rTb').innerHTML=l.slice(0,rLimN).map(function(r){var s=rv(r,'Resultado'),o=rv(r,'Orden');
  var es=estDe(r);
  return'<tr data-o="'+esc(o)+'"'+(/^LIBERADA/.test(es)||pyLib(r)||(window.kFueLib&&window.kFueLib(o))?' class="lib"':'')+' tabindex="0">'+COLS.map(function(c){var k=c[0],v;
   if(k==='_est')return'<td class="est">'+(es?'<span class="pl '+(es==='AUDITADA'?'OK':es==='EN REVISIÓN'?'A':/^LIBERADA/.test(es)?'B':'P')+'">'+esc(es)+'</span>':'')+'</td>';
   if(k==='_pdf'){var u=PDFS[o];return'<td class="pdf">'+(u?'<a class="pdfb" href="'+esc(u)+'" target="_blank" rel="noopener" title="Abrir el acta '+esc(o)+'.pdf en Drive (desde ahí se descarga)">PDF</a>':'<span class="pdfb no" title="'+(pdfBusy?'Buscando las actas en Drive…':'No hay acta de esta orden en VOF CAMP/ORDENES')+'">PDF</span>')+'</td>'}
   if(k==='_alertas')return'<td'+(r._tags.length?' data-tip="'+esc(r._tags.map(function(t){return t[1]}).join(' | '))+'"':'')+'>'+r._tags.map(function(t){return'<span class="tg '+t[0]+'">'+t[1]+'</span>'}).join('')+'</td>';
   if(k==='_crit')return'<td'+(r._crit?' data-tip="'+esc(r._crit.split(' ').map(function(c){var t=(RS.crit.filter(function(x){return x.c===c})[0]||{}).t;return c+(t?' — '+t:'')}).join(' | '))+'"':'')+'>'+r._crit.split(' ').filter(Boolean).map(function(x){return'<span class="tg '+(x[0]==='C'||x[0]==='T'?'er':'wn')+'">'+x+'</span>'}).join('')+'</td>';
   v=rv(r,k);
   if(k==='Resultado'){var cls=v==='NO CUMPLE'?'F':v==='REVISAR'?'A':v==='LIBERADA'?'L':'OK';return'<td><span class="pl '+cls+'">'+esc(v)+'</span></td>'}
   if(k==='Proceso')v=v==='CAMPANA'?'CAMPAÑA':v;
   var CORTO={'CONFORME':'C','NO CONFORME':'NC','NO APLICA':'NA','NO REGISTRA':'NR','REGISTRA':'R','COBRO MAL':'SÍ','SI':'SÍ'};
   if(/CONEX|PUENTES|CONTINUIDAD|DISPLAY|INTEGRADOR|GIRO|ROZAMIENTO|FRENA|Cobro mal/.test(k)&&CORTO[v])return'<td class="cc'+(v==='NO CONFORME'||v==='COBRO MAL'||v==='NO REGISTRA'?' rr':'')+'" data-tip="'+esc(v)+'">'+CORTO[v]+'</td>';
   if(k==='Orden')return'<td class="st3 nw"><b>'+esc(v)+'</b></td>';
   if(v.length>14)return'<td'+(c[2]?' class="'+c[2]+'"':'')+' data-tip="'+esc(v)+'"><div class="cl">'+esc(v)+'</div></td>';
   var col=/^(NO CONFORME|NO|SÍ|SI|VALIDAR|COBRO MAL)$/.test(v)&&/CONEX|PUENTES|CONTINUIDAD|DISPLAY|INTEGRADOR|PARE|LO SUBI|Cobro mal/.test(k)?(v==='NO CONFORME'||v==='COBRO MAL'||(k==='APLICA PARE'&&/^S/.test(v))||(k==='LO SUBIÓ AL APLICATIVO'&&v==='NO')?' class="rr"':v==='VALIDAR'?' class="ra"':''):'';
   return'<td'+(c[2]&&c[2]!=='pdf'?' class="'+c[2]+'"':'')+col+'>'+esc(v)+'</td>'}).join('')+'</tr>'}).join('')||'<tr><td colspan="'+COLS.length+'" class="mu">No hay órdenes con estos filtros.</td></tr>';
 $('rMas').hidden=l.length<=rLimN;
 setTimeout(rAlto,0);
 $('rPg').textContent=l.length>rLimN?'Mostrando '+rLimN+' de '+rNum(l.length)+'.':rNum(l.length)+' órdenes.'}
function rAlto(){
 var el=$('rDash');if(!el||el.hidden||$('tRes').hidden)return;
 if(window.innerWidth<=1100){el.style.height='';return}
 var top=el.getBoundingClientRect().top+(window.scrollY||0);
 el.style.height=Math.max(300,window.innerHeight-top-12)+'px'}
window.addEventListener('resize',function(){clearTimeout(rAlto.t);rAlto.t=setTimeout(rAlto,120)});
function rPonDatos(d,archivo,fecha){RS.TEC={};RS.TOT={};d.A.forEach(function(r){var o=rv(r,'Orden'),t=rv(r,'Técnico');if(o&&t){RS.TEC[o]=t;RS.TOT[t]=(RS.TOT[t]||0)+1}});setTimeout(function(){if(window.hRepintar)window.hRepintar();if(window.kDatos)window.kDatos()},0);RS.A=d.A;RS.crit=d.crit;RS.archivo=archivo;RS.fecha=fecha;rLimN=200;rPintar();rEstado()}
function rEstado(){
 if(!RS.archivo)return;
 $('rArch').textContent=RS.archivo;
 var f=RS.fecha?RS.fecha.toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
 $('rInfo').textContent=(f?'Guardado por el script: '+f.replace(/\.$/,'')+'. ':'')+(X.mcp()?'Se actualiza solo cada 2 minutos desde Drive.':'Cargado desde el computador.');
 $('rDot').classList.toggle('vivo',!!X.mcp())}
/* actas PDF de VOF CAMP/ORDENES: se listan una vez y se refrescan cuando cambia el resultado */
async function rPdfs(){
 if(!X.mcp()||pdfBusy||!DR.ord)return;pdfBusy=true;
 try{var l=await drLista(DR.ord),m={};
  l.forEach(function(f){var x=/\.pdf$/i.test(f.title||'')&&f.title.match(/(\d{6,})/);if(x&&!m[x[1]])m[x[1]]=f.viewUrl||('https://drive.google.com/file/d/'+f.id+'/view')});
  PDFS=m}catch(e){}
 pdfBusy=false;if(RS.A.length)rTabla()}
async function rDrive(manual){
 if(!X.mcp()||rBusy)return;rBusy=true;$('rAct').disabled=true;
 try{
  var xl=(await drLista(DR.res)).filter(function(f){return /^resultado.*\.xlsx$/i.test(f.title||'')}).sort(function(a,b){return String(b.modifiedTime).localeCompare(String(a.modifiedTime))});
  if(!xl.length)throw new Error('vacio');
  var f=xl[0];
  if(manual||f.id!==RS.id||String(f.modifiedTime)!==RS.mod||!RS.A.length){
   if(!RS.A.length)$('rInfo').textContent='Descargando '+f.title+' de Drive…';
   var d=rLeer(await drBytes(f.id,[80,75]));
   var nuevo=RS.A.length&&(f.id!==RS.id||String(f.modifiedTime)!==RS.mod);
   RS.id=f.id;RS.mod=String(f.modifiedTime);rPonDatos(d,f.title,new Date(f.modifiedTime));
   if(nuevo||manual)toast(nuevo?'Resultado actualizado: '+f.title:'Cuadro al día');
   if(pdfMod!==RS.mod||manual){pdfMod=RS.mod;rPdfs()}
  }else rEstado();
 }catch(e){$('rInfo').textContent='Drive: '+drMsg(e)+'. Se vuelve a intentar en 2 minutos.';if(manual)toast('Drive: '+drMsg(e),true)}
 rBusy=false;$('rAct').disabled=false}
function rIniciar(){
 if(!X.mcp()){$('rInfo').textContent='Google Drive no está conectado: abre el Excel de resultado desde el computador.';return}
 rDrive(false);clearInterval(rTimer);
 rTimer=setInterval(function(){if(!document.hidden)rDrive(false)},120000);
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&X.mcp())rDrive(false)})}
async function rArchivo(file){
 try{var d=rLeer(new Uint8Array(await file.arrayBuffer()));RS.id='';RS.mod='';rPonDatos(d,file.name,new Date(file.lastModified));$('rInfo').textContent='Cargado desde el computador ('+file.name+').'+(X.mcp()?' Al cambiar el resultado en Drive se reemplaza solo.':'')}
 catch(e){toast(e&&e.message==='hoja'?'Ese Excel no tiene la hoja Acciones: elige un resultado_AAAA-MM-DD.xlsx':'No pude leer ese Excel.',true)}}
/* ---------- cuadro flotante con el texto completo ---------- */
var tip=document.createElement('div');tip.id='rTip';tip.setAttribute('role','tooltip');document.body.appendChild(tip);
function tipPon(td,e){
 var v=td.getAttribute('data-tip');if(!v){tip.classList.remove('on');return}
 var tr=td.closest('tr'),i=[].indexOf.call(tr.children,td),col=COLS[i]||[],o=tr.getAttribute('data-o');
 var partes=v.split(/\s*\|\s*|\n+/).filter(Boolean);
 tip.innerHTML='<div class="th"><b>'+esc(col[4]||col[1]||'')+'</b><span>Orden '+esc(o)+'</span></div>'+
  (partes.length>1?'<ul>'+partes.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>':'<p>'+esc(v)+'</p>');
 tip.classList.add('on');tipMov(e)}
function tipMov(e){var w=tip.offsetWidth,h=tip.offsetHeight,x=e.clientX+16,y=e.clientY+16;
 if(x+w>innerWidth-8)x=Math.max(8,e.clientX-w-16);if(y+h>innerHeight-8)y=Math.max(8,e.clientY-h-16);
 tip.style.left=x+'px';tip.style.top=y+'px'}
$('rTb').addEventListener('mouseover',function(e){var td=e.target.closest('td[data-tip]');if(td)tipPon(td,e);else tip.classList.remove('on')});
$('rTb').addEventListener('mousemove',function(e){if(tip.classList.contains('on'))tipMov(e)});
$('rTb').addEventListener('mouseleave',function(){tip.classList.remove('on')});
$('rTw').addEventListener('scroll',function(){tip.classList.remove('on')});
/* ---------- ocultar / mostrar cuadros ---------- */
function rColapso(on){$('tRes').classList.toggle('rcol',on);$('rCol').textContent=on?'▼ Mostrar cuadros':'▲ Ocultar cuadros';$('rCol').setAttribute('aria-expanded',on?'false':'true');try{localStorage.setItem('vof_ordenes_rcol',on?'1':'0')}catch(e){}}
try{rColapso(localStorage.getItem('vof_ordenes_rcol')==='1')}catch(e){}
$('rCol').onclick=function(){rColapso(!$('tRes').classList.contains('rcol'));rAlto()};
/* ---------- eventos ---------- */
$('rAct').onclick=function(){if(X.mcp())rDrive(true);else $('rFi').click()};
$('rAbr').onclick=function(){$('rFi').click()};
$('rFi').onchange=function(){if(this.files[0])rArchivo(this.files[0]);this.value=''};
$('rK').onclick=function(e){var b=e.target.closest('[data-k]');if(!b)return;var k=b.getAttribute('data-k');rFil.k=rFil.k===k?'todas':k;rLimN=200;rPintar()};
$('rDon').onclick=function(e){var b=e.target.closest('[data-r]');if(!b)return;var r=b.getAttribute('data-r');rFil.res=rFil.res===r?'':r;rPintar()};
$('rTec').onclick=function(e){var b=e.target.closest('[data-t]');if(!b)return;var t=b.getAttribute('data-t');rFil.tec=rFil.tec===t?'':t;rPintar()};
$('rCri').onclick=function(e){var b=e.target.closest('[data-c]');if(!b)return;var c=b.getAttribute('data-c');rFil.cri=rFil.cri===c?'':c;rPintar()};
$('rPro').onclick=function(e){var b=e.target.closest('[data-p]');if(!b)return;var p=b.getAttribute('data-p');rFil.pro=rFil.pro===p?'':p;rPintar()};
$('rDia').onclick=function(e){var b=e.target.closest('[data-d]');if(!b)return;rFil.dia=b.getAttribute('data-d');if(rFil.dia){$('rDes').value='';$('rHas').value=''}rLimN=200;rPintar()};
$('rDes').onchange=$('rHas').onchange=function(){rFil.dia='';rLimN=200;rPintar()};
$('rSCri').onchange=function(){rFil.cri=this.value;rLimN=200;rPintar()};
$('rSTec').onchange=function(){rFil.tec=this.value;rLimN=200;rPintar()};
$('rSAle').onchange=function(){rFil.ale=this.value;rLimN=200;rPintar()};
$('rLim').onclick=function(){$('rDes').value='';$('rHas').value='';rFil={k:'todas',tec:'',res:'',pro:'',dia:'',cri:'',ale:''};CF={};$('rQ').value='';rLimN=200;rPintar()};
$('rTf').addEventListener('change',function(e){var x=e.target.closest('select[data-f]');if(!x)return;var k=x.getAttribute('data-f');CF[k]=x.value?{t:'s',v:x.value}:null;x.classList.toggle('on',!!x.value);rLimN=200;rTabla();cfPintar()});
var cfq;$('rTf').addEventListener('input',function(e){var x=e.target.closest('input[data-f]');if(!x)return;var k=x.getAttribute('data-f');CF[k]=x.value.trim()?{t:'t',v:x.value.trim()}:null;clearTimeout(cfq);cfq=setTimeout(function(){rLimN=200;rTabla()},200)});
window.addEventListener('resize',function(){setTimeout(cfTop,150)});
$('rMas').onclick=function(){rLimN+=300;rTabla()};
var rtq;$('rQ').oninput=function(){clearTimeout(rtq);rtq=setTimeout(function(){rLimN=200;rPintar()},200)};
function ordenar(c){if(!c)return;if(rOrd.c===c)rOrd.d=-rOrd.d;else{rOrd.c=c;rOrd.d=-1}rTabla()}
$('rTh').onclick=function(e){var t=e.target.closest('th[data-c]');if(t)ordenar(t.getAttribute('data-c'))};
$('rTh').onkeydown=function(e){if(e.key==='Enter'){var t=e.target.closest('th[data-c]');if(t)ordenar(t.getAttribute('data-c'))}};
function rAbrir(o){if(!o)return;ir('chk');if(window.kAbrir)window.kAbrir(o)}
$('rTb').onclick=function(e){if(e.target.closest('a'))return;var t=e.target.closest('tr[data-o]');if(t&&e.target.closest('td.st3'))rAbrir(t.getAttribute('data-o'))};
$('rTb').onkeydown=function(e){if(e.key==='Enter'&&!e.target.closest('a')){var t=e.target.closest('tr[data-o]');if(t)rAbrir(t.getAttribute('data-o'))}};
document.addEventListener('drop',function(ev){if(X.tab()!=='res')return;var f=[].filter.call(ev.dataTransfer.files||[],function(x){return /\.xlsx$/i.test(x.name)})[0];if(f){ev.stopImmediatePropagation();rArchivo(f)}},true);

window.rPintar=function(){rPintar();setTimeout(rAlto,30)};window.rIniciar=rIniciar;window.rFilas=function(){return RS.A||[]};window.rTecDe=function(o){return RS.TEC&&RS.TEC[o]||''};window.rTotTec=function(){return RS.TOT||{}};window.rRefrescar=function(){if(RS.A.length&&!$('tRes').hidden){cfPintar();rTabla()}};window.rTiene=function(){return RS.A.length>0};
if(X.listo)rIniciar();
setTimeout(function(){if(!X.listo&&!RS.A.length)$('rInfo').textContent='Google Drive no está conectado en esta vista: abre el Excel de resultado desde el computador.'},10000);
})();
