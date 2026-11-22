/* VOF Órdenes – pestaña VIDEOS: consolidado VOF CAMP/VIDEOS/videos_consolidado.xlsx (nunca se borra; el script lo actualiza) */
(function(){
var X=window.VOFX;if(!X)return;
var $=X.$,esc=X.esc,toast=X.toast,drMsg=X.drMsg,drBytes=X.drBytes,DR=X.DR;
var COLS=[['Fecha','Fecha',5],['Hora','Hora',4],['Orden','Orden',5],['NIC','NIC',4.2],['Técnico','Técnico',8],['Proceso','Proceso',4.6],['Tipo Orden','Tipo orden',3.8],
 ['IRREGULARIDAD','Irregularidad',11],['TIPO DE IRRE','Tipo de irre',13],['_nov','Novedad',5.4],['LO SUBIÓ AL APLICATIVO','Subió video',3.8],['Archivos en el panel','Archivos',3.4],
 ['Video encontrado el','Video encontrado',5],['Primera vez en el resultado','Primera vez',5],['Última revisión','Última revisión',5]];
var NOVS=[['NO TIENE','No tiene','er'],['PENDIENTE','Pendiente','wn'],['SUBIDO','Subido','ok']];
var NV={};try{NV=JSON.parse(localStorage.getItem('vof_videos_nov')||'{}')||{}}catch(e){NV={}}
function nvSave(){try{localStorage.setItem('vof_videos_nov',JSON.stringify(NV))}catch(e){}}
async function nvCargar(){var db=X.db&&X.db();if(!db)return;
 try{var r=await Promise.race([db.collection('vnov').get(),new Promise(function(ok){setTimeout(function(){ok(null)},10000)})]);if(!r)return;
  r.docs.forEach(function(d){var x=d.data()||{};if(!NV[d.id]||(x.t||0)>=(NV[d.id].t||0))NV[d.id]={v:String(x.v||''),t:+x.t||0}});nvSave();pintar()}catch(e){}}
function nvPon(o,v){var x={v:v,t:Date.now()};NV[o]=x;nvSave();var db=X.db&&X.db();
 if(db){try{db.doc('vnov/'+o).set(x).then(null,function(){toast('No se pudo guardar la novedad en la página; quedó en este navegador.',true)})}catch(e){}}}
var ANCHO=COLS.reduce(function(a,c){return a+c[2]},0);
var sec=document.createElement('section');sec.id='tVid';sec.hidden=true;
var ref=$('tCri')||$('tHis');ref.parentNode.insertBefore(sec,ref);
sec.innerHTML=
 '<div class="vhd"><span class="dot" id="vDot"></span><b>Videos de anomalías</b><span class="mu" id="vInfo">Buscando el consolidado en VOF CAMP/VIDEOS…</span><span style="flex:1"></span>'+
 '<button class="b s" id="vAct" type="button">Actualizar</button><button class="b s" id="vAbr" type="button">Abrir Excel del computador</button><input type="file" id="vFi" accept=".xlsx" hidden></div>'+
 '<div class="vf"><div class="vseg" id="vPer" role="group" aria-label="Periodo"><button type="button" data-p="gen" class="on">General</button><button type="button" data-p="hoy">Hoy</button><button type="button" data-p="ayer">Ayer</button><button type="button" data-p="dia">Día</button><button type="button" data-p="mes">Mes</button></div>'+
  '<input type="date" id="vDia" aria-label="Día" hidden><select id="vMes" aria-label="Mes" hidden></select>'+
  '<div class="vseg" id="vEst" role="group" aria-label="Estado"><button type="button" data-e="" class="on">Todas</button><button type="button" data-e="NO">Sin video</button><button type="button" data-e="SÍ">Con video</button><button type="button" data-e="SIN REVISAR">Sin revisar</button></div>'+
  '<label>Novedad <select id="vNov"><option value="">Todas</option><option value="NO TIENE">No tiene</option><option value="PENDIENTE">Pendiente</option><option value="SUBIDO">Subido</option><option value="-">Sin marcar</option></select></label><label>Técnico <select id="vTec"></select></label><input type="search" id="vQ" placeholder="Buscar orden, NIC, técnico o anomalía" aria-label="Buscar en videos">'+
  '<button class="b s" id="vLim" type="button" hidden>Quitar filtros</button></div>'+
 '<div class="rvac" id="vVac"><div><p style="font-size:18px;margin:0 0 6px"><b>Aún no hay consolidado de videos</b></p><p class="mu" style="margin:0">El script lo crea en <b>G:\\Mi unidad\\VOF CAMP\\VIDEOS\\videos_consolidado.xlsx</b> en el paso 5 (o con REVISAR_VIDEOS.bat).<br>Guarda todas las órdenes que piden video y en cada corrida vuelve a buscar las que no lo tenían.</p></div></div>'+
 '<div class="vdash" id="vDash" hidden><div class="vk" id="vK"></div>'+
  '<div class="vg"><div class="card"><h3>Sin video por técnico</h3><div class="cb" id="vTecG"></div></div><div class="card"><h3>Por día</h3><div class="cb" id="vDiaG"></div></div></div>'+
  '<div class="card vt"><div class="tb"><h3 style="margin:0" id="vTt">Órdenes</h3><span style="flex:1"></span><span class="mu" style="font-size:11px">Clic en un título para ordenar</span></div>'+
  '<div class="cb" id="vTw"><table><colgroup>'+COLS.map(function(c){return'<col style="width:'+(c[2]*100/ANCHO).toFixed(2)+'%">'}).join('')+'</colgroup><thead><tr id="vTh"></tr></thead><tbody id="vTb"></tbody></table>'+
  '<p class="mu" id="vPg" style="margin:8px 0 0;font-size:11px"></p><button class="b s" id="vMas" type="button" hidden>Mostrar más</button></div></div></div>';

var V={A:[],id:'',mod:'',fecha:null},F={p:'gen',dia:'',mes:'',e:'',tec:'',q:'',nov:''},O={c:'Fecha',d:-1},lim=300,busy=false,timer=null,fileId='';
function rv(r,k){var v=r[k];return v==null?'':String(v).trim()}
function fk(f){var m=String(f).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2):''}
function dk(d){return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)}
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function mesTxt(k){return MESES[+k.slice(4,6)-1]+' '+k.slice(0,4)}
function est(r){var v=rv(r,'LO SUBIÓ AL APLICATIVO').toUpperCase();return v==='SÍ'||v==='SI'?'SÍ':v==='NO'?'NO':'SIN REVISAR'}
function leer(bytes){
 var wb=XLSX.read(bytes,{type:'array'}),ws=wb.Sheets['Videos']||wb.Sheets[wb.SheetNames[0]];
 var A=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false}).filter(function(r){return /\d{6,}/.test(rv(r,'Orden'))});
 A.forEach(function(r){r._k=fk(rv(r,'Fecha'));r._e=est(r);r._t=(rv(r,'Orden')+' '+rv(r,'NIC')+' '+rv(r,'Técnico')+' '+rv(r,'IRREGULARIDAD')+' '+rv(r,'TIPO DE IRRE')).toLowerCase()});
 return A}
