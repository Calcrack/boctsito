import React, { useState, useMemo, useRef } from 'react';
import { ROLE_BY_ID, ALL_ROLES } from '../data/roles';
import { typeLabel, MASK } from '../utils/identity';

// ── Asistente de montaje (Addendum 2 §B) ─────────────────────────────
// Iniciar partida OBLIGA a pasar por aquí. El Narrador decide TODO: roles,
// asientos y cada secreto oculto. La app calcula opciones y valida; nada se
// confirma hasta BLOQUEAR. La noche 1 queda pre-rellenada (cero azar en vivo).
const TYPES = [
  { k: 'townfolk', label: 'Aldeanos' },
  { k: 'outsider', label: 'Forasteros' },
  { k: 'minion',   label: 'Esbirros' },
  { k: 'demon',    label: 'Demonios' },
];
// Viajeros y Fabulados no cuentan para la composición, pero el Narrador debe
// poder repartirlos igualmente: sólo aparecen con el catálogo completo abierto.
const EXTRA_TYPES = [
  { k: 'traveler', label: 'Viajeros' },
  { k: 'fabled',   label: 'Fabulados' },
];
const STEPS = ['Saco', 'Asientos', 'Decisiones', 'Revisar'];

export default function SetupWizard({ game, send, onClose }) {
  const setup = game.setup || { seatOrder: [], assignments: {}, decisions: [] };
  const players = game.players;
  const roleList = (game.campaignRoles && game.campaignRoles.length)
    ? game.campaignRoles : [];
  const assignments = setup.assignments || {};
  const decisions = setup.decisions || [];

  // Catálogo COMPLETO: los 181 personajes de todas las campañas + viajeros +
  // extras. Manda el del servidor (conoce los guiones importados); la tabla
  // estática del cliente es el respaldo si el estado aún no lo trae.
  const catalog = useMemo(() => {
    const byId = new Map();
    for (const r of ALL_ROLES) byId.set(r.id, r);
    for (const r of (game.allRoles || [])) byId.set(r.id, { ...(byId.get(r.id) || {}), ...r });
    for (const r of roleList) byId.set(r.id, { ...(byId.get(r.id) || {}), ...r });
    return [...byId.values()];
  }, [game.allRoles, roleList]);

  // La campaña del SERVIDOR manda: es la única que conoce los roles de un
  // guion importado (Hechicero, Señor de Typhon, homebrew…). La tabla estática
  // del cliente solo rellena lo que falte. Sin esto, un rol que la tabla del
  // cliente desconozca se dibuja en el saco pero NO cuenta para la composición.
  const roleInfo = useMemo(() => {
    const map = { ...ROLE_BY_ID };
    for (const r of catalog) map[r.id] = { ...(ROLE_BY_ID[r.id] || {}), ...r };
    for (const r of roleList) map[r.id] = { ...(map[r.id] || {}), ...r };
    return map;
  }, [catalog, roleList]);

  // Ids de la campaña activa: sirve para marcar lo que viene "de fuera".
  const campaignIds = useMemo(() => new Set(roleList.map(r => r.id)), [roleList]);

  const [step, setStep] = useState(0);
  // El "saco" = roles disponibles para asignar. Arranca de lo ya asignado.
  const [bag, setBag] = useState(() => new Set(Object.values(assignments)));

  const baseOrder = (setup.seatOrder && setup.seatOrder.length) ? setup.seatOrder : players.map(p => p.id);
  const seatOrder = [...baseOrder, ...players.filter(p => !baseOrder.includes(p.id)).map(p => p.id)];
  const seats = seatOrder.map(id => players.find(p => p.id === id)).filter(Boolean);

  const dist = (game.campaignDistribution || {})[players.length] || null;
  const mods = game.campaignOutsiderModifiers || {};
  const minionMods = game.campaignMinionModifiers || {};
  const needed = useMemo(() => {
    if (!dist) return null;
    const d = { ...dist };
    for (const [rid, delta] of Object.entries(mods)) {
      if (bag.has(rid)) {
        d.outsiders = Math.max(0, Math.min(d.outsiders + delta, players.length - d.demons - d.minions));
        d.townfolk = players.length - d.outsiders - d.minions - d.demons;
      }
    }
    // Esbirros extra (Señor de Typhon +1). Salen de los Aldeanos.
    for (const [rid, delta] of Object.entries(minionMods)) {
      if (bag.has(rid)) {
        d.minions = Math.max(1, d.minions + delta);
        d.townfolk = Math.max(0, players.length - d.outsiders - d.minions - d.demons);
      }
    }
    return d;
  }, [dist, mods, minionMods, bag, players.length]);

  const allAssigned = seats.length > 0 && seats.every(s => assignments[s.id]);
  const unresolved = decisions.filter(d => !isResolved(d)).length;

  const toggleBag = (rid) => setBag(prev => {
    const n = new Set(prev);
    if (n.has(rid)) {
      n.delete(rid);
    } else {
      n.add(rid);
      if (rid === 'ATHEIST') {
        for (const id of [...n]) {
          if (roleInfo[id]?.alignment === 'evil') n.delete(id);
        }
      }
    }
    return n;
  });

  // Reordenar asientos: el paso 2 arrastra filas enteras, no sólo vecinos.
  const setSeatOrder = (order) => send('SETUP_SET_SEAT_ORDER', { seatOrder: order });

  const assignSeat = (seatId, roleId) => {
    const next = { ...assignments };
    if (roleId) next[seatId] = roleId; else delete next[seatId];
    send('SETUP_SET_ASSIGNMENTS', { assignments: next });
  };
  const setAssignments = (next) => send('SETUP_SET_ASSIGNMENTS', { assignments: next });

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-card" onClick={e => e.stopPropagation()}>
        {/* Cabecera + barra de pasos (fija) */}
        <div className="wizard-head">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-hot)', margin: 0 }}>
              🎬 Asistente de montaje
            </p>
            <button onClick={onClose} className="btn-night" style={{ fontSize: 13, padding: '3px 10px' }} title="Cerrar (volver al lobby)">✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)}
                className="btn-night"
                style={{ flex: 1, fontSize: 12, padding: '7px 4px', borderColor: step === i ? 'var(--gold)' : undefined, color: step === i ? 'var(--gold-hot)' : undefined }}>
                {i + 1}. {s}
              </button>
            ))}
          </div>
        </div>

        {/* Cuerpo con scroll propio */}
        <div className="wizard-body">
          {step === 0 && (
            <BagStep roleList={roleList} catalog={catalog} campaignIds={campaignIds} roleInfo={roleInfo}
              bag={bag} toggleBag={toggleBag} needed={needed} playerCount={players.length} />
          )}
          {step === 1 && (
            <SeatStep seats={seats} assignments={assignments} bag={bag} catalog={catalog} roleInfo={roleInfo}
              setSeatOrder={setSeatOrder} assignSeat={assignSeat} setAssignments={setAssignments} />
          )}
          {step === 2 && (
            <DecisionsStep decisions={decisions} seats={seats} assignments={assignments} roleList={roleList} catalog={catalog} roleInfo={roleInfo} send={send} />
          )}
          {step === 3 && (
            <ReviewStep seats={seats} assignments={assignments} decisions={decisions} roleInfo={roleInfo}
              allAssigned={allAssigned} unresolved={unresolved} send={send} />
          )}
        </div>

        {/* Navegación (fija) */}
        <div className="wizard-nav">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="btn-action" style={{ flex: 1, opacity: step === 0 ? 0.35 : 1 }}>← Atrás</button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-500)', whiteSpace: 'nowrap' }}>{step + 1}/{STEPS.length}</span>
          <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}
            className="btn-action primary" style={{ flex: 1, opacity: step === STEPS.length - 1 ? 0.35 : 1 }}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}

