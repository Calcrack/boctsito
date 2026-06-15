import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID, getCampaign } from '../data/roles';
import StatusChips from './StatusChips';

const INFO_MARKERS = new Set(['EVIL_INFO', 'MINION_INFO', 'DEMON_INFO']);

function buildSteps(game) {
  const campaign = getCampaign(game.campaignId);
  const order = game.nightNumber <= 1 ? campaign.firstNightOrder : campaign.otherNightOrder;
  const players = game.players;
  const pendingRaven = players.find(p => p.role === 'RAVENKEEPER' && p.pendingRavenkeeper);
  const steps = [];
  let infoShown = false;
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
      (p.role === roleId || (p.role === 'DRUNK' && p.drunkAs === roleId)) &&
      (isPending ? true : p.alive)
    );
    for (const actor of actors) steps.push({ type: 'role', role, actor });
  }
  return steps;
}

export default function NightWalkthrough({ onActiveActor, embedded = false }) {
  const { state, send } = useGame();
  const { game } = state;
  const [idx, setIdx] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => { setIdx(0); }, [game?.nightNumber]);

  const isNight = game && ['first_night', 'night'].includes(game.phase);
  const steps = isNight ? buildSteps(game) : [];
  const total = steps.length;
  const current = Math.min(idx, Math.max(0, total - 1));
  const step = steps[current];

  // Avisa al panel del actor activo para resaltar su asiento en la mesa.
  useEffect(() => {
    if (!onActiveActor) return;
    onActiveActor(step?.type === 'role' ? step.actor.id : null);
    return () => onActiveActor && onActiveActor(null);
  }, [step?.type, step?.actor?.id, onActiveActor]);

  if (!isNight) return null;

  if (collapsed && !embedded) {
    return (
      <button onClick={() => setCollapsed(false)}
        style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 250,
          background: 'rgba(10,11,20,0.92)', border: '1px solid var(--gold)', borderRadius: 8, padding: '8px 16px',
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-hot)', cursor: 'pointer' }}>
        🌙 Orden de noche ({total})
      </button>
    );
  }

  // La Marioneta (misperception sin despertar) NO se muestra con el mal: los Esbirros no la conocen.
  const minions = game.players.filter(p => p.type === 'minion' && ROLE_BY_ID[p.role]?.misperception?.wakesWithEvil !== false);
  const demons = game.players.filter(p => p.type === 'demon');

  const containerStyle = embedded
    ? { width: '100%', display: 'flex', flexDirection: 'column', maxHeight: '60vh', background: 'rgba(8,9,16,0.7)', border: '1px solid var(--gold)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }
    : { position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 250, width: 'min(560px, 94vw)', display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        background: 'rgba(8,9,16,0.96)', border: '1px solid var(--gold)', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', overflow: 'hidden' };

  return (
    <div style={containerStyle}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(201,162,74,0.08)', borderBottom: 'var(--hairline)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-hot)' }}>
          🌙 Orden de Noche {game.nightNumber} — {current + 1}/{total}
        </span>
        {!embedded && <button onClick={() => setCollapsed(true)} className="btn-night" style={{ fontSize: 9 }}>Ocultar</button>}
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
              Entra a la sala de cada uno y dale su información por voz (aliados y Demonio).
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
                  : <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-500)', fontStyle: 'italic', margin: 0 }}>Info se genera al iniciar la noche.</p>}
              </div>
            ))}
          </div>
        ) : (
          <RoleStepView step={step} send={send} />
        )}
      </div>

      {/* Footer nav */}
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

function RoleStepView({ step, send }) {
  const { role, actor } = step;
  // Misperception: el jugador CREE ser otro rol. Muestra el rol creído + aviso de info FALSA.
  const trueDef = ROLE_BY_ID[actor.role] || role;
  const believedDef = actor.believedRole ? ROLE_BY_ID[actor.believedRole] : null;
  const isMisperc = !!believedDef && actor.believedRole !== actor.role;
  const shown = isMisperc ? believedDef : role;
  const evil = shown.alignment === 'evil';
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
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', margin: 0, lineHeight: 1.5 }}>
            ⚠ Cree ser <strong>{shown.name}</strong>, pero en realidad es <strong>{trueDef.name}</strong>. Su habilidad NO funciona — dale información <strong>FALSA</strong> y arbitraria coherente con {shown.name}.
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
            Sin información automática — despiértalo, ejecuta su acción y/o coloca su ficha.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grimorio:</span>
        <StatusChips player={actor} compact />
      </div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-500)', fontStyle: 'italic', marginTop: 8 }}>
        Acciones detalladas (matar / envenenar / etc.) en la pestaña <strong>Noche</strong>.
      </p>
    </div>
  );
}
