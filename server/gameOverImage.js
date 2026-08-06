// ── Generador de imagen de fin de partida (server-side) ──────────────
// Replica fielmente el componente React GameOver.jsx: colores, fuentes,
// avatares de jugador (URL de Discord) y arte de personaje (PNG local).
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const { ROLES } = require('./roles');
const { roleImages } = require('./roleImages');

// ── Paleta (theme.css) ─────────────────────────────────────────────
const INK900 = '#07070a';
const INK700 = '#1a1a23';
const BONE50 = '#f4efe4';
const BONE200 = '#c9beaa';
const BONE300 = '#b0a690';
const BONE400 = '#8a8170';
const GOLD = '#c9a24a';
const GOOD = '#6d8cb8';
const BLOOD_HI = '#d4483a';

const SCALE = 2;

// ── Downloads helpers ──────────────────────────────────────────────
function download(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.headers.location) {
        download(res.headers.location).then(resolve).catch(reject);
        res.resume();
        return;
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Fonts ──────────────────────────────────────────────────────────
// Descargamos el CSS de Google Fonts (UA normal → devuelve TTF), parseamos
// las URLs reales y las registramos en @napi-rs/canvas, cacheando en disco.
const FONT_DIR = path.join(os.tmpdir(), 'boct-fonts');
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap';

let fontsReady = null;
function ensureFonts() {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR, { recursive: true });
    let css = '';
    try {
      css = (await download(FONT_CSS_URL)).toString('utf8');
    } catch (e) {
      console.error('[GameOver] No se pudo leer Google Fonts:', e.message);
      return;
    }
    const faces = css.match(/@font-face\s*{[^}]+}/g) || [];
    for (const face of faces) {
      let family = (face.match(/font-family:\s*'([^']+)'/) || [])[1];
      let url = (face.match(/url\((https:[^)]+\.ttf)\)/) || [])[1];
      if (!family || !url) continue;
      const safe = family.replace(/\s+/g, '-');
      const file = path.join(FONT_DIR, `${safe}.ttf`);
      if (!fs.existsSync(file)) {
        try {
          const buf = await download(url);
          fs.writeFileSync(file, buf);
        } catch { continue; }
      }
      try { GlobalFonts.registerFromPath(file, family); } catch {}
    }
  })();
  return fontsReady;
}

// ── Role images ────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, '..', 'client', 'public');

