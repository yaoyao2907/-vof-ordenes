/**
 * VOF Órdenes – puente entre la página de GitHub y el Google Drive de Yair.
 * Corre con TU cuenta ("Ejecutar como: yo"), así que los analistas no inician sesión:
 * la página manda la clave del equipo y este script le devuelve los archivos de VOF CAMP.
 *
 * Además:
 *  - guarda lo que el equipo marca en la página (checklist de Validar IA, novedades de videos)
 *    en el archivo "vof_pagina_datos.json" dentro de VOF CAMP, para que todos vean lo mismo;
 *  - llama a la IA (Gemini, OpenRouter, Cloudflare) con las claves guardadas aquí, rotando
 *    sola de clave cuando una se queda sin cupo. Los analistas nunca ven las claves.
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   CLAVE_EQUIPO  la clave que escriben los analistas en la página
 *   CLAVE_ADMIN   tu clave para cambiar las claves de IA desde la página
 */

// Carpetas de VOF CAMP que la página puede leer (las mismas de siempre)
var CARPETAS = {
  '1jU_HN4gxf3tzOAeyxKnxpwQ6xah7T8PF': 'RESULTADO',
  '1Tw3kYQt7lgzFfrJ6d3qnmZXeejOEYRNC': 'ORDENES',
  '19opjY75bx_G5XCfeF72Vyd3dLfKgttIJ': 'CAMBIOS REALIZADOS',
  '1EuXjhfuWCKHaDk1sWxoQWWlHvi5RqyFQ': 'VIDEOS'
};
var ARCHIVO_DATOS = 'vof_pagina_datos.json';

var PROVEEDORES = {
  gemini:     { nombre: 'Google Gemini', modelo: 'gemini-2.5-flash', max: 16 },
  openrouter: { nombre: 'OpenRouter', modelo: 'qwen/qwen2.5-vl-72b-instruct:free', max: 6 },
  cloudflare: { nombre: 'Cloudflare Workers AI', modelo: '@cf/meta/llama-3.2-11b-vision-instruct', max: 1 }
};
var ORDEN_PROV = ['gemini', 'openrouter', 'cloudflare'];

function doGet() {
  return ContentService.createTextOutput('VOF Órdenes: el puente está activo.');
}

