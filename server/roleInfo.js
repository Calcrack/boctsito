// ── Información automática de personajes (capa @auto del gherkin) ────
// Cada entrada devuelve el texto que el Narrador lee (o que el jugador ve en
// modo automático). Es PURA respecto al motor: solo lee `game` y `player`.
//
// Convenciones del gherkin:
//   · "borracho o envenenado" ⇒ la información puede ser falsa, pero SIEMPRE
//     se genera algo plausible, nunca "nada".
//   · Vortox ⇒ toda la información de los Aldeanos es falsa.
const { ROLES } = require('./roles');

// ── helpers ──────────────────────────────────────────────────────────
const rand = arr => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function falsify(real, min, max) {
  const opts = [];
  for (let i = min; i <= max; i++) if (i !== real) opts.push(i);
  return opts.length ? rand(opts) : min;
}
const nameOf = p => (p ? p.name : '?');
const roleName = id => ROLES[id]?.name || id;

// ¿Este jugador recibe información alterada?
function isImpaired(game, player) {
  if (player.poisoned) return true;
  if (player.drunkAs) return true;
  if ((player.tokens || []).some(t => ['POISONED', 'DRUNK_NIGHT', 'DRUNK'].includes(t.type))) return true;
  // Vortox sano en juego: los Aldeanos reciben información falsa.
  const vortox = game.players.find(p => p.role === 'VORTOX' && p.alive && !p.poisoned);
  if (vortox && player.type === 'townfolk') return true;
  return false;
}

// Registro de alineación a ojos de las habilidades (Espía/Recluso).
function registersEvil(game, p) {
  if (p.role === 'SPY') return game.spyRegistersAs === 'good' ? false : p.alignment === 'evil';
  if (p.role === 'RECLUSE') return !!game.recluseRegistersAs || !!game.recluseRegistersAsEvil;
  return p.alignment === 'evil';
}
function registersDemon(game, p) {
  if (p.role === 'RECLUSE' && game.recluseRegistersAs === 'demon') return true;
  return p.type === 'demon';
}

const living = game => game.players.filter(p => p.alive);
const others = (game, player) => game.players.filter(p => p.id !== player.id);
const livingOthers = (game, player) => living(game).filter(p => p.id !== player.id);

// Distancia mínima en asientos entre dos jugadores del círculo completo.
function seatDistance(game, a, b) {
  const n = game.players.length;
  const i = game.players.findIndex(p => p.id === a.id);
  const j = game.players.findIndex(p => p.id === b.id);
  if (i < 0 || j < 0) return 0;
  const d = Math.abs(i - j);
  return Math.min(d, n - d);
}