function roleImageBuffer(role) {
  const map = roleImages();
  const rel = role?.img || role?.image || (role && map[role.id]);
  if (!rel) return null;
  const file = path.join(PUBLIC_DIR, rel.replace(/^\//, ''));
  try { return fs.readFileSync(file); } catch { return null; }
}

// ── Text helpers ───────────────────────────────────────────────────
function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// ── Main generator ─────────────────────────────────────────────────
async function generateGameOverImage(game) {
  await ensureFonts();
  const { winner, players = [], winReason } = game;
  if (!winner) return null;

  const isGoodWin = winner === 'good';
  const goodTeam = players.filter(p => p.alignment === 'good');
  const evilTeam = players.filter(p => p.alignment === 'evil');

  // ── Dimensiones (ratio 2x para nitidez) ──
  const W = 720 * SCALE;
  const rowH = 34 * SCALE;
  const gap = 10 * SCALE;
  const colPadY = 16 * SCALE;
  const colPadX = 18 * SCALE;
  const colTitleH = 26 * SCALE;

  const maxRows = Math.max(goodTeam.length, evilTeam.length);
  const colContentH = colPadY * 2 + maxRows * rowH + (Math.max(0, maxRows - 1)) * gap;
  const colH = colTitleH + colContentH;

  // Header
  const iconSize = 60 * SCALE;
  const headerGap = 16 * SCALE;
  const titleH = 44 * SCALE;
  const reasonH = winReason ? 30 * SCALE : 0;
  const dividerH = 26 * SCALE;
  const headerH = iconSize + headerGap + titleH + (winReason ? 6 * SCALE + reasonH : 0) + dividerH;
  const headerMargin = 32 * SCALE;

  const PAD = 32 * SCALE;
  const gridGap = 16 * SCALE;
  const colW = (W - PAD * 2 - gridGap) / 2;
  const bottomMargin = 24 * SCALE;

  const H = PAD + headerH + headerMargin + colH + bottomMargin + PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background (fiel a la radial-gradient del JSX) ──
  const grad = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, W * 0.6);
  const top = isGoodWin ? 'rgba(8,15,26,1)' : 'rgba(26,6,8,1)';
  grad.addColorStop(0, top);
  grad.addColorStop(0.7, INK900);
  grad.addColorStop(1, INK900);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  let y = PAD;

  // ── Icon ✦ / ☠ ──
  const iconColor = isGoodWin ? GOOD : BLOOD_HI;
  ctx.fillStyle = iconColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${iconSize}px serif`;
  ctx.fillText(isGoodWin ? '✦' : '☠', W / 2, y + iconSize / 2);
  y += iconSize + headerGap;

  // ── Title ──
  ctx.fillStyle = BONE50;
  ctx.font = `400 ${26 * SCALE}px "Cinzel Decorative"`;
  ctx.textAlign = 'center';
  const titleTxt = isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado';
  ctx.fillText(titleTxt, W / 2, y + titleH / 2);
  y += titleH;

  // ── Win reason ──
  if (winReason) {
    ctx.fillStyle = BONE300;
    ctx.font = `italic 400 ${14 * SCALE}px "Cormorant Garamond"`;
    ctx.fillText(winReason, W / 2, y + reasonH / 2);
    y += reasonH;
  }

  // ── Divider ✦ ──
  ctx.fillStyle = 'rgba(201,162,74,0.6)';
  ctx.font = `${12 * SCALE}px serif`;
  ctx.fillText('✦', W / 2, y + dividerH / 2);
  y += dividerH + headerMargin;

  // ── Columns ──
  const colX = [PAD, PAD + colW + gridGap];

  const drawColumn = async (team, x, label, isGood) => {
    let cy = y;

    // Column title
    ctx.fillStyle = isGood ? GOOD : BLOOD_HI;
    ctx.font = `500 ${9 * SCALE}px "IBM Plex Mono"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), x, cy + colTitleH / 2);
    cy += colTitleH;

    // Column background
    const colBorder = isGood ? 'rgba(109,140,184,0.3)' : 'rgba(168,58,45,0.3)';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(x, cy, colW, colH - colTitleH, 6 * SCALE);
    ctx.fill();
    ctx.strokeStyle = colBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    let py = cy + colPadY;
    for (const p of team) {
      const rowX = x + colPadX;
      const rowW = colW - colPadX * 2;
      const rh = rowH;
      ctx.globalAlpha = p.alive ? 1 : 0.55;

      const role = ROLES[p.role];
      const isDrunk = p.role === 'DRUNK';
      const drunkRole = isDrunk && p.drunkAs ? ROLES[p.drunkAs] : null;

      const roleImgSize = 30 * SCALE;

      // Role icon (left) — PNG o inicial
      const rbuf = roleImageBuffer(role);
      if (rbuf) {
        try {
          const img = await loadImage(rbuf);
          const rr = Math.max(2, Math.round(roleImgSize * 0.08));
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x + colPadX, py, roleImgSize, roleImgSize, rr);
          ctx.clip();
          ctx.drawImage(img, x + colPadX, py, roleImgSize, roleImgSize);
          ctx.restore();
        } catch { drawRoleFallback(ctx, role, x + colPadX, py, roleImgSize, isGood); }
      } else {
        drawRoleFallback(ctx, role, x + colPadX, py, roleImgSize, isGood);
      }

      // Player chip (name + avatar)
      const chipX = x + colPadX + roleImgSize + 10 * SCALE;
      drawPlayerChip(ctx, p, chipX, py, rh, isGood);

      // Role name (right aligned) + extras
      drawRoleName(ctx, p, role, isDrunk, drunkRole, x + colPadX, py, rowW, roleImgSize, isGood);

      py += rh;
    }
    ctx.globalAlpha = 1;
  };

  await drawColumn(goodTeam, colX[0], 'Aldeanos & Forasteros', true);
  await drawColumn(evilTeam, colX[1], 'Esbirros & Demonio', false);

  return canvas.toBuffer('image/png');
}

