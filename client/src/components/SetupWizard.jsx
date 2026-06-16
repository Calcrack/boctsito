import React, { useState, useMemo } from 'react';
import { ROLE_BY_ID } from '../data/roles';
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
const STEPS = ['Saco', 'Asientos', 'Decisiones', 'Revisar'];

export default function SetupWizard({ game, send }) {
  const setup = game.setup || { seatOrder: [], assignments: {}, decisions: [] };
  const players = game.players;
  const roleList = (game.campaignRoles && game.campaignRoles.length)
    ? game.campaignRoles : [];
  const assignments = setup.assignments || {};
  const decisions = setup.decisions || [];

  const [step, setStep] = useState(0);
  // El "saco" = roles disponibles para asignar. Arranca de lo ya asignado.
  const [bag, setBag] = useState(() => new Set(Object.values(assignments)));

  const baseOrder = (setup.seatOrder && setup.seatOrder.length) ? setup.seatOrder : players.map(p => p.id);
  const seatOrder = [...baseOrder, ...players.filter(p => !baseOrder.includes(p.id)).map(p => p.id)];
  const seats = seatOrder.map(id => players.find(p => p.id === id)).filter(Boolean);

  const dist = (game.campaignDistribution || {})[players.length] || null;
  const mods = game.campaignOutsiderModifiers || {};
  const needed = useMemo(() => {
    if (!dist) return null;
    const d = { ...dist };
    for (const [rid, delta] of Object.entries(mods)) {
      if (bag.has(rid)) {
        d.outsiders = Math.min(d.outsiders + delta, players.length - d.demons - d.minions);
        d.townfolk = players.length - d.outsiders - d.minions - d.demons;
      }
    }
    return d;
  }, [dist, mods, bag, players.length]);

  const allAssigned = seats.length > 0 && seats.every(s => assignments[s.id]);
  const unresolved = decisions.filter(d => !isResolved(d)).length;

  const toggleBag = (rid) => setBag(prev => {
    const n = new Set(prev);
    n.has(rid) ? n.delete(rid) : n.add(rid);
    return n;
  });

  const moveSeat = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= seats.length) return;
    const order = seats.map(s => s.id);
    [order[i], order[j]] = [order[j], order[i]];
    send('SETUP_SET_SEAT_ORDER', { seatOrder: order });
  };

  const assignSeat = (seatId, roleId) => {
    const next = { ...assignments };
    if (roleId) next[seatId] = roleId; else delete next[seatId];
    send('SETUP_SET_ASSIGNMENTS', { assignments: next });
  };

  return (
    <div style={{ border: '1px solid var(--gold)', borderRadius: 8, overflow: 'hidden', background: 'rgba(201,162,74,0.04)' }}>
      {/* Cabecera + barra de pasos */}
      <div style={{ padding: '8px 12px', background: 'rgba(201,162,74,0.1)', borderBottom: 'var(--hairline)' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-hot)', margin: 0 }}>
          🎬 Asistente de montaje
        </p>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)}
              className="btn-night"
              style={{ flex: 1, fontSize: 9, borderColor: step === i ? 'var(--gold)' : undefined, color: step === i ? 'var(--gold-hot)' : undefined }}>
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        {step === 0 && (
          <BagStep roleList={roleList} bag={bag} toggleBag={toggleBag} needed={needed} playerCount={players.length} />
        )}
        {step === 1 && (
          <SeatStep seats={seats} assignments={assignments} bag={bag} roleList={roleList}
            moveSeat={moveSeat} assignSeat={assignSeat} />
        )}
        {step === 2 && (
          <DecisionsStep decisions={decisions} seats={seats} assignments={assignments} roleList={roleList} send={send} />
        )}
        {step === 3 && (
          <ReviewStep seats={seats} assignments={assignments} decisions={decisions}
            allAssigned={allAssigned} unresolved={unresolved} send={send} />
        )}
      </div>

      {/* Navegación */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: 'var(--hairline)' }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="btn-action" style={{ flex: 1, opacity: step === 0 ? 0.35 : 1 }}>← Atrás</button>
        <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}
          className="btn-action primary" style={{ flex: 1, opacity: step === STEPS.length - 1 ? 0.35 : 1 }}>Siguiente →</button>
      </div>
    </div>
  );
}

