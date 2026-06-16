import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID, getCampaign } from '../data/roles';
import { typeLabel, MASK } from '../utils/identity';
import StatusChips from './StatusChips';

const INFO_MARKERS = new Set(['EVIL_INFO', 'MINION_INFO', 'DEMON_INFO']);

function buildSteps(game) {
  const campaign = getCampaign(game.campaignId);
  const order = game.nightNumber <= 1 ? campaign.firstNightOrder : campaign.otherNightOrder;
  const players = game.players;
  const pendingRaven = players.find(p => p.role === 'RAVENKEEPER' && p.pendingRavenkeeper);
  const steps = [];
  let infoShown = false;
  const rolesInOrder = new Set(order.filter(id => !INFO_MARKERS.has(id)));
  for (const roleId of order) {
    if (INFO_MARKERS.has(roleId)) {
      if (infoShown) continue;
      infoShown = true;
      steps.push({ type: 'info' });
      continue;
    }
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    const isPending = roleId === 'RAVENKEEPER' && !!pendingRaven;
    const actors = players.filter(p =>
      (p.role === roleId ||
       (p.role === 'DRUNK' && p.drunkAs === roleId) ||
       (p.believedRole === roleId && !rolesInOrder.has(p.role))) &&
      (isPending ? true : p.alive)
    );
    for (const actor of actors) steps.push({ type: 'role', role, actor });
  }
  return steps;
}

// ── Patrón de acción del Narrador por rol ───────────────────────────────
const NIGHT_ROLE_PATTERN = {
  // ── TB ──────────────────────────────────────────────────────────────────
  WASHERWOMAN:    { kind: 'P2', targetType: 'townfolk', emoji: '🧺' },
  LIBRARIAN:      { kind: 'P2', targetType: 'outsider', emoji: '📚' },
  INVESTIGATOR:   { kind: 'P2', targetType: 'minion',   emoji: '🔍' },
  COOK:           { kind: 'P1', what: 'evilPairs',      emoji: '🍳', label: 'pareja(s) de vecinos malvados' },
  EMPATH:         { kind: 'P1', what: 'evilNeighbors',  emoji: '💞', label: 'vecino(s) malvado(s) vivos' },
  UNDERTAKER:     { kind: 'P1', what: 'executedRole',   emoji: '⚰️' },
  POISONER:       { kind: 'P3', effect: 'POISONER_ACTION', emoji: '🧪', label: 'Envenenar a', notSelf: false },
  MONK:           { kind: 'P3', effect: 'MONK_PROTECT',    emoji: '🛡️', label: 'Proteger a',  notSelf: true  },
  IMP:            { kind: 'P3', effect: 'IMP_KILL',        emoji: '👹', label: 'Atacar a',    notSelf: false },
  BUTLER:         { kind: 'P3', effect: 'BUTLER_MASTER',   emoji: '🤵', label: 'Amo de',      notSelf: true  },
  FORTUNE_TELLER: { kind: 'P4', emoji: '🔮' },
  // ── BMR demons ──────────────────────────────────────────────────────────
  PUKKA:    { kind: 'P3', effect: 'PUKKA_POISON',    emoji: '🕸️', label: 'Envenenar a', notSelf: false,
              note: 'Primero: el envenenado de anoche muere ahora. Luego elige a quién envenenar esta noche.' },
  ZOMBUUL:  { kind: 'P3', effect: 'ZOMBUUL_KILL',    emoji: '🧟', label: 'Atacar a',    notSelf: false,
              note: 'Solo actúa si nadie murió de día. Su 1ª "muerte" lo deja muerto-vivo (sigue activo).' },
  PO:       { kind: 'P3', effect: 'PO_KILL',         emoji: '💀', label: 'Atacar a',    notSelf: false,
              note: 'Si anoche no atacó (marcador 3 ataques): esta noche elige 3 objetivos en lugar de 1.' },
  SHABALOTH:{ kind: 'P3x2', effect: 'SHABALOTH_KILL', emoji: '👁️',
              note: 'Elige 2 objetivos. Puede revivir a 1 muerto de la noche anterior.' },
  // ── S&V demons ──────────────────────────────────────────────────────────
  FANG_GU:     { kind: 'P3', effect: 'FANG_GU_KILL',    emoji: '🌿', label: 'Atacar a', notSelf: false,
                 note: '1er Forastero que mata → ese Forastero se vuelve Fang Gu (malo); Fang Gu muere.' },
  NO_DASHII:   { kind: 'P3', effect: 'NO_DASHII_KILL',  emoji: '🐲', label: 'Atacar a', notSelf: false,
                 note: 'Sus 2 Aldeanos vecinos vivos están envenenados. Recalcular al morir alguien.' },
  VORTOX:      { kind: 'P3', effect: 'VORTOX_KILL',     emoji: '🌀', label: 'Atacar a', notSelf: false,
                 note: 'Toda info de Aldeanos es FALSA. Sin ejecución hoy → el Mal gana.' },
  VIGORMORTIS: { kind: 'P3', effect: 'VIGORMORTIS_KILL',emoji: '🦴', label: 'Atacar a', notSelf: false,
                 note: 'Esbirros que mata conservan habilidad y envenenan a 1 Aldeano vecino.' },
  // ── Carousel demons ─────────────────────────────────────────────────────
  KAZALI:      { kind: 'P3', effect: 'KAZALI_KILL',      emoji: '👑', label: 'Atacar a',           notSelf: false },
  LLEECH:      { kind: 'P3', effect: 'LLEECH_KILL',      emoji: '🩸', label: 'Atacar a',           notSelf: false,
                 note: 'Muere si su anfitrión (primer jugador elegido) muere envenenado.' },
  OJO:         { kind: 'P3', effect: 'OJO_KILL',         emoji: '👁️', label: 'Elige personaje',    notSelf: false,
                 note: 'Elige un personaje (no jugador): muere quien lo tenga. Si nadie, el Narrador elige.' },
  LEGION:      { kind: 'P3', effect: 'LEGION_KILL',      emoji: '⚔️', label: 'Atacar a',           notSelf: false,
                 note: 'Ejecuciones fallan si solo votaron malignos. Mayoría de jugadores son Legión.' },
  AL_HADIKHIA: { kind: 'P3', effect: 'AL_HADIKHIA_KILL', emoji: '🏛️', label: 'Elige 3 jugadores',  notSelf: false,
                 note: 'Elige 3; cada uno decide silenciosamente (pulgar arriba/abajo) vivir o morir.' },
};

