import React, { useEffect, useRef } from 'react';

// Logo de BoCT recoloreado igual que en la imagen que se envía a Discord:
// el servidor (gameOverImage.js) fuerza el matiz (hue) de todos los píxeles
// del logo a un tono objetivo (rojo si ganan los malos, azul si ganan los
// buenos), preservando luminosidad y saturación. Esto replica ese efecto.
const SRC = '/assets/boct-logo.png';

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    default: h = (r - g) / d + 4;
  }
  h /= 6;
  return [h * 360, s, l];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const H = h / 360;
  return [
    Math.round(hue2rgb(p, q, H + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, H) * 255),
    Math.round(hue2rgb(p, q, H - 1 / 3) * 255),
  ];
}

function recolor(canvas, img, targetHueDeg, size) {
  const ctx = canvas.getContext('2d');
  canvas.width = size; canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    const [r, g, b] = hslToRgb(targetHueDeg, s, l);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(imgData, 0, 0);
}

export default function TintedLogo({ size = 96, isGoodWin, style, ...rest }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (imgRef.current) {
      recolor(canvas, imgRef.current, isGoodWin ? 215 : 0, size);
      return;
    }
    const img = new Image();
    imgRef.current = img;
    img.onload = () => recolor(canvas, img, isGoodWin ? 215 : 0, size);
    img.src = SRC;
  }, [isGoodWin, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block', ...style }} {...rest} />;
}