import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';

const FIRST_NIGHT = [
  { key: 'evil_info',    label: 'Info Esbirros & Demonio', systemOnly: true },
  { role: 'POISONER',    label: 'Envenenador',        action: 'POISONER_ACTION',  targets: 1, evil: true, playerControlled: true },
  { role: 'WASHERWOMAN', label: 'Lavandera',           action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'LIBRARIAN',   label: 'Bibliotecario',       action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'INVESTIGATOR',label: 'Investigador',        action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'COOK',        label: 'Cocinero',            action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'EMPATH',      label: 'Empática',            action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'FORTUNE_TELLER',label:'Adivina',            action: 'FORTUNE_TELLER',  targets: 2, playerControlled: true },
  { role: 'BUTLER',      label: 'Mayordomo',           action: 'BUTLER_MASTER',   targets: 1, playerControlled: true },
  { role: 'SPY',         label: 'Espía',               action: 'INFO_ACKNOWLEDGE', targets: 0, evil: true, playerControlled: true },
];

const OTHER_NIGHTS = [
  { role: 'POISONER',    label: 'Envenenador',         action: 'POISONER_ACTION',  targets: 1, evil: true, playerControlled: true },
  { role: 'MONK',        label: 'Monje',               action: 'MONK_PROTECT',     targets: 1, playerControlled: true },
  { role: 'IMP',         label: 'Diablillo',           action: 'IMP_KILL',         targets: 1, evil: true, playerControlled: true },
  { role: 'UNDERTAKER',  label: 'Enterrador',          action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'EMPATH',      label: 'Empática',            action: 'INFO_ACKNOWLEDGE', targets: 0, playerControlled: true },
  { role: 'RAVENKEEPER', label: 'Criacuervos',         action: 'RAVENKEEPER_INFO', targets: 1, onlyIfPending: true, playerControlled: true },
  { role: 'FORTUNE_TELLER',label:'Adivina',            action: 'FORTUNE_TELLER',  targets: 2, playerControlled: true },
  { role: 'BUTLER',      label: 'Mayordomo',           action: 'BUTLER_MASTER',   targets: 1, playerControlled: true },
  { role: 'SPY',         label: 'Espía',               action: 'INFO_ACKNOWLEDGE', targets: 0, evil: true, playerControlled: true },
];