function calcEvilNeighbors(game, playerId) {
  const living = game.players.filter(p => p.alive);
  const idx = living.findIndex(p => p.id === playerId);
  if (idx === -1 || living.length <= 1) return 0;
  const n = living.length;
  const left  = living[(idx - 1 + n) % n];
  const right = living[(idx + 1) % n];
  return (left?.alignment === 'evil' ? 1 : 0) + (right?.alignment === 'evil' ? 1 : 0);
}

function calcEvilPairs(game) {
  const living = game.players.filter(p => p.alive);
  const n = living.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (living[i].alignment === 'evil' && living[(i + 1) % n].alignment === 'evil') count++;
  }
  return count;
}

export default function NightWalkthrough({ onActiveActor, embedded = false }) {
  const { state, send } = useGame();
  const { game } = state;
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => { setIdx(0); }, [game?.nightNumber]);

  const isNight = game && ['first_night', 'night'].includes(game.phase);
  const steps = isNight ? buildSteps(game) : [];
  const total = steps.length;
  const current = Math.min(idx, Math.max(0, total - 1));
  const step = steps[current];

  useEffect(() => {
    if (!onActiveActor) return;
    onActiveActor(step?.type === 'role' ? step.actor.id : null);
    return () => onActiveActor && onActiveActor(null);
  }, [step?.type, step?.actor?.id, onActiveActor]);

  if (!isNight) return null;

  const minions = game.players.filter(p => p.type === 'minion' && ROLE_BY_ID[p.role]?.misperception?.wakesWithEvil !== false);
  const demons  = game.players.filter(p => p.type === 'demon');

  const containerStyle = { width: '100%', display: 'flex', flexDirection: 'column', maxHeight: '70vh', background: 'rgba(8,9,16,0.7)', border: '1px solid var(--gold)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(201,162,74,0.08)', borderBottom: 'var(--hairline)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-hot)' }}>
          🌙 Guía · Noche {game.nightNumber} — paso {current + 1}/{total}
        </span>
      </div>

      <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {!step ? (
          <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-400)', fontStyle: 'italic', textAlign: 'center' }}>
            No hay roles que actúen esta noche.
          </p>
        ) : step.type === 'info' ? (
          <div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--blood-hi)', marginBottom: 8 }}>Info Esbirros &amp; Demonio</p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-400)', fontStyle: 'italic', marginBottom: 8 }}>
              Entra a la sala de cada uno y dale su información por voz.
            </p>
            {[...minions, ...demons].map(m => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', flex: 1 }}>
                    {m.name} · {m.type === 'demon' ? '👹 Demonio' : '😈 Esbirro'}
                  </span>
                  {m.discordId && (
                    <button onClick={() => send('MOVE_NARRATOR_TO_ROOM', { playerId: m.id })}
                      className="btn-action primary" style={{ fontSize: 9, padding: '3px 8px' }}>🚪 Ir a su sala</button>
                  )}
                </div>
                {m.nightInfo
                  ? <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', whiteSpace: 'pre-line', margin: 0 }}>{m.nightInfo}</p>
                  : <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-500)', fontStyle: 'italic', margin: 0 }}>Info pendiente.</p>}
              </div>
            ))}
            {game.nightNumber === 1 && <BluffsPanel game={game} send={send} />}
          </div>
        ) : (
          <RoleStepView step={step} game={game} send={send} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: 'var(--hairline)' }}>
        <button onClick={() => setIdx(Math.max(0, current - 1))} disabled={current <= 0}
          className="btn-action" style={{ flex: 1, opacity: current <= 0 ? 0.35 : 1 }}>← Anterior</button>
        {step?.type === 'role' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--bone-300)', whiteSpace: 'nowrap', cursor: 'pointer', marginRight: 'auto' }}>
            <input type="checkbox" checked={completed.has(current)} onChange={e => {
              const c = new Set(completed);
              if (e.target.checked) c.add(current); else c.delete(current);
              setCompleted(c);
            }} />
            Desperté
          </label>
        )}
        {step?.type === 'role' && step.actor.discordId && (
          <button onClick={() => send('MOVE_NARRATOR_TO_ROOM', { playerId: step.actor.id })}
            className="btn-action primary" style={{ flex: 1.4 }}>🚪 Ir a su habitación</button>
        )}
        <button onClick={() => setIdx(Math.min(total - 1, current + 1))} disabled={current >= total - 1}
          className="btn-action primary" style={{ flex: 1, opacity: current >= total - 1 ? 0.35 : 1 }}>Siguiente →</button>
      </div>
    </div>
  );
}