function poner(A,nombre,fecha){
 V.A=A;V.fecha=fecha;
 var ms={};A.forEach(function(r){if(r._k)ms[r._k.slice(0,6)]=1});
 var mk=Object.keys(ms).sort().reverse();if(!F.mes||!ms[F.mes])F.mes=mk[0]||'';
 $('vMes').innerHTML=mk.map(function(k){return'<option value="'+k+'"'+(k===F.mes?' selected':'')+'>'+mesTxt(k)+'</option>'}).join('');
 var ts={};A.forEach(function(r){var t=rv(r,'Técnico');if(t)ts[t]=1});
 $('vTec').innerHTML='<option value="">Todos</option>'+Object.keys(ts).sort().map(function(t){return'<option'+(t===F.tec?' selected':'')+'>'+esc(t)+'</option>'}).join('');
 $('vVac').hidden=A.length>0;$('vDash').hidden=!A.length;
 info();pintar()}
function info(){
 var f=V.fecha?V.fecha.toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
 $('vInfo').textContent=(V.A.length?V.A.length+' órdenes que piden video. ':'')+(f?'Actualizado por el script: '+f.replace(/\.$/,'')+'. ':'')+(X.mcp()?'Se refresca solo cada 2 minutos desde Drive.':'Cargado desde el computador.');
 $('vDot').classList.toggle('vivo',!!X.mcp())}
function enPer(r){
 if(F.p==='gen')return true;var h=new Date();
 if(F.p==='hoy')return r._k===dk(h);
 if(F.p==='ayer'){h.setDate(h.getDate()-1);return r._k===dk(h)}
 if(F.p==='dia')return !F.dia||r._k===F.dia.replace(/-/g,'');
 if(F.p==='mes')return !F.mes||r._k.slice(0,6)===F.mes;return true}
