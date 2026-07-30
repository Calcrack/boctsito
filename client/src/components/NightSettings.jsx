import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

// ── Ajustes de esta noche ────────────────────────────────────────────
// Decisiones del narrador que no son un paso del orden de noche, sino un
// interruptor que dura toda la partida o toda la noche: cómo registran el
// Recluso y el Espía, a quién redirige el Alcalde su muerte y quién es el
// falso positivo de la Adivina.
// Cada bloque solo aparece si su personaje está en juego.

function Choice({ options, value, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <button key={String(opt.value)} onClick={() => onPick(opt.value)}
          className={`nx-btn sm${value === opt.value ? ' on' : ''}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Setting({ title, help, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="nx-sub" style={{ marginBottom: 2 }}>{title}</p>
      {help && <p className="nx-hint" style={{ marginBottom: 6 }}>{help}</p>}
      {children}
    </div>
  );
}

export default function NightSettings() {
  const { state, send } = useGame();
  const { game } = state;
  const [open, setOpen] = useState(false);
  if (!game) return null;

  const players = game.players || [];
  const hasFortuneTeller = players.some(p => p.role === 'FORTUNE_TELLER');
  const hasRecluse = players.some(p => p.role === 'RECLUSE' && p.alive);
  const hasSpy = players.some(p => p.role === 'SPY' && p.alive);
  const mayor = players.find(p => p.role === 'MAYOR' && p.alive);

  const count = [hasFortuneTeller, hasRecluse, hasSpy, !!mayor].filter(Boolean).length;
  if (count === 0) return null;

  const redHerring = players.find(p => p.id === game.smokeScreenPlayerId);
  const mayorTarget = players.find(p => p.id === game.mayorKillTarget);

  return (
    <div className="nx-card">
      <div className="nx-card-head clickable" onClick={() => setOpen(o => !o)}>
        <p className="nx-head-title">⚙ Ajustes de esta noche ({count})</p>
        <span className="nx-mono">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="nx-card-body">
          {hasFortuneTeller && (
            <Setting
              title="Falso positivo de la Adivina"
              help={redHerring ? `Ahora: ${redHerring.name} le aparece como Demonio.` : 'Un jugador bueno que siempre le sale como Demonio.'}>
              <Choice
                value={game.smokeScreenPlayerId || null}
                onPick={v => send('SET_SMOKE_SCREEN', { playerId: v })}
                options={[{ value: null, label: 'Ninguno' }, ...players.map(p => ({ value: p.id, label: p.name }))]}
              />
            </Setting>
          )}

          {hasRecluse && (
            <Setting title="Recluso — cómo se registra" help="Puede aparecer como malvado en cualquier información.">
              <Choice
                value={game.recluseRegistersAs || null}
                onPick={v => send('SET_RECLUSE_REGISTERS_AS', { value: v })}
                options={[
                  { value: null, label: 'Normal (bueno)' },
                  { value: 'minion', label: 'Parece Esbirro' },
                  { value: 'demon', label: 'Parece Demonio' },
                ]}
              />
            </Setting>
          )}

          {hasSpy && (
            <Setting title="Espía — cómo se registra" help="Puede aparecer como bueno en cualquier información.">
              <Choice
                value={game.spyRegistersAs || null}
                onPick={v => send('SET_SPY_REGISTERS_AS', { value: v })}
                options={[
                  { value: null, label: 'Normal (malvado)' },
                  { value: 'good', label: 'Parece Bueno' },
                ]}
              />
            </Setting>
          )}

          {mayor && (
            <Setting
              title="Alcalde — redirigir su muerte"
              help={mayorTarget ? `Si atacan al Alcalde, muere ${mayorTarget.name}.` : 'Si el Demonio le ataca, puedes matar a otro en su lugar.'}>
              <Choice
                value={game.mayorKillTarget || null}
                onPick={v => send('SET_MAYOR_KILL_TARGET', { playerId: v })}
                options={[
                  { value: null, label: 'Sin redirección' },
                  ...players.filter(p => p.alive && p.role !== 'MAYOR').map(p => ({ value: p.id, label: p.name })),
                ]}
              />
            </Setting>
          )}
        </div>
      )}
    </div>
  );
}