function RoleStepView({ step, game, send }) {
  const { role, actor } = step;
  const trueDef    = ROLE_BY_ID[actor.role] || role;
  const believedDef = actor.believedRole ? ROLE_BY_ID[actor.believedRole] : null;
  const isMisperc  = !!believedDef && actor.believedRole !== actor.role;
  const shown      = isMisperc ? believedDef : role;
  const evil       = shown.alignment === 'evil';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {shown.img && <img src={shown.img} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: evil ? 'var(--blood-hi)' : 'var(--bone-100)' }}>{shown.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-300)' }}>
            🗣 {actor.name}{actor.poisoned ? ' · 🧪 envenenado' : ''}{!actor.alive ? ' · ☠' : ''}
          </div>
        </div>
      </div>

      {isMisperc && (
        <div style={{ background: 'rgba(168,58,45,0.14)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p className="identity-false" style={{ color: 'var(--blood-hi)', marginBottom: 4 }} title={`${actor.name} no conoce su rol real. Cree ser ${shown.name} y recibe información falsa.`}>
            <span className="mask">{MASK}</span>&nbsp;<strong>Identidad falsa</strong>
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', margin: 0, lineHeight: 1.5 }}>
            {actor.name} — Real: <strong>{trueDef.name}</strong> ({typeLabel(trueDef.type)}) · Se cree: <strong>{shown.name}</strong> ({typeLabel(shown.type)}). Su habilidad NO funciona — dale información <strong>FALSA</strong>.
          </p>
        </div>
      )}

      {actor.poisoned && !isMisperc && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: '#4ade80', margin: 0, lineHeight: 1.5 }}>
            🧪 <strong>{actor.name} está envenenado</strong>: su habilidad NO funciona — dale información <strong>FALSA</strong>.
          </p>
        </div>
      )}

      <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-300)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>{shown.ability}</p>

      {actor.nightInfo ? (
        <div style={{ background: 'rgba(201,162,74,0.07)', border: 'var(--hairline)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Para decirle por voz</p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-100)', whiteSpace: 'pre-line', margin: 0 }}>{actor.nightInfo}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(0,0,0,0.25)', border: 'var(--hairline-bone)', borderRadius: 4, padding: '7px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-500)', fontStyle: 'italic', margin: 0 }}>
            Sin información previa — decide abajo y confirma.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grimorio:</span>
        <StatusChips player={actor} compact />
      </div>

      <NarratorActionPanel actor={actor} role={shown} trueRole={trueDef} game={game} send={send} />
    </div>
  );
}