function base(){var q=F.q.toLowerCase();return V.A.filter(function(r){return enPer(r)&&(!F.tec||rv(r,'Técnico')===F.tec)&&(!q||r._t.indexOf(q)>=0)})}
function pl(e){return'<span class="vpl '+(e==='SÍ'?'ok':e==='NO'?'er':'wn')+'">'+(e==='SÍ'?'SÍ':e==='NO'?'NO':'SIN REVISAR')+'</span>'}
function barras(el,m,max,fn){
 var ks=Object.keys(m).sort(function(a,b){return m[b].n-m[a].n||a.localeCompare(b)});if(fn)ks=fn(ks);
 el.innerHTML=ks.length?ks.map(function(k){var x=m[k];return'<div class="vbr" data-k="'+esc(k)+'" title="'+esc(k)+': '+x.si+' con video, '+x.no+' sin video, '+x.sr+' sin revisar"><span>'+esc(x.l||k)+'</span><div><i style="width:'+(x.si*100/max).toFixed(1)+'%;background:var(--ok)"></i><i style="width:'+(x.no*100/max).toFixed(1)+'%;background:var(--er)"></i><i style="width:'+(x.sr*100/max).toFixed(1)+'%;background:var(--wn)"></i></div><b>'+x.n+'</b></div>'}).join(''):'<p class="mu" style="font-size:12px">Nada en este periodo.</p>'}
function pintar(){
 if(!V.A.length)return;
 var B=base(),si=0,no=0,sr=0;B.forEach(function(r){if(r._e==='SÍ')si++;else if(r._e==='NO')no++;else sr++});
 var tot=B.length,rev=si+no;
 $('vK').innerHTML=[['','Órdenes que piden video',tot,'en el periodo','ac'],['SÍ','Con video',si,tot?Math.round(si*100/tot)+'% del total':'','ok'],['NO','Sin video',no,'el técnico no lo subió','er'],['SIN REVISAR','Sin revisar',sr,'aún no se buscó en el panel','wn'],['','Cumplimiento',rev?Math.round(si*100/rev)+'%':'—','de las revisadas','pu']]
  .map(function(k){return'<button type="button" class="k '+k[4]+(F.e===k[0]&&(k[0]||k[1]==='Órdenes que piden video')?' on':'')+'" data-e="'+k[0]+'"><small>'+k[1]+'</small><b>'+k[2]+'</b><i>'+k[3]+'</i></button>'}).join('');
 var mt={},md={},mx=1,mxd=1;
 B.forEach(function(r){var t=rv(r,'Técnico')||'(sin técnico)',x=mt[t]||(mt[t]={n:0,si:0,no:0,sr:0});var y=md[r._k]||(md[r._k]={n:0,si:0,no:0,sr:0,l:rv(r,'Fecha')});
  [x,y].forEach(function(z){z.n++;if(r._e==='SÍ')z.si++;else if(r._e==='NO')z.no++;else z.sr++});mx=Math.max(mx,x.n);mxd=Math.max(mxd,y.n)});
 Object.keys(mt).forEach(function(k){mt[k].n=mt[k].si+mt[k].no+mt[k].sr});
 barras($('vTecG'),mt,mx,function(ks){return ks.sort(function(a,b){return mt[b].no-mt[a].no||mt[b].n-mt[a].n})});
 barras($('vDiaG'),md,mxd,function(ks){return ks.sort().reverse()});
 var T=B.filter(function(r){var n=(NV[rv(r,'Orden')]||{}).v||'';return(!F.e||r._e===F.e)&&(!F.nov||(F.nov==='-'?!n:n===F.nov))});
 var c=O.c,d=O.d;T.sort(function(a,b){var x,y;if(c==='Fecha'){x=a._k+rv(a,'Hora');y=b._k+rv(b,'Hora')}else if(c==='Archivos en el panel'){x=+rv(a,c)||0;y=+rv(b,c)||0}else if(c==='LO SUBIÓ AL APLICATIVO'){x=a._e;y=b._e}else if(c==='_nov'){x=(NV[rv(a,'Orden')]||{}).v||'~';y=(NV[rv(b,'Orden')]||{}).v||'~'}else{x=rv(a,c).toLowerCase();y=rv(b,c).toLowerCase()}return x<y?-d:x>y?d:0});
 $('vTh').innerHTML=COLS.map(function(k){return'<th data-c="'+esc(k[0])+'" class="'+(k[0]===c?'on':'')+'" title="'+esc(k[0])+'">'+esc(k[1])+(k[0]===c?(d<0?' ▼':' ▲'):'')+'</th>'}).join('');
 $('vTb').innerHTML=T.slice(0,lim).map(function(r){return'<tr class="'+(r._e==='NO'?'no':'')+'">'+COLS.map(function(k){var v=rv(r,k[0]);
  if(k[0]==='LO SUBIÓ AL APLICATIVO')return'<td>'+pl(r._e)+'</td>';
  if(k[0]==='_nov'){var o=rv(r,'Orden'),n=(NV[o]||{}).v||'';return'<td><div class="vnov" role="group" aria-label="Novedad de la orden '+esc(o)+'" data-o="'+esc(o)+'">'+NOVS.map(function(x){return'<button type="button" data-v="'+x[0]+'" class="'+x[2]+(n===x[0]?' on':'')+'" aria-pressed="'+(n===x[0])+'">'+x[1]+'</button>'}).join('')+'</div></td>'}
  if(k[0]==='Orden')return'<td class="o">'+esc(v)+'</td>';
  var m=v.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/);if(m)return'<td class="f">'+esc(m[1])+'<br><span class="mu">'+esc(m[2])+'</span></td>';
  if(k[0]==='Fecha'||k[0]==='Hora'||k[0]==='NIC'||k[0]==='Archivos en el panel')return'<td class="f">'+esc(v)+'</td>';
  return'<td>'+esc(v)+'</td>'}).join('')+'</tr>'}).join('')||'<tr><td colspan="'+COLS.length+'" class="mu" style="text-align:center;padding:18px">No hay órdenes con esos filtros.</td></tr>';
 var pt={gen:'General',hoy:'Hoy',ayer:'Ayer',dia:F.dia?'Día '+F.dia.split('-').reverse().join('/'):'Día',mes:F.mes?'Mes '+mesTxt(F.mes):'Mes'}[F.p];
 $('vTt').textContent='Órdenes · '+pt+(F.e?' · '+(F.e==='SÍ'?'con video':F.e==='NO'?'sin video':'sin revisar'):'')+' ('+T.length+')';
 $('vPg').textContent=T.length>lim?'Mostrando '+lim+' de '+T.length:'';$('vMas').hidden=T.length<=lim;
 $('vLim').hidden=F.p==='gen'&&!F.e&&!F.tec&&!F.q&&!F.nov;
 alto()}
