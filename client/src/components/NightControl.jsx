import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID, getCampaign } from '../data/roles';

// Marcadores especiales del orden de noche → paso de info de equipo malvado.
const INFO_MARKERS = new Set(['EVIL_INFO', 'MINION_INFO', 'DEMON_INFO']);

// Controles genéricos (campañas con narrador) → acción del motor.
const CONTROL_DEFS = {
  kill:    { action: 'KILL',       label: '☠ Matar',       color: 'var(--blood-hi)', max: 3 },
  poison:  { action: 'POISON',     label: '🧪 Envenenar',  color: 'var(--good)',     max: 1 },
  drunk:   { action: 'MAKE_DRUNK', label: '🍺 Emborrachar', color: 'var(--gold)',    max: 1 },
  protect: { action: 'PROTECT',    label: '🛡 Proteger',    color: 'var(--moon)',    max: 1 },
  safe:    { action: 'SAFE',       label: '✅ A salvo',     color: 'var(--good)',     max: 2 },
  revive:  { action: 'REVIVE',     label: '♻ Revivir',     color: 'var(--good)',     max: 1 },
};

export default function NightControl() {
  const { state, send } = useGame();
  const { game } = state;
  if (!game) return null;

  const { players, nightNumber, nightDeaths } = game;
  const campaign = getCampaign(game.campaignId);
  const isFirst = nightNumber <= 1;
  const order = isFirst ? campaign.firstNightOrder : campaign.otherNightOrder;

  const pendingRaven = players.find(p => p.role === 'RAVENKEEPER' && p.pendingRavenkeeper);

  let infoShown = false;
  let stepNum = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      {/* Controles especiales TB (solo si el rol está en juego) */}
      {players.some(p => p.role === 'FORTUNE_TELLER') && <SmokeScreenControl game={game} send={send} />}
      {players.some(p => p.role === 'RECLUSE' && p.alive) && <RecluseControl game={game} send={send} />}
      {players.some(p => p.role === 'SPY' && p.alive) && <SpyControl game={game} send={send} />}
      {['first_night', 'night'].includes(game.phase) && players.some(p => p.role === 'MAYOR' && p.alive) && (
        <MayorControl game={game} send={send} players={players} />
      )}

      <div>
        <p className="panel-label">
          {campaign.name} — Orden Noche {nightNumber} {isFirst ? '— Primera' : ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {order.map((roleId) => {
            if (INFO_MARKERS.has(roleId)) {
              if (infoShown) return null;
              infoShown = true;
              stepNum += 1;
              return <SystemInfoStep key="evil_info" idx={stepNum} game={game} players={players} />;
            }

            const role = ROLE_BY_ID[roleId];
            const isPendingRole = roleId === 'RAVENKEEPER' && !!pendingRaven;
            const actors = players.filter(p =>
              (p.role === roleId || (p.role === 'DRUNK' && p.drunkAs === roleId)) &&
              (isPendingRole ? true : p.alive)
            );
            if (actors.length === 0) return null;

            return actors.map(actor => {
              stepNum += 1;
              return (
                <NightStep
                  key={actor.id + roleId}
                  idx={stepNum}
                  role={role}
                  actor={actor}
                  game={game}
                  send={send}
                  isPendingRole={isPendingRole}
                />
              );
            });
          })}
        </div>

        {/* Jugadores sin confirmar Hecho (relevante en modo automático) */}
        {(game.nightNotReady || []).length > 0 && game.autoMode && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 4 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
              ⏳ Sin confirmar Hecho ({game.nightNotReady.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {game.nightNotReady.map(p => (
                <span key={p.id} style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-200)', background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '3px 7px' }}>{p.name}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => {
          const deaths = nightDeaths.map(id => players.find(p => p.id === id)?.name).filter(Boolean);
          send('START_DAY', { nightDeaths: deaths });
        }} className="btn-action primary" style={{ width: '100%', padding: '12px 0', marginTop: 16 }}>
          Amanecer → Día {game.dayNumber + 1}
        </button>
      </div>

      {nightDeaths.length > 0 && (
        <div style={{ background: 'rgba(168,58,45,0.1)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '10px 12px' }}>
          <p className="panel-label" style={{ color: 'var(--blood-hi)' }}>Muertes esta noche</p>
          {nightDeaths.map(id => {
            const p = players.find(pl => pl.id === id);
            const role = p?.role ? ROLE_BY_ID[p.role] : null;
            return p ? (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)' }}>
                {role?.img && <img src={role.img} style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} />}
                <span>☠ {p.name}</span>
                {role && <span style={{ color: 'var(--bone-400)', fontSize: 11 }}>({role.name})</span>}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Un paso del orden de noche (un rol) ────────────────────────────
function NightStep({ idx, role, actor, game, send, isPendingRole }) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState([]);
  const [infoText, setInfoText] = useState('');
  const players = game.players;

  if (!role) return null;
  const evil = role.alignment === 'evil';
  const concrete = role.night;           // TB: acción automatizada
  const controls = role.controls || [];  // campañas nuevas: botones genéricos
  const campaign = getCampaign(game.campaignId);
  const roleReminders = campaign.reminders?.[role.id] || []; // fichas de este rol

  const toggle = (pid, max) => {
    setTargets(prev => {
      if (prev.includes(pid)) return prev.filter(x => x !== pid);
      if (prev.length >= max) return max === 1 ? [pid] : [...prev.slice(1), pid];
      return [...prev, pid];
    });
  };

  const applyConcrete = () => {
    send('NIGHT_ACTION', { actionType: concrete.action, actorId: actor.id, targetIds: targets });
    setTargets([]); setOpen(false);
  };
  const applyControl = (def) => {
    if (def.action !== 'REVIVE' && targets.length === 0) return;
    send('NIGHT_ACTION', { actionType: def.action, actorId: actor.id, targetIds: targets });
    setTargets([]);
  };
  const sendInfo = () => {
    send('NIGHT_ACTION', { actionType: 'SEND_INFO', actorId: actor.id, info: infoText });
    setInfoText('');
  };
  // Coloca una ficha del rol sobre los jugadores seleccionados.
  const placeFicha = (t) => {
    if (targets.length === 0) return;
    targets.forEach(pid => send('ADD_TOKEN', { playerId: pid, token: { tokenId: t.id, roleId: role.id, label: t.label, duration: t.duration } }));
  };

  const maxTargets = concrete?.targets ?? Math.max(1, ...controls.map(c => CONTROL_DEFS[c]?.max || 1), 1);
  const pool = players; // narrador puede elegir a cualquiera

  return (
    <div style={{
      borderRadius: 4,
      border: open ? '1px solid rgba(201,162,74,0.4)' : 'var(--hairline-bone)',
      borderLeft: evil ? '3px solid var(--blood-hi)' : undefined,
      background: open ? 'rgba(201,162,74,0.05)' : 'rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', width: 16, textAlign: 'right', flexShrink: 0 }}>{idx}</span>
        {role.img && <img src={role.img} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: evil ? 'var(--blood-hi)' : 'var(--bone-100)' }}>{role.name}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', marginLeft: 6 }}>
            {actor.name}{actor.poisoned ? ' ⚠' : ''}{!actor.alive ? ' ☠' : ''}
          </span>
        </div>
        {actor.nightInfo && <span style={{ color: 'var(--good)', fontSize: 11 }}>✓</span>}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ borderTop: 'var(--hairline-bone)', padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', margin: 0 }}>{role.ability}</p>

          {actor.nightInfo && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 3, padding: '8px 10px' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Info de {actor.name}</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', whiteSpace: 'pre-line', margin: 0 }}>{actor.nightInfo}</p>
            </div>
          )}

          {/* Selector de objetivos — siempre disponible para el narrador */}
          <div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', marginBottom: 6 }}>
              Elige jugador(es){targets.length > 0 && `: ${targets.map(id => players.find(p => p.id === id)?.name).join(', ')}`}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {pool.map(p => (
                <button key={p.id} onClick={() => toggle(p.id, maxTargets)}
                  className="btn-night"
                  style={{
                    fontSize: 9,
                    borderColor: targets.includes(p.id) ? 'var(--gold)' : undefined,
                    color: targets.includes(p.id) ? 'var(--gold-hot)' : undefined,
                    opacity: p.alive ? 1 : 0.5,
                  }}>
                  {p.name}{!p.alive ? ' ☠' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Fichas de este rol → colocar sobre el/los jugador(es) elegidos */}
          {roleReminders.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', marginBottom: 6 }}>
                {targets.length === 0
                  ? 'Colocar ficha (elige jugador primero)'
                  : `Colocar ficha sobre: ${targets.map(id => players.find(p => p.id === id)?.name).join(', ')}`}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {roleReminders.map(t => (
                  <button key={t.id} onClick={() => placeFicha(t)} disabled={targets.length === 0}
                    className="btn-night"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 6px 2px 2px', opacity: targets.length === 0 ? 0.4 : 1 }}>
                    {role.img && <img src={role.img} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TB: acción concreta automatizada */}
          {concrete && !concrete.passive && (
            <button onClick={applyConcrete}
              disabled={concrete.targets > 0 && targets.length < concrete.targets}
              className="btn-action primary"
              style={{ opacity: (concrete.targets > 0 && targets.length < concrete.targets) ? 0.35 : 1 }}>
              Aplicar acción
            </button>
          )}

          {/* Campañas nuevas: botones genéricos */}
          {!concrete && controls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {controls.filter(c => CONTROL_DEFS[c]).map(c => {
                const def = CONTROL_DEFS[c];
                return (
                  <button key={c} onClick={() => applyControl(def)}
                    className="btn-night"
                    style={{ fontSize: 11, color: def.color, borderColor: 'currentColor' }}>
                    {def.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Caja de info libre (siempre disponible para el narrador) */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            <textarea value={infoText} onChange={e => setInfoText(e.target.value)}
              placeholder="Enviar información a este jugador…"
              rows={2}
              style={{ flex: 1, background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 3, padding: '6px 8px', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', resize: 'vertical' }}
            />
            <button onClick={sendInfo} disabled={!infoText.trim()} className="btn-action primary"
              style={{ padding: '8px 10px', opacity: infoText.trim() ? 1 : 0.35 }}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemInfoStep({ idx, game, players }) {
  const [open, setOpen] = useState(false);
  const minions = players.filter(p => p.type === 'minion');
  const demons  = players.filter(p => p.type === 'demon');
  return (
    <div style={{ borderRadius: 4, border: '1px solid var(--blood-dim)', background: 'rgba(168,58,45,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', width: 16, textAlign: 'right' }}>{idx}</span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', flex: 1 }}>Info Esbirros & Demonio</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ borderTop: 'var(--hairline-bone)', padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...minions, ...demons].map(m => m.nightInfo ? (
            <div key={m.id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 3, padding: '8px 10px' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 4 }}>{m.name}</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', whiteSpace: 'pre-line', margin: 0 }}>{m.nightInfo}</p>
            </div>
          ) : null)}
          {[...minions, ...demons].every(p => !p.nightInfo) && (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic' }}>Info se genera al iniciar la noche.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ControlBlock({ title, children, borderColor = 'var(--hairline)' }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 4, border: `1px solid ${borderColor}`, background: 'rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ borderTop: 'var(--hairline-bone)', padding: '10px' }}>{children}</div>}
    </div>
  );
}

function RecluseControl({ game, send }) {
  const current = game.recluseRegistersAs;
  const options = [
    { value: null, label: 'Normal (bueno)' },
    { value: 'minion', label: 'Parece Esbirro' },
    { value: 'demon', label: 'Parece Demonio' },
  ];
  return (
    <ControlBlock title="Recluso — ¿cómo se registra?" borderColor="rgba(109,140,184,0.3)">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={String(opt.value)} onClick={() => send('SET_RECLUSE_REGISTERS_AS', { value: opt.value })}
            className="btn-night"
            style={{ borderColor: current === opt.value ? 'var(--gold)' : undefined, color: current === opt.value ? 'var(--gold-hot)' : undefined }}>
            {opt.label}
          </button>
        ))}
      </div>
    </ControlBlock>
  );
}

function SpyControl({ game, send }) {
  const current = game.spyRegistersAs;
  const options = [
    { value: null, label: 'Normal (malvado)' },
    { value: 'good', label: 'Parece Bueno' },
  ];
  return (
    <ControlBlock title="Espía — ¿cómo se registra?" borderColor="rgba(201,162,74,0.3)">
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(opt => (
          <button key={String(opt.value)} onClick={() => send('SET_SPY_REGISTERS_AS', { value: opt.value })}
            className="btn-night"
            style={{ borderColor: current === opt.value ? 'var(--gold)' : undefined, color: current === opt.value ? 'var(--gold-hot)' : undefined }}>
            {opt.label}
          </button>
        ))}
      </div>
    </ControlBlock>
  );
}

function MayorControl({ game, send, players }) {
  const current = game.mayorKillTarget;
  const currentName = players.find(p => p.id === current)?.name;
  const living = players.filter(p => p.alive && p.role !== 'MAYOR');
  return (
    <ControlBlock title={`Alcalde — redirigir muerte${current ? ` → ${currentName}` : ''}`} borderColor="rgba(109,140,184,0.3)">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => send('SET_MAYOR_KILL_TARGET', { playerId: null })}
          className="btn-night"
          style={{ borderColor: !current ? 'var(--gold)' : undefined, color: !current ? 'var(--gold-hot)' : undefined }}>
          Sin redirección
        </button>
        {living.map(p => (
          <button key={p.id} onClick={() => send('SET_MAYOR_KILL_TARGET', { playerId: p.id })}
            className="btn-night"
            style={{ borderColor: current === p.id ? 'var(--gold)' : undefined, color: current === p.id ? 'var(--gold-hot)' : undefined }}>
            {p.name}
          </button>
        ))}
      </div>
    </ControlBlock>
  );
}

function SmokeScreenControl({ game, send }) {
  const hasFT = game.players.some(p => p.role === 'FORTUNE_TELLER');
  if (!hasFT) return null;
  return (
    <ControlBlock title="Cortina de Humo (Adivina — falso positivo)" borderColor="rgba(201,162,74,0.3)">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <button onClick={() => send('SET_SMOKE_SCREEN', { playerId: null })}
          className="btn-night"
          style={{ borderColor: !game.smokeScreenPlayerId ? 'var(--gold)' : undefined, color: !game.smokeScreenPlayerId ? 'var(--gold-hot)' : undefined }}>
          Ninguno
        </button>
        {game.players.map(p => (
          <button key={p.id} onClick={() => send('SET_SMOKE_SCREEN', { playerId: p.id })}
            className="btn-night"
            style={{ borderColor: game.smokeScreenPlayerId === p.id ? 'var(--gold)' : undefined, color: game.smokeScreenPlayerId === p.id ? 'var(--gold-hot)' : undefined, fontSize: 9 }}>
            {p.name}
          </button>
        ))}
      </div>
    </ControlBlock>
  );
}