// ── Generadores por personaje ────────────────────────────────────────
// firstNight: solo la noche 1 · otherNights: noche ≥2 · always: todas.
const GENERATORS = {

  // ── Relojero: distancia entre el Demonio y su Esbirro más cercano ──
  CLOCKMAKER: { when: 'first', gen(game, p) {
    const demon = game.players.find(x => x.type === 'demon');
    const minions = game.players.filter(x => x.type === 'minion');
    if (!demon) return '🕰️ Relojero\nNo hay Demonio en el círculo.';
    const real = minions.length
      ? Math.min(...minions.map(m => seatDistance(game, demon, m)))
      : 0;
    const value = isImpaired(game, p)
      ? falsify(real, 1, Math.max(2, Math.floor(game.players.length / 2)))
      : real;
    return `🕰️ Relojero\nDistancia entre el Demonio y su Esbirro más cercano: ${value}.`;
  }},

  // ── Administrador: conoce 1 jugador bueno ─────────────────────────
  STEWARD: { when: 'first', gen(game, p) {
    const pool = livingOthers(game, p).filter(x => !registersEvil(game, x));
    const fake = livingOthers(game, p).filter(x => registersEvil(game, x));
    const target = isImpaired(game, p)
      ? (rand(fake) || rand(livingOthers(game, p)))
      : rand(pool);
    if (!target) return '🤵 Administrador\nNo hay a quién señalar.';
    return `🤵 Administrador\n${target.name} es bueno.`;
  }},

  // ── Shugenja: el malvado más cercano, ¿izquierda o derecha? ───────
  SHUGENJA: { when: 'first', gen(game, p) {
    const seats = game.players;
    const n = seats.length;
    const me = seats.findIndex(x => x.id === p.id);
    let dl = null, dr = null;
    for (let k = 1; k < n; k++) {
      if (dr == null && registersEvil(game, seats[(me + k) % n])) dr = k;
      if (dl == null && registersEvil(game, seats[(me - k + n) % n])) dl = k;
    }
    let side;
    if (dl == null && dr == null) side = 'derecha';
    else if (dl == null) side = 'derecha';
    else if (dr == null) side = 'izquierda';
    else side = dl <= dr ? 'izquierda' : 'derecha';
    if (isImpaired(game, p)) side = side === 'izquierda' ? 'derecha' : 'izquierda';
    return `⛩️ Shugenja\nEl malvado más cercano está a tu ${side}.`;
  }},

  // ── Noble: 3 jugadores, exactamente 1 malvado ─────────────────────
  NOBLE: { when: 'first', gen(game, p) {
    const pool = livingOthers(game, p);
    const evil = pool.filter(x => registersEvil(game, x));
    const good = pool.filter(x => !registersEvil(game, x));
    let trio;
    if (isImpaired(game, p) || evil.length === 0) {
      trio = shuffle(pool).slice(0, 3);
    } else {
      trio = shuffle([rand(evil), ...shuffle(good).slice(0, 2)].filter(Boolean));
    }
    if (trio.length < 3) return '👑 Noble\nNo hay suficientes jugadores.';
    return `👑 Noble\nExactamente 1 de estos 3 es malvado: ${trio.map(nameOf).join(', ')}.`;
  }},

  // ── Caballero: 2 jugadores que NO son el Demonio ──────────────────
  KNIGHT: { when: 'first', gen(game, p) {
    const pool = livingOthers(game, p);
    const safe = pool.filter(x => !registersDemon(game, x));
    const demon = pool.find(x => registersDemon(game, x));
    let pair;
    if (isImpaired(game, p) && demon) pair = shuffle([demon, rand(safe)].filter(Boolean));
    else pair = shuffle(safe).slice(0, 2);
    if (pair.length < 2) return '🛡️ Caballero\nNo hay suficientes jugadores.';
    return `🛡️ Caballero\nNinguno de estos 2 es el Demonio: ${pair.map(nameOf).join(', ')}.`;
  }},

  // ── Cazarrecompensas: 1 jugador malvado (y otro si ese muere) ─────
  BOUNTY_HUNTER: { when: 'always', gen(game, p) {
    const known = p.bountyKnownId ? game.players.find(x => x.id === p.bountyKnownId) : null;
    // Solo vuelve a hablar si aún no sabe a nadie o el conocido ha muerto.
    if (game.nightNumber > 1 && known && known.alive) return null;
    const pool = others(game, p).filter(x => registersEvil(game, x) && x.id !== p.bountyKnownId);
    const target = isImpaired(game, p)
      ? rand(others(game, p).filter(x => !registersEvil(game, x)))
      : rand(pool);
    if (!target) return '🎯 Cazarrecompensas\nNo queda ningún malvado que señalar.';
    p.bountyKnownId = target.id;
    return `🎯 Cazarrecompensas\nUn jugador malvado: ${target.name}.`;
  }},

  // ── Oráculo: cuántos muertos son malvados ─────────────────────────
  ORACLE: { when: 'other', gen(game, p) {
    const dead = game.players.filter(x => !x.alive);
    const real = dead.filter(x => registersEvil(game, x)).length;
    const value = isImpaired(game, p) ? falsify(real, 0, Math.max(1, dead.length)) : real;
    return `🔮 Oráculo\nHay ${value} jugador(es) muerto(s) malvado(s).`;
  }},

  // ── Florista: ¿votó hoy el Demonio? ─────────────────────
  FLOWERGIRL: { when: 'other', gen(game, p) {
    const demonIds = new Set(game.players.filter(x => x.type === 'demon').map(x => x.id));
    const real = (game.nominations || []).some(n => (n.votes || []).some(v => demonIds.has(v)));
    const value = isImpaired(game, p) ? !real : real;
    return `🌸 Florista\nEl Demonio ${value ? 'SÍ' : 'NO'} votó hoy.`;
  }},

  // ── Pregonero: ¿nominó hoy algún Esbirro? ─────────────────────────
  TOWN_CRIER: { when: 'other', gen(game, p) {
    const minionIds = new Set(game.players.filter(x => x.type === 'minion').map(x => x.id));
    const real = (game.nominations || []).some(n => minionIds.has(n.nominatorId));
    const value = isImpaired(game, p) ? !real : real;
    return `📢 Pregonero\n${value ? 'SÍ' : 'NO'} nominó ningún Esbirro hoy.`;
  }},

  // ── Matemático: cuántas habilidades funcionaron de forma anormal ──
  MATHEMATICIAN: { when: 'always', gen(game, p) {
    const ALTERING = new Set(['POISONED', 'DRUNK_NIGHT', 'DRUNK', 'EXORCISED', 'WITCH_CURSED', 'SAFE_TONIGHT', 'PROTECTED']);
    const real = game.players.filter(x =>
      (x.tokens || []).some(t => ALTERING.has(t.type) && t.nightApplied === game.nightNumber)
    ).length;
    const value = isImpaired(game, p) ? falsify(real, 0, Math.max(2, real + 1)) : real;
    return `🧮 Matemático\n${value} habilidad(es) funcionaron de forma anormal.`;
  }},

  // ── Aeronauta: cada noche, un jugador de un tipo distinto al de ayer ──
  BALLOONIST: { when: 'always', gen(game, p) {
    const last = p.balloonistLastType || null;
    let pool = livingOthers(game, p).filter(x => x.type !== last);
    if (!pool.length) pool = livingOthers(game, p);
    const target = rand(pool);
    if (!target) return '🎈 Aeronauta\nNo queda a quién señalar.';
    p.balloonistLastType = target.type;
    const shown = isImpaired(game, p) ? rand(livingOthers(game, p)) : target;
    return `🎈 Aeronauta\n${shown.name} es de tipo ${roleName(shown.type) || shown.type}.`;
  }},

  // ── Rey: si los muertos igualan o superan a los vivos, un personaje vivo ──
  KING: { when: 'always', gen(game, p) {
    const dead = game.players.filter(x => !x.alive).length;
    const alive = game.players.filter(x => x.alive).length;
    if (dead < alive) return null;
    const target = rand(livingOthers(game, p));
    if (!target) return null;
    const shown = isImpaired(game, p)
      ? rand((game.rolesNotInPlay || []).length ? game.rolesNotInPlay : [target.role])
      : target.role;
    return `👑 Rey\nUn personaje vivo: ${roleName(shown)}.`;
  }},

  // ── Cultivador de Opio: sabe cuándo el Mal se reconoce ──────
  POPPY_GROWER: { when: 'always', gen(game, p) {
    if (!p.alive) return null;
    return '🌺 Cultivador de Opio\nLos Esbirros y el Demonio NO se conocen mientras vivas.';
  }},

  // ── Mago: el Demonio y los Esbirros lo perciben al revés ─────────
  MAGICIAN: { when: 'first', gen() {
    return '🎩 Mago\nEl Demonio cree que eres un Esbirro; los Esbirros creen que eres el Demonio.';
  }},

  // ── Sereno: se revela a un jugador (una vez) ──────────
  NIGHTWATCHMAN: { when: 'always', gen(game, p) {
    if (p.nightwatchmanUsed) return null;
    return '🔦 Sereno\nPuedes elegir un jugador: aprende que eres el Sereno.';
  }},
};