// ── Paso 1: el saco ──────────────────────────────────────────────────
function BagStep({ roleList, catalog, campaignIds, roleInfo, bag, toggleBag, needed, playerCount }) {
  const [q, setQ] = useState('');
  const atheistInBag = bag.has('ATHEIST');
  const have = {
    townfolk: [...bag].filter(id => roleInfo[id]?.type === 'townfolk').length,
    outsider: [...bag].filter(id => roleInfo[id]?.type === 'outsider').length,
    minion:   [...bag].filter(id => roleInfo[id]?.type === 'minion').length,
    demon:    [...bag].filter(id => roleInfo[id]?.type === 'demon').length,
  };
  const needMap = needed ? { townfolk: needed.townfolk, outsider: needed.outsiders, minion: needed.minions, demon: needed.demons } : null;
  const baseTypes = atheistInBag ? TYPES.filter(t => t.k === 'townfolk' || t.k === 'outsider') : TYPES;
  const visibleTypes = [...baseTypes, ...EXTRA_TYPES];
  const needle = q.trim().toLowerCase();

  // Sin búsqueda: la campaña activa (más lo que ya esté en el saco, aunque
  // venga de fuera — si no, no habría forma de desmarcarlo).
  // Con búsqueda: TODO el compendio, para que ningún personaje sea inalcanzable.
  const pool = useMemo(() => {
    if (needle) {
      return catalog.filter(r =>
        r.name.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle));
    }
    return [...roleList, ...catalog.filter(r => bag.has(r.id) && !campaignIds.has(r.id))];
  }, [needle, catalog, roleList, bag, campaignIds]);
  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 8px' }}>
        Elige qué personajes entran en el saco ({playerCount} jugadores).
      </p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en los 181 personajes…"
          style={{ flex: 1, fontSize: 11, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-100)', padding: '6px 8px' }} />
        {needle && (
          <button onClick={() => setQ('')} className="btn-night" style={{ fontSize: 10, padding: '4px 9px' }}>✕</button>
        )}
      </div>
      {needle && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--moon)', fontStyle: 'italic', margin: '0 0 10px' }}>
          Buscando en todo el compendio. ✦ = fuera de la campaña activa.
        </p>
      )}
      {atheistInBag && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--gold)', background: 'rgba(201,162,74,0.08)', border: '1px solid rgba(201,162,74,0.3)', borderRadius: 4, padding: '6px 10px', margin: '0 0 10px' }}>
          ⚠ Ateo activo — solo aldeanos y forasteros permitidos.
        </p>
      )}
      {visibleTypes.map(({ k, label }) => {
        const items = pool.filter(r => r.type === k);
        // Los 4 tipos de composición siempre se ven (aunque estén vacíos) para
        // no perder el contador tengo/necesito. Viajeros/Fabulados sólo si hay.
        const isExtra = EXTRA_TYPES.some(t => t.k === k);
        if (items.length === 0 && (isExtra || needle)) return null;
        return (
          <div key={k} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-400)' }}>{label}</span>
              {needMap && needMap[k] != null && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: have[k] === needMap[k] ? 'var(--good)' : have[k] > needMap[k] ? 'var(--gold)' : 'var(--blood-hi)' }}>
                  {have[k]}/{needMap[k]}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {items.map(r => {
                const foreign = campaignIds && !campaignIds.has(r.id);
                return (
                  <button key={r.id} onClick={() => toggleBag(r.id)} className="btn-night"
                    title={`${foreign ? '✦ Fuera de la campaña activa — ' : ''}${r.ability || ''}`}
                    style={{ fontSize: 9, borderColor: bag.has(r.id) ? 'var(--gold)' : undefined, color: bag.has(r.id) ? 'var(--gold-hot)' : undefined, opacity: foreign && !bag.has(r.id) ? 0.75 : 1 }}>
                    {foreign ? '✦ ' : ''}{r.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {needed === null && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-500)', fontStyle: 'italic' }}>5–15 jugadores para ver la composición requerida.</p>
      )}
    </div>
  );
}

// ── Paso 2: asignar a asientos ───────────────────────────────────────
// El desplegable ofrece SÓLO lo que está en el saco: si ofreciera toda la
// campaña, la lista real quedaría enterrada entre 180 opciones. ¿Falta un
// personaje? Se añade en el paso 1.
function SeatStep({ seats, assignments, bag, catalog, roleInfo, setSeatOrder, assignSeat, setAssignments }) {
  const usedRoles = new Set(Object.values(assignments));
  const bagRoles = useMemo(
    () => catalog.filter(r => bag.has(r.id)).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [catalog, bag]);
  const freeRoles = bagRoles.filter(r => !usedRoles.has(r.id));

  // Asientos válidos para la Marioneta = vecinos del Demonio.
  const demonSeatIdx = seats.findIndex(s => roleInfo[assignments[s.id]]?.type === 'demon');
  const adjToDemon = new Set();
  if (demonSeatIdx >= 0 && seats.length > 1) {
    adjToDemon.add(seats[(demonSeatIdx - 1 + seats.length) % seats.length].id);
    adjToDemon.add(seats[(demonSeatIdx + 1) % seats.length].id);
  }

  // ── Arrastrar filas (ratón y táctil con un único código: pointer events) ──
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const rowRefs = useRef([]);

  const indexAtY = (y) => {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return seats.length - 1;
  };
  const onHandleDown = (i) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragIdx(i); setOverIdx(i);
  };
  const onHandleMove = (e) => {
    if (dragIdx == null) return;
    setOverIdx(indexAtY(e.clientY));
  };
  const onHandleUp = () => {
    if (dragIdx != null && overIdx != null && overIdx !== dragIdx) {
      const order = seats.map(s => s.id);
      const [moved] = order.splice(dragIdx, 1);
      order.splice(overIdx, 0, moved);
      setSeatOrder(order);
    }
    setDragIdx(null); setOverIdx(null);
  };

  const shuffleSeats = () => {
    const order = shuffled(seats.map(s => s.id));
    setSeatOrder(order);
  };
  // Reparto al azar: sólo personajes del saco, uno por asiento.
  const randomizeRoles = () => {
    const pool = shuffled(bagRoles.map(r => r.id));
    const next = {};
    seats.forEach((s, i) => { if (pool[i]) next[s.id] = pool[i]; });
    setAssignments(next);
  };

  const shortfall = seats.length - bagRoles.length;

  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 8px' }}>
        Arrastra <b>⠿</b> para reordenar la mesa. La Marioneta debe ser vecina del Demonio.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={randomizeRoles} className="btn-action primary" disabled={shortfall > 0}
          style={{ flex: 2, fontSize: 11, padding: '7px 0', opacity: shortfall > 0 ? 0.4 : 1 }}
          title="Reparte al azar los personajes del saco entre los asientos">
          🎲 Repartir roles al azar
        </button>
        <button onClick={shuffleSeats} className="btn-night" style={{ flex: 1, fontSize: 11, padding: '7px 0' }}
          title="Baraja el orden de los asientos en la mesa">
          🔀 Barajar mesa
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: shortfall > 0 ? 'var(--blood-hi)' : 'var(--bone-400)' }}>
          Saco: {bagRoles.length} · Asientos: {seats.length}
          {shortfall > 0 && ` · faltan ${shortfall} en el saco`}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: freeRoles.length === 0 ? 'var(--good)' : 'var(--bone-400)' }}>
          {freeRoles.length} sin repartir
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}>
        {seats.map((s, i) => {
          const roleId = assignments[s.id];
          const role = roleId ? roleInfo[roleId] : null;
          const badSeat = roleId === 'MARIONETTE' && demonSeatIdx >= 0 && !adjToDemon.has(s.id);
          const evil = role?.alignment === 'evil';
          const isDragging = dragIdx === i;
          const isTarget = dragIdx != null && overIdx === i && !isDragging;
          return (
            <div key={s.id} ref={el => { rowRefs.current[i] = el; }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, borderRadius: 4, padding: '6px 7px',
                background: isDragging ? 'rgba(201,162,74,0.12)' : 'rgba(0,0,0,0.22)',
                borderLeft: `3px solid ${role ? (evil ? 'var(--blood-hi)' : 'var(--good)') : 'transparent'}`,
                border: badSeat ? '1px solid var(--blood-dim)' : 'var(--hairline-bone)',
                borderTop: isTarget ? '2px solid var(--gold-hot)' : undefined,
                opacity: isDragging ? 0.55 : 1,
              }}>
              <span onPointerDown={onHandleDown(i)}
                title="Arrastra para mover este asiento"
                style={{ cursor: 'grab', touchAction: 'none', color: 'var(--bone-500)', fontSize: 15, lineHeight: 1, padding: '0 3px', userSelect: 'none' }}>⠿</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-600)', width: 18, textAlign: 'right' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 12.5, color: 'var(--bone-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: role ? (evil ? 'var(--blood-hi)' : 'var(--bone-500)') : 'var(--bone-600)' }}>
                  {role ? `${role.name} · ${typeLabel(role.type)}` : 'sin rol'}
                  {adjToDemon.has(s.id) && ' · vecino del Demonio'}
                </div>
              </div>
              <select value={roleId || ''} onChange={e => assignSeat(s.id, e.target.value || null)}
                style={{ fontSize: 10, background: 'var(--ink-600)', border: '1px solid', borderColor: evil ? 'var(--blood-dim)' : 'var(--hairline-bone)', borderRadius: 2, color: role ? (evil ? 'var(--blood-hi)' : 'var(--bone-200)') : 'var(--bone-500)', padding: '4px 5px', maxWidth: 130 }}>
                <option value="">— sin asignar —</option>
                {bagRoles.filter(r => !usedRoles.has(r.id) || r.id === roleId).map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({typeLabel(r.type)})</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {shortfall > 0 && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--blood-hi)', fontStyle: 'italic', marginTop: 8 }}>
          El saco tiene menos personajes que asientos. Vuelve al paso 1 para añadirlos.
        </p>
      )}
    </div>
  );
}

