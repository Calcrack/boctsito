// ── Motor de decisiones de montaje (Addendum 2 §C) ───────────────────
// El Narrador decide TODO antes de empezar. Este módulo, a partir de los
// personajes asignados a asientos, ENUMERA cada decisión oculta que el guion
// exige, SUGIERE un default válido (opcional) y VALIDA que todo esté resuelto.
// Es PURO y dirigido por datos: lee los tags `setup`/`info`/`misperception`
// del catálogo (server/campaigns/*). Añadir un rol = añadir datos, no código.
const { ROLES, getCampaign } = require('./roles');

// ── Helpers de contexto ──────────────────────────────────────────────
// Construye un contexto homogéneo desde el `game` (o desde args de test).
function buildCtx(game) {
  const setup = game.setup || {};
  const seatOrder = (setup.seatOrder && setup.seatOrder.length)
    ? setup.seatOrder
    : game.players.map(p => p.id);
  const seats = seatOrder
    .map(id => game.players.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ id: p.id, name: p.name }));
  const assignments = setup.assignments || {};
  const campaign = getCampaign(game.campaignId);
  const rolesInPlay = new Set(Object.values(assignments));
  return { seats, assignments, campaign, rolesInPlay };
}

function roleOf(ctx, seatId) { return ROLES[ctx.assignments[seatId]] || null; }
function nameOf(ctx, seatId) { return ctx.seats.find(s => s.id === seatId)?.name || '?'; }

function goodRolesNotInPlay(ctx) {
  return Object.values(ctx.campaign.roles)
    .filter(r => r.alignment === 'good' && !ctx.rolesInPlay.has(r.id) && !r.misperception)
    .map(r => r.id);
}
function rolesByTypeInPlay(ctx, type) {
  return ctx.seats.filter(s => ROLES[ctx.assignments[s.id]]?.type === type);
}
function seatsExcept(ctx, exceptIds) {
  const ex = new Set(exceptIds);
  return ctx.seats.filter(s => !ex.has(s.id));
}
// Vecinos en el círculo (orden de asientos).
function neighbors(ctx, seatId) {
  const i = ctx.seats.findIndex(s => s.id === seatId);
  if (i === -1 || ctx.seats.length < 2) return [];
  const n = ctx.seats.length;
  return [ctx.seats[(i - 1 + n) % n], ctx.seats[(i + 1) % n]];
}

const pick = arr => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
const sample = (arr, k) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
};

// ¿Debe la info de este asiento ser FORZOSAMENTE falsa? (envenenado/borracho/Vortox)
function mustBeFalseFor(ctx, seatId) {
  const role = roleOf(ctx, seatId);
  if (role?.misperception) return true;                 // Borracho/Marioneta/Lunático
  if (ctx.rolesInPlay.has('VORTOX')) return true;       // Vortox → Aldeanos dan info falsa
  return false;
}

