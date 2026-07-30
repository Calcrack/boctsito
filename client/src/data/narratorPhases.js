// ── Mapa de fases del narrador ───────────────────────────────────────
// Tabla declarativa: qué es cada fase, cómo se llama en castellano y qué
// bloques se pintan en la columna "Ahora". La acción principal (el botón
// que hace avanzar la partida) también sale de aquí, para que la topbar y
// los atajos de teclado usen exactamente la misma.

export const PHASES = {
  lobby:       { label: 'Montaje',      icon: '🎬', blocks: ['setup'] },
  role_reveal: { label: 'Reparto',      icon: '🎭', blocks: ['reveal', 'roster'] },
  first_night: { label: 'Primera noche', icon: '🌙', blocks: ['guide', 'nightSettings', 'roster'] },
  night:       { label: 'Noche',        icon: '🌙', blocks: ['guide', 'nightSettings', 'roster'] },
  day:         { label: 'Día',          icon: '☀', blocks: ['day', 'roster'] },
  nominations: { label: 'Nominaciones', icon: '⚖', blocks: ['nominations', 'roster'] },
  voting:      { label: 'Votación',     icon: '🗳', blocks: ['nominations', 'roster'] },
  game_over:   { label: 'Fin de la partida', icon: '🏁', blocks: [] },
};

export function phaseInfo(game) {
  const base = PHASES[game?.phase] || { label: game?.phase || '—', icon: '·', blocks: [] };
  const n = game?.nightNumber ?? 0;
  const d = game?.dayNumber ?? 0;
  let label = base.label;
  if (game?.phase === 'night') label = `Noche ${n}`;
  if (game?.phase === 'day') label = `Día ${d}`;
  if (game?.phase === 'nominations') label = `Nominaciones · Día ${d}`;
  if (game?.phase === 'voting') label = `Votación · Día ${d}`;
  return { ...base, label };
}

export function hasBlock(game, block) {
  return (PHASES[game?.phase]?.blocks || []).includes(block);
}

// ── Acción principal ────────────────────────────────────────────────
// Devuelve { label, note, tone, run, disabled, secondary } o null.
// `tone`: 'primary' | 'danger'.  `run(send)` ejecuta el paso.
// En lobby no hay acción de motor: se abre el asistente de montaje, por eso
// devuelve `openWizard` en vez de `run`.
export function mainAction(game) {
  if (!game) return null;
  const { phase, players = [] } = game;

  if (phase === 'lobby') {
    return {
      label: '🎬 Montar partida',
      note: players.length < 5
        ? `${players.length} jugador(es) — hacen falta 5 para empezar`
        : `${players.length} jugadores listos`,
      tone: 'primary',
      openWizard: true,
      disabled: players.length < 1,
    };
  }

  if (phase === 'role_reveal') {
    return {
      label: '🌙 Iniciar primera noche',
      note: `Reparto hecho · enséñale su personaje a cada uno de los ${players.length}`,
      tone: 'primary',
      run: send => send('START_NIGHT', {}),
    };
  }

  if (phase === 'first_night' || phase === 'night') {
    const deaths = (game.nightDeaths || []).map(id => players.find(p => p.id === id)?.name).filter(Boolean);
    const readyCount = game.nightReadyCount || 0;
    const readyTotal = game.nightReadyTotal || 0;
    const allReady = readyTotal > 0 && readyCount >= readyTotal;
    const waiting = game.autoMode && !allReady;
    return {
      label: `☀ Amanecer → Día ${(game.dayNumber || 0) + 1}`,
      note: deaths.length ? `Mueren: ${deaths.join(', ')}` : 'Nadie muere esta noche',
      tone: 'primary',
      disabled: waiting,
      run: send => send('START_DAY', { nightDeaths: deaths }),
      secondary: waiting
        ? { label: 'Forzar amanecer', run: send => send('START_DAY', { nightDeaths: deaths }) }
        : null,
    };
  }

  if (phase === 'day') {
    return {
      label: '⚖ Abrir nominaciones',
      note: 'Fase de discusión libre',
      tone: 'primary',
      run: send => send('OPEN_NOMINATIONS', {}),
      secondary: { label: 'Saltar a la noche', run: send => send('START_NIGHT', {}) },
    };
  }

  if (phase === 'voting') {
    const nom = (game.nominations || []).find(n => n.id === game.activeNomination);
    if (nom && nom.stage === 'arguments') {
      return {
        label: '🗳 Abrir votación',
        note: `${nom.nominatorName} acusa a ${nom.nomineeName}`,
        tone: 'primary',
        run: send => send('OPEN_VOTING', { nominationId: nom.id }),
      };
    }
    if (nom) {
      const pending = Array.isArray(nom.pendingVoters) ? nom.pendingVoters.length : 0;
      return {
        label: '✔ Cerrar votación',
        note: pending > 0 ? `${pending} sin votar` : 'Todos han votado',
        tone: 'danger',
        run: send => send('RESOLVE_VOTE', { nominationId: nom.id }),
      };
    }
    return null;
  }

  if (phase === 'nominations') {
    const eligible = (game.nominations || []).filter(n => n.resolved && n.meetsThreshold && !n.executed && !n.tieSkipped);
    if (eligible.length > 0) {
      const maxTally = Math.max(...eligible.map(n => n.tally));
      const tied = eligible.filter(n => n.tally === maxTally);
      const sole = tied.length === 1 ? tied[0] : null;
      return {
        label: sole ? `☠ Ejecutar a ${sole.nomineeName}` : `Finalizar (empate a ${maxTally})`,
        note: `${eligible.length} nominación(es) con votos suficientes`,
        tone: 'danger',
        run: send => send('FINALIZE_NOMINATIONS', {}),
        secondary: { label: 'Noche sin ejecución', run: send => send('START_NIGHT', {}) },
      };
    }
    return {
      label: '🌙 Iniciar noche',
      note: 'Sin nominaciones con votos suficientes',
      tone: 'primary',
      run: send => send('START_NIGHT', {}),
    };
  }

  return null;
}
