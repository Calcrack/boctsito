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

    // 2) Bluffs del Demonio
    if (s.demonBluffs) {
      keep({
        id: `bluffsDemonio:${seat.id}`, kind: 'bluffsDemonio', seat: seat.id, seatName: seat.name,
        count: s.demonBluffs, chosen: [],
        consequence: `El Demonio (${seat.name}) fingirá ser uno de estos ${s.demonBluffs} roles buenos no en juego.`,
      });
    }

    // 3) Falso positivo de la Adivina (red herring)
    if (s.redHerring) {
      keep({
        id: `falsoPositivoAdivina:${seat.id}`, kind: 'falsoPositivoAdivina', seat: seat.id, seatName: seat.name,
        targetSeat: null,
        consequence: 'Ese jugador bueno registrará como Demonio para la Adivina (cortina de humo).',
      });
    }

    // 4) Veneno inicial (Envenenador/Pukka/Widow)
    if (s.initialPoison) {
      keep({
        id: `venenoInicial:${seat.id}`, kind: 'venenoInicial', seat: seat.id, seatName: seat.name,
        source: role.id, targetSeat: null,
        consequence: 'El objetivo queda envenenado la primera noche: su información será falsa.',
      });
    }

    // 5) Forasteros (Barón/Padrino/Fang Gu/Vigormortis)
    if (typeof s.outsiderModifier === 'number') {
      const base = ctx.campaign.distribution[ctx.seats.length]?.outsiders ?? 0;
      keep({
        id: `forasteros:${seat.id}`, kind: 'forasteros', seat: seat.id, seatName: seat.name,
        modifier: s.outsiderModifier, expected: Math.max(0, base + s.outsiderModifier),
        chosen: [],
        consequence: `${role.name} modifica el nº de Forasteros (${s.outsiderModifier > 0 ? '+' : ''}${s.outsiderModifier}). Confirma cuáles entran.`,
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

    // 8) Info de primera noche (Lavandera, Bibliotecario, Relojero, Abuela…)
    if (info.firstNight) {
      const mustBeFalse = mustBeFalseFor(ctx, seat.id);
      keep({
        id: `infoPrimeraNoche:${seat.id}`, kind: 'infoPrimeraNoche', seat: seat.id, seatName: seat.name,
        role: role.id, infoKind: info.kind, params: stripKind(info),
        options: computeInfoOptions(ctx, seat, info, mustBeFalse),
        chosen: null, mustBeFalse,
        consequence: mustBeFalse
          ? `${seat.name} recibe info FALSA (envenenado/borracho/Vortox): elige libremente qué decirle.`
          : `Elige exactamente qué información ve ${seat.name}.`,
      });
    }
  }
  // Post-proceso: si un asiento es objetivo del veneno inicial, su info de 1ª noche va FALSA.
  const poisonTargets = new Set(out.filter(d => d.kind === 'venenoInicial' && d.targetSeat).map(d => d.targetSeat));
  for (const d of out) {
    if (d.kind === 'infoPrimeraNoche' && poisonTargets.has(d.seat)) d.mustBeFalse = true;
  }
  return out;
}

// Opciones válidas que la app calcula; el Narrador elige una.
function computeInfoOptions(ctx, seat, info, mustBeFalse) {
  switch (info.kind) {
    case 'pairOfType': {
      // 2 jugadores, uno de los cuales es del tipo `targetType` (o falso).
      const trueCandidates = mustBeFalse
        ? seatsExcept(ctx, [seat.id])
        : rolesByTypeInPlay(ctx, info.targetType).filter(s => s.id !== seat.id);
      return {
        validTrue: trueCandidates.map(s => ({ id: s.id, name: s.name, role: ROLES[ctx.assignments[s.id]]?.name })),
        validDecoy: seatsExcept(ctx, [seat.id]).map(s => ({ id: s.id, name: s.name })),
        // si es falso, también puede elegir qué ROL mostrar
        roleChoices: roleNamesOfType(ctx.campaign, info.targetType),
        targetType: info.targetType,
      };
    }
    case 'count': {
      const max = info.what === 'evilNeighbors' ? 2 : Math.min(3, Math.floor(ctx.seats.length / 2));
      return { range: Array.from({ length: max + 1 }, (_, i) => i), what: info.what };
    }
    case 'clockmaker':
      return { range: Array.from({ length: Math.max(1, Math.floor(ctx.seats.length / 2)) + 1 }, (_, i) => i) };
    case 'knowGoodPlayer':
      return { players: rolesByTypeInPlay(ctx, 'townfolk').concat(rolesByTypeInPlay(ctx, 'outsider'))
        .filter(s => s.id !== seat.id).map(s => ({ id: s.id, name: s.name, role: ROLES[ctx.assignments[s.id]]?.name })) };
    case 'knowEvilPlayer':
      return { players: ctx.seats.filter(s => ROLES[ctx.assignments[s.id]]?.alignment === 'evil')
        .map(s => ({ id: s.id, name: s.name, role: ROLES[ctx.assignments[s.id]]?.name })) };
    case 'knowOutsiders':
      return { outsiders: rolesByTypeInPlay(ctx, 'outsider').map(s => ROLES[ctx.assignments[s.id]]?.name) };
    case 'stewardNeighbors':
      return { neighbors: neighbors(ctx, seat.id).map(s => ({ id: s.id, name: s.name })) };
    default:
      // Genérico: texto libre que el Narrador escribe.
      return { freeText: true };
  }
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
    case 'bluffsDemonio':
      d.chosen = sample(goodRolesNotInPlay(ctx), d.count);
      break;
    case 'falsoPositivoAdivina': {
      const goods = ctx.seats.filter(s => ROLES[ctx.assignments[s.id]]?.alignment === 'good');
      d.targetSeat = pick(goods.map(s => s.id));
      break;
    }
    case 'venenoInicial': {
      const others = seatsExcept(ctx, [d.seat]).filter(s => ROLES[ctx.assignments[s.id]]?.alignment === 'good');
      d.targetSeat = pick((others.length ? others : seatsExcept(ctx, [d.seat])).map(s => s.id));
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
    case 'infoPrimeraNoche':
      d.chosen = suggestInfo(ctx, d);
      break;
  }
  return d;
}

function suggestInfo(ctx, d) {
  const o = d.options || {};
  switch (d.infoKind) {
    case 'pairOfType': {
      const t = pick(o.validTrue || []);
      const decoy = pick((o.validDecoy || []).filter(x => x.id !== t?.id));
      return t ? { trueSeat: t.id, decoySeat: decoy?.id || null, shownRole: t.role } : null;
    }
    case 'count':
    case 'clockmaker':
      return { value: pick(o.range || [0]) };
    case 'knowGoodPlayer':
    case 'knowEvilPlayer': {
      const p = pick(o.players || []);
      return p ? { seat: p.id, role: p.role } : null;
    }
    case 'knowOutsiders':
      return { outsiders: o.outsiders || [] };
    case 'stewardNeighbors':
      return { neighbors: (o.neighbors || []).map(n => n.id) };
    default:
      return { text: '' };
  }
}

// ── isSetupComplete(decisions) → boolean ─────────────────────────────
// El montaje no se marca "listo" hasta que TODAS las decisiones tienen valor.
function isDecisionResolved(d) {
  switch (d.kind) {
    case 'identidadFalsa':
      if (d.role === 'lunatic') return !!d.lunatic?.perceivedDemon;
      return !!d.chosenGoodRole;
    case 'bluffsDemonio':   return Array.isArray(d.chosen) && d.chosen.length === d.count;
    case 'falsoPositivoAdivina': return !!d.targetSeat;
    case 'venenoInicial':   return !!d.targetSeat;
    case 'forasteros':      return Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case 'registroInicial': return !!d.registersAs;
    case 'otroSecreto':     return d.secret !== 'evilTwin' || !!d.targetSeat;
    case 'infoPrimeraNoche':return d.chosen != null;
    default: return true;
  }
}
function isSetupComplete(decisions) {
  return (decisions || []).every(isDecisionResolved);
}

// ── utilidades internas ──────────────────────────────────────────────
function indexById(arr) { const m = {}; for (const d of arr) m[d.id] = d; return m; }
// Conserva sólo los campos "elegidos" de una decisión previa al recalcular.
function pickChosen(prev) {
  const { chosenGoodRole, lunatic, chosen, targetSeat, registersAs } = prev;
  const out = {};
  if (chosenGoodRole !== undefined) out.chosenGoodRole = chosenGoodRole;
  if (lunatic !== undefined) out.lunatic = lunatic;
  if (chosen !== undefined) out.chosen = chosen;
  if (targetSeat !== undefined) out.targetSeat = targetSeat;
  if (registersAs !== undefined) out.registersAs = registersAs;
  if (prev.chosenInfo !== undefined) out.chosen = prev.chosenInfo;
  if (prev.kind === 'infoPrimeraNoche' && prev.chosen !== undefined) out.chosen = prev.chosen;
  return out;
}
function stripKind(info) { const { firstNight, everyNight, kind, ...rest } = info; return rest; }
function roleNamesOfType(campaign, type) {
  return Object.values(campaign.roles).filter(r => r.type === type).map(r => ({ id: r.id, name: r.name }));
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