function drawRoleFallback(ctx, role, x, y, size, isGood) {
  const color = isGood ? GOOD : BLOOD_HI;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 4);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(size * 0.5)}px "Cormorant Garamond"`;
  ctx.fillText((role?.name || '?').trim()[0].toUpperCase(), x + size / 2, y + size / 2 + 1);
}

async function drawPlayerChip(ctx, p, x, y, rh, isGood) {
  const avatarSize = 26 * SCALE;
  const chipH = avatarSize + 2 * (2 * SCALE);
  const cy = y;

  const chipW = Math.max(60 * SCALE, ctx.measureText(p.name || '?').width + avatarSize + 24 * SCALE);

  ctx.fillStyle = 'rgba(201,162,74,0.12)';
  ctx.strokeStyle = 'rgba(201,162,74,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, cy, chipW, chipH, 4);
  ctx.fill();
  ctx.stroke();

  const avX = x + 4 * SCALE;
  const avY = cy + (chipH - avatarSize) / 2;
  ctx.fillStyle = INK700;
  ctx.beginPath();
  ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.stroke();
  if (p.avatar) {
    try {
      const img = await loadImage(p.avatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avX, avY, avatarSize, avatarSize);
      ctx.restore();
    } catch {
      drawAvatarFallback(ctx, (p.name || '?')[0].toUpperCase(), avX, avY, avatarSize);
    }
  } else {
    drawAvatarFallback(ctx, (p.name || '?')[0].toUpperCase(), avX, avY, avatarSize);
  }

  ctx.fillStyle = BONE50;
  ctx.font = `600 ${12 * SCALE}px "Cormorant Garamond"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(ctx, p.name || '?', chipW - avatarSize - 14 * SCALE), avX + avatarSize + 7 * SCALE, cy + chipH / 2 + 1);
}

function drawAvatarFallback(ctx, letter, x, y, size) {
  ctx.fillStyle = BONE200;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(size * 0.5)}px "Cormorant Garamond"`;
  ctx.fillText(letter, x + size / 2, y + size / 2 + 1);
}

function drawRoleName(ctx, p, role, isDrunk, drunkRole, x0, y0, rowW, roleImgSize, isGood) {
  const roleName = role?.name || p.role || '?';
  const rightX = x0 + rowW;
  const leftLimit = x0 + 190 * SCALE;

  if (!p.alive) {
    ctx.font = `${10 * SCALE}px serif`;
    ctx.fillStyle = BLOOD_HI;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', rightX, y0 + roleImgSize / 2);
  }

  ctx.fillStyle = BONE400;
  ctx.font = `500 ${8 * SCALE}px "IBM Plex Mono"`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  const nameY = y0 + (roleImgSize / 2) - 7 * SCALE;
  ctx.fillText(truncate(ctx, roleName.toUpperCase(), Math.max(20, rightX - leftLimit)), rightX, nameY);

  const noteY = nameY + 12 * SCALE;
  if (isDrunk && drunkRole) {
    ctx.fillStyle = GOLD;
    ctx.font = `italic 400 ${8 * SCALE}px "Cormorant Garamond"`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, `creía ser ${drunkRole.name}`, Math.max(20, rightX - leftLimit)), rightX, noteY);
  } else if (p.isSmokeScreen) {
    ctx.fillStyle = BLOOD_HI;
    ctx.font = `italic 400 ${8 * SCALE}px "Cormorant Garamond"`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(truncate(ctx, 'Cortina de Humo', Math.max(20, rightX - leftLimit)), rightX, noteY);
  }
}

module.exports = { generateGameOverImage, ensureFonts };