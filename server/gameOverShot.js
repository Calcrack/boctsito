// ── Captura de fin de partida con Puppeteer ─────────────────────────
// El servidor renderiza su propio HTML de la pantalla de fin de partida
// (idéntico en colores/tipografía al cliente) y lanza Chromium headless para
// obtener el PNG. Devuelve un data URL para enviar al canal de Discord.
const puppeteer = require('puppeteer-core');
const Chromium = require('@sparticuz/chromium').default;
const { ROLES } = require('./roles');

// Paleta & tipografías replicadas de theme.css del cliente.
const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap" rel="stylesheet">';

const TYPE_COLOR = {
  townfolk: '#6d8cb8',
  outsider: '#cfd6e8',
  minion:   '#d4483a',
  demon:    '#d4483a',
  traveler: '#c9a24a',
  fabled:   '#c9a24a',
};

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      // En Render el binario de Chromium viene en node_modules (@sparticuz/chromium).
      // En local (Windows) se puede apuntar a un Chrome instalado con la variable
      // PUPPETEER_EXECUTABLE_PATH para probar el envío sin desplegar.
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await Chromium.executablePath().catch(() => null));
      const args = process.env.PUPPETEER_EXECUTABLE_PATH
        ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        : Chromium.args;
      return puppeteer.launch({
        headless: process.env.PUPPETEER_EXECUTABLE_PATH ? 'new' : 'shell',
        executablePath,
        args,
      });
    })();
  }
  return browserPromise;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function roleTile(role) {
  const color = TYPE_COLOR[role.type] || '#8a8170';
  const initial = (role.name || '?').trim()[0].toUpperCase();
  return `<span class="role-tile" style="border-color:${color};color:${color}">${initial}</span>`;
}

function playerChip(p) {
  const initial = (p.name || '?').trim()[0].toUpperCase();
  const avatar = p.avatar
    ? `<img src="${escapeHtml(p.avatar)}" alt="">`
    : `<span class="avatar-initial">${escapeHtml(initial)}</span>`;
  return `<span class="pc"><span class="avatar">${avatar}</span><span class="pc-name">${escapeHtml(p.name)}</span></span>`;
}

function playerRow(p) {
  const role = roleInfo(p.role);
  const isDrunk = p.role === 'DRUNK';
  const drunkFake = isDrunk && p.drunkAs ? roleInfo(p.drunkAs) : null;
  const opacity = p.alive ? 1 : 0.55;
  const row = [
    roleTile(role),
    playerChip(p),
    `<span class="role-name">${escapeHtml(role.name || '')}</span>`,
  ];
  if (drunkFake) {
    row.push(`<span class="note gold">creía ser ${escapeHtml(drunkFake.name)}</span>`);
  }
  if (!p.alive) row.push(`<span class="dead-mark">☠</span>`);
  return `<div class="player-row" style="opacity:${opacity}">${row.join('')}</div>`;
}

function roleInfo(roleId) {
  return ROLES[roleId] || { id: roleId, name: roleId || '?', type: 'townfolk', alignment: 'good' };
}