// Baraja una copia (Fisher-Yates).
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Paso 3: decisiones de montaje ────────────────────────────────────
function DecisionsStep({ decisions, seats, assignments, roleList, catalog, roleInfo, send }) {
  // El guion EFECTIVO = campaña activa + cualquier personaje repartido desde el
  // compendio. Sin esto, un Alquimista de Carousel en una partida de Trouble
  // Brewing no podría copiar al Esbirro que sí está sentado en la mesa.
  const scriptRoles = useMemo(() => {
    const byId = new Map(roleList.map(r => [r.id, r]));
    for (const rid of Object.values(assignments)) {
      if (!rid || byId.has(rid)) continue;
      const def = (catalog || []).find(r => r.id === rid) || roleInfo[rid];
      if (def) byId.set(rid, def);
    }
    return [...byId.values()];
  }, [roleList, catalog, assignments, roleInfo]);

  const goodNotInPlay = scriptRoles.filter(r => r.alignment === 'good' && !Object.values(assignments).includes(r.id) && !roleInfo[r.id]?.misperception);
  const demonsInCampaign = scriptRoles.filter(r => r.type === 'demon');
  const minionsInCampaign = scriptRoles.filter(r => r.type === 'minion');
  const outsidersInPlay = seats.filter(s => roleInfo[assignments[s.id]]?.type === 'outsider').map(s => assignments[s.id]);

  const setDec = (id, patch) => send('SETUP_SET_DECISION', { id, patch });
  const suggest = (id) => send('SETUP_SUGGEST', { id });
  const nameOf = id => seats.find(s => s.id === id)?.name || '?';

  if (decisions.length === 0) {
    return <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic' }}>Sin decisiones ocultas para esta composición. Asigna roles primero.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)' }}>{decisions.filter(isResolved).length}/{decisions.length} resueltas</span>
        <button onClick={() => send('SETUP_SUGGEST', {})} className="btn-night" style={{ fontSize: 9 }}>💡 Sugerir todo</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {decisions.map(d => (
          <DecisionCard key={d.id} d={d} goodNotInPlay={goodNotInPlay} demonsInCampaign={demonsInCampaign}
            minionsInCampaign={minionsInCampaign} outsidersInPlay={outsidersInPlay}
            seats={seats} assignments={assignments} nameOf={nameOf} setDec={setDec} suggest={suggest} />
        ))}
      </div>
    </div>
  );
}