export default function NightControl() {
  const { state, send } = useGame();
  const { game } = state;
  const [openStep, setOpenStep] = useState(null);
  const [targets, setTargets] = useState([]);

  if (!game) return null;
  const { players, nightNumber, executedToday, nightDeaths } = game;
  const isFirst = nightNumber <= 1;
  const order = isFirst ? FIRST_NIGHT : OTHER_NIGHTS;
  const living = players.filter(p => p.alive);

  const presentRoles = new Set(players.filter(p => p.alive).map(p => p.role));
  const pendingRaven = players.find(p => p.role === 'RAVENKEEPER' && p.pendingRavenkeeper);
  if (pendingRaven) presentRoles.add('RAVENKEEPER');

  const activeSteps = order.map((step, idx) => ({ ...step, _idx: idx + 1 })).filter(step => {
    if (step.systemOnly) return true;
    if (!presentRoles.has(step.role)) return false;
    if (step.onlyIfPending) return !!pendingRaven;
    if (step.role === 'UNDERTAKER') return !!executedToday;
    return true;
  });

  const handleApply = (step) => {
    if (!step.action) return;
    const actor = players.find(p => p.role === step.role && (step.onlyIfPending ? true : p.alive));
    if (!actor) return;
    send('NIGHT_ACTION', { actionType: step.action, actorId: actor.id, targetIds: targets });
    setTargets([]);
    setOpenStep(null);
  };

  const toggleTarget = (pid, max) => {
    setTargets(prev => {
      if (prev.includes(pid)) return prev.filter(id => id !== pid);
      if (prev.length >= max) return max === 1 ? [pid] : [...prev.slice(1), pid];
      return [...prev, pid];
    });
  };

  const row = (content, extra = {}) => (
    <div style={{ padding: '6px 0', borderBottom: 'var(--hairline-bone)', ...extra }}>{content}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      <SmokeScreenControl game={game} send={send} />

      {players.some(p => p.role === 'RECLUSE' && p.alive) && <RecluseControl game={game} send={send} />}
      {players.some(p => p.role === 'SPY' && p.alive) && <SpyControl game={game} send={send} />}
      {['first_night','night'].includes(game.phase) && players.some(p => p.role === 'MAYOR' && p.alive) && (
        <MayorControl game={game} send={send} players={players} />
      )}

      <div>
        <p className="panel-label">
          Orden Noche {nightNumber} {isFirst ? '— Primera' : ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {activeSteps.map(step => {
            if (step.systemOnly) return <SystemInfoStep key="evil_info" game={game} players={players} />;

            const actor = players.find(p => p.role === step.role && (step.onlyIfPending ? !p.alive : p.alive));
            if (!actor) return null;
            const isOpen = openStep === step.role;
            const roleData = ROLE_BY_ID[step.role];

            return (
              <div key={step.role} style={{
                borderRadius: 4,
                border: isOpen ? '1px solid rgba(201,162,74,0.4)' : 'var(--hairline-bone)',
                borderLeft: step.evil ? '3px solid var(--blood-hi)' : (isOpen ? undefined : undefined),
                background: isOpen ? 'rgba(201,162,74,0.05)' : 'rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' }}
                  onClick={() => { setOpenStep(isOpen ? null : step.role); setTargets([]); }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', width: 16, textAlign: 'right', flexShrink: 0 }}>{step._idx}</span>
                  {roleData?.img && <img src={roleData.img} style={{ width: 24, height: 24, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: step.evil ? 'var(--blood-hi)' : 'var(--bone-100)' }}>
                      {step.label}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', marginLeft: 6 }}>
                      {actor.name}{actor.poisoned ? ' ⚠' : ''}
                    </span>
                  </div>
                  {actor.nightInfo && <span style={{ color: 'var(--good)', fontSize: 11 }}>✓</span>}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: 'var(--hairline-bone)', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {actor.nightInfo && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 3, padding: '8px 10px' }}>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Info para {actor.name}</p>
                        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', whiteSpace: 'pre-line' }}>{actor.nightInfo}</p>
                      </div>
                    )}

                    {step.targets > 0 && !step.playerControlled && (
                      <div>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', marginBottom: 6 }}>
                          Elige {step.targets === 1 ? 'objetivo' : `${step.targets} objetivos`}
                          {targets.length > 0 && `: ${targets.map(id => players.find(p => p.id === id)?.name).join(', ')}`}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(step.evil ? players : living)
                            .filter(p => step.role !== 'MONK' || p.id !== actor.id)
                            .map(p => (
                              <button key={p.id} onClick={() => toggleTarget(p.id, step.targets)}
                                className="btn-night"
                                style={{
                                  fontSize: 9,
                                  borderColor: targets.includes(p.id) ? 'var(--gold)' : undefined,
                                  color: targets.includes(p.id) ? 'var(--gold-hot)' : undefined,
                                  opacity: p.alive ? 1 : 0.5,
                                }}>
                                {p.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {step.action && !step.playerControlled && (
                      <button onClick={() => handleApply(step)}
                        disabled={step.targets > 0 && targets.length < step.targets}
                        className="btn-action primary"
                        style={{ opacity: (step.targets > 0 && targets.length < step.targets) ? 0.35 : 1 }}>
                        Aplicar acción
                      </button>
                    )}
                    {step.playerControlled && (
                      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', textAlign: 'center' }}>
                        El jugador actúa desde su panel
                        {actor.nightInfo && <span style={{ color: 'var(--good)', marginLeft: 6 }}>— ya actuó</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending players — haven't pressed Hecho */}
        {(game.nightNotReady || []).length > 0 && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 4 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
              ⏳ Sin confirmar Hecho ({game.nightNotReady.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {game.nightNotReady.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '3px 7px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', background: 'var(--ink-700)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--bone-100)' }}>
                    {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
                  </div>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-200)' }}>{p.name}</span>
                </div>
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

function SystemInfoStep({ game, players }) {
  const [open, setOpen] = useState(false);
  const minions = players.filter(p => p.type === 'minion');
  const demons  = players.filter(p => p.type === 'demon');
  return (
    <div style={{ borderRadius: 4, border: '1px solid var(--blood-dim)', background: 'rgba(168,58,45,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', width: 16, textAlign: 'right' }}>1</span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', flex: 1 }}>Info Esbirros & Demonio</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ borderTop: 'var(--hairline-bone)', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...minions, ...demons].map(m => m.nightInfo ? (
            <div key={m.id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 3, padding: '8px 10px' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 4 }}>{m.name}</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', whiteSpace: 'pre-line' }}>{m.nightInfo}</p>
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
      {open && <div style={{ borderTop: 'var(--hairline-bone)', padding: '10px 10px' }}>{children}</div>}
    </div>
  );
}

function RecluseControl({ game, send }) {
  const current = game.recluseRegistersAs;
  const options = [
    { value: null,    label: 'Normal (bueno)' },
    { value: 'minion', label: 'Parece Esbirro' },
    { value: 'demon',  label: 'Parece Demonio' },
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
    { value: null,   label: 'Normal (malvado)' },
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