function renderGameOver(game) {
  const winner = game.winner;
  const isGoodWin = winner === 'good';
  const players = game.players || [];
  const goodTeam = players.filter(p => (p.alignment || roleInfo(p.role).alignment) === 'good');
  const evilTeam = players.filter(p => (p.alignment || roleInfo(p.role).alignment) === 'evil');

  const teamBlock = (team, label, accent, border) => `
    <div class="team" style="border-color:${border}">
      <p class="team-label" style="color:${accent}">${escapeHtml(label)}</p>
      <div class="team-rows">${team.map(playerRow).join('')}</div>
    </div>`;

  const gradient = isGoodWin
    ? 'radial-gradient(ellipse at center top, #080f1a 0%, #07070a 70%)'
    : 'radial-gradient(ellipse at center top, #1a0608 0%, #07070a 70%)';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
${FONT_LINK}
<style>
  :root {
    --ink-900:#07070a; --good:#6d8cb8; --evil:#a83a2d; --blood-hi:#d4483a;
    --bone-50:#f4efe4; --bone-300:#b0a690; --bone-400:#8a8170; --gold:#c9a24a;
    --moon:#cfd6e8;
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body {
    background:${gradient};
    font-family:'Cormorant Garamond', Georgia, serif;
    color:var(--bone-50);
    display:flex; align-items:center; justify-content:center;
    min-height:100vh; padding:32px;
  }
  .frame { width:720px; max-width:720px; }
  .header { text-align:center; margin-bottom:32px; }
  .winner-icon { font-size:60px; margin-bottom:16px; }
  h1 {
    font-family:'Cinzel Decorative', 'Cinzel', 'Cormorant Garamond', serif;
    font-size:34px; font-weight:400; color:var(--bone-50);
    margin:0 0 8px; letter-spacing:0.04em;
  }
  .winreason { font-size:20px; font-style:italic; color:var(--bone-300); margin:0; }
  .flourish { color:var(--gold); letter-spacing:0.5em; margin:4px auto 0; text-align:center; }
  .teams { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .team {
    background:rgba(0,0,0,0.3);
    border:1px solid transparent; border-radius:6px; padding:16px 18px;
  }
  .team-label {
    font-family:'IBM Plex Mono', monospace; font-size:11px;
    letter-spacing:0.22em; text-transform:uppercase; margin:0 0 12px;
  }
  .team-rows { display:flex; flex-direction:column; gap:10px; }
  .player-row { display:flex; align-items:center; justify-content:center; gap:10px; }
  .role-tile {
    width:30px; height:30px; border-radius:4px; border:1px solid;
    display:inline-flex; align-items:center; justify-content:center;
    font-family:'Cormorant Garamond', serif; font-weight:600;
    font-size:15px; line-height:1; flex-shrink:0; background:rgba(0,0,0,0.35);
  }
  .pc {
    display:inline-flex; align-items:center; gap:5px;
    background:rgba(201,162,74,0.12); border:1px solid rgba(201,162,74,0.25);
    border-radius:4px; padding:1px 7px 1px 3px; vertical-align:middle;
  }
  .avatar {
    width:26px; height:26px; border-radius:50%; overflow:hidden; flex-shrink:0;
    display:inline-flex; align-items:center; justify-content:center;
    background:#1a1a23; border:1px solid rgba(255,255,255,0.1);
  }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  .avatar-initial {
    font-family:'Cormorant Garamond', serif; font-size:13px; font-weight:700; color:#c9beaa;
  }
  .pc-name {
    font-family:'Cormorant Garamond', serif; font-size:15px; font-weight:600;
    color:var(--bone-50); line-height:1; display:inline-block;
  }
  .role-name {
    font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:0.1em;
    text-transform:uppercase; color:var(--bone-400); min-width:74px; text-align:left;
  }
  .role-note {
    font-family:'Cormorant Garamond', serif; font-size:10px; font-style:italic;
  }
  .dead-mark { color:var(--blood-hi); font-size:14px; }
</style>
</head>
<body>
<div class="frame">
  <div class="header">
    <div class="winner-icon" style="color:${isGoodWin ? 'var(--good)' : 'var(--blood-hi)'}">${isGoodWin ? '✦' : '☠'}</div>
    <h1>${isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado'}</h1>
    <p class="winreason">${escapeHtml(game.winReason || '')}</p>
    <div class="flourish">✦</div>
  </div>
  <div class="teams">
    ${teamBlock(goodTeam, 'Aldeanos &amp; Forasteros', 'var(--good)', 'rgba(109,140,184,0.3)')}
    ${teamBlock(evilTeam, 'Esbirros &amp; Demonio', 'var(--blood-hi)', 'rgba(168,58,45,0.3)')}
  </div>
</div>
</body>
</html>`;
}

// Genera el PNG del fin de partida como data URL. Recibe el objeto `game`
// (con winner, winReason y players). Devuelve { ok, dataUrl } o { ok:false, error }.
async function captureGameOver(game) {
  if (!game || !game.winner) return { ok: false, error: 'No hay fin de partida' };
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 820, height: 60, deviceScaleFactor: 2 });
    await page.setContent(renderGameOver(game), { waitUntil: ['networkidle0'], timeout: 20000 });
    // Asegura que las fuentes web están listas antes de disparar la foto.
    await page.evaluateHandle(() => document.fonts.ready);
    const body = await page.$('body');
    const buf = await body.screenshot({ type: 'png' });
    await page.close();
    return { ok: true, dataUrl: `data:image/png;base64,${buf.toString('base64')}` };
  } catch (err) {
    console.error('[gameOverShot] Puppeteer falló:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { captureGameOver, renderGameOver };