function doPost(e) {
  var r;
  try {
    var q = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var clave = props.getProperty('CLAVE_EQUIPO');
    if (!clave) throw new Error('Falta la propiedad CLAVE_EQUIPO en el Apps Script.');
    if (q.clave !== clave) {
      Utilities.sleep(1500);
      return salida({ ok: false, codigo: 'clave', error: 'Clave del equipo incorrecta.' });
    }
    switch (q.accion) {
      case 'ping':     r = { ok: true, ia: resumenClaves() }; break;
      case 'listar':   r = listar(q.carpeta); break;
      case 'bajar':    r = bajar(q.id); break;
      case 'db_get':   r = dbGet(q.ruta); break;
      case 'db_lista': r = dbLista(q.coleccion); break;
      case 'db_set':   r = dbSet(q.ruta, q.datos); break;
      case 'db_del':   r = dbSet(q.ruta, null); break;
      case 'ia':       r = ia(q.texto, q.imagenes || []); break;
      case 'claves_ver':     r = { ok: true, ia: resumenClaves() }; break;
      case 'claves_guardar': r = guardarClaves(q.admin, q.cambios || {}); break;
      default: throw new Error('Acción desconocida: ' + q.accion);
    }
  } catch (err) {
    r = { ok: false, error: String(err && err.message || err) };
  }
  return salida(r);
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Drive ---------------- */
function listar(idCarpeta) {
  if (!CARPETAS[idCarpeta]) throw new Error('Carpeta no permitida.');
  var cache = CacheService.getScriptCache(), k = 'lst_' + idCarpeta;
  var n = cache.get(k + '_n');
  if (n) {                                   // lista guardada hace menos de 1 minuto
    var partes = cache.getAll(Array.apply(null, Array(+n)).map(function (_, i) { return k + '_' + i; }));
    var txt = '', completo = true;
    for (var i = 0; i < +n; i++) { if (partes[k + '_' + i] == null) { completo = false; break; } txt += partes[k + '_' + i]; }
    if (completo) return { ok: true, files: JSON.parse(txt) };
  }
  var it = DriveApp.getFolderById(idCarpeta).getFiles(), l = [];
  while (it.hasNext()) {
    var f = it.next();
    l.push({ id: f.getId(), title: f.getName(), modifiedTime: f.getLastUpdated().toISOString(), fileSize: String(f.getSize()) });
  }
  l.sort(function (a, b) { return a.modifiedTime < b.modifiedTime ? 1 : -1; });
  var s = JSON.stringify(l), trozos = {}, t = 0;
  for (var p = 0; p < s.length; p += 90000) trozos[k + '_' + (t++)] = s.substring(p, p + 90000);
  if (t <= 40) { trozos[k + '_n'] = String(t); cache.putAll(trozos, 60); }
  return { ok: true, files: l };
}

function bajar(id) {
  var f = DriveApp.getFileById(id), ok = false, padres = f.getParents();
  while (padres.hasNext()) { if (CARPETAS[padres.next().getId()]) { ok = true; break; } }
  if (!ok) throw new Error('Ese archivo no está en VOF CAMP.');
  return { ok: true, nombre: f.getName(), blob: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/* ---------------- datos compartidos de la página ---------------- */
function archivoDatos() {
  var raiz = DriveApp.getFolderById(Object.keys(CARPETAS)[0]).getParents().next();   // VOF CAMP
  var it = raiz.getFilesByName(ARCHIVO_DATOS);
  return it.hasNext() ? it.next() : raiz.createFile(ARCHIVO_DATOS, '{}', MimeType.PLAIN_TEXT);
}
function leerDatos() {
  try { return JSON.parse(archivoDatos().getBlob().getDataAsString() || '{}'); } catch (e) { return {}; }
}
function dbGet(ruta) {
  var d = leerDatos();
  return { ok: true, existe: d.hasOwnProperty(ruta), datos: d[ruta] || null };
}
function dbLista(col) {
  var d = leerDatos(), out = [], pre = col + '/';
  Object.keys(d).forEach(function (k) {
    if (k.indexOf(pre) === 0 && k.split('/').length === 2) out.push({ id: k.split('/')[1], datos: d[k] });
  });
  return { ok: true, docs: out };
}
function dbSet(ruta, datos) {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(String(ruta))) throw new Error('Ruta no válida.');
  if (/^snap/.test(ruta)) return { ok: true };            // copias de la versión de Claude: no se guardan aquí
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var f = archivoDatos(), d = {};
    try { d = JSON.parse(f.getBlob().getDataAsString() || '{}'); } catch (e) { d = {}; }
    if (datos === null) delete d[ruta]; else d[ruta] = datos;
    f.setContent(JSON.stringify(d));
  } finally { lock.releaseLock(); }
  return { ok: true };
}

/* ---------------- IA ---------------- */
function claves() {
  var c = {};
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty('CLAVES_IA') || '{}'); } catch (e) { c = {}; }
  ORDEN_PROV.forEach(function (p) {
    c[p] = c[p] || {};
    c[p].claves = (c[p].claves || []).concat(['', '', '', '', '']).slice(0, 5);
    if (!c[p].modelo) c[p].modelo = PROVEEDORES[p].modelo;
  });
  return c;
}
function resumenClaves() {          // lo que ve la página: cuántas hay, nunca las claves
  var c = claves(), r = {};
  ORDEN_PROV.forEach(function (p) {
    r[p] = { nombre: PROVEEDORES[p].nombre, modelo: c[p].modelo, cuenta: c[p].cuenta || '',
             guardadas: c[p].claves.map(function (x) { return !!x; }) };
  });
  return r;
}
function guardarClaves(admin, cambios) {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CLAVE_ADMIN') || admin !== props.getProperty('CLAVE_ADMIN')) {
    Utilities.sleep(1500);
    return { ok: false, codigo: 'admin', error: 'Clave de administrador incorrecta.' };
  }
  var c = claves();
  ORDEN_PROV.forEach(function (p) {
    var x = cambios[p];
    if (!x) return;
    (x.claves || []).forEach(function (v, i) {
      if (v === '-') c[p].claves[i] = '';           // "-" borra la clave
      else if (v) c[p].claves[i] = String(v).trim(); // vacío: se deja la que estaba
    });
    if (x.modelo) c[p].modelo = String(x.modelo).trim();
    if (x.cuenta !== undefined && x.cuenta !== '') c[p].cuenta = String(x.cuenta).trim();
  });
  props.setProperty('CLAVES_IA', JSON.stringify(c));
  return { ok: true, ia: resumenClaves() };
}