// ── Dispatcher: elige el panel correcto según el patrón del rol ──────────
function NarratorActionPanel({ actor, role, trueRole, game, send }) {
  const isMisperc = actor.believedRole && actor.believedRole !== actor.role;
  // For misperception (Marionette/Lunatic): show believed role's panel so narrator goes through the motions
  const p = NIGHT_ROLE_PATTERN[isMisperc ? role.id : trueRole.id];
  if (!p) return null;
  const isFirstNight = game.nightNumber === 1;
  if (p.kind === 'P2' && !isFirstNight) return null;
  if ((p.kind === 'P3' || p.kind === 'P3x2') && trueRole.id === 'MONK' && isFirstNight) return null;
  if (p.kind === 'P1' && p.what === 'executedRole' && !game.executedToday) return null;
  const roleName = role.name;
  switch (p.kind) {
    case 'P2':   return <P2Panel   actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P1':   return <P1Panel   actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P3':   return <P3Panel   actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P3x2': return <P3x2Panel actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P4':   return <P4Panel   actor={actor} pattern={p} game={game} send={send} />;
    default:     return null;
  }
}

const panelStyle = { marginTop: 10, background: 'rgba(201,162,74,0.06)', border: '1px solid rgba(201,162,74,0.25)', borderRadius: 6, padding: '10px 12px' };
const labelStyle = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', margin: '0 0 8px' };
const selStyle   = { fontSize: 11, background: 'var(--ink-600)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: 'var(--bone-100)', padding: '4px 6px', width: '100%', marginBottom: 4 };
const btnPrimary = { width: '100%', fontSize: 11, padding: '6px 0' };
const poisonNote = <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: '#4ade80', fontStyle: 'italic', margin: '0 0 6px' }}>🧪 Envenenado: elige libremente (info FALSA).</p>;

