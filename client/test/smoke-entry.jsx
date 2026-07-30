// Smoke test: el panel del narrador debe renderizar en TODAS las fases.
// Cachea fallos que el build no ve (variables inexistentes, props rotas).
import './smoke-shim.js';
import React from 'react';
import { renderToString } from 'react-dom/server';
import NarratorPanel from '../src/components/NarratorPanel';
import { SCENARIOS, setScenario } from './smoke-stub.jsx';

// Marcadores que DEBEN aparecer en cada fase
const MUST = {
  lobby:       ['Montaje', 'Montar partida', 'Campaña'],
  role_reveal: ['Reparto', 'Enseñar personaje', 'Iniciar primera noche'],
  first_night: ['Primera noche', 'Guía de la noche', 'Jugadores', 'Amanecer'],
  night:       ['Noche 2', 'Guía de la noche', 'paso', 'Amanecer', 'Pendiente', 'Decides tú', 'Registro'],
  day:         ['Día 2', 'Abrir nominaciones', 'Nueva nominación'],
  nominations: ['Nominaciones', 'Ejecutar a Jugador 3'],
  voting:      ['Votación', 'Cerrar votación'],
};
// Lo que ya NO debe existir en ningún sitio
const MUST_NOT = ['Acciones de Noche', 'first_night ·'];

const lines = [];
let fails = 0;
for (const key of Object.keys(SCENARIOS)) {
  setScenario(key);
  try {
    const html = renderToString(React.createElement(NarratorPanel));
    const missing = (MUST[key] || []).filter(m => !html.includes(m));
    const forbidden = MUST_NOT.filter(m => html.includes(m));
    if (missing.length || forbidden.length) {
      fails++;
      lines.push(`FALLA ${key.padEnd(12)} falta: [${missing.join(', ')}] sobra: [${forbidden.join(', ')}]`);
    } else {
      lines.push(`OK    ${key.padEnd(12)} ${html.length} bytes`);
    }
  } catch (e) {
    fails++;
    lines.push(`FALLA ${key.padEnd(12)} ${e.message}`);
  }
}
console.log(lines.join('\n'));
console.log(fails === 0 ? '\nTODAS LAS FASES RENDERIZAN' : `\n${fails} FASES ROTAS`);
process.exitCode = fails === 0 ? 0 : 1;