function DecisionCard({ d, goodNotInPlay, demonsInCampaign, minionsInCampaign, outsidersInPlay, seats, assignments, nameOf, setDec, suggest }) {
  const resolved = isResolved(d);
  const sel = (value, onChange, opts, placeholder) => (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)}
      style={{ fontSize: 11, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-100)', padding: '4px 6px', width: '100%' }}>
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  let control = null;
  switch (d.kind) {
    case 'identidadFalsa':
      if (d.role === 'lunatic') {
        control = (
          <>
            {sel(d.lunatic?.perceivedDemon, v => setDec(d.id, { lunatic: { ...(d.lunatic || {}), perceivedDemon: v } }),
              demonsInCampaign.map(r => ({ v: r.id, l: r.name })), '¿Qué Demonio cree ser?')}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-500)', margin: '4px 0 0' }}>Esbirros falsos y bluffs: se eligen durante la primera noche.</p>
          </>
        );
      } else {
        control = sel(d.chosenGoodRole, v => setDec(d.id, { chosenGoodRole: v }),
          goodNotInPlay.map(r => ({ v: r.id, l: `${r.name} (${typeLabel(r.type)})` })), '¿Qué rol bueno cree ser?');
      }
      break;
    case 'registroInicial':
      control = sel(d.registersAs, v => setDec(d.id, { registersAs: v }),
        (d.options || []).map(o => ({ v: o, l: o })), 'Registro por defecto');
      break;
    case 'forasteros': {
      const chosen = d.chosen || [];
      control = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', width: '100%' }}>Esperados: {d.expected}</span>
          {outsidersInPlay.map(rid => {
            const on = chosen.includes(rid);
            return (
              <button key={rid} className="btn-night" style={{ fontSize: 8, borderColor: on ? 'var(--gold)' : undefined, color: on ? 'var(--gold-hot)' : undefined }}
                onClick={() => setDec(d.id, { chosen: on ? chosen.filter(x => x !== rid) : [...chosen, rid] })}>
                {ROLE_BY_ID[rid]?.name || rid}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case 'otroSecreto':
      if (d.secret === 'evilTwin') {
        control = sel(d.targetSeat, v => setDec(d.id, { targetSeat: v }),
          seats.filter(s => s.id !== d.seat).map(s => ({ v: s.id, l: s.name })), 'Gemela de alineación opuesta');
      } else {
        control = <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-400)' }}>{d.secret}</p>;
      }
      break;
    // Legión: multi-selección de asientos. «La mayoría de jugadores son
    // Legión»: sin esto había que cambiarlos de personaje uno a uno.
    case 'legionSeats': {
      const picked = d.chosen || [];
      const toggle = (id) => setDec(d.id, {
        chosen: picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id],
      });
      control = (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {seats.map(s => {
              const on = picked.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggle(s.id)} className="btn-night"
                  style={{ fontSize: 10, borderColor: on ? 'var(--blood-hi)' : undefined, color: on ? 'var(--blood-hi)' : undefined }}>
                  {on ? '☠ ' : ''}{s.name}
                </button>
              );
            })}
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: picked.length >= d.min ? 'var(--good)' : 'var(--blood-hi)', margin: 0 }}>
            {picked.length}/{seats.length} marcados · mínimo {d.min}
          </p>
        </div>
      );
      break;
    }
    case 'puzzlemasterDrunk': {
      const puzPool = seats.filter(s => s.id !== d.seat);
      control = sel(d.chosen, v => setDec(d.id, { chosen: v }),
        puzPool.map(s => ({ v: s.id, l: s.name })), '¿Qué jugador está borracho?');
      break;
    }
    case 'alchemistAbility': {
      const mAbility = (minionsInCampaign || []).find(r => r.id === d.chosen)?.ability;
      const selEl = sel(d.chosen, v => setDec(d.id, { chosen: v }),
        (minionsInCampaign || []).map(r => ({ v: r.id, l: r.name })), '¿Habilidad de qué Esbirro?');
      control = (
        <>
          {selEl}
          {mAbility && <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-400)', margin: '4px 0 0', fontStyle: 'italic' }}>{mAbility}</p>}
        </>
      );
      break;
    }
    case 'boffinAbility': {
      const bAbility = (goodNotInPlay || []).find(r => r.id === d.chosen)?.ability;
      control = (
        <>
          {sel(d.chosen, v => setDec(d.id, { chosen: v }),
            (goodNotInPlay || []).map(r => ({ v: r.id, l: r.name })), '¿Qué habilidad buena tendrá el Demonio?')}
          {bAbility && <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-400)', margin: '4px 0 0', fontStyle: 'italic' }}>{bAbility}</p>}
        </>
      );
      break;
    }
    case 'outsiderModifierChoice': {
      const oBase = d.base ?? 0;
      const oPicked = d.chosenModifier;
      const oChosen = d.chosen || [];
      const oExpected = oPicked != null ? Math.max(0, oBase + oPicked) : null;
      control = (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {(d.options || [-1, 1]).map(opt => (
              <button key={opt} className="btn-night"
                style={{ flex: 1, fontSize: 12, padding: '6px 0',
                  borderColor: oPicked === opt ? 'var(--gold)' : undefined,
                  color: oPicked === opt ? 'var(--gold-hot)' : undefined }}
                onClick={() => setDec(d.id, { chosenModifier: opt, expected: Math.max(0, oBase + opt), chosen: [] })}>
                {opt > 0 ? `+${opt}` : opt} Forastero
              </button>
            ))}
          </div>
          {oExpected != null && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', width: '100%' }}>Esperados: {oExpected}</span>
              {outsidersInPlay.map(rid => {
                const on = oChosen.includes(rid);
                return (
                  <button key={rid} className="btn-night" style={{ fontSize: 8, borderColor: on ? 'var(--gold)' : undefined, color: on ? 'var(--gold-hot)' : undefined }}
                    onClick={() => setDec(d.id, { chosen: on ? oChosen.filter(x => x !== rid) : [...oChosen, rid] })}>
                    {ROLE_BY_ID[rid]?.name || rid}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
      break;
    }
    case 'summonerSetup':
      control = (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', margin: '4px 0', borderLeft: '2px solid var(--gold)', paddingLeft: 6 }}>
          Quitar ficha de Demonio del saco → añadir 1 Aldeano. El Invocador recibe 3 bluffs en noche 1.
        </p>
      );
      break;
    default:
      control = null;
  }

  return (
    <div style={{ border: resolved ? '1px solid rgba(109,140,184,0.4)' : '1px solid var(--blood-dim)', borderRadius: 4, padding: '8px 10px', background: 'rgba(0,0,0,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: resolved ? 'var(--good)' : 'var(--gold-hot)', flex: 1 }}>
          {resolved ? '✓ ' : '• '}{titleFor(d)}
        </span>
        <button onClick={() => suggest(d.id)} className="btn-night" style={{ fontSize: 8 }} title="Rellenar un default válido">💡</button>
      </div>
      {control}
      {d.consequence && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 10.5, color: 'var(--bone-500)', fontStyle: 'italic', margin: '6px 0 0' }}>↳ {d.consequence}</p>
      )}
    </div>
  );
}


// ── Paso 4: revisar y bloquear ───────────────────────────────────────
function ReviewStep({ seats, assignments, decisions, roleInfo, allAssigned, unresolved, send }) {
  const believedFor = (seatId) => {
    const d = decisions.find(x => x.kind === 'identidadFalsa' && x.seat === seatId);
    if (!d) return null;
    const rid = d.role === 'lunatic' ? d.lunatic?.perceivedDemon : d.chosenGoodRole;
    return rid ? (roleInfo[rid] || ROLE_BY_ID[rid]) : null;
  };
  const canLock = allAssigned && unresolved === 0;
  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 8px' }}>
        Revisa el montaje. Al bloquear, la noche 1 queda pre-rellenada.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto', marginBottom: 10 }}>
        {seats.map((s, i) => {
          const role = roleInfo[assignments[s.id]] || ROLE_BY_ID[assignments[s.id]];
          const believed = believedFor(s.id);
          return (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '5px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-600)', width: 14 }}>{i + 1}</span>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1 }}>{s.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', color: role ? (role.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)') : 'var(--bone-600)' }}>
                  {role ? `${role.name} (${typeLabel(role.type)})` : '— sin rol —'}
                </span>
              </div>
              {believed && (
                <div className="identity-false" style={{ fontSize: 10, paddingLeft: 20 }}>
                  <span className="mask">{MASK}</span>&nbsp;se cree {believed.name} ({typeLabel(believed.type)})
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: allAssigned ? 'var(--good)' : 'var(--blood-hi)' }}>{allAssigned ? '✓' : '✗'} Asientos</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: unresolved === 0 ? 'var(--good)' : 'var(--blood-hi)' }}>{unresolved === 0 ? '✓' : `✗ ${unresolved}`} Decisiones</span>
      </div>
      <button onClick={() => send('SETUP_LOCK', {})} disabled={!canLock}
        className="btn-action primary" style={{ width: '100%', padding: '12px 0', opacity: canLock ? 1 : 0.4 }}>
        🔒 Bloquear montaje → Reparto
      </button>
    </div>
  );
}