// P2 — par verdadero + señuelo + personaje (Lavandera, Bibliotecario, Investigador)
function P2Panel({ actor, pattern, game, send, roleName }) {
  const [trueSeat,  setTrueSeat]  = useState('');
  const [decoySeat, setDecoySeat] = useState('');
  const [shownRole, setShownRole] = useState('');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive && p.id !== actor.id);
  const isp    = actor.poisoned;
  const validTrue  = isp ? living : living.filter(p => p.type === pattern.targetType);
  const validDecoy = living.filter(p => p.id !== trueSeat);
  const roleChoices = (game.campaignRoles || []).filter(r => r.type === pattern.targetType);

  const trueName  = game.players.find(p => p.id === trueSeat)?.name;
  const decoyName = game.players.find(p => p.id === decoySeat)?.name;
  const can = trueSeat && decoySeat && trueSeat !== decoySeat && shownRole;
  const info = can ? `${pattern.emoji} ${roleName || ROLE_BY_ID[actor.role]?.name || ''}\nEntre ${trueName} y ${decoyName} hay un/una ${shownRole}.` : null;

  const confirm = () => {
    if (!info) return;
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: info });
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Decidir info (P2)'}</p>
      {isp && poisonNote}
      <select style={selStyle} value={trueSeat} onChange={e => { setTrueSeat(e.target.value); setOk(false); }}>
        <option value="">Jugador VERDADERO{!isp ? ` (${pattern.targetType})` : ''}</option>
        {validTrue.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={decoySeat} onChange={e => { setDecoySeat(e.target.value); setOk(false); }}>
        <option value="">Jugador SEÑUELO</option>
        {validDecoy.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={shownRole} onChange={e => { setShownRole(e.target.value); setOk(false); }}>
        <option value="">Rol a mostrar</option>
        {roleChoices.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
      </select>
      {info && <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-300)', fontStyle: 'italic', margin: '4px 0' }}>{info}</p>}
      <button onClick={confirm} disabled={!can} className="btn-action primary" style={btnPrimary}>✓ Confirmar info</button>
    </div>
  );
}

// P1 — número calculado + override (Empática, Cocinero, Sepulturero)
function P1Panel({ actor, pattern, game, send, roleName }) {
  const [val, setVal] = useState('');
  const [ok,  setOk]  = useState(false);

  if (pattern.what === 'executedRole') {
    const exec = game.players.find(p => p.id === game.executedToday);
    if (!exec) return null;
    const execRoleName = ROLE_BY_ID[exec.role]?.name || '?';
    const info = `${pattern.emoji} Sepulturero\nEl ejecutado (${exec.name}) era: ${execRoleName}.`;
    return (
      <div style={panelStyle}>
        <p style={labelStyle}>{ok ? '✓ Confirmado' : 'Sepulturero'}</p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', margin: '0 0 6px' }}>{info}</p>
        <button onClick={() => { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: info }); setOk(true); }}
          className="btn-action primary" style={btnPrimary}>✓ Confirmar</button>
      </div>
    );
  }

  const auto = pattern.what === 'evilNeighbors' ? calcEvilNeighbors(game, actor.id) : calcEvilPairs(game);
  const maxV = pattern.what === 'evilNeighbors' ? 2 : Math.min(4, Math.floor(game.players.length / 2));
  const infoStr = val !== '' ? `${pattern.emoji} ${roleName || ROLE_BY_ID[actor.role]?.name || ''}\nTienes ${val} ${pattern.label}.` : null;

  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Decidir número'}</p>
      {actor.poisoned && poisonNote}
      {!actor.poisoned && <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-400)', margin: '0 0 4px' }}>
        Auto: <strong style={{ color: 'var(--good)' }}>{auto}</strong> {pattern.label}
      </p>}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {Array.from({ length: maxV + 1 }, (_, i) => (
          <button key={i} onClick={() => { setVal(String(i)); setOk(false); }} className="btn-night"
            style={{ flex: 1, fontSize: 14, padding: '5px 0', borderColor: String(i) === val ? 'var(--gold)' : undefined, color: String(i) === val ? 'var(--gold-hot)' : undefined }}>
            {i}
          </button>
        ))}
      </div>
      {!actor.poisoned && val === '' && auto != null && (
        <button onClick={() => setVal(String(auto))} className="btn-night" style={{ width: '100%', fontSize: 10, padding: '4px 0', marginBottom: 4 }}>
          Usar calculado ({auto})
        </button>
      )}
      <button onClick={() => { if (infoStr) { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: infoStr }); setOk(true); } }}
        disabled={!infoStr} className="btn-action primary" style={{ ...btnPrimary, opacity: infoStr ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P3 — elegir 1 jugador (Envenenador, Monje, Mayordomo, Imp, y todos los Demonios no-TB)
function P3Panel({ actor, pattern, game, send, roleName }) {
  const [targetId, setTargetId] = useState('');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive && (pattern.notSelf ? p.id !== actor.id : true));
  const infoLabels = {
    POISONER_ACTION: n => `🧪 Envenenador\nEnvenenaste a ${n} esta noche.`,
    MONK_PROTECT:    n => `🛡️ Monje\nProtegiste a ${n} esta noche.`,
    IMP_KILL:        n => `👹 Diablillo\nAtacaste a ${n} esta noche.`,
    BUTLER_MASTER:   n => `🤵 Mayordomo\nTu Amo esta noche es ${n}.`,
  };

  const confirm = () => {
    if (!targetId) return;
    const name = game.players.find(p => p.id === targetId)?.name;
    const fallback = n => `${pattern.emoji} ${roleName || ''}\n${pattern.label} ${n} esta noche.`;
    const nightInfo = (infoLabels[pattern.effect] || fallback)(name);
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, actionType: pattern.effect, targetIds: [targetId], nightInfo });
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Acción aplicada' : pattern.label || roleName}</p>
      {pattern.note && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', margin: '0 0 8px', borderLeft: '2px solid var(--gold)', paddingLeft: 6, lineHeight: 1.4 }}>
          ⚠ {pattern.note}
        </p>
      )}
      <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setOk(false); }}>
        <option value="">{pattern.label || 'Elegir jugador'}…</option>
        {living.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button onClick={confirm} disabled={!targetId} className="btn-action primary"
        style={{ ...btnPrimary, opacity: targetId ? 1 : 0.4 }}>{pattern.emoji} Aplicar</button>
    </div>
  );
}

