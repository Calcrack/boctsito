import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ALL_ROLES, ROLE_BY_ID, CAMPAIGN_LIST, getCampaign } from '../data/roles';
import { formatIdentity, MASK } from '../utils/identity';
import SetupWizard from './SetupWizard';
import NightControl from './NightControl';
import NightWalkthrough from './NightWalkthrough';
import StatusChips from './StatusChips';
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

const TABS = ['setup', 'mesa', 'ranking'];
const TAB_LABELS = { setup: 'Config', mesa: 'Mesa', ranking: '🏆' };

function PuzzlemasterDayPanel({ pm, alreadyUsed, send }) {
  const [moved, setMoved] = useState(false);
  const [guessed, setGuessed] = useState(null); // 'correct' | 'wrong'

  const applyNoAbility = () => {
    send('ADD_TOKEN', { playerId: pm.id, token: { type: 'NO_ABILITY', roleId: 'PUZZLEMASTER', label: 'Sin habilidad', expiry: [] } });
  };

  const onCorrect = () => {
    setGuessed('correct');
    applyNoAbility();
    send('NIGHT_NARRATOR_ACTION', { actorId: pm.id, actionType: 'PUZZLEMASTER_REVEAL', targetIds: [] });
  };

  const onWrong = () => {
    setGuessed('wrong');
    applyNoAbility();
  };

  const s = { marginTop: 8, background: 'rgba(201,162,74,0.06)', border: '1px solid rgba(201,162,74,0.25)', borderRadius: 6, padding: '10px 12px' };
  const lbl = { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', margin: '0 0 6px' };

  if (alreadyUsed) return (
    <div style={s}>
      <p style={lbl}>🧩 Maestro de Acertijos</p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', margin: 0, fontStyle: 'italic' }}>Habilidad ya usada.</p>
    </div>
  );

  return (
    <div style={s}>
      <p style={lbl}>🧩 Maestro de Acertijos — Acción de día</p>
      {!moved ? (
        <button className="btn-action primary" style={{ width: '100%', fontSize: 13, padding: '7px 0' }}
          onClick={() => { send('MOVE_NARRATOR_TO_ROOM', { playerId: pm.id }); setMoved(true); }}>
          🚪 Llevar a habitación
        </button>
      ) : guessed ? (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: guessed === 'correct' ? '#4ade80' : 'var(--bone-400)', margin: 0 }}>
          {guessed === 'correct' ? '✓ Adivinó correcto — resultado revelado.' : '✗ Adivinó incorrecto — habilidad consumida.'}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-action primary" style={{ flex: 1, fontSize: 12, padding: '6px 0' }} onClick={onCorrect}>✓ Adivinó correcto</button>
          <button className="btn-action danger" style={{ flex: 1, fontSize: 12, padding: '6px 0' }} onClick={onWrong}>✗ Adivinó incorrecto</button>
        </div>
      )}
    </div>
  );
}