function alto(){var w=$('vTw');if(!w||sec.hidden)return;var t=w.getBoundingClientRect().top;w.style.maxHeight=Math.max(240,innerHeight-t-22)+'px'}
addEventListener('resize',alto);
var DR_VID='1EuXjhfuWCKHaDk1sWxoQWWlHvi5RqyFQ'; /* G:\\Mi unidad\\VOF CAMP\\VIDEOS */
function conTiempo(p,ms){return Promise.race([p,new Promise(function(_,no){setTimeout(function(){no({code:'server_unavailable'})},ms)})])}
async function buscarArchivo(){
 var l=await conTiempo(X.drLista(DR_VID),45000);
 return l.filter(function(f){return /^videos_consolidado\.xlsx$/i.test(f.title||'')}).sort(function(a,b){return String(b.modifiedTime).localeCompare(String(a.modifiedTime))})[0]||null}
async function drive(manual){
 if(!X.mcp()||busy)return;busy=true;$('vAct').disabled=true;
 try{var f=await buscarArchivo();
  if(!f){$('vInfo').textContent='Drive: todavía no está videos_consolidado.xlsx en VOF CAMP/VIDEOS. Se vuelve a buscar en 2 minutos.';$('vVac').hidden=!!V.A.length}
  else if(manual||f.id!==V.id||String(f.modifiedTime)!==V.mod||!V.A.length){
   if(!V.A.length)$('vInfo').textContent='Descargando el consolidado de videos…';
   var nuevo=V.A.length&&String(f.modifiedTime)!==V.mod;
   var A=leer(await conTiempo(drBytes(f.id,[80,75]),60000));V.id=f.id;V.mod=String(f.modifiedTime);poner(A,f.title,new Date(f.modifiedTime));
   if(nuevo||manual)toast(nuevo?'Videos actualizados':'Videos al día')}
  else info()}
 catch(e){$('vInfo').textContent='Drive: '+drMsg(e)+'. Se vuelve a intentar en 2 minutos.';if(manual)toast('Drive: '+drMsg(e),true)}
 busy=false;$('vAct').disabled=false}
