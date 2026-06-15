import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { statusTokens, remindersForRolesInPlay, ROLE_BY_ID } from '../data/roles';

// Fichas del grimorio (solo narrador):
//  · tokens = fichas recordatorias con arte de rol (se ven sobre el jugador)
//  · statuses = notas de texto libre / estados genéricos
export default function StatusChips({ player, compact = false }) {
  const { state, send } = useGame();
  const { game } = state;
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const statuses = player.statuses || [];
  const tokens = player.tokens || [];
  const genericTokens = statusTokens(game?.campaignId);
  const rolesInPlay = (game?.players || []).map(p => p.role).filter(Boolean);
  const reminders = remindersForRolesInPlay(game?.campaignId, rolesInPlay);

  const toggleStatus = (s) => send('TOGGLE_STATUS', { playerId: player.id, status: s });
  const placeToken = (t) => send('ADD_TOKEN', { playerId: player.id, token: t });
  const removeToken = (instanceId) => send('REMOVE_TOKEN', { playerId: player.id, instanceId });

  const durColor = (d) => d === 'night' ? 'var(--moon)' : d === 'oneShot' ? 'var(--blood-hi)' : d === 'day' ? 'var(--gold)' : 'var(--good)';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {/* Fichas colocadas (con arte de rol) */}
      {tokens.map(t => {
        const role = ROLE_BY_ID[t.roleId];
        const dur = t.duration || (t.temp ? 'night' : 'permanent');
        return (
          <button key={t.instanceId} onClick={() => removeToken(t.instanceId)} title={`${t.label}${t.manual ? ' (manual)' : ''} — quitar`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--serif)', fontSize: compact ? 9 : 11, background: 'rgba(0,0,0,0.3)', border: `1px solid ${durColor(dur)}`, color: 'var(--bone-100)', borderRadius: 10, padding: '1px 6px 1px 2px', cursor: 'pointer' }}>
            {role?.img && <img src={role.img} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
            {t.label} ✕
          </button>
        );
      })}

      {/* Estados de texto */}
      {statuses.map(s => (
        <button key={s} onClick={() => toggleStatus(s)} title="Quitar"
          style={{ fontFamily: 'var(--serif)', fontSize: compact ? 9 : 11, background: 'rgba(201,162,74,0.15)', border: '1px solid rgba(201,162,74,0.4)', color: 'var(--gold-hot)', borderRadius: 3, padding: '1px 6px', cursor: 'pointer' }}>
          {s} ✕
        </button>
      ))}

      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)}
          className="btn-night" style={{ fontSize: compact ? 9 : 10, padding: '1px 7px' }}>+ ficha</button>
        {open && (
          <div style={{ position: 'absolute', zIndex: 50, top: '100%', left: 0, marginTop: 4, width: 240, background: 'var(--ink-800)', border: 'var(--hairline)', borderRadius: 4, padding: 8, boxShadow: '0 4px 18px rgba(0,0,0,0.6)' }}>

            {/* Fichas recordatorias por rol en juego */}
            {reminders.length > 0 && (
              <>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', margin: '0 0 5px' }}>Fichas de rol</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                  {reminders.map(t => {
                    const on = tokens.some(x => x.instanceId === `${t.roleId}:${t.tokenId}`);
                    return (
                      <button key={`${t.roleId}:${t.tokenId}`} onClick={() => placeToken(t)} title={`${t.roleName}: ${t.label}`}
                        className="btn-night"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 6px 2px 2px', borderColor: on ? durColor(t.duration) : undefined, color: on ? 'var(--bone-50)' : undefined }}>
                        {t.img && <img src={t.img} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Estados genéricos de texto */}
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', margin: '0 0 5px' }}>Estados</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
              {genericTokens.map(s => {
                const sel = statuses.includes(s);
                return (
                  <button key={s} onClick={() => toggleStatus(s)}
                    className="btn-night"
                    style={{ fontSize: 9, borderColor: sel ? 'var(--gold)' : undefined, color: sel ? 'var(--gold-hot)' : undefined }}>
                    {s}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <input value={custom} onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { toggleStatus(custom.trim()); setCustom(''); } }}
                placeholder="Personalizado…"
                style={{ flex: 1, background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '3px 6px', fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-100)' }}
              />
              <button onClick={() => { if (custom.trim()) { toggleStatus(custom.trim()); setCustom(''); } }} className="btn-action primary" style={{ fontSize: 10, padding: '3px 7px' }}>+</button>
            </div>
            {(statuses.length > 0 || tokens.length > 0) && (
              <button onClick={() => send('CLEAR_STATUSES', { playerId: player.id })}
                style={{ marginTop: 6, width: '100%', fontFamily: 'var(--mono)', fontSize: 9, background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--blood-hi)', padding: '3px', cursor: 'pointer' }}>
                Limpiar todo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