// ── computeRequiredDecisions(game) → Decision[] ──────────────────────
// Cada Decision lleva un `id` estable (kind+seat) para que el cliente la
// mapee y el servidor fusione el valor elegido sin perder el resto.
function computeRequiredDecisions(game) {
  const ctx = buildCtx(game);
  const prev = indexById(game.setup?.decisions || []);
  const out = [];
  const keep = d => out.push({ ...d, ...(prev[d.id] ? pickChosen(prev[d.id]) : {}) });

  for (const seat of ctx.seats) {
    const role = roleOf(ctx, seat.id);
    if (!role) continue;
    const m = role.misperception;
    const s = role.setup || {};
    const info = role.info || {};

    // 1) Identidad falsa (Marioneta/Borracho/Lunático)
    if (m) {
      const kindRole = role.id === 'DRUNK' ? 'drunk' : (m.believes === 'demon' ? 'lunatic' : 'marionette');
      const dec = {
        id: `identidadFalsa:${seat.id}`, kind: 'identidadFalsa', seat: seat.id, seatName: seat.name,
        role: kindRole, realRole: role.id,
        chosenGoodRole: null,
        consequence: `${seat.name} creerá ser su identidad falsa; toda su info se enruta por ahí (su rol real nunca se le revela).`,
      };
      if (kindRole === 'lunatic') {
        dec.lunatic = { perceivedDemon: null, fakeMinions: [], bluffs: [], firstNightFakeKill: null };
      }
      keep(dec);
    }

    // 2) Forasteros fijos (Barón/Fang Gu/Vigormortis)
    if (typeof s.outsiderModifier === 'number') {
      const base = ctx.campaign.distribution[ctx.seats.length]?.outsiders ?? 0;
      keep({
        id: `forasteros:${seat.id}`, kind: 'forasteros', seat: seat.id, seatName: seat.name,
        modifier: s.outsiderModifier, expected: Math.max(0, base + s.outsiderModifier),
        chosen: [],
        consequence: `${role.name} modifica el nº de Forasteros (${s.outsiderModifier > 0 ? '+' : ''}${s.outsiderModifier}). Confirma cuáles entran.`,
      });
    }

    // 2b) Forasteros con elección del narrador (Padrino: -1 o +1)
    if (s.outsiderModifierChoice) {
      const base = ctx.campaign.distribution[ctx.seats.length]?.outsiders ?? 0;
      keep({
        id: `outsiderModifierChoice:${seat.id}`, kind: 'outsiderModifierChoice',
        seat: seat.id, seatName: seat.name,
        options: s.outsiderModifierChoice, // [-1, 1]
        chosenModifier: null,
        chosen: [],
        expected: null, // se calcula al elegir el modificador
        base,
        consequence: `${role.name}: elige si entran +1 o -1 Forastero, luego confirma cuáles.`,
      });
    }

    // 6) Registro inicial (Espía/Recluso)
    if (s.registersAs) {
      keep({
        id: `registroInicial:${seat.id}`, kind: 'registroInicial', seat: seat.id, seatName: seat.name,
        registersAs: s.registersAs === 'evilOptional' ? 'good' : s.registersAs,
        options: s.registersAs === 'evilOptional' ? ['good', 'minion', 'demon'] : ['good', 'evil'],
        consequence: 'Cómo registra por defecto a ojos de las habilidades (editable cada noche).',
      });
    }

    // 7) Otros secretos del guion (Gemela Malvada, Padrino…)
    if (s.otherSecret) {
      keep({
        id: `otroSecreto:${s.otherSecret}:${seat.id}`, kind: 'otroSecreto', secret: s.otherSecret,
        seat: seat.id, seatName: seat.name,
        targetSeat: s.otherSecret === 'evilTwin' ? null : undefined,
        consequence: s.otherSecret === 'evilTwin'
          ? 'Empareja a la Gemela Malvada con un jugador de alineación opuesta (se conocen).'
          : `Secreto de montaje: ${s.otherSecret}.`,
      });
    }

    // 8) Maestro de Acertijos — jugador borracho (elegido en setup, no en noche)
    if (s.puzzlemasterDrunk) {
      keep({
        id: `puzzlemasterDrunk:${seat.id}`, kind: 'puzzlemasterDrunk',
        seat: seat.id, seatName: seat.name, chosen: null,
        consequence: 'Un jugador distinto al Maestro queda borracho todo el juego.',
      });
    }

    // 9) Alquimista — habilidad de Esbirro (elegida en setup)
    if (s.alchemistAbility) {
      keep({
        id: `alchemistAbility:${seat.id}`, kind: 'alchemistAbility',
        seat: seat.id, seatName: seat.name, chosen: null,
        consequence: 'El Alquimista tendrá la habilidad del Esbirro elegido durante toda la partida.',
      });
    }

    // 10) Rata de Laboratorio — habilidad buena que tendrá el Demonio
    if (s.boffinAbility) {
      keep({
        id: `boffinAbility:${seat.id}`, kind: 'boffinAbility',
        seat: seat.id, seatName: seat.name, chosen: null,
        consequence: 'El Demonio tendrá la habilidad del bueno elegido toda la partida. Ambos lo saben desde noche 1.',
      });
    }

    // 11) Invocador — preparación especial (solo aviso, auto-resuelto)
    if (s.summonerSetup) {
      keep({
        id: `summonerSetup:${seat.id}`, kind: 'summonerSetup',
        seat: seat.id, seatName: seat.name, chosen: true,
        consequence: 'Quitar la ficha de Demonio del saco y añadir 1 Aldeano. El Invocador recibe 3 bluffs en noche 1. En noche 3, elige jugador + tipo de Demonio.',
      });
    }

  }
  return out;
}


// ── suggestDecision(decision, game) → decision con valor por defecto ──
// Atajo opcional: replica la lógica aleatoria histórica como SUGERENCIA.
function suggestDecision(decision, game) {
  const ctx = buildCtx(game);
  const d = { ...decision };
  switch (d.kind) {
    case 'identidadFalsa': {
      const pool = goodRolesNotInPlay(ctx);
      if (d.role === 'drunk') {
        const tf = pool.filter(id => ROLES[id]?.type === 'townfolk');
        d.chosenGoodRole = pick(tf.length ? tf : pool);
      } else if (d.role === 'lunatic') {
        const demon = ctx.seats.find(s => ROLES[ctx.assignments[s.id]]?.type === 'demon' && s.id !== d.seat);
        d.chosenGoodRole = null; // el Lunático cree ser el Demonio
        d.lunatic = {
          perceivedDemon: ROLES[ctx.assignments[demon?.id]]?.id || pick(Object.values(ctx.campaign.roles).filter(r => r.type === 'demon').map(r => r.id)),
          fakeMinions: sample(seatsExcept(ctx, [d.seat]).map(s => s.id), Math.min(1, ctx.seats.length - 1)),
          bluffs: sample(pool, Math.min(3, pool.length)),
          firstNightFakeKill: pick(seatsExcept(ctx, [d.seat]).map(s => s.id)),
        };
      } else {
        d.chosenGoodRole = pick(pool);
      }
      break;
    }
    case 'forasteros':
      d.chosen = rolesByTypeInPlay(ctx, 'outsider').map(s => ctx.assignments[s.id]);
      break;
    case 'registroInicial':
      d.registersAs = d.options[0];
      break;
    case 'otroSecreto':
      if (d.secret === 'evilTwin') {
        const opp = ctx.seats.filter(s => ROLES[ctx.assignments[s.id]]?.alignment === 'evil');
        d.targetSeat = pick(opp.map(s => s.id));
      }
      break;
  }
  return d;
}