export default function NarratorPanel() {
  const { state, send } = useGame();
  const { game, discordMembers, rankings, campaigns: serverCampaigns, importResult } = state;
  const [tab, setTab] = useState('setup');
  const [activeNightActorId, setActiveNightActorId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [discordMap, setDiscordMap] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showManualAssign, setShowManualAssign] = useState(false);
  const [manualAssignments, setManualAssignments] = useState({});
  const [showReorder, setShowReorder] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [showAutoMode, setShowAutoMode] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(true);
  const [confirmWin, setConfirmWin] = useState(null);
  const [uiScale, setUiScale] = useState(() => parseFloat(localStorage.getItem('boct_uiscale') || '1'));
  const changeScale = (d) => { const v = Math.max(0.8, Math.min(1.5, +(uiScale + d).toFixed(2))); setUiScale(v); localStorage.setItem('boct_uiscale', String(v)); };

  useEffect(() => {
    if (tab === 'setup') { send('GET_DISCORD_MEMBERS', {}); send('GET_CAMPAIGNS', {}); }
    if (tab === 'ranking') send('GET_RANKINGS', {});
  }, [tab]);

  useEffect(() => {
    if (game && game.phase !== 'lobby') setTab('mesa');
  }, [game?.phase === 'lobby']);

  // Al cambiar de campaña, los roles seleccionados ya no aplican.
  useEffect(() => { setSelectedRoles([]); }, [game?.campaignId]);

  // Referencia (roster) colapsada por defecto durante la noche; se abre a demanda.
  useEffect(() => {
    const night = game && ['first_night', 'night'].includes(game.phase);
    setRosterOpen(!night);
  }, [game?.phase]);

  if (!game) return <div style={{ padding: 32, fontFamily: 'var(--serif)', color: 'var(--bone-400)' }}>Cargando...</div>;

  const { players, phase, nominations, activeNomination, nightDeaths } = game;
  const isNight = ['first_night', 'night'].includes(phase);
  const campaign = getCampaign(game.campaignId);
  // Para campañas personalizadas usamos los roles que envía el servidor.
  const campaignRoleList = (game.campaignRoles && game.campaignRoles.length)
    ? game.campaignRoles
    : campaign.roles;

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const discord = discordMap[newPlayerName] || {};
    send('ADD_PLAYER', { name: newPlayerName.trim(), discordId: discord.id, discordTag: discord.tag });
    setNewPlayerName('');
  };

  // Barra de alertas (abajo): sólo cuando hay una decisión/consecuencia pendiente.
  const pendingAdvice = (game.advice || []).filter(a => a.severity === 'warn' || a.severity === 'danger');
  const hasAlerts = pendingAdvice.length > 0 || (game.deferredEffects || []).length > 0 || (game.deferredOptions || []).length > 0;

  return (
    <div className={`app-shell ${isNight ? 'is-night' : 'is-day'}${hasAlerts ? ' has-alerts' : ''}`}>


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
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 6 }} title="Tamaño de texto del narrador">
            <button onClick={() => changeScale(-0.1)} className="btn-night" style={{ fontSize: 11, padding: '2px 7px' }}>A−</button>
            <button onClick={() => changeScale(0.1)} className="btn-night" style={{ fontSize: 13, padding: '2px 7px' }}>A+</button>
          </div>
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
      <aside className="left-panel" style={{ zoom: uiScale }}>
        {tab === 'setup' && (
          <>
            {/* Campaign selector (oficiales + personalizadas del servidor) */}
            <div>
              <p className="panel-label">Campaña</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(serverCampaigns && serverCampaigns.length ? serverCampaigns : CAMPAIGN_LIST).map(c => {
                  const active = game.campaignId === c.id;
                  const locked = phase !== 'lobby';
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: 4 }}>
                      <button
                        disabled={locked && !active}
                        onClick={() => { if (!locked) send('SET_CAMPAIGN', { campaignId: c.id }); }}
                        className="btn-night"
                        style={{
                          flex: 1, textAlign: 'left', padding: '8px 10px',
                          borderColor: active ? 'var(--gold)' : undefined,
                          color: active ? 'var(--gold-hot)' : undefined,
                          opacity: (locked && !active) ? 0.35 : 1,
                          cursor: locked ? 'default' : 'pointer',
                        }}>
                        {active ? '◆ ' : ''}{c.name}{c.isCustom ? ' ✦' : ''}
                      </button>
                      {c.isCustom && !locked && (
                        <button onClick={() => { if (confirm(`¿Eliminar campaña "${c.name}"?`)) send('DELETE_CAMPAIGN', { campaignId: c.id }); }}
                          className="btn-night" style={{ fontSize: 10, color: 'var(--blood-hi)' }} title="Eliminar">✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
              {phase !== 'lobby' && (
                <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-500)', fontStyle: 'italic', marginTop: 4 }}>
                  Resetea la partida para cambiar de campaña.
                </p>
              )}
              {phase === 'lobby' && <ImportCampaignBox send={send} importResult={importResult} />}
            </div>

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
                    <button onClick={() => send('KICK_PLAYER_SESSION', { playerId: p.id })}
                      title="Expulsar su sesión (libera el asiento para que pueda volver a unirse)"
                      style={{ color: 'var(--moon)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>🔌</button>
                    <button onClick={() => send('REMOVE_PLAYER', { playerId: p.id })} style={{ color: 'var(--blood-hi)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Asistente de montaje — el Narrador decide TODO (cero azar) */}
            {phase === 'lobby' && (
              <button onClick={() => setWizardOpen(true)} className="btn-action primary"
                disabled={players.length < 1}
                style={{ width: '100%', padding: '14px 0', fontSize: 14, opacity: players.length < 1 ? 0.4 : 1 }}>
                🎬 Montar partida (asistente)
              </button>
            )}
            {phase === 'lobby' && wizardOpen && (
              <SetupWizard game={game} send={send} onClose={() => setWizardOpen(false)} />
            )}

            {/* Partida sin narrador (modo automático: reparto aleatorio permitido) */}
            <div>
              <p className="panel-label">Sin narrador</p>

              {/* Auto mode (partida sin narrador) — oculto por defecto cuando hay narrador */}
              {game.autoMode ? null : (
                <button onClick={() => setShowAutoMode(s => !s)} className="btn-night"
                  style={{ width: '100%', marginTop: 8, fontSize: 9, opacity: 0.7 }}>
                  {showAutoMode ? 'Ocultar' : '⚙ Partida sin narrador (modo automático)'}
                </button>
              )}
              {(showAutoMode || game.autoMode) && (
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
              )}

            </div>

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

        {tab === 'mesa' && (
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

            {/* Botones de victoria */}
            {phase !== 'lobby' && phase !== 'game_over' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                {confirmWin ? (
                  <>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-200)', flex: 1 }}>
                      ¿Declarar victoria del <strong style={{ color: confirmWin === 'good' ? 'var(--good)' : 'var(--blood-hi)' }}>{confirmWin === 'good' ? 'Bien' : 'Mal'}</strong>?
                    </p>
                    <button onClick={() => { send('DECLARE_WINNER', { winner: confirmWin }); setConfirmWin(null); }}
                      className="btn-action danger" style={{ fontSize: 11, padding: '4px 10px' }}>Sí, confirmar</button>
                    <button onClick={() => setConfirmWin(null)} className="btn-night" style={{ fontSize: 11 }}>✕</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmWin('good')} className="btn-action"
                      style={{ flex: 1, fontSize: 11, borderColor: 'var(--good)', color: 'var(--good)' }}>✨ Gana el Bien</button>
                    <button onClick={() => setConfirmWin('evil')} className="btn-action danger"
                      style={{ flex: 1, fontSize: 11 }}>⚔ Gana el Mal</button>
                  </>
                )}
              </div>
            )}

            <PhaseStepControl phase={phase} game={game} send={send} />

            {/* Maestro de Acertijos — panel de acción de día */}
            {phase !== 'lobby' && phase !== 'game_over' && (() => {
              const pm = players.find(p => p.role === 'PUZZLEMASTER' && p.alive);
              if (!pm) return null;
              const alreadyUsed = (pm.tokens || []).some(t => t.type === 'NO_ABILITY');
              return (
                <PuzzlemasterDayPanel key={pm.id} pm={pm} alreadyUsed={alreadyUsed} send={send} />
              );
            })()}

            {/* Control de noche por rol (matar / envenenar / proteger / info) */}
            {isNight && <NightControl />}

            {/* Nominación manual: el narrador fija nominador y nominado (día o nominaciones) */}
            {(phase === 'day' || phase === 'nominations') && (
              <ManualNominateCard game={game} send={send} />
            )}

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

            {/* Jugadores: orden de rueda + roles + fichas/tokens + matar/revivir */}
            <div>
              <p className="panel-label" style={{ cursor: 'pointer' }} onClick={() => setRosterOpen(o => !o)}>
                <span>Jugadores <span className="count">{players.filter(p => p.alive).length}/{players.length}</span></span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{rosterOpen ? '▲' : '▼ ver'}</span>
              </p>
              {rosterOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflowY: 'auto' }}>
                {players.map((p, i) => {
                  const role = ALL_ROLES.find(r => r.id === p.role);
                  return (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 3, opacity: p.alive ? 1 : 0.55 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-600)', minWidth: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-100)', overflow: 'hidden', flexShrink: 0 }}>
                          {role?.img ? <img src={role.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
                        </div>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: role?.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)' }}>{role?.name || '?'}</span>
                        {p.poisoned && <span style={{ fontSize: 9, color: '#4ade80' }}>⚠</span>}
                        <button onClick={() => send('KICK_PLAYER_SESSION', { playerId: p.id })}
                          title="Expulsar su sesión (libera el asiento para que pueda volver a unirse)"
                          style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--moon)', padding: '2px 4px' }}>
                          🔌
                        </button>
                        <button onClick={() => send(p.alive ? 'KILL_PLAYER' : 'REVIVE_PLAYER', { playerId: p.id })}
                          style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: p.alive ? 'var(--blood-hi)' : 'var(--good)', padding: '2px 4px' }}>
                          {p.alive ? '☠' : '♻'}
                        </button>
                      </div>
                      {(() => { const id = formatIdentity(p); return id.hasFalse ? (
                        <div className="identity-false" style={{ fontSize: 10, paddingLeft: 20 }} title={id.tooltip}>
                          <span className="mask">{MASK}</span>&nbsp;se cree {id.believedName} ({id.believedTypeLabel})
                        </div>
                      ) : null; })()}
                      <StatusChips player={p} compact />
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            <ChannelControl players={players} send={send} />
          </>
        )}

        {tab === 'ranking' && (
          <RankingsManager rankings={rankings} send={send} />
        )}
      </aside>

      {/* ── Stage ── */}
      <main className="stage">
        <GameTable isNarrator={true} activeActorId={activeNightActorId} />
      </main>

      {/* ── Right panel — "Guía" (única fuente de instrucciones de noche) ── */}
      <aside className="right-panel">
        {/* Efectos diferidos y avisos urgentes (antes fija abajo, ahora inline) */}
        <AlertsInline game={game} send={send} />

        {/* Guía: una acción a la vez, centro de mando del narrador */}
        {isNight && <NightWalkthrough onActiveActor={setActiveNightActorId} />}

        {/* Mapa de sospechas (agregado) */}
        <SuspicionMap players={players} />

        {/* Night deaths summary */}
        {nightDeaths.length > 0 && (
          <div>
            <p className="panel-label" style={{ color: 'var(--blood-hi)' }}>Muertes esta noche</p>
            {nightDeaths.map(id => {
              const p = players.find(pl => pl.id === id);
              const role = p?.role ? ROLE_BY_ID[p.role] : null;
              return p ? (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-200)' }}>
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
    // En modo manual el narrador dirige y avanza cuando quiere; "Hecho" solo cuenta en auto.
    main = {
      label: game.autoMode ? `Amanecer → (${readyCount}/${readyTotal} listos)` : `Amanecer → Día ${game.dayNumber + 1}`,
      color: 'primary',
      action: () => send('START_DAY', { nightDeaths: deaths }),
      disabled: game.autoMode && !allReady,
    };
    if (game.autoMode && !allReady) {
      secondary = { label: 'Forzar →', color: '', action: () => send('START_DAY', { nightDeaths: deaths }) };
    }
    stepLabel = deaths.length > 0 ? `Muertos: ${deaths.join(', ')}` : 'Nadie muerto esta noche';
    stepLabel2 = !game.autoMode
      ? '🎙 Dirige la noche desde la pestaña Noche'
      : allReady
        ? '✓ Todos confirmaron Hecho'
        : notReady.length > 0
          ? `⏳ Pendientes: ${notReady.map(p => p.name).join(', ')}`
          : `⏳ Faltan ${readyTotal - readyCount} jugador(es)`;
    label2Color = (!game.autoMode || allReady) ? 'var(--good)' : 'var(--gold)';
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

  // Turno de voto en sentido horario (empieza por el nominador)
  const order = Array.isArray(nom.voteOrder) ? nom.voteOrder : [];
  const turnIdx = nom.voteTurnIndex || 0;
  const turnId = order[turnIdx] || null;
  const turnPlayer = turnId ? game.players.find(p => p.id === turnId) : null;
  const votedSet = new Set([...forVoters.map(v => (typeof v === 'object' ? v.id : v)), ...agstVoters.map(v => (typeof v === 'object' ? v.id : v))]);
  const inArguments = nom.stage === 'arguments';

  return (
    <div style={{ background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 4, padding: '12px 14px' }}>
      <p className="panel-label" style={{ color: 'var(--gold-hot)' }}>
        {inArguments ? 'Argumentos' : 'Votación (sentido horario)'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
        <MiniAvatar player={nominatorPlayer} size={24} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)' }}>{nom.nominatorName}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-500)' }}>acusa a</span>
        <MiniAvatar player={nomineePlayer} size={24} />
        <strong style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-50)' }}>{nom.nomineeName}</strong>
      </div>

      {inArguments ? (
        <ArgumentsControls nom={nom} send={send} nominatorPlayer={nominatorPlayer} nomineePlayer={nomineePlayer} />
      ) : (
        <>
          {/* Turno actual */}
          {turnPlayer ? (
            <div style={{ background: 'rgba(109,140,184,0.1)', border: '1px solid rgba(109,140,184,0.35)', borderRadius: 4, padding: '8px 10px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--good)' }}>Turno {turnIdx + 1}/{order.length}</span>
                <MiniAvatar player={turnPlayer} size={22} />
                <strong style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-50)', flex: 1 }}>{turnPlayer.name}</strong>
                <button onClick={() => send('ADVANCE_VOTE_TURN', { nominationId: nom.id })}
                  className="btn-night" style={{ fontSize: 10, padding: '4px 8px' }} title="Saltar turno (no vota)">Saltar →</button>
              </div>
              {/* Voto por el narrador: cuando el jugador no puede votar desde su pantalla */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={() => send('VOTE_AS', { playerId: turnPlayer.id, nominationId: nom.id, inFavor: true })}
                  className="btn-action danger" style={{ flex: 1, fontSize: 11, padding: '5px 0' }}
                  title={`Votar A FAVOR por ${turnPlayer.name}`}>
                  ⚔ A favor (por {turnPlayer.name.slice(0, 10)})
                </button>
                {turnPlayer.alive && (
                  <button onClick={() => send('VOTE_AS', { playerId: turnPlayer.id, nominationId: nom.id, inFavor: false })}
                    className="btn-action" style={{ flex: 1, fontSize: 11, padding: '5px 0', borderColor: 'var(--good)', color: 'var(--good)' }}
                    title={`Votar EN CONTRA por ${turnPlayer.name}`}>
                    🛡 En contra
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--good)', fontStyle: 'italic', marginBottom: 8 }}>✓ Todos han pasado por su turno</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, color: 'var(--gold-hot)' }}>{votes}/{required}</span>
            <div className="vote-bar-track" style={{ flex: 1, margin: 0 }}>
              <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Orden de voto con estado por jugador */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
            {order.map((pid, i) => {
              const pl = game.players.find(p => p.id === pid);
              if (!pl) return null;
              const votedFor = forVoters.some(v => (typeof v === 'object' ? v.id : v) === pid);
              const votedAgainst = agstVoters.some(v => (typeof v === 'object' ? v.id : v) === pid);
              const isTurn = i === turnIdx;
              const bg = votedFor ? 'rgba(168,58,45,0.25)' : votedAgainst ? 'rgba(109,140,184,0.25)' : 'rgba(0,0,0,0.2)';
              return (
                <span key={pid} title={pl.name}
                  style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-200)', background: bg, border: isTurn ? '1px solid var(--good)' : 'var(--hairline-bone)', borderRadius: 2, padding: '2px 5px' }}>
                  {i + 1}.{pl.name.slice(0, 6)}{votedFor ? ' ⚔' : votedAgainst ? ' 🛡' : votedSet.has(pid) ? '' : ' ·'}
                </span>
              );
            })}
          </div>

          <button onClick={() => send('RESOLVE_VOTE', { nominationId: nom.id })} className="btn-action danger" style={{ width: '100%' }}>
            {allVoted ? 'Cerrar votación' : `Cerrar (${pendingCount} sin votar)`}
          </button>
        </>
      )}
    </div>
  );
}

// Controles de la fase de argumentos: da la palabra al acusador / acusado con tiempo.
function ArgumentsControls({ nom, send, nominatorPlayer, nomineePlayer }) {
  const [secs, setSecs] = useState(60);
  const timer = nom.argueTimer;
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!timer) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer?.endsAt, timer?.playerId]);

  const speaker = nom.argSpeaker === 'nominee' ? nomineePlayer : nom.argSpeaker === 'nominator' ? nominatorPlayer : null;
  const urgent = remaining <= 10;

  return (
    <div>
      {speaker && timer && (
        <div style={{ textAlign: 'center', background: 'rgba(201,162,74,0.08)', border: '1px solid rgba(201,162,74,0.3)', borderRadius: 6, padding: '8px', marginBottom: 8 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', margin: '0 0 2px' }}>🗣 Habla {speaker.name}</p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: urgent ? 'var(--blood-hi)' : 'var(--gold-hot)', margin: 0 }}>{remaining}s</p>
        </div>
      )}

      {/* Selector de segundos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)' }}>Tiempo</span>
        <button onClick={() => setSecs(s => Math.max(15, s - 15))} className="btn-night" style={{ fontSize: 11, padding: '2px 8px' }}>−</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--gold-hot)', minWidth: 38, textAlign: 'center' }}>{secs}s</span>
        <button onClick={() => setSecs(s => Math.min(300, s + 15))} className="btn-night" style={{ fontSize: 11, padding: '2px 8px' }}>+</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={() => send('SET_ARG_SPEAKER', { nominationId: nom.id, who: 'nominator', seconds: secs })}
          className="btn-action" style={{ width: '100%', borderColor: nom.argSpeaker === 'nominator' ? 'var(--gold)' : undefined }}>
          🗣 Argumentos de {nominatorPlayer?.name || 'nominador'}
        </button>
        <button onClick={() => send('SET_ARG_SPEAKER', { nominationId: nom.id, who: 'nominee', seconds: secs })}
          className="btn-action" style={{ width: '100%', borderColor: nom.argSpeaker === 'nominee' ? 'var(--gold)' : undefined }}>
          🗣 Argumentos de {nomineePlayer?.name || 'nominado'}
        </button>
        {timer && (
          <button onClick={() => send('STOP_ARGUE_TIMER', { nominationId: nom.id })} className="btn-night" style={{ fontSize: 10 }}>■ Parar tiempo</button>
        )}
        <button onClick={() => send('OPEN_VOTING', { nominationId: nom.id })} className="btn-action primary" style={{ width: '100%', marginTop: 4 }}>
          🗳️ Abrir votación
        </button>
      </div>
    </div>
  );
}

// Nominación fijada por el narrador: elige nominador y nominado.
function ManualNominateCard({ game, send }) {
  const alive = game.players.filter(p => p.alive);
  const alreadyNominated = new Set(game.nominations.map(n => n.nominatorId));
  const [nominatorId, setNominatorId] = useState('');
  const [nomineeId, setNomineeId] = useState('');
  const busy = !!game.activeNomination;

  const submit = () => {
    if (!nominatorId || !nomineeId || nominatorId === nomineeId) return;
    send('NOMINATE_AS', { nominatorId, nomineeId });
    setNominatorId(''); setNomineeId('');
  };

  return (
    <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: 'var(--hairline-bone)' }}>
      <p className="panel-label" style={{ margin: '0 0 8px' }}>Nueva nominación</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <select value={nominatorId} onChange={e => setNominatorId(e.target.value)}
          style={{ flex: 1, fontSize: 11, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-200)', padding: '5px 6px' }}>
          <option value="">Nomina…</option>
          {alive.map(p => <option key={p.id} value={p.id} disabled={alreadyNominated.has(p.id)}>{p.name}{alreadyNominated.has(p.id) ? ' (ya nominó)' : ''}</option>)}
        </select>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-500)' }}>→</span>
        <select value={nomineeId} onChange={e => setNomineeId(e.target.value)}
          style={{ flex: 1, fontSize: 11, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-200)', padding: '5px 6px' }}>
          <option value="">Nominado…</option>
          {alive.map(p => <option key={p.id} value={p.id} disabled={p.id === nominatorId}>{p.name}</option>)}
        </select>
      </div>
      <button onClick={submit} disabled={busy || !nominatorId || !nomineeId || nominatorId === nomineeId}
        className="btn-action primary"
        style={{ width: '100%', marginTop: 8, opacity: (busy || !nominatorId || !nomineeId || nominatorId === nomineeId) ? 0.4 : 1 }}>
        {busy ? 'Resuelve la votación activa primero' : '⚖ Nominar'}
      </button>
    </div>
  );
}

// Alertas inline (top del panel derecho): avisos urgentes + efectos diferidos reales.
// deferredOptions se excluye — causaba bucle infinito y mostraba la barra siempre.
function AlertsInline({ game, send }) {
  const advice = (game.advice || []).filter(a => a.severity === 'warn' || a.severity === 'danger');
  const deferred = game.deferredEffects || [];

  if (advice.length === 0 && deferred.length === 0) return null;

  return (
    <div style={{ padding: '6px 10px', background: 'rgba(168,58,45,0.18)', borderBottom: 'var(--hairline)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blood-hi)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>⚠ Pendiente</span>
      {advice.map((a, i) => (
        <span key={'a' + i} style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', whiteSpace: 'nowrap' }}>{a.text}</span>
      ))}
      {deferred.map(d => (
        <span key={d.id} style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-50)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {d.label}
          <button onClick={() => send('RESOLVE_DEFERRED', { id: d.id })} className="btn-night" style={{ fontSize: 9 }}>✓ Hecho</button>
        </span>
      ))}
    </div>
  );
}

// Mapa de sospechas agregado (todas las sospechas privadas en un vistazo).
function SuspicionMap({ players }) {
  const [open, setOpen] = useState(false);
  const withSusp = players.filter(p => (p.accusations || []).length > 0);
  if (withSusp.length === 0) return null;
  const total = withSusp.reduce((n, p) => n + p.accusations.length, 0);

  return (
    <div style={{ border: 'var(--hairline-bone)', borderRadius: 4, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--moon)' }}>👁 Mapa de sospechas ({total})</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {withSusp.map(p => (
            <div key={p.id}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', margin: '0 0 2px', fontWeight: 600 }}>{p.name} <span style={{ color: 'var(--moon)', fontSize: 10 }}>👁 {p.accusations.length}</span></p>
              {p.accusations.map((a, i) => {
                const sr = ALL_ROLES.find(r => r.id === a.roleId);
                return (
                  <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-400)', margin: '0 0 0 8px' }}>
                    {a.accuserName} → {sr?.name || a.roleId}
                  </p>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Importar campaña personalizada: pegar JSON del script (formato BotC).
function ImportCampaignBox({ send, importResult }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState('');
  const [name, setName] = useState('');

  const doImport = () => {
    if (!json.trim()) return;
    send('IMPORT_CAMPAIGN', { json: json.trim(), name: name.trim() || undefined });
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(o => !o)} className="btn-night" style={{ width: '100%', fontSize: 10 }}>
        {open ? 'Cerrar' : '＋ Importar campaña (JSON)'}
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(0,0,0,0.25)', border: 'var(--hairline-bone)', borderRadius: 4 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre (opcional)"
            style={{ width: '100%', marginBottom: 6, background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '5px 7px', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)' }} />
          <textarea value={json} onChange={e => setJson(e.target.value)} rows={5}
            placeholder='Pega el script: [{"id":"_meta","name":"..."},"washerwoman",...]'
            style={{ width: '100%', background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-100)', resize: 'vertical' }} />
          <button onClick={doImport} disabled={!json.trim()} className="btn-action primary" style={{ width: '100%', marginTop: 6, opacity: json.trim() ? 1 : 0.4 }}>
            Importar
          </button>
          {importResult && (
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--serif)' }}>
              {importResult.ok ? (
                <>
                  <p style={{ color: 'var(--good)', margin: '0 0 4px' }}>✓ {importResult.name} — {importResult.roleCount} roles</p>
                  {(importResult.warnings || []).map((w, i) => (
                    <p key={i} style={{ color: 'var(--gold)', margin: '2px 0', fontStyle: 'italic' }}>{w}</p>
                  ))}
                  {(importResult.setupNotes || []).map((s, i) => (
                    <p key={`s${i}`} style={{ color: 'var(--bone-400)', margin: '2px 0' }}>· {s}</p>
                  ))}
                </>
              ) : (
                <p style={{ color: 'var(--blood-hi)', margin: 0 }}>✕ {importResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}
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
