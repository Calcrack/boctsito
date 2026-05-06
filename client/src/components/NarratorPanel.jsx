import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ALL_ROLES, ROLE_BY_ID } from '../data/roles';
import NightControl from './NightControl';
import GameTable from './GameTable';

const shuffleArr = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function MiniAvatar({ player, size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--ink-700)', border: 'var(--hairline)',
      overflow: 'hidden', flexShrink: 0, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--serif)', fontSize: Math.round(size * 0.5), color: 'var(--bone-100)',
    }}>
      {player?.avatar
        ? <img src={player.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (player?.name?.[0] || '?').toUpperCase()
      }
    </div>
  );
}

const BASE_DISTRIBUTION = {
  5:  { townfolk: 3, outsiders: 0, minions: 1, demons: 1 },
  6:  { townfolk: 3, outsiders: 1, minions: 1, demons: 1 },
  7:  { townfolk: 5, outsiders: 0, minions: 1, demons: 1 },
  8:  { townfolk: 5, outsiders: 1, minions: 1, demons: 1 },
  9:  { townfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  10: { townfolk: 7, outsiders: 0, minions: 2, demons: 1 },
  11: { townfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  12: { townfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  13: { townfolk: 9, outsiders: 0, minions: 3, demons: 1 },
  14: { townfolk: 9, outsiders: 1, minions: 3, demons: 1 },
  15: { townfolk: 9, outsiders: 2, minions: 3, demons: 1 },
};

function getNeeded(count, roles) {
  const base = BASE_DISTRIBUTION[count];
  if (!base) return null;
  const hasBaron = roles.includes('BARON');
  const dist = { ...base };
  if (hasBaron) {
    dist.outsiders = Math.min(dist.outsiders + 2, count - dist.demons - dist.minions);
    dist.townfolk = count - dist.outsiders - dist.minions - dist.demons;
  }
  return dist;
}

const TABS = ['setup', 'game', 'night', 'grimoire', 'ranking'];
const TAB_LABELS = { setup: 'Config', game: 'Partida', night: 'Noche', grimoire: 'Grimorio', ranking: '🏆' };

export default function NarratorPanel() {
  const { state, send } = useGame();
  const { game, discordMembers, rankings } = state;
  const [tab, setTab] = useState('setup');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [discordMap, setDiscordMap] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showManualAssign, setShowManualAssign] = useState(false);
  const [manualAssignments, setManualAssignments] = useState({});
  const [showReorder, setShowReorder] = useState(false);
  const [reorderList, setReorderList] = useState([]);

  useEffect(() => {
    if (tab === 'setup') send('GET_DISCORD_MEMBERS', {});
    if (tab === 'ranking') send('GET_RANKINGS', {});
  }, [tab]);

  useEffect(() => {
    if (game && game.phase !== 'lobby') setTab('game');
  }, [game?.phase === 'lobby']);

  if (!game) return <div style={{ padding: 32, fontFamily: 'var(--serif)', color: 'var(--bone-400)' }}>Cargando...</div>;

  const { players, phase, nominations, activeNomination, nightDeaths } = game;
  const isNight = ['first_night', 'night'].includes(phase);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const discord = discordMap[newPlayerName] || {};
    send('ADD_PLAYER', { name: newPlayerName.trim(), discordId: discord.id, discordTag: discord.tag });
    setNewPlayerName('');
  };

  return (
    <div className={`app-shell ${isNight ? 'is-night' : 'is-day'}`}>

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <span className="brand-title">Los Campanarios</span>
        </div>

        <div className="topbar-center">
          <div className="phase-badge">
            <div className="dot" />
            <span>{phase} · Día {game.dayNumber} · Noche {game.nightNumber}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="btn-night"
                style={{ borderColor: tab === t ? 'var(--gold)' : undefined, color: tab === t ? 'var(--gold-hot)' : undefined }}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="topbar-right">
          {showResetConfirm ? (
            <>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--blood-hi)' }}>¿Resetear?</span>
              <button onClick={() => { send('RESET_GAME', {}); setShowResetConfirm(false); }} className="btn-action danger" style={{ fontSize: 11, padding: '4px 10px' }}>Sí</button>
              <button onClick={() => setShowResetConfirm(false)} className="btn-action" style={{ fontSize: 11, padding: '4px 10px' }}>No</button>
            </>
          ) : (
            <button onClick={() => setShowResetConfirm(true)} className="btn-night">Reset</button>
          )}
        </div>
      </header>

      {/* ── Left panel ── */}
      <aside className="left-panel">
        {tab === 'setup' && (
          <>
            {/* Discord member quick-picker */}
            <DiscordMemberPicker discordMembers={discordMembers} players={players} send={send} />

            {/* Add players */}
            <div>
              <p className="panel-label">Jugadores <span className="count">{players.length}</span></p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPlayer()}
                  placeholder="Nombre del jugador"
                  style={{ flex: 1, background: 'var(--ink-700)', border: 'var(--hairline)', borderRadius: 2, padding: '6px 10px', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}
                />
                <button onClick={addPlayer} className="btn-action primary" style={{ padding: '6px 12px' }}>+</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', border: 'var(--hairline-bone)', borderRadius: 3, padding: '6px 8px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ink-700)', border: 'var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-100)', overflow: 'hidden', flexShrink: 0 }}>
                      {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
                    </div>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <select value={p.discordId || ''} onChange={e => {
                      const m = discordMembers.find(m => m.id === e.target.value);
                      send('UPDATE_PLAYER', { playerId: p.id, discordId: m?.id, discordTag: m?.tag, avatar: m?.avatar });
                    }} style={{ fontSize: 9, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-300)', padding: '2px 4px', maxWidth: 80 }}>
                      <option value="">Discord</option>
                      {discordMembers.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                    </select>
                    <button onClick={() => send('REMOVE_PLAYER', { playerId: p.id })} style={{ color: 'var(--blood-hi)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Role distribution */}
            <div>
              <p className="panel-label">Roles en juego</p>
              {['townfolk', 'outsider', 'minion', 'demon'].map(type => (
                <div key={type} style={{ marginBottom: 10 }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-400)', marginBottom: 5 }}>
                    {type === 'townfolk' ? 'Aldeanos' : type === 'outsider' ? 'Forasteros' : type === 'minion' ? 'Esbirros' : 'Demonios'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ALL_ROLES.filter(r => r.type === type).map(r => (
                      <button key={r.id}
                        onClick={() => setSelectedRoles(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}
                        className="btn-night"
                        style={{
                          fontSize: 9,
                          borderColor: selectedRoles.includes(r.id) ? 'var(--gold)' : undefined,
                          color: selectedRoles.includes(r.id) ? 'var(--gold-hot)' : undefined,
                        }}>
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Distribution feedback */}
              {(() => {
                const needed = getNeeded(players.length, selectedRoles);
                if (!needed) return <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-500)', fontStyle: 'italic' }}>5–15 jugadores necesarios</p>;
                const have = {
                  townfolk:  selectedRoles.filter(id => ROLE_BY_ID[id]?.type === 'townfolk').length,
                  outsiders: selectedRoles.filter(id => ROLE_BY_ID[id]?.type === 'outsider').length,
                  minions:   selectedRoles.filter(id => ROLE_BY_ID[id]?.type === 'minion').length,
                  demons:    selectedRoles.filter(id => ROLE_BY_ID[id]?.type === 'demon').length,
                };
                const rows = [
                  { k: 'townfolk', l: 'Aldeanos',   h: have.townfolk,  n: needed.townfolk },
                  { k: 'outsiders',l: 'Forasteros', h: have.outsiders, n: needed.outsiders },
                  { k: 'minions',  l: 'Esbirros',   h: have.minions,   n: needed.minions },
                  { k: 'demons',   l: 'Demonios',   h: have.demons,    n: needed.demons },
                ];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, margin: '8px 0' }}>
                    {rows.map(r => {
                      const ok = r.h >= r.n;
                      const over = r.h > r.n;
                      return (
                        <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 2, background: ok && !over ? 'rgba(109,140,184,0.1)' : over ? 'rgba(201,162,74,0.1)' : 'rgba(168,58,45,0.1)' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bone-300)' }}>{r.l}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 600, color: ok && !over ? 'var(--good)' : over ? 'var(--gold)' : 'var(--blood-hi)' }}>{r.h}/{r.n}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => send('DISTRIBUTE_ROLES', { selectedRoles })}
                  disabled={selectedRoles.length === 0}
                  className="btn-action primary"
                  style={{ flex: 1, opacity: selectedRoles.length === 0 ? 0.35 : 1 }}>
                  Distribuir (aleatorio)
                </button>
                <button
                  disabled={selectedRoles.length === 0 || players.length === 0}
                  className="btn-action"
                  style={{ flex: 1, opacity: (selectedRoles.length === 0 || players.length === 0) ? 0.35 : 1 }}
                  onClick={() => {
                    setManualAssignments({});
                    setShowManualAssign(true);
                  }}>
                  Asignar manual
                </button>
              </div>

              {/* Auto mode */}
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(141,90,180,0.07)', borderRadius: 4, border: '1px solid rgba(141,90,180,0.2)' }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(141,90,180,0.8)', margin: '0 0 8px' }}>Modo automático</p>

                {/* Time controls */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Día', key: 'dayMs', val: game.autoDayMs ?? 300000 },
                    { label: 'Nominaciones', key: 'nomMs', val: game.autoNomMs ?? 420000 },
                  ].map(({ label, key, val }) => (
                    <div key={key} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '6px 8px' }}>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-400)', margin: '0 0 5px' }}>{label} (min)</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => send('SET_AUTO_TIMINGS', { [key]: val - 60000 })}
                          disabled={val <= 60000}
                          className="btn-night" style={{ padding: '1px 7px', opacity: val <= 60000 ? 0.35 : 1 }}>−</button>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--gold-hot)', flex: 1, textAlign: 'center' }}>
                          {Math.round(val / 60000)}
                        </span>
                        <button
                          onClick={() => send('SET_AUTO_TIMINGS', { [key]: val + 60000 })}
                          disabled={val >= 1800000}
                          className="btn-night" style={{ padding: '1px 7px', opacity: val >= 1800000 ? 0.35 : 1 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {game.autoMode ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)', fontStyle: 'italic' }}>🤖 Activo — partida sin narrador</span>
                    <button onClick={() => send('STOP_AUTO_MODE', {})} className="btn-night" style={{ fontSize: 8 }}>Detener</button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-400)', fontStyle: 'italic', margin: '0 0 6px' }}>
                      Roles repartidos automáticamente. Los jugadores se gestionan solos.
                    </p>
                    <button
                      onClick={() => {
                        if (players.length < 5) { alert('Necesitas al menos 5 jugadores'); return; }
                        send('AUTO_MODE', {});
                      }}
                      disabled={players.length < 5}
                      className="btn-action"
                      style={{ width: '100%', opacity: players.length < 5 ? 0.35 : 1 }}>
                      🤖 Iniciar modo automático
                    </button>
                  </>
                )}
              </div>

              {showManualAssign && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 4, border: 'var(--hairline)' }}>
                  <p className="panel-label" style={{ marginBottom: 8 }}>Asignación manual de roles</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {players.map(p => {
                      const usedRoles = new Set(Object.entries(manualAssignments).filter(([pid]) => pid !== p.id).map(([, rid]) => rid));
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          <select
                            value={manualAssignments[p.id] || ''}
                            onChange={e => setManualAssignments(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={{ fontSize: 10, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-200)', padding: '3px 6px', maxWidth: 130 }}>
                            <option value="">— sin asignar —</option>
                            {selectedRoles.filter(rid => !usedRoles.has(rid)).map(rid => (
                              <option key={rid} value={rid}>{ROLE_BY_ID[rid]?.name || rid}</option>
                            ))}
                            {manualAssignments[p.id] && usedRoles.has(manualAssignments[p.id]) ? null : null}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn-action primary"
                      style={{ flex: 1 }}
                      disabled={players.some(p => !manualAssignments[p.id])}
                      onClick={() => {
                        const assignments = players.map(p => ({ playerId: p.id, roleId: manualAssignments[p.id] }));
                        send('ASSIGN_ROLES_MANUAL', { assignments });
                        setShowManualAssign(false);
                        setManualAssignments({});
                      }}>
                      Confirmar
                    </button>
                    <button className="btn-action" style={{ flex: 1 }} onClick={() => { setShowManualAssign(false); setManualAssignments({}); }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reorder seats */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p className="panel-label" style={{ margin: 0 }}>Orden en la rueda</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-night" style={{ fontSize: 9 }} onClick={() => {
                    const shuffled = shuffleArr(players);
                    send('REORDER_PLAYERS', { playerIds: shuffled.map(p => p.id) });
                  }}>🔀 Aleatorizar</button>
                  <button className="btn-night" style={{ fontSize: 9 }} onClick={() => {
                    setReorderList([...players]);
                    setShowReorder(!showReorder);
                  }}>
                    {showReorder ? 'Cerrar' : 'Reordenar'}
                  </button>
                </div>
              </div>
              {showReorder && (
                <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: 'var(--hairline-bone)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {reorderList.map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', width: 14 }}>{i + 1}</span>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <button
                          disabled={i === 0}
                          onClick={() => setReorderList(prev => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; })}
                          style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-300)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, padding: '2px 6px', fontSize: 11 }}>↑</button>
                        <button
                          disabled={i === reorderList.length - 1}
                          onClick={() => setReorderList(prev => { const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })}
                          style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-300)', cursor: i === reorderList.length - 1 ? 'default' : 'pointer', opacity: i === reorderList.length - 1 ? 0.3 : 1, padding: '2px 6px', fontSize: 11 }}>↓</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-action primary" style={{ flex: 1 }} onClick={() => {
                      send('REORDER_PLAYERS', { playerIds: reorderList.map(p => p.id) });
                      setShowReorder(false);
                    }}>Confirmar orden</button>
                    <button className="btn-action" style={{ flex: 1 }} onClick={() => setShowReorder(false)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Drunk fake role config */}
            {selectedRoles.includes('DRUNK') && (
              <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: 'var(--hairline-bone)' }}>
                <p className="panel-label" style={{ margin: '0 0 6px' }}>Rol del Borracho (cree que es)</p>
                <select
                  value={game.narratorDrunkAs || ''}
                  onChange={e => send('SET_DRUNK_AS', { roleId: e.target.value || null })}
                  style={{ width: '100%', background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-200)', padding: '4px 8px', fontFamily: 'var(--serif)', fontSize: 12 }}>
                  <option value="">Aleatorio</option>
                  {ALL_ROLES.filter(r => r.type === 'townfolk').map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Imp bluff roles config */}
            {selectedRoles.some(id => ROLE_BY_ID[id]?.type === 'demon') && (
              <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: 'var(--hairline-bone)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p className="panel-label" style={{ margin: 0 }}>Roles libres del Diablillo</p>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--bone-400)' }}>
                    {(game.narratorRolesForImp || []).length}/3 elegidos
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <button
                    className="btn-night"
                    style={{ fontSize: 8, borderColor: (game.narratorRolesForImp || []).length === 0 ? 'var(--gold)' : undefined }}
                    onClick={() => send('SET_ROLES_FOR_IMP', { roleIds: [] })}>
                    Automático
                  </button>
                  {ALL_ROLES.filter(r => r.alignment === 'good').map(r => {
                    const sel = (game.narratorRolesForImp || []).includes(r.id);
                    const full = (game.narratorRolesForImp || []).length >= 3 && !sel;
                    return (
                      <button key={r.id}
                        className="btn-night"
                        disabled={full}
                        style={{ fontSize: 8, opacity: full ? 0.4 : 1, borderColor: sel ? 'var(--blood-hi)' : undefined, color: sel ? 'var(--blood-hi)' : undefined }}
                        onClick={() => {
                          const cur = game.narratorRolesForImp || [];
                          send('SET_ROLES_FOR_IMP', { roleIds: sel ? cur.filter(x => x !== r.id) : [...cur, r.id] });
                        }}>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Channel capacity limits */}
            <ChannelLimitsControl game={game} send={send} />

            {/* Role reveal */}
            {phase === 'role_reveal' && (
              <div>
                <p className="panel-label">Revelar roles</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {players.map(p => {
                    const role = p.role ? ALL_ROLES.find(r => r.id === p.role) : null;
                    return (
                      <button key={p.id} onClick={() => send('REVEAL_ROLE', { playerId: p.id })}
                        style={{ background: 'rgba(0,0,0,0.25)', border: 'var(--hairline-bone)', borderRadius: 3, padding: '8px 10px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,162,74,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
                        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', margin: '0 0 2px' }}>{p.name}</p>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bone-400)', margin: 0 }}>{role?.name || '?'}</p>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => send('START_NIGHT', {})} className="btn-action primary" style={{ width: '100%' }}>
                  Iniciar Primera Noche
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'game' && (
          <>
            {game.autoMode && (
              game.autoPhaseInfo
                ? <AutoModeTimer autoPhaseInfo={game.autoPhaseInfo} send={send} />
                : (
                  <div style={{ padding: '8px 12px', background: 'rgba(141,90,180,0.08)', borderRadius: 4, border: '1px solid rgba(141,90,180,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-400)', fontStyle: 'italic' }}>🤖 Esperando acciones nocturnas...</span>
                    <button onClick={() => send('STOP_AUTO_MODE', {})} className="btn-night" style={{ fontSize: 8 }}>Detener</button>
                  </div>
                )
            )}
            <PhaseStepControl phase={phase} game={game} send={send} />

            {activeNomination && <ActiveNominationCard game={game} send={send} />}

            {nominations.length > 0 && (
              <div>
                <p className="panel-label">Nominaciones</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nominations.map(n => {
                    const nominator = players.find(p => p.id === n.nominatorId);
                    const nominee   = players.find(p => p.id === n.nomineeId);
                    const forCount  = Array.isArray(n.votes) ? n.votes.length : 0;
                    const agtCount  = Array.isArray(n.against) ? n.against.length : 0;
                    return (
                      <div key={n.id} style={{
                        padding: '6px 10px', borderRadius: 3,
                        background: n.executed ? 'rgba(168,58,45,0.12)' : n.resolved ? 'rgba(0,0,0,0.2)' : 'rgba(201,162,74,0.08)',
                        border: n.executed ? '1px solid var(--blood-dim)' : 'var(--hairline-bone)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <MiniAvatar player={nominator} size={22} />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-500)' }}>→</span>
                        <MiniAvatar player={nominee} size={22} />
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: n.executed ? 'var(--blood-hi)' : 'var(--bone-200)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.nomineeName}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blood-hi)', background: 'rgba(168,58,45,0.12)', borderRadius: 2, padding: '1px 5px' }}>⚔{forCount}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--good)', background: 'rgba(109,140,184,0.12)', borderRadius: 2, padding: '1px 5px' }}>🛡{agtCount}</span>
                        {n.resolved && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: n.executed ? 'var(--blood-hi)' : 'var(--bone-500)', flexShrink: 0 }}>{n.executed ? '☠' : '✕'}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compact seat order */}
            <div>
              <p className="panel-label">Jugadores <span className="count">{players.filter(p => p.alive).length}/{players.length}</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 180, overflowY: 'auto' }}>
                {players.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: p.alive ? 1 : 0.5, padding: '2px 0' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-600)', minWidth: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <MiniAvatar player={p} size={22} />
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {!p.alive && <span style={{ color: 'var(--blood-hi)', fontSize: 10 }}>☠</span>}
                  </div>
                ))}
              </div>
            </div>

            <ChannelControl players={players} send={send} />
          </>
        )}

        {tab === 'night' && <NightControl />}

        {tab === 'ranking' && (
          <RankingsManager rankings={rankings} send={send} />
        )}

        {tab === 'grimoire' && (
          <div>
            <p className="panel-label">Grimorio Completo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {players.map(p => {
                const role = ALL_ROLES.find(r => r.id === p.role);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 3, opacity: p.alive ? 1 : 0.45 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-100)', overflow: 'hidden', flexShrink: 0 }}>
                      {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
                    </div>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: role?.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)' }}>{role?.name || '?'}</span>
                    {p.poisoned && <span style={{ fontSize: 9, color: '#4ade80' }}>⚠</span>}
                    <button onClick={() => send(p.alive ? 'KILL_PLAYER' : 'REVIVE_PLAYER', { playerId: p.id })}
                      style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: p.alive ? 'var(--blood-hi)' : 'var(--good)', padding: '2px 4px' }}>
                      {p.alive ? '☠' : '♻'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ── Stage ── */}
      <main className="stage">
        <GameTable isNarrator={true} />
      </main>

      {/* ── Right panel ── */}
      <aside className="right-panel" style={{ padding: '18px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Night deaths summary */}
        {nightDeaths.length > 0 && (
          <div>
            <p className="panel-label" style={{ color: 'var(--blood-hi)' }}>Muertes esta noche</p>
            {nightDeaths.map(id => {
              const p = players.find(pl => pl.id === id);
              const role = p?.role ? ROLE_BY_ID[p.role] : null;
              return p ? (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'var(--ink-700)', border: '1px solid var(--blood-dim)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--bone-100)' }}>
                    {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
                  </div>
                  {role?.img && <img src={role.img} style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} />}
                  <span>☠ {p.name}</span>
                </div>
              ) : null;
            })}
          </div>
        )}

      </aside>
    </div>
  );
}

function PhaseStepControl({ phase, game, send }) {
  const { players } = game;
  let main = null, secondary = null, stepLabel = '', stepLabel2 = '', label2Color = 'var(--gold)';

  if (phase === 'first_night' || phase === 'night') {
    const readyCount = game.nightReadyCount || 0;
    const readyTotal = game.nightReadyTotal || 0;
    const allReady = readyTotal > 0 && readyCount >= readyTotal;
    const deaths = game.nightDeaths.map(id => players.find(p => p.id === id)?.name).filter(Boolean);
    const notReady = game.nightNotReady || [];
    main = {
      label: `Amanecer → (${readyCount}/${readyTotal} listos)`,
      color: 'primary',
      action: () => send('START_DAY', { nightDeaths: deaths }),
      disabled: !allReady,
    };
    if (!allReady) {
      secondary = { label: 'Forzar →', color: '', action: () => send('START_DAY', { nightDeaths: deaths }) };
    }
    stepLabel = deaths.length > 0 ? `Muertos: ${deaths.join(', ')}` : 'Nadie muerto esta noche';
    stepLabel2 = allReady
      ? '✓ Todos confirmaron Hecho'
      : notReady.length > 0
        ? `⏳ Pendientes: ${notReady.map(p => p.name).join(', ')}`
        : `⏳ Faltan ${readyTotal - readyCount} jugador(es)`;
    label2Color = allReady ? 'var(--good)' : 'var(--gold)';
  } else if (phase === 'day') {
    main      = { label: 'Abrir Nominaciones', color: 'primary', action: () => send('OPEN_NOMINATIONS', {}) };
    secondary = { label: 'Saltar a Noche', color: '', action: () => send('START_NIGHT', {}) };
    stepLabel = 'Fase de discusión';
  } else if (phase === 'voting') {
    stepLabel = 'Votación en curso';
  } else if (phase === 'nominations') {
    const eligible = game.nominations.filter(n => n.resolved && n.meetsThreshold && !n.executed && !n.tieSkipped);
    const maxTally = eligible.length > 0 ? Math.max(...eligible.map(n => n.tally)) : 0;
    const tiedCount = eligible.filter(n => n.tally === maxTally).length;
    const soleWinner = tiedCount === 1 ? eligible.find(n => n.tally === maxTally) : null;

    if (eligible.length > 0) {
      main = {
        label: tiedCount > 1 ? `Finalizar (Empate ${tiedCount})` : `Ejecutar a ${soleWinner.nomineeName}`,
        color: 'danger', action: () => send('FINALIZE_NOMINATIONS', {}),
      };
      secondary = { label: 'Noche sin ejecución', color: '', action: () => send('START_NIGHT', {}) };
      stepLabel = `${eligible.length} nominación(es) con votos suficientes`;
    } else {
      main = { label: 'Iniciar Noche', color: '', action: () => send('START_NIGHT', {}) };
      stepLabel = 'Esperando nominaciones';
    }
  }

  if (!main && phase !== 'voting') return null;
  if (phase === 'voting') return null; // handled by ActiveNominationCard

  return (
    <div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', fontStyle: 'italic', marginBottom: 4 }}>{stepLabel}</p>
      {stepLabel2 && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: label2Color, fontStyle: 'italic', marginBottom: 6 }}>{stepLabel2}</p>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={main.action}
          disabled={!!main.disabled}
          className={`btn-action ${main.color}`}
          style={{ flex: 1, padding: '10px 0', opacity: main.disabled ? 0.45 : 1, cursor: main.disabled ? 'not-allowed' : 'pointer' }}>
          {main.label}
        </button>
        {secondary && (
          <button onClick={secondary.action} className={`btn-action ${secondary.color}`} style={{ padding: '10px 12px' }}>
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveNominationCard({ game, send }) {
  const nom = game.nominations.find(n => n.id === game.activeNomination);
  if (!nom) return null;
  const nominatorPlayer = game.players.find(p => p.id === nom.nominatorId);
  const nomineePlayer   = game.players.find(p => p.id === nom.nomineeId);
  const living = game.players.filter(p => p.alive).length;
  const required = Math.ceil(living / 2);
  const forVoters  = Array.isArray(nom.votes)   ? nom.votes   : [];
  const agstVoters = Array.isArray(nom.against) ? nom.against : [];
  const votes = forVoters.length;
  const pct = Math.min(100, (votes / required) * 100);
  const allVoted = nom.allVoted;
  const pendingVoters = nom.pendingVoters;
  const pendingCount = Array.isArray(pendingVoters) ? pendingVoters.length : 0;

  return (
    <div style={{ background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 4, padding: '12px 14px' }}>
      <p className="panel-label" style={{ color: 'var(--gold-hot)' }}>Votación activa</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
        <MiniAvatar player={nominatorPlayer} size={24} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)' }}>{nom.nominatorName}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-500)' }}>acusa a</span>
        <MiniAvatar player={nomineePlayer} size={24} />
        <strong style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-50)' }}>{nom.nomineeName}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, color: 'var(--gold-hot)' }}>{votes}/{required}</span>
        <div className="vote-bar-track" style={{ flex: 1, margin: 0 }}>
          <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div style={{ background: 'rgba(168,58,45,0.08)', borderRadius: 3, padding: '4px 8px' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 7, textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 2 }}>Matar ({votes})</p>
          {forVoters.map((v, i) => <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 9, color: 'var(--bone-200)', margin: '1px 0' }}>{typeof v === 'object' ? v.name : v}</p>)}
        </div>
        <div style={{ background: 'rgba(109,140,184,0.08)', borderRadius: 3, padding: '4px 8px' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 7, textTransform: 'uppercase', color: 'var(--good)', marginBottom: 2 }}>Salvar ({agstVoters.length})</p>
          {agstVoters.map((v, i) => <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 9, color: 'var(--bone-200)', margin: '1px 0' }}>{typeof v === 'object' ? v.name : v}</p>)}
        </div>
      </div>
      {!allVoted && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', marginBottom: 6 }}>
          ⏳ Sin votar: {Array.isArray(pendingVoters) ? pendingVoters.join(', ') : `${pendingCount} pendientes`}
        </p>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => send('RESOLVE_VOTE', { nominationId: nom.id })}
          disabled={!allVoted}
          className="btn-action danger"
          style={{ flex: 1, opacity: allVoted ? 1 : 0.4, cursor: allVoted ? 'pointer' : 'not-allowed' }}>
          {allVoted ? 'Cerrar votación' : `Cerrar (${pendingCount} sin votar)`}
        </button>
        {!allVoted && (
          <button onClick={() => send('RESOLVE_VOTE', { nominationId: nom.id })} className="btn-action" style={{ fontSize: 10, padding: '8px 10px' }}>
            Forzar →
          </button>
        )}
      </div>
    </div>
  );
}

function DiscordMemberPicker({ discordMembers, players, send }) {
  const GAME_ROLE_ID = '1499987378755076218';
  const [nicknames, setNicknames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('boct_nicknames') || '{}'); } catch { return {}; }
  });
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const gameMembers = discordMembers.filter(m => m.roles?.includes(GAME_ROLE_ID));
  const addedIds = new Set(players.filter(p => p.discordId).map(p => p.discordId));

  const saveNickname = (id, nick) => {
    const trimmed = nick.trim();
    const updated = { ...nicknames };
    if (trimmed) updated[id] = trimmed; else delete updated[id];
    setNicknames(updated);
    localStorage.setItem('boct_nicknames', JSON.stringify(updated));
    setEditId(null);
  };

  const addMember = (m) => {
    const name = nicknames[m.id] || m.displayName;
    send('ADD_PLAYER', { name, discordId: m.id, discordTag: m.tag, avatar: m.avatar });
  };

  return (
    <div style={{ padding: '8px 10px', background: 'rgba(88,101,242,0.07)', borderRadius: 4, border: '1px solid rgba(88,101,242,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="panel-label" style={{ margin: 0, color: 'rgba(88,101,242,0.9)' }}>
          Miembros Discord ({gameMembers.length})
        </p>
        <button className="btn-night" style={{ fontSize: 9 }} onClick={() => send('REFRESH_DISCORD_MEMBERS', {})}>
          🔄 Recargar
        </button>
      </div>
      {gameMembers.length === 0 ? (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-500)', fontStyle: 'italic' }}>
          {discordMembers.length === 0 ? 'Conectando Discord...' : 'Sin miembros con rol de partida.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 260, overflowY: 'auto' }}>
          {gameMembers.map(m => {
            const nick = nicknames[m.id];
            const displayName = nick || m.displayName;
            const added = addedIds.has(m.id);
            const isEditing = editId === m.id;
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: added ? 'rgba(109,140,184,0.1)' : 'rgba(0,0,0,0.2)',
                border: added ? '1px solid rgba(109,140,184,0.25)' : 'var(--hairline-bone)',
                borderRadius: 3, padding: '4px 6px',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--ink-700)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'var(--bone-100)',
                }}>
                  {m.avatar ? <img src={m.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName[0]}
                </div>
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveNickname(m.id, editValue);
                        if (e.key === 'Escape') setEditId(null);
                      }}
                      placeholder={m.displayName}
                      style={{ flex: 1, background: 'var(--ink-600)', border: 'var(--hairline)', borderRadius: 2, padding: '3px 6px', fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-100)' }}
                    />
                    <button onClick={() => saveNickname(m.id, editValue)} className="btn-night" style={{ fontSize: 9, padding: '2px 6px' }}>✓</button>
                    <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', color: 'var(--bone-400)', cursor: 'pointer', fontSize: 10, padding: '0 2px' }}>✕</button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: 'var(--serif)', fontSize: 11,
                        color: nick ? 'var(--gold-hot)' : 'var(--bone-100)',
                        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{displayName}</span>
                      {nick && (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--bone-500)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.displayName}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditId(m.id); setEditValue(nick || ''); }}
                      title="Apodo"
                      style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: nick ? 'var(--gold)' : 'var(--bone-500)', cursor: 'pointer', fontSize: 9, padding: '2px 5px', flexShrink: 0 }}>
                      ✏
                    </button>
                    <button
                      onClick={() => addMember(m)}
                      disabled={added}
                      className={added ? 'btn-night' : 'btn-action primary'}
                      style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, opacity: added ? 0.4 : 1 }}>
                      {added ? '✓' : '+'}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChannelLimitsControl({ game, send }) {
  const CHANNELS = ['MERCADO', 'TABERNA', 'CEMENTERIO', 'BOSQUE'];
  const LABELS = { MERCADO: 'Mercado', TABERNA: 'Taberna', CEMENTERIO: 'Cementerio', BOSQUE: 'Bosque' };
  const limits = game.channelLimits || {};

  return (
    <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: 'var(--hairline-bone)' }}>
      <p className="panel-label" style={{ margin: '0 0 8px' }}>Límites de canales</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CHANNELS.map(ch => (
          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)', flex: 1 }}>{LABELS[ch]}</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <button
                onClick={() => send('SET_CHANNEL_LIMIT', { channel: ch, limit: Math.max(0, (limits[ch] || 0) - 1) })}
                style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-300)', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--mono)', fontSize: 11 }}>−</button>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: limits[ch] ? 'var(--gold-hot)' : 'var(--bone-500)', minWidth: 20, textAlign: 'center' }}>
                {limits[ch] || '∞'}
              </span>
              <button
                onClick={() => send('SET_CHANNEL_LIMIT', { channel: ch, limit: (limits[ch] || 0) + 1 })}
                style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-300)', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--mono)', fontSize: 11 }}>+</button>
              {limits[ch] > 0 && (
                <button
                  onClick={() => send('SET_CHANNEL_LIMIT', { channel: ch, limit: 0 })}
                  style={{ background: 'none', border: 'none', color: 'var(--blood-hi)', cursor: 'pointer', fontSize: 9, padding: '2px 4px' }}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoModeTimer({ autoPhaseInfo, send }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.floor((autoPhaseInfo.endsAt - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((autoPhaseInfo.endsAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [autoPhaseInfo.endsAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = autoPhaseInfo.phase === 'day_discussion' ? 'Tiempo libre (5 min)' : 'Nominaciones (7 min)';
  const urgent = remaining < 60;

  return (
    <div style={{ padding: '8px 12px', background: 'rgba(141,90,180,0.1)', borderRadius: 4, border: `1px solid rgba(141,90,180,${urgent ? '0.6' : '0.3'})`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <div>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(141,90,180,0.8)', margin: '0 0 2px' }}>🤖 Modo automático</p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)', margin: 0 }}>{label}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: urgent ? 'var(--blood-hi)' : 'var(--gold-hot)' }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <button onClick={() => send('STOP_AUTO_MODE', {})} className="btn-night" style={{ fontSize: 8 }}>Detener</button>
      </div>
    </div>
  );
}

function ChannelControl({ players, send }) {
  const [open, setOpen] = useState(false);
  const [secretFeedback, setSecretFeedback] = useState({});
  const outOfPlaza = players.filter(p => p.discordChannel && p.discordChannel !== 'PLAZA');
  const CHANNEL_LABELS = { PLAZA: 'Plaza', MERCADO: 'Mercado', TABERNA: 'Taberna', CEMENTERIO: 'Cementerio', BOSQUE: 'Bosque' };

  const moveToSecret = (p) => {
    send('MOVE_TO_SECRET', { targetPlayerId: p.id });
    setSecretFeedback(prev => ({ ...prev, [p.id]: true }));
    setTimeout(() => setSecretFeedback(prev => { const n = { ...prev }; delete n[p.id]; return n; }), 2000);
  };

  return (
    <div style={{ borderRadius: 4, border: 'var(--hairline-bone)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', cursor: 'pointer', background: 'rgba(0,0,0,0.15)' }}
        onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}>Canales Discord</span>
          {outOfPlaza.length > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(201,162,74,0.1)', padding: '2px 6px', borderRadius: 2 }}>{outOfPlaza.length} fuera</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={e => { e.stopPropagation(); send('MOVE_TO_CHANNEL', { moveAll: true, channel: null }); }}
            className="btn-night" style={{ fontSize: 8 }}>Todos → Plaza</button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {players.map(p => {
            const ch = p.discordChannel || 'PLAZA';
            const inPlaza = !p.discordChannel || p.discordChannel === 'PLAZA';
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--bone-400)' }}>{CHANNEL_LABELS[ch] || ch}</span>
                <button
                  onClick={() => moveToSecret(p)}
                  title="Mover a canal secreto (confesionario)"
                  className="btn-night"
                  style={{ fontSize: 9, padding: '2px 6px', borderColor: secretFeedback[p.id] ? 'var(--good)' : undefined, color: secretFeedback[p.id] ? 'var(--good)' : undefined }}>
                  {secretFeedback[p.id] ? '✓' : '🔒'}
                </button>
                {!inPlaza && (
                  <button onClick={() => send('MOVE_TO_CHANNEL', { targetPlayerId: p.id, channel: null })}
                    className="btn-night" style={{ fontSize: 8, padding: '2px 6px' }}>Plaza</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RankingsManager({ rankings, send }) {
  const [editingKey, setEditingKey] = useState(null);
  const [editVals, setEditVals] = useState({});

  const rows = rankings
    ? Object.entries(rankings).sort((a, b) => (b[1].wins_as_good + b[1].wins_as_demon) - (a[1].wins_as_good + a[1].wins_as_demon))
    : null;

  const startEdit = (key, r) => {
    setEditingKey(key);
    setEditVals({ wins_as_good: r.wins_as_good || 0, wins_as_demon: r.wins_as_demon || 0, total_games: r.total_games || 0 });
  };

  const saveEdit = () => {
    send('UPDATE_RANKING', { key: editingKey, updates: editVals });
    setEditingKey(null);
  };

  const numInput = (field, color) => (
    <input
      type="number" min="0"
      value={editVals[field]}
      onChange={e => setEditVals(v => ({ ...v, [field]: e.target.value }))}
      style={{
        width: 44, background: 'var(--ink-700)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 2, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 11,
        color, textAlign: 'center',
      }}
    />
  );

  return (
    <div>
      <p className="panel-label">Rankings <span className="count">{rows ? rows.length : '…'}</span></p>
      {rows === null ? (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-400)', fontStyle: 'italic' }}>Cargando...</p>
      ) : rows.length === 0 ? (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-400)', fontStyle: 'italic' }}>Sin partidas registradas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 8, padding: '0 10px 4px', alignItems: 'center' }}>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--good)', minWidth: 44, textAlign: 'center', letterSpacing: '0.05em' }}>ALDEA</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blood-hi)', minWidth: 44, textAlign: 'center', letterSpacing: '0.05em' }}>DEMO</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-200)', minWidth: 44, textAlign: 'center', letterSpacing: '0.05em' }}>TOTAL</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', minWidth: 44, textAlign: 'center', letterSpacing: '0.05em' }}>JUGADAS</span>
            <div style={{ width: 56 }} />
          </div>
          {rows.map(([key, r]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: editingKey === key ? 'rgba(201,162,74,0.06)' : 'rgba(0,0,0,0.2)',
              border: editingKey === key ? '1px solid rgba(201,162,74,0.3)' : 'var(--hairline-bone)',
              borderRadius: 3, padding: '8px 10px',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--ink-700)', border: 'var(--hairline)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)',
              }}>
                {r.avatar
                  ? <img src={r.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (r.name?.[0] || '?').toUpperCase()
                }
              </div>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>

              {editingKey === key ? (
                <>
                  {numInput('wins_as_good', 'var(--good)')}
                  {numInput('wins_as_demon', 'var(--blood-hi)')}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-200)', minWidth: 44, textAlign: 'center' }}>
                    {(parseInt(editVals.wins_as_good) || 0) + (parseInt(editVals.wins_as_demon) || 0)}
                  </span>
                  {numInput('total_games', 'var(--bone-300)')}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={saveEdit}
                      style={{ background: 'rgba(201,162,74,0.2)', border: '1px solid rgba(201,162,74,0.4)', borderRadius: 2, color: 'var(--gold)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', padding: '3px 7px' }}>
                      ✓
                    </button>
                    <button onClick={() => setEditingKey(null)}
                      style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-400)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', padding: '3px 7px' }}>
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span title="Victorias aldeano" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--good)', minWidth: 44, textAlign: 'center' }}>{r.wins_as_good || 0}</span>
                  <span title="Victorias demonio" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--blood-hi)', minWidth: 44, textAlign: 'center' }}>{r.wins_as_demon || 0}</span>
                  <span title="Total victorias" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-200)', minWidth: 44, textAlign: 'center' }}>{(r.wins_as_good || 0) + (r.wins_as_demon || 0)}</span>
                  <span title="Partidas jugadas" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-400)', minWidth: 44, textAlign: 'center' }}>{r.total_games || 0}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => startEdit(key, r)}
                      style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-400)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', padding: '3px 7px', opacity: 0.6 }}
                      title="Editar estadísticas"
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    >✎</button>
                    <button onClick={() => send('DELETE_RANKING', { key })}
                      style={{ color: 'var(--blood-hi)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: 0.6, padding: '2px 4px' }}
                      title="Eliminar del ranking"
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
