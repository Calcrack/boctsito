// Suite 6 — Hoja de campaña: la página de personajes que los jugadores abren
// en una pestaña nueva. Se genera en el servidor a partir del guion activo,
// así que también funciona con guiones importados.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { renderCampaignSheet, englishName, highlight } = require(path.join(ROOT, 'campaignSheet'));
const { getCampaign, CAMPAIGNS } = require(path.join(ROOT, 'campaigns'));

let pass = 0, fail = 0; const fails = []; let group = '';
function G_(n) { group = n; }
function t(n, fn) { try { fn(); pass++; } catch (e) { fail++; fails.push(`[${group}] ${n}\n     → ${e.message}`); } }
function eq(a, b, m) { if (a !== b) throw new Error(`${m || ''} esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
function ok(v, m) { if (!v) throw new Error(m || 'falsy'); }
function no(v, m) { if (v) throw new Error(m || 'truthy'); }

const BASE = ['TROUBLE_BREWING', 'BAD_MOON_RISING', 'SECTS_AND_VIOLETS', 'CAROUSEL'];
const count = (html, re) => (html.match(re) || []).length;

G_('Estructura');
t('cada campaña oficial trae los cuatro grupos', () => {
  for (const cid of BASE) {
    const html = renderCampaignSheet(getCampaign(cid));
    for (const rail of ['ALDEANOS', 'FORASTEROS', 'ESBIRROS', 'DEMONIOS']) {
      ok(html.includes(`>${rail}<`), `${cid}: falta el grupo ${rail}`);
    }
  }
});

t('el número de entradas coincide con los personajes del guion', () => {
  for (const cid of BASE) {
    const c = getCampaign(cid);
    const esperados = Object.values(c.roles).filter(r =>
      ['townfolk', 'outsider', 'minion', 'demon'].includes(r.type)).length;
    eq(count(renderCampaignSheet(c), /<li class="entry">/g), esperados, `${cid}:`);
  }
});

t('cada personaje sale con nombre, nombre inglés y habilidad', () => {
  const html = renderCampaignSheet(getCampaign('TROUBLE_BREWING'));
  ok(html.includes('Lavandera'), 'sin nombre');
  ok(html.includes('(Washerwoman)'), 'sin nombre inglés');
  ok(html.includes('Empiezas conociendo que 1 de 2 jugadores'), 'sin habilidad');
});

t('el título es el nombre de la campaña y lleva el recuento', () => {
  const html = renderCampaignSheet(getCampaign('TROUBLE_BREWING'));
  ok(/<h1>Trouble Brewing<\/h1>/.test(html), 'título incorrecto');
  ok(/22 personajes/.test(html), 'sin recuento');
});

t('lleva la nota del asterisco al pie', () => {
  ok(renderCampaignSheet(getCampaign('TROUBLE_BREWING')).includes('No la primera noche'));
});

G_('Arte');
t('los personajes con arte llevan su imagen', () => {
  const html = renderCampaignSheet(getCampaign('TROUBLE_BREWING'));
  ok(html.includes('src="/assets/roles/lavandera.png"'), 'sin arte de la Lavandera');
  eq(count(html, /<img class="art"/g), 22, 'todos los de TB tienen arte');
});

t('los personajes sin arte caen a la inicial, no a una imagen rota', () => {
  const html = renderCampaignSheet(getCampaign('CAROUSEL'));
  ok(count(html, /class="art art-initial"/g) >= 2, 'Rata de Laboratorio y Hechicero no tienen arte');
  no(/src=""/.test(html), 'no debe haber src vacío');
});

t('un guion homebrew usa el `image` que trae el propio rol', () => {
  const custom = {
    id: 'CUSTOM_TEST', name: 'Guion propio', isCustom: true,
    roles: {
      X: { id: 'X', name: 'Inventado', type: 'townfolk', alignment: 'good',
           ability: 'Hace algo.', image: '/assets/homebrew/x.png', homebrew: true },
    },
  };
  const html = renderCampaignSheet(custom);
  ok(html.includes('src="/assets/homebrew/x.png"'), 'no usa el image del rol');
  ok(html.includes('Inventado'), 'no sale el nombre');
});

G_('Seguridad');
t('el HTML de una habilidad se escapa', () => {
  const evil = {
    id: 'X', name: 'X',
    roles: { X: { id: 'X', name: 'X', type: 'demon', alignment: 'evil', ability: '<script>alert(1)</script>' } },
  };
  const html = renderCampaignSheet(evil);
  no(html.includes('<script>alert(1)</script>'), 'inyección de script');
  ok(html.includes('&lt;script&gt;'), 'no se escapó');
});

t('el nombre de la campaña también se escapa', () => {
  const html = renderCampaignSheet({ id: 'X', name: '<img onerror=x>', roles: {} });
  no(/<img onerror/.test(html), 'inyección en el título');
});

t('el resaltado no rompe el escapado', () => {
  const out = highlight('El <b>Demonio</b> es malo');
  no(out.includes('<b>'), 'no se escapó la etiqueta');
  ok(out.includes('kw-demon'), 'no resaltó Demonio');
  ok(out.includes('kw-evil'), 'no resaltó malo');
});

G_('Nombres ingleses');
t('los ids se convierten bien', () => {
  eq(englishName('SNAKE_CHARMER'), 'Snake Charmer');
  eq(englishName('LIL_MONSTA'), "Lil' Monsta");
  eq(englishName('LORD_OF_TYPHON'), 'Lord of Typhon');
  eq(englishName('DEVILS_ADVOCATE'), "Devil's Advocate");
  eq(englishName('IMP'), 'Imp');
});

G_('Campañas personalizadas');
t('una campaña sin personajes no revienta', () => {
  const html = renderCampaignSheet({ id: 'V', name: 'Vacía', roles: {} });
  ok(html.includes('no tiene personajes'), 'sin mensaje de vacío');
});

t('todas las campañas registradas se renderizan', () => {
  for (const c of Object.values(CAMPAIGNS)) {
    const html = renderCampaignSheet(c);
    ok(html.startsWith('<!doctype html>'), `${c.id}: HTML inválido`);
  }
});

const line = '═'.repeat(70);
console.log(`\n${line}`);
console.log(`SUITE 6 (hoja de campaña):  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log(line);
if (fails.length) { console.log('\n' + fails.join('\n')); process.exitCode = 1; }