var arr=false;
function iniciar(){if(arr)return;arr=true;nvCargar();
 if(!X.mcp()){arr=false;$('vInfo').textContent='Google Drive no está conectado: abre videos_consolidado.xlsx desde el computador.';return}
 drive(false);timer=setInterval(function(){if(!document.hidden)drive(false)},120000)}
/* eventos */
$('vPer').onclick=function(e){var b=e.target.closest('button');if(!b)return;F.p=b.getAttribute('data-p');[].forEach.call(this.children,function(x){x.classList.toggle('on',x===b)});
 $('vDia').hidden=F.p!=='dia';$('vMes').hidden=F.p!=='mes';if(F.p==='dia'&&!F.dia){var h=new Date();F.dia=h.getFullYear()+'-'+('0'+(h.getMonth()+1)).slice(-2)+'-'+('0'+h.getDate()).slice(-2);$('vDia').value=F.dia}lim=300;pintar()};
$('vDia').onchange=function(){F.dia=this.value;pintar()};$('vMes').onchange=function(){F.mes=this.value;pintar()};
function ponEst(v){F.e=v;[].forEach.call($('vEst').children,function(x){x.classList.toggle('on',x.getAttribute('data-e')===v)});lim=300;pintar()}
$('vEst').onclick=function(e){var b=e.target.closest('button');if(b)ponEst(b.getAttribute('data-e'))};
$('vK').onclick=function(e){var b=e.target.closest('button[data-e]');if(b)ponEst(F.e===b.getAttribute('data-e')?'':b.getAttribute('data-e'))};
$('vTec').onchange=function(){F.tec=this.value;pintar()};
$('vNov').onchange=function(){F.nov=this.value;pintar()};
$('vTb').onclick=function(e){var b=e.target.closest('.vnov button');if(!b)return;var g=b.parentNode,o=g.getAttribute('data-o'),v=b.getAttribute('data-v');
 if(((NV[o]||{}).v||'')===v)v='';nvPon(o,v);
 [].forEach.call(g.children,function(x){var on=x.getAttribute('data-v')===v;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
 if(F.nov)pintar()};
$('vTecG').onclick=function(e){var b=e.target.closest('.vbr');if(!b)return;var k=b.getAttribute('data-k');F.tec=F.tec===k?'':k;$('vTec').value=F.tec;pintar()};
$('vDiaG').onclick=function(e){var b=e.target.closest('.vbr');if(!b)return;var k=b.getAttribute('data-k');F.p='dia';F.dia=k.slice(0,4)+'-'+k.slice(4,6)+'-'+k.slice(6,8);$('vDia').value=F.dia;$('vDia').hidden=false;$('vMes').hidden=true;
 [].forEach.call($('vPer').children,function(x){x.classList.toggle('on',x.getAttribute('data-p')==='dia')});pintar()};
var tq;$('vQ').oninput=function(){var v=this.value;clearTimeout(tq);tq=setTimeout(function(){F.q=v.trim();lim=300;pintar()},180)};
$('vTh').onclick=function(e){var t=e.target.closest('th');if(!t)return;var c=t.getAttribute('data-c');if(O.c===c)O.d=-O.d;else{O.c=c;O.d=c==='Fecha'?-1:1}pintar()};
$('vMas').onclick=function(){lim+=300;pintar()};
$('vLim').onclick=function(){F.p='gen';F.tec='';F.q='';F.nov='';$('vNov').value='';$('vQ').value='';$('vTec').value='';$('vDia').hidden=$('vMes').hidden=true;
 [].forEach.call($('vPer').children,function(x){x.classList.toggle('on',x.getAttribute('data-p')==='gen')});ponEst('')};
$('vAct').onclick=function(){if(X.mcp())drive(true);else $('vFi').click()};
$('vAbr').onclick=function(){$('vFi').click()};
$('vFi').onchange=async function(){var f=this.files[0];this.value='';if(!f)return;
 try{poner(leer(new Uint8Array(await f.arrayBuffer())),f.name,new Date(f.lastModified));$('vInfo').textContent='Cargado desde el computador ('+f.name+').'}catch(e){toast('No pude leer ese Excel.',true)}};
window.vMostrar=function(){iniciar();pintar();setTimeout(alto,30)};
})();
