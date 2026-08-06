// ── Generador de imagen de fin de partida (server-side con node-canvas) ──
const { createCanvas, loadImage } = require('canvas');
const { ROLES } = require('./roles');

const W = 800;
const PAD = 40;
const INK  = '#07070a';
const BONE = '#f4efe4';
const BONE3 = '#b0a690';
const BONE4 = '#8a8170';
const GOOD = '#6d8cb8';
const BLOOD = '#d4483a';
const GOLD = '#c9a24a';

async function generateGameOverImage(game) {
  const { winner, players = [], winReason } = game;
  if (!winner) return null;

  const isGoodWin = winner === 'good';
  const goodTeam = players.filter(p => p.alignment === 'good');
  const evilTeam = players.filter(p => p.alignment === 'evil');

  // Pre-calculate row height
  const rowH = 38;
  const headerH = 140;
  const reasonH = winReason ? 30 : 0;
  const colTitleH = 30;
  const colContentH = Math.max(goodTeam.length, evilTeam.length) * rowH + 16;
  const footerH = 60;
  const H = headerH + reasonH + colTitleH + colContentH + footerH + PAD * 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient overlay at top
  const grad = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, W * 0.6);
  if (isGoodWin) {
    grad.addColorStop(0, 'rgba(8,15,26,0.8)');
    grad.addColorStop(1, 'rgba(7,7,10,0)');
  } else {
    grad.addColorStop(0, 'rgba(26,6,8,0.8)');
    grad.addColorStop(1, 'rgba(7,7,10,0)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = 'rgba(201,162,74,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  let y = PAD;

  // ── Icon ──
  ctx.fillStyle = isGoodWin ? GOOD : BLOOD;
  ctx.font = '48px serif';
  ctx.textAlign = 'center';
  ctx.fillText(isGoodWin ? '✦' : '☠', W / 2, y + 48);
  y += 60;

  // ── Title ──
  ctx.fillStyle = BONE;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado', W / 2, y + 28);
  y += 40;

  // ── Win reason ──
  if (winReason) {
    ctx.fillStyle = BONE3;
    ctx.font = 'italic 16px serif';
    ctx.fillText(winReason, W / 2, y + 18);
    y += 30;
  }

  // ── Divider ──
  y += 8;
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.5;
  ctx.font = '14px serif';
  ctx.fillText('✦', W / 2, y + 8);
  ctx.globalAlpha = 1;
  y += 20;

  // ── Columns ──
  const colW = (W - PAD * 2 - 20) / 2;
  const colX = [PAD, PAD + colW + 20];

  const drawColumn = (team, x, label, isGood) => {
    let cy = y;

    // Column title
    ctx.fillStyle = isGood ? GOOD : BLOOD;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.letterSpacing = '3px';
    ctx.fillText(label.toUpperCase(), x, cy + 10);
    ctx.letterSpacing = '0px';
    cy += colTitleH;

    // Column background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, x, cy, colW, colContentH, 6);
    ctx.fill();
    ctx.strokeStyle = isGood ? 'rgba(109,140,184,0.3)' : 'rgba(168,58,45,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, cy, colW, colContentH, 6);
    ctx.stroke();

    // Players
    let py = cy + 14;
    for (const p of team) {
      const role = ROLES[p.role];
      const isDrunk = p.role === 'DRUNK';
      const drunkRole = isDrunk && p.drunkAs ? ROLES[p.drunkAs] : null;

      ctx.globalAlpha = p.alive ? 1 : 0.5;

      // Role initial circle
      ctx.fillStyle = isGood ? 'rgba(109,140,184,0.15)' : 'rgba(168,58,45,0.15)';
      ctx.beginPath();
      ctx.arc(x + 18, py + 10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isGood ? 'rgba(109,140,184,0.3)' : 'rgba(168,58,45,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Role initial
      ctx.fillStyle = isGood ? GOOD : BLOOD;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const initial = (role?.name || p.role || '?')[0];
      ctx.fillText(initial, x + 18, py + 14);

      // Player name
      ctx.fillStyle = BONE;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name || '?', x + 38, py + 14);

      // Role name (right aligned)
      ctx.fillStyle = BONE4;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      const roleName = role?.name || p.role || '?';
      ctx.fillText(roleName, x + colW - 12, py + 8);

      // Drunk note
      if (isDrunk && drunkRole) {
        ctx.fillStyle = GOLD;
        ctx.font = 'italic 9px serif';
        ctx.fillText(`creía ser ${drunkRole.name}`, x + colW - 12, py + 22);
      }

      // Dead skull
      if (!p.alive) {
        ctx.fillStyle = BLOOD;
        ctx.font = '12px serif';
        ctx.textAlign = 'right';
        ctx.fillText('☠', x + colW - ctx.measureText(roleName).width - 16, py + 8);
      }

      ctx.globalAlpha = 1;
      py += rowH;
    }
  };

  drawColumn(goodTeam, colX[0], 'Aldeanos & Forasteros', true);
  drawColumn(evilTeam, colX[1], 'Esbirros & Demonio', false);

  // Export
  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = { generateGameOverImage };