// ── Paso 1: el saco ──────────────────────────────────────────────────
function BagStep({ roleList, bag, toggleBag, needed, playerCount }) {
  const have = {
    townfolk: [...bag].filter(id => ROLE_BY_ID[id]?.type === 'townfolk').length,
    outsider: [...bag].filter(id => ROLE_BY_ID[id]?.type === 'outsider').length,
    minion:   [...bag].filter(id => ROLE_BY_ID[id]?.type === 'minion').length,
    demon:    [...bag].filter(id => ROLE_BY_ID[id]?.type === 'demon').length,
  };
  const needMap = needed ? { townfolk: needed.townfolk, outsider: needed.outsiders, minion: needed.minions, demon: needed.demons } : null;
  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 10px' }}>
        Elige qué personajes entran en el saco ({playerCount} jugadores).
      </p>
      {TYPES.map(({ k, label }) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-400)' }}>{label}</span>
            {needMap && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: have[k] === needMap[k] ? 'var(--good)' : have[k] > needMap[k] ? 'var(--gold)' : 'var(--blood-hi)' }}>
                {have[k]}/{needMap[k]}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {roleList.filter(r => r.type === k).map(r => (
              <button key={r.id} onClick={() => toggleBag(r.id)} className="btn-night"
                title={r.ability}
                style={{ fontSize: 9, borderColor: bag.has(r.id) ? 'var(--gold)' : undefined, color: bag.has(r.id) ? 'var(--gold-hot)' : undefined }}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {needed === null && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-500)', fontStyle: 'italic' }}>5–15 jugadores para ver la composición requerida.</p>
      )}
    </div>
  );
}

// ── Paso 2: asignar a asientos ───────────────────────────────────────
function SeatStep({ seats, assignments, bag, roleList, moveSeat, assignSeat }) {
  const usedRoles = new Set(Object.values(assignments));
  const bagRoles = roleList.filter(r => bag.has(r.id));
  // Asientos válidos para la Marioneta = vecinos del Demonio.
  const demonSeatIdx = seats.findIndex(s => ROLE_BY_ID[assignments[s.id]]?.type === 'demon');
  const adjToDemon = new Set();
  if (demonSeatIdx >= 0 && seats.length > 1) {
    adjToDemon.add(seats[(demonSeatIdx - 1 + seats.length) % seats.length].id);
    adjToDemon.add(seats[(demonSeatIdx + 1) % seats.length].id);
  }
  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 10px' }}>
        Asigna un rol del saco a cada asiento. La Marioneta debe ser vecina del Demonio.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {seats.map((s, i) => {
          const roleId = assignments[s.id];
          const role = roleId ? ROLE_BY_ID[roleId] : null;
          const isMarionette = roleId === 'MARIONETTE';
          const badSeat = isMarionette && demonSeatIdx >= 0 && !adjToDemon.has(s.id);
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '5px 7px', border: badSeat ? '1px solid var(--blood-dim)' : 'var(--hairline-bone)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-600)', width: 16, textAlign: 'right' }}>{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => moveSeat(i, -1)} disabled={i === 0} style={{ fontSize: 8, lineHeight: 1, color: 'var(--bone-400)', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => moveSeat(i, 1)} disabled={i === seats.length - 1} style={{ fontSize: 8, lineHeight: 1, color: 'var(--bone-400)', opacity: i === seats.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <select value={roleId || ''} onChange={e => assignSeat(s.id, e.target.value || null)}
                style={{ fontSize: 10, background: 'var(--ink-600)', border: '1px solid', borderColor: role ? (role.alignment === 'evil' ? 'var(--blood-dim)' : 'var(--hairline-bone)') : 'var(--hairline-bone)', borderRadius: 2, color: role ? (role.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--bone-200)') : 'var(--bone-500)', padding: '3px 5px', maxWidth: 150 }}>
                <option value="">— sin asignar —</option>
                {bagRoles.filter(r => !usedRoles.has(r.id) || r.id === roleId).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {demonSeatIdx >= 0 && [...adjToDemon].length > 0 && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--moon)', fontStyle: 'italic', marginTop: 6 }}>
          Vecinos del Demonio: {[...adjToDemon].map(id => seats.find(s => s.id === id)?.name).join(', ')}.
        </p>
      )}
    </div>
  );
}

// ── Paso 3: decisiones de montaje ────────────────────────────────────
function DecisionsStep({ decisions, seats, assignments, roleList, send }) {
  const goodNotInPlay = roleList.filter(r => r.alignment === 'good' && !Object.values(assignments).includes(r.id) && !ROLE_BY_ID[r.id]?.misperception);
  const demonsInCampaign = roleList.filter(r => r.type === 'demon');
  const goodSeats = seats.filter(s => ROLE_BY_ID[assignments[s.id]]?.alignment === 'good');
  const outsidersInPlay = seats.filter(s => ROLE_BY_ID[assignments[s.id]]?.type === 'outsider').map(s => assignments[s.id]);

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
            goodSeats={goodSeats} outsidersInPlay={outsidersInPlay} seats={seats} assignments={assignments}
            nameOf={nameOf} setDec={setDec} suggest={suggest} />
        ))}
      </div>
    </div>
  );
}