// ── ¿Decisión resuelta? (espejo de isDecisionResolved del servidor) ──
function isResolved(d) {
  switch (d.kind) {
    case 'identidadFalsa':  return d.role === 'lunatic' ? !!d.lunatic?.perceivedDemon : !!d.chosenGoodRole;
    case 'forasteros':      return Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case 'registroInicial': return !!d.registersAs;
    case 'otroSecreto':        return d.secret !== 'evilTwin' || !!d.targetSeat;
    case 'legionSeats':             return Array.isArray(d.chosen) && d.chosen.length >= d.min;
    case 'puzzlemasterDrunk':       return !!d.chosen;
    case 'alchemistAbility':        return !!d.chosen;
    case 'boffinAbility':           return !!d.chosen;
    case 'outsiderModifierChoice':  return d.chosenModifier != null && Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case 'summonerSetup':      return true;
    default: return true;
  }
}

function titleFor(d) {
  switch (d.kind) {
    case 'identidadFalsa':     return `Identidad falsa de ${d.seatName}`;
    case 'forasteros':         return `Forasteros (${d.seatName})`;
    case 'registroInicial':    return `Registro de ${d.seatName}`;
    case 'otroSecreto':        return d.secret === 'evilTwin' ? 'Gemela Malvada' : d.secret;
    case 'legionSeats':        return `Legión — ¿qué asientos lo son?`;
    case 'puzzlemasterDrunk':  return `Maestro de Acertijos — jugador borracho`;
    case 'alchemistAbility':   return `Alquimista — habilidad de Esbirro`;
    case 'boffinAbility':            return `Rata de Laboratorio — habilidad del Demonio`;
    case 'outsiderModifierChoice':   return `${d.seatName} — ±1 Forastero`;
    case 'summonerSetup':      return `Invocador — preparación especial`;
    default: return d.kind;
  }
}