// P3x2 — elegir 2 jugadores (Shabaloth)
function P3x2Panel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive);
  const can = t1 && t2 && t1 !== t2;

  const confirm = () => {
    if (!can) return;
    const n1 = game.players.find(p => p.id === t1)?.name;
    const n2 = game.players.find(p => p.id === t2)?.name;
    const nightInfo = `${pattern.emoji} ${roleName}\nAtacaste a ${n1} y ${n2} esta noche.`;
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, actionType: pattern.effect, targetIds: [t1, t2], nightInfo });
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Acción aplicada' : `${roleName} — 2 objetivos`}</p>
      {pattern.note && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', margin: '0 0 8px', borderLeft: '2px solid var(--gold)', paddingLeft: 6, lineHeight: 1.4 }}>
          ⚠ {pattern.note}
        </p>
      )}
      <select style={selStyle} value={t1} onChange={e => { setT1(e.target.value); setOk(false); }}>
        <option value="">Objetivo 1…</option>
        {living.filter(p => p.id !== t2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={t2} onChange={e => { setT2(e.target.value); setOk(false); }}>
        <option value="">Objetivo 2…</option>
        {living.filter(p => p.id !== t1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button onClick={confirm} disabled={!can} className="btn-action primary"
        style={{ ...btnPrimary, opacity: can ? 1 : 0.4 }}>{pattern.emoji} Aplicar 2 ataques</button>
    </div>
  );
}

// P4 — 2 jugadores + sí/no (Adivina)
function P4Panel({ actor, pattern, game, send }) {
  const isFirstNight = game.nightNumber === 1;
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [redHerring, setRedHerring] = useState(game.smokeScreenPlayerId || '');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive && p.id !== actor.id);
  const goodPl = game.players.filter(p => p.alignment === 'good');
  const p1d = game.players.find(p => p.id === p1);
  const p2d = game.players.find(p => p.id === p2);
  const rh  = redHerring || game.smokeScreenPlayerId;
  const isDemon = p => p?.type === 'demon' || p?.id === rh;
  const result = (p1d && p2d && !actor.poisoned)
    ? (isDemon(p1d) || isDemon(p2d) ? '✅ SÍ hay Demonio' : '❌ NO hay Demonio')
    : null;
  const can = p1 && p2 && p1 !== p2;
  const buildInfo = () => {
    const n1 = p1d?.name, n2 = p2d?.name;
    const res = actor.poisoned ? '(info FALSA — decide tú)' : (result || '…');
    return `🔮 Adivina\nEntre ${n1} y ${n2}: ${res}.`;
  };
  const confirm = () => {
    if (!can) return;
    const payload = { actorId: actor.id, nightInfo: buildInfo() };
    if (isFirstNight && redHerring) payload.redHerringSeatId = redHerring;
    send('NIGHT_NARRATOR_ACTION', payload);
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Adivina — elegir 2 jugadores'}</p>
      {isFirstNight && (
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '6px 8px', marginBottom: 8 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--bone-400)', textTransform: 'uppercase', margin: '0 0 4px' }}>Falso positivo (solo 1ª noche)</p>
          <select style={{ ...selStyle, marginBottom: 0 }} value={redHerring} onChange={e => {
            setRedHerring(e.target.value);
            if (e.target.value) send('NIGHT_NARRATOR_ACTION', { redHerringSeatId: e.target.value });
          }}>
            <option value="">Sin falso positivo</option>
            {goodPl.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <select style={selStyle} value={p1} onChange={e => { setP1(e.target.value); setOk(false); }}>
        <option value="">Jugador 1</option>
        {living.filter(p => p.id !== p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={p2} onChange={e => { setP2(e.target.value); setOk(false); }}>
        <option value="">Jugador 2</option>
        {living.filter(p => p.id !== p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {result && !actor.poisoned && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: result.startsWith('✅') ? 'var(--blood-hi)' : 'var(--good)', margin: '4px 0', textAlign: 'center', fontWeight: 700 }}>{result}</p>
      )}
      {actor.poisoned && poisonNote}
      <button onClick={confirm} disabled={!can} className="btn-action primary"
        style={{ ...btnPrimary, opacity: can ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P7 — Bluffs del Demonio (en el paso "Info Esbirros & Demonio", noche 1)
function BluffsPanel({ game, send }) {
  const notInPlay = game.rolesNotInPlay || [];
  const allRoles  = game.campaignRoles  || [];
  const [selected, setSelected] = useState(game.narratorRolesForImp || []);
  const [ok, setOk] = useState((game.narratorRolesForImp || []).length >= 3);

  const candidates = allRoles.filter(r => notInPlay.includes(r.id) && r.alignment === 'good');

  const toggle = rid => {
    setSelected(prev => prev.includes(rid)
      ? prev.filter(x => x !== rid)
      : prev.length < 3 ? [...prev, rid] : prev);
    setOk(false);
  };
  const confirm = () => { send('NIGHT_NARRATOR_ACTION', { bluffs: selected }); setOk(true); };

  return (
    <div style={{ marginTop: 10, background: 'rgba(168,58,45,0.08)', border: '1px solid var(--blood-dim)', borderRadius: 6, padding: '10px 12px' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', margin: '0 0 6px' }}>
        {ok ? '✓ Bluffs fijados' : `Bluffs del Demonio (${selected.length}/3)`}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
        {candidates.map(r => {
          const on   = selected.includes(r.id);
          const full = selected.length >= 3 && !on;
          return (
            <button key={r.id} disabled={full} className="btn-night"
              style={{ fontSize: 9, opacity: full ? 0.35 : 1, borderColor: on ? 'var(--blood-hi)' : undefined, color: on ? 'var(--blood-hi)' : undefined }}
              onClick={() => toggle(r.id)}>
              {r.name}
            </button>
          );
        })}
      </div>
      <button onClick={confirm} disabled={selected.length < 3} className="btn-action"
        style={{ width: '100%', fontSize: 11, padding: '5px 0', opacity: selected.length >= 3 ? 1 : 0.4 }}>
        ✓ Confirmar bluffs
      </button>
    </div>
  );
}