function pedirIA(p, clave, cfg, texto, imgs) {
  var r, j, url, cuerpo, cab = { 'Content-Type': 'application/json' };
  if (p === 'gemini') {
    var parts = [{ text: texto }].concat(imgs.map(function (b) { return { inline_data: { mime_type: 'image/jpeg', data: b } }; }));
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(cfg.modelo) + ':generateContent?key=' + encodeURIComponent(clave);
    cuerpo = { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } };
  } else {
    var cont = [{ type: 'text', text: texto }].concat(imgs.map(function (b) { return { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b } }; }));
    url = p === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(cfg.cuenta || '') + '/ai/v1/chat/completions';
    cab.Authorization = 'Bearer ' + clave;
    if (p === 'openrouter') cab['X-Title'] = 'VOF Ordenes';
    cuerpo = { model: cfg.modelo, temperature: 0, max_tokens: 1500, messages: [{ role: 'user', content: cont }] };
  }
  r = UrlFetchApp.fetch(url, { method: 'post', headers: cab, payload: JSON.stringify(cuerpo), muteHttpExceptions: true });
  var st = r.getResponseCode();
  try { j = JSON.parse(r.getContentText()); } catch (e) { j = {}; }
  if (st >= 300) {
    var m = (j.error && (j.error.message || j.error)) || (j.errors && j.errors[0] && j.errors[0].message) || ('HTTP ' + st);
    throw { st: st, msg: String(m).substring(0, 200) };
  }
  if (p === 'gemini') return ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(function (x) { return x.text || ''; }).join('');
  var msg = ((j.choices || [])[0] || {}).message || {};
  return typeof msg.content === 'string' ? msg.content : (msg.content || []).map(function (x) { return x.text || ''; }).join('');
}
function aJson(t) {
  var m = /\{[\s\S]*\}/.exec(String(t || ''));
  if (!m) throw { msg: 'La IA no devolvió JSON' };
  return JSON.parse(m[0]);
}
function juntar(a, b) {
  if (!a) return b;
  var o = { fotos: (a.fotos || []).concat(b.fotos || []), lecturas: {} }, la = a.lecturas || {}, lb = b.lecturas || {};
  Object.keys(lb).forEach(function (k) { o.lecturas[k] = lb[k]; });
  Object.keys(la).forEach(function (k) { var v = la[k]; if (v !== null && v !== '' && !(Array.isArray(v) && !v.length)) o.lecturas[k] = v; });
  return o;
}
function ia(texto, imgs) {
  var c = claves(), cache = CacheService.getScriptCache(), ult = '';
  for (var pi = 0; pi < ORDEN_PROV.length; pi++) {
    var p = ORDEN_PROV[pi], cfg = c[p], max = PROVEEDORES[p].max;
    for (var i = 0; i < 5; i++) {
      var k = cfg.claves[i];
      if (!k || cache.get('frio_' + p + i)) continue;
      try {
        var res = null;
        if (imgs.length > max) {                         // este proveedor acepta menos fotos: se parte el lote
          var base = +((/numera desde (\d+)/.exec(texto) || [0, 1])[1]);
          for (var x = 0; x < imgs.length; x += max) {
            var lote = imgs.slice(x, x + max);
            var tx = texto.replace(/\nOjo: van las fotos[^\n]*/, '') + '\nOjo: van las fotos ' + (base + x) + ' a ' + (base + x + lote.length - 1) + '; numera desde ' + (base + x) + '.';
            res = juntar(res, aJson(pedirIA(p, k, cfg, tx, lote)));
          }
        } else {
          res = aJson(pedirIA(p, k, cfg, texto, imgs));
        }
        return { ok: true, datos: res, usado: PROVEEDORES[p].nombre + ' · clave ' + (i + 1), aviso: ult };
      } catch (e) {
        var st = e && e.st;
        // sin cupo: 10 minutos; clave mala: 6 horas; otro error: 2 minutos
        cache.put('frio_' + p + i, '1', st === 429 ? 600 : (st === 401 || st === 403) ? 21600 : 120);
        ult = PROVEEDORES[p].nombre + ' clave ' + (i + 1) + ': ' + ((e && (e.msg || e.message)) || 'falló');
      }
    }
  }
  return { ok: false, codigo: 'sin_cupo', error: ult ? 'Todas las claves fallaron o están sin cupo. Última: ' + ult : 'No hay claves de IA guardadas.' };
}

/** Ejecútala una vez desde el editor para dar los permisos de Drive y de internet. */
function probar() {
  Logger.log(listar('1jU_HN4gxf3tzOAeyxKnxpwQ6xah7T8PF').files.slice(0, 3));
  Logger.log(UrlFetchApp.fetch('https://www.google.com').getResponseCode());
}