// Info reactiva: se dispara cuando el Demonio mata a alguien.
function onDemonKill(game, victim, addDeferred) {
  // Sabio: aprende 2 jugadores, uno es el Demonio.
  if (victim.role === 'SAGE' && !victim.poisoned) {
    const demon = game.players.find(x => x.type === 'demon');
    const decoy = rand(game.players.filter(x => x.id !== victim.id && x.type !== 'demon'));
    if (demon && decoy) {
      const pair = shuffle([demon, decoy]);
      victim.nightInfo = `🧙 Sabio\nUno de estos 2 es el Demonio: ${pair.map(nameOf).join(', ')}.`;
    }
  }
  // Banshee: todos se enteran y puede nominar dos veces al día.
  if (victim.role === 'BANSHEE' && !victim.poisoned) {
    victim.bansheeActive = true;
    addDeferred(game, {
      label: `👻 Banshee: ${victim.name} murió a manos del Demonio. Anúncialo a todos — a partir de ahora puede nominar DOS veces al día.`,
      dueNight: game.nightNumber, sourcePlayerId: victim.id, severity: 'warn', role: 'BANSHEE',
    });
  }
  // Niño de Coro: si el Demonio mata al Rey, aprende quién es el Demonio.
  if (victim.role === 'KING') {
    const choirboy = game.players.find(x => x.role === 'CHOIRBOY' && x.alive && !x.poisoned);
    const demon = game.players.find(x => x.type === 'demon');
    if (choirboy && demon) {
      choirboy.nightInfo = `🎼 Niño de Coro\nEl Demonio es: ${demon.name}.`;
    }
  }
  // Granjero: al morir de noche, un buen jugador vivo se convierte en Granjero.
  if (victim.role === 'FARMER' && !victim.poisoned) {
    addDeferred(game, {
      label: `🌾 Granjero: ${victim.name} murió de noche — elige un jugador BUENO vivo que se convierta en Granjero (usa "Cambiar rol").`,
      dueNight: game.nightNumber, sourcePlayerId: victim.id, severity: 'warn', role: 'FARMER',
    });
  }
}

// Punto de entrada: devuelve el texto de este personaje esta noche, o null.
function autoInfo(game, player) {
  const roleId = player.role === 'DRUNK' ? player.drunkAs : player.role;
  const g = GENERATORS[roleId];
  if (!g) return null;
  const isFirst = game.nightNumber === 1;
  if (g.when === 'first' && !isFirst) return null;
  if (g.when === 'other' && isFirst) return null;
  try { return g.gen(game, player); } catch (e) { return null; }
}

const AUTO_INFO_ROLES = new Set(Object.keys(GENERATORS));

module.exports = { autoInfo, onDemonKill, AUTO_INFO_ROLES, GENERATORS };