function DecisionCard({ d, goodNotInPlay, demonsInCampaign, goodSeats, outsidersInPlay, seats, assignments, nameOf, setDec, suggest }) {
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
            <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-500)', margin: '4px 0 0' }}>Usa “Sugerir” para Esbirros falsos, bluffs y la “muerte” de la 1ª noche.</p>
          </>
        );
      } else {
        control = sel(d.chosenGoodRole, v => setDec(d.id, { chosenGoodRole: v }),
          goodNotInPlay.map(r => ({ v: r.id, l: `${r.name} (${typeLabel(r.type)})` })), '¿Qué rol bueno cree ser?');
      }
      break;
    case 'bluffsDemonio': {
      const chosen = d.chosen || [];
      control = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {goodNotInPlay.map(r => {
            const on = chosen.includes(r.id);
            const full = chosen.length >= d.count && !on;
            return (
              <button key={r.id} disabled={full} className="btn-night"
                style={{ fontSize: 8, opacity: full ? 0.4 : 1, borderColor: on ? 'var(--blood-hi)' : undefined, color: on ? 'var(--blood-hi)' : undefined }}
                onClick={() => setDec(d.id, { chosen: on ? chosen.filter(x => x !== r.id) : [...chosen, r.id] })}>
                {r.name}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case 'falsoPositivoAdivina':
      control = sel(d.targetSeat, v => setDec(d.id, { targetSeat: v }),
        goodSeats.map(s => ({ v: s.id, l: s.name })), 'Jugador bueno (registra como Demonio)');
      break;
    case 'venenoInicial':
      control = sel(d.targetSeat, v => setDec(d.id, { targetSeat: v }),
        seats.filter(s => s.id !== d.seat).map(s => ({ v: s.id, l: s.name })), 'Objetivo del veneno (1ª noche)');
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
    case 'infoPrimeraNoche':
      control = <InfoControl d={d} seats={seats} setDec={setDec} />;
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

function InfoControl({ d, seats, setDec }) {
  const o = d.options || {};
  const c = d.chosen || {};
  const nameOpt = arr => (arr || []).map(x => ({ v: x.id, l: x.name + (x.role ? ` (${x.role})` : '') }));
  const Sel = ({ value, onChange, opts, ph }) => (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)}
      style={{ fontSize: 11, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-100)', padding: '4px 6px', width: '100%', marginBottom: 4 }}>
      <option value="">{ph}</option>
      {opts.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}
    </select>
  );
  switch (d.infoKind) {
    case 'pairOfType':
      return (
        <div>
          {d.mustBeFalse && <FalseBanner />}
          <Sel value={c.trueSeat} onChange={v => setDec(d.id, { chosen: { ...c, trueSeat: v } })} opts={nameOpt(o.validTrue)} ph="Jugador verdadero" />
          <Sel value={c.decoySeat} onChange={v => setDec(d.id, { chosen: { ...c, decoySeat: v } })} opts={nameOpt(o.validDecoy)} ph="Señuelo (2º jugador)" />
          {d.mustBeFalse && (
            <Sel value={c.shownRole} onChange={v => setDec(d.id, { chosen: { ...c, shownRole: v } })} opts={(o.roleChoices || []).map(r => ({ v: r.name, l: r.name }))} ph="Rol a mostrar (falso)" />
          )}
        </div>
      );
    case 'count':
    case 'clockmaker':
      return (
        <div>
          {d.mustBeFalse && <FalseBanner />}
          <Sel value={c.value != null ? String(c.value) : ''} onChange={v => setDec(d.id, { chosen: { value: v == null ? null : Number(v) } })}
            opts={(o.range || []).map(n => ({ v: String(n), l: String(n) }))} ph="Número a decir" />
        </div>
      );
    case 'knowGoodPlayer':
    case 'knowEvilPlayer':
      return (
        <div>
          {d.mustBeFalse && <FalseBanner />}
          <Sel value={c.seat} onChange={v => { const pl = (o.players || []).find(x => x.id === v); setDec(d.id, { chosen: { seat: v, role: pl?.role } }); }}
            opts={nameOpt(o.players)} ph="Jugador a mostrar" />
        </div>
      );
    default:
      return (
        <div>
          {d.mustBeFalse && <FalseBanner />}
          <input value={c.text || ''} onChange={e => setDec(d.id, { chosen: { text: e.target.value } })}
            placeholder="Texto exacto a decir"
            style={{ fontSize: 11, background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-100)', padding: '4px 6px', width: '100%' }} />
        </div>
      );
  }
}

function FalseBanner() {
  return (
    <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: '#4ade80', fontStyle: 'italic', margin: '0 0 4px' }}>
      🧪 Info FORZOSAMENTE falsa (envenenado/borracho/Vortox): elige libremente.
    </p>
  );
}

// ── Paso 4: revisar y bloquear ───────────────────────────────────────
function ReviewStep({ seats, assignments, decisions, allAssigned, unresolved, send }) {
  const believedFor = (seatId) => {
    const d = decisions.find(x => x.kind === 'identidadFalsa' && x.seat === seatId);
    if (!d) return null;
    const rid = d.role === 'lunatic' ? d.lunatic?.perceivedDemon : d.chosenGoodRole;
    return rid ? ROLE_BY_ID[rid] : null;
  };
  const canLock = allAssigned && unresolved === 0;
  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 8px' }}>
        Revisa el montaje. Al bloquear, la noche 1 queda pre-rellenada.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto', marginBottom: 10 }}>
        {seats.map((s, i) => {
          const role = ROLE_BY_ID[assignments[s.id]];
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
    case 'bluffsDemonio':   return Array.isArray(d.chosen) && d.chosen.length === d.count;
    case 'falsoPositivoAdivina': return !!d.targetSeat;
    case 'venenoInicial':   return !!d.targetSeat;
    case 'forasteros':      return Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case 'registroInicial': return !!d.registersAs;
    case 'otroSecreto':     return d.secret !== 'evilTwin' || !!d.targetSeat;
    case 'infoPrimeraNoche':return d.chosen != null && Object.keys(d.chosen).length > 0;
    default: return true;
  }
}

function titleFor(d) {
  switch (d.kind) {
    case 'identidadFalsa':  return `Identidad falsa de ${d.seatName}`;
    case 'bluffsDemonio':   return `Bluffs del Demonio (${d.count})`;
    case 'falsoPositivoAdivina': return 'Falso positivo de la Adivina';
    case 'venenoInicial':   return `Veneno inicial (${d.seatName})`;
    case 'forasteros':      return `Forasteros (${d.seatName})`;
    case 'registroInicial': return `Registro de ${d.seatName}`;
    case 'otroSecreto':     return d.secret === 'evilTwin' ? 'Gemela Malvada' : d.secret;
    case 'infoPrimeraNoche':return `Info 1ª noche · ${d.seatName}`;
    default: return d.kind;
  }
}