// ── isSetupComplete(decisions) → boolean ─────────────────────────────
// El montaje no se marca "listo" hasta que TODAS las decisiones tienen valor.
function isDecisionResolved(d) {
  switch (d.kind) {
    case 'identidadFalsa':
      if (d.role === 'lunatic') return !!d.lunatic?.perceivedDemon;
      return !!d.chosenGoodRole;
    case 'forasteros':         return Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case 'registroInicial':    return !!d.registersAs;
    case 'otroSecreto':        return d.secret !== 'evilTwin' || !!d.targetSeat;
    case 'puzzlemasterDrunk':  return !!d.chosen;
    case 'alchemistAbility':   return !!d.chosen;
    case 'boffinAbility':      return !!d.chosen;
    case 'outsiderModifierChoice':
      if (d.chosenModifier == null) return false;
      return Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case 'summonerSetup':      return true;
    default: return true;
  }
}
function isSetupComplete(decisions) {
  return (decisions || []).every(isDecisionResolved);
}

// ── utilidades internas ──────────────────────────────────────────────
function indexById(arr) { const m = {}; for (const d of arr) m[d.id] = d; return m; }
function pickChosen(prev) {
  const { chosenGoodRole, lunatic, chosen, targetSeat, registersAs, chosenModifier, expected } = prev;
  const out = {};
  if (chosenGoodRole !== undefined) out.chosenGoodRole = chosenGoodRole;
  if (lunatic !== undefined) out.lunatic = lunatic;
  if (chosen !== undefined) out.chosen = chosen;
  if (targetSeat !== undefined) out.targetSeat = targetSeat;
  if (registersAs !== undefined) out.registersAs = registersAs;
  if (chosenModifier !== undefined) out.chosenModifier = chosenModifier;
  if (expected !== undefined) out.expected = expected;
  return out;
}

// ── renderInfoString: convierte la decisión de info en el texto de voz ──
// que el Narrador leerá la 1ª noche (pre-rellenado, sin azar en vivo).
const INFO_EMOJI = {
  WASHERWOMAN: '🧺', LIBRARIAN: '📚', INVESTIGATOR: '🔍', COOK: '🍳', EMPATH: '💞',
  CLOCKMAKER: '🕰️', GRANDMOTHER: '👵', GODFATHER: '🎩', BOUNTY_HUNTER: '🎯', STEWARD: '🤵',
};
function renderInfoString(game, d) {
  const ctx = buildCtx(game);
  const nm = id => ctx.seats.find(s => s.id === id)?.name || '?';
  const c = d.chosen;
  if (!c) return null;
  const roleName = ROLES[d.role]?.name || '';
  const emoji = INFO_EMOJI[d.role] || 'ℹ️';
  switch (d.infoKind) {
    case 'pairOfType': {
      const role = c.shownRole || ROLES[ctx.assignments[c.trueSeat]]?.name || '?';
      return `${emoji} ${roleName}\nEntre ${nm(c.trueSeat)} y ${nm(c.decoySeat)} hay un/una ${role}.`;
    }
    case 'count':
      return d.params?.what === 'evilPairs'
        ? `${emoji} ${roleName}\nHay ${c.value} pareja(s) de vecinos malvados.`
        : `${emoji} ${roleName}\nTienes ${c.value} vecino(s) malvado(s) vivos.`;
    case 'clockmaker':
      return `${emoji} ${roleName}\nDistancia entre el Demonio y su Esbirro más cercano: ${c.value}.`;
    case 'knowGoodPlayer':
      return `${emoji} ${roleName}\n${nm(c.seat)} es ${c.role}.`;
    case 'knowEvilPlayer':
      return `${emoji} ${roleName}\nUn jugador malvado: ${nm(c.seat)}.`;
    case 'knowOutsiders':
      return `${emoji} ${roleName}\nForasteros en juego: ${(c.outsiders || []).join(', ') || 'ninguno'}.`;
    case 'stewardNeighbors':
      return `${emoji} ${roleName}\nVecinos: ${(c.neighbors || []).map(nm).join(', ')}.`;
    default:
      return c.text || null;
  }
}

module.exports = {
  computeRequiredDecisions,
  suggestDecision,
  isSetupComplete,
  isDecisionResolved,
  renderInfoString,
  // exportados para tests / integración
  buildCtx,
};
