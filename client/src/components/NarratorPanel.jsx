import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarberPanel, RoshamboBox, NarratorCounter } from './NarratorTools';
import { ABILITY_PANELS } from '../data/abilityPanels';
import { useGame } from '../context/GameContext';
import { ALL_ROLES, ROLE_BY_ID, SELECTABLE_CAMPAIGNS } from '../data/roles';
import { formatIdentity, MASK } from '../utils/identity';
import { phaseInfo, hasBlock, mainAction } from '../data/narratorPhases';
import useNarratorHotkeys, { HOTKEYS } from '../hooks/useNarratorHotkeys';
import SetupWizard from './SetupWizard';
import NightSettings from './NightSettings';
import NightWalkthrough from './NightWalkthrough';
import StatusChips from './StatusChips';
import GameTable from './GameTable';
import ActionModal from './ActionModal';
import RoleIcon from './RoleIcon';
import SheetLink from './SheetLink';

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

// Pestañas del menú ⋯ (todo lo que no es narrar: configuración y utilidades)
const MENU_TABS = [
  { id: 'partida',  label: '⚙ Partida' },
  { id: 'discord',  label: '💬 Discord' },
  { id: 'ranking',  label: '🏆 Rankings' },
  { id: 'admin',    label: '🛡 Admin' },
  { id: 'atajos',   label: '⌨ Atajos' },
];

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
  const [activeNightActorId, setActiveNightActorId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [discordMap, setDiscordMap] = useState({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [menuTab, setMenuTab] = useState(null);          // null = menú ⋯ cerrado
  const [editCampaign, setEditCampaign] = useState(null); // campaña abierta para editar (punto 7)
  const [nightStep, setNightStep] = useState({ current: 0, total: 0 });
  const [rosterTarget, setRosterTarget] = useState(null); // jugador abierto desde el roster
  const [uiScale, setUiScale] = useState(() => parseFloat(localStorage.getItem('boct_uiscale') || '1'));
  const changeScale = (d) => { const v = Math.max(0.8, Math.min(1.5, +(uiScale + d).toFixed(2))); setUiScale(v); localStorage.setItem('boct_uiscale', String(v)); };

  const guideRef  = useRef(null);   // mando de la Guía (siguiente / anterior / ir a)
  const searchRef = useRef(null);   // buscador del roster

  const onProgress = useCallback(info => setNightStep(info), []);

  useEffect(() => {
    if (game?.phase === 'lobby') { send('GET_DISCORD_MEMBERS', {}); send('GET_CAMPAIGNS', {}); }
  }, [game?.phase === 'lobby']);

  useEffect(() => {
    if (menuTab === 'ranking') send('GET_RANKINGS', {});
    if (menuTab === 'discord') send('GET_DISCORD_MEMBERS', {});
  }, [menuTab]);

  // La escala del narrador afecta a las tres columnas, no solo a una.
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
    return () => document.documentElement.style.removeProperty('--ui-scale');
  }, [uiScale]);

  const act = mainAction(game);
  const runMain = useCallback(() => {
    if (!act || act.disabled) return;
    if (act.openWizard) { setWizardOpen(true); return; }
    act.run?.(send);
  }, [act, send]);

  useNarratorHotkeys({
    enabled: !wizardOpen && !menuTab && !rosterTarget,
    onMain: runMain,
    onNext: () => guideRef.current?.next(),
    onPrev: () => guideRef.current?.prev(),
    onGoTo: n => guideRef.current?.goTo(n),
    onSearch: () => searchRef.current?.focus(),
    onEscape: () => { setMenuTab(null); setRosterTarget(null); },
  });

  if (!game) return <div style={{ padding: 32, fontFamily: 'var(--serif)', color: 'var(--bone-400)' }}>Cargando...</div>;

  const { players, phase, nominations, activeNomination, nightDeaths } = game;
  const isNight = ['first_night', 'night'].includes(phase);
  const ph = phaseInfo(game);
  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const discord = discordMap[newPlayerName] || {};
    send('ADD_PLAYER', { name: newPlayerName.trim(), discordId: discord.id, discordTag: discord.tag });
    setNewPlayerName('');
  };

  const alive = players.filter(p => p.alive).length;

  return (
    <div className={`app-shell ${isNight ? 'is-night' : 'is-day'}`}>

      {/* ── Topbar de mando: dónde estoy · qué hago ahora · utilidades ── */}
      <header className="topbar">
        <div className="nx-topbar-phase">
          <span style={{ fontSize: 20 }}>{ph.icon}</span>
          <span className="nx-phase-name">{ph.label}</span>
          {isNight && nightStep.total > 0 && (
            <span className="nx-phase-step">paso {nightStep.current + 1}/{nightStep.total}</span>
          )}
        </div>

        <div className="topbar-center">
          {act ? (
            <div className="nx-main-slot">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={runMain} disabled={act.disabled}
                  className={`nx-btn-main${act.tone === 'danger' ? ' danger' : ''}`}
                  title="Atajo: barra espaciadora">
                  {act.label}
                </button>
                {act.secondary && (
                  <button onClick={() => act.secondary.run(send)} className="nx-btn sm">
                    {act.secondary.label}
                  </button>
                )}
              </div>
              {act.note && <span className="nx-main-note">{act.note}</span>}
            </div>
          ) : (
            <span className="nx-main-note">Resuelve la votación abierta para seguir.</span>
          )}
        </div>

        <div className="topbar-right">
          <span className="nx-count">{alive}♥ <span className="dead">{players.length - alive}☠</span></span>
          <div style={{ display: 'flex', gap: 2 }} title="Tamaño de la interfaz">
            <button onClick={() => changeScale(-0.1)} className="nx-icon-btn">A−</button>
            <button onClick={() => changeScale(0.1)} className="nx-icon-btn" style={{ fontSize: 17 }}>A+</button>
          </div>
          <SheetLink game={game} compact />
          <button onClick={() => setMenuTab('partida')} className="nx-btn sm" title="Ajustes, Discord, rankings y atajos">⋯</button>
        </div>
      </header>

      {menuTab && (
        <SettingsMenu
          tab={menuTab} setTab={setMenuTab} onClose={() => setMenuTab(null)}
          game={game} send={send} rankings={rankings} discordMembers={discordMembers} players={players}
        />
      )}

      {rosterTarget && players.some(p => p.id === rosterTarget) && (
        <ActionModal target={players.find(p => p.id === rosterTarget)} isNarrator
          onClose={() => setRosterTarget(null)} />
      )}

      {editCampaign && (
        <EditCampaignModal campaign={editCampaign} send={send} onClose={() => setEditCampaign(null)} />
      )}

      {/* ── Columna izquierda — AHORA ── */}
      <aside className="left-panel">
        {hasBlock(game, 'setup') && (
          <>
            {/* Campaign selector (oficiales + personalizadas del servidor) */}
            <div>
              <p className="panel-label">Campaña</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(serverCampaigns && serverCampaigns.length ? serverCampaigns : SELECTABLE_CAMPAIGNS).map(c => {
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
                      {!locked && (
                        <>
                          <button onClick={() => setEditCampaign(c)}
                            className="btn-night" style={{ fontSize: 10, color: 'var(--gold)' }}
                            title={c.isCustom ? 'Editar campaña' : 'Editar nombre de los canales'}>✎</button>
                          {c.isCustom && (
                            <button onClick={() => { if (confirm(`¿Eliminar campaña "${c.name}"?`)) send('DELETE_CAMPAIGN', { campaignId: c.id }); }}
                              className="btn-night" style={{ fontSize: 10, color: 'var(--blood-hi)' }} title="Eliminar">✕</button>
                          )}
                        </>
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

            {/* Narradores (multi): ven las habitaciones y se mueven con la Plaza */}
            <NarratorsPicker game={game} discordMembers={discordMembers} send={send} />

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
            <button onClick={() => setWizardOpen(true)} className="nx-btn primary"
              disabled={players.length < 1} style={{ fontSize: 17, padding: '13px 0' }}>
              🎬 Montar partida (asistente)
            </button>

            <p className="nx-hint">
              El modo automático, los límites de canal y el resto de ajustes están en el menú <strong>⋯</strong> de arriba a la derecha.
            </p>
          </>
        )}

        {/* Reparto: enseñar su personaje a cada jugador */}
        {hasBlock(game, 'reveal') && (
          <div className="nx-card">
            <div className="nx-card-head"><p className="nx-head-title">🎭 Enseñar personaje</p></div>
            <div className="nx-card-body">
              <p className="nx-hint" style={{ marginBottom: 8 }}>Pulsa a cada jugador para mostrarle su personaje en su pantalla.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {players.map(p => {
                  const role = p.role ? ALL_ROLES.find(r => r.id === p.role) : null;
                  return (
                    <button key={p.id} onClick={() => send('REVEAL_ROLE', { playerId: p.id })} className="nx-btn"
                      style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: 15 }}>{p.name}</span>
                      <span className="nx-mono" style={{ fontSize: 11 }}>{role?.name || '?'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {wizardOpen && phase === 'lobby' && (
          <SetupWizard game={game} send={send} onClose={() => setWizardOpen(false)} />
        )}

        {!hasBlock(game, 'setup') && (
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

            {/* Noche: la Guía es el único centro de mando */}
            {hasBlock(game, 'guide') && (
              <>
                <NightWalkthrough
                  onActiveActor={setActiveNightActorId}
                  onProgress={onProgress}
                  controlsRef={guideRef}
                />
                <NightSettings />
              </>
            )}

            {/* Maestro de Acertijos — panel de acción de día */}
            {(hasBlock(game, 'day') || hasBlock(game, 'nominations')) && (() => {
              const pm = players.find(p => p.role === 'PUZZLEMASTER' && p.alive);
              if (!pm) return null;
              const alreadyUsed = (pm.tokens || []).some(t => t.type === 'NO_ABILITY');
              return (
                <PuzzlemasterDayPanel key={pm.id} pm={pm} alreadyUsed={alreadyUsed} send={send} />
              );
            })()}

            {/* Nominación manual: el narrador fija nominador y nominado (día o nominaciones) */}
            {(phase === 'day' || phase === 'nominations') && (
              <ManualNominateCard game={game} send={send} />
            )}

            {activeNomination && <ActiveNominationCard game={game} send={send} />}

            {nominations.length > 0 && !isNight && (
              <div>
                <p className="panel-label">Nominaciones de hoy</p>
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

            {/* Jugadores: siempre a mano, con buscador */}
            <RosterList players={players} send={send} searchRef={searchRef} onOpen={setRosterTarget} />
          </>
        )}
      </aside>

      {/* ── Centro — la mesa ── */}
      <main className="stage">
        <GameTable isNarrator={true} activeActorId={activeNightActorId} />
      </main>

      {/* ── Columna derecha — PENDIENTE (igual en todas las fases) ── */}
      <aside className="right-panel">
        <AlertsInline game={game} send={send} />

        {/* Contadores que se llevan DURANTE EL DÍA (Yaggababble) */}
        <DayCounters game={game} send={send} />

        {/* Pasos que no pueden esperar: Barbero y Roshambo */}
        <BarberPanel />
        <RoshamboBox />

        {/* Personajes que decides tú: la página avisa, no automatiza */}
        <RoleHints game={game} />

        {/* Muertes de esta noche */}
        {nightDeaths.length > 0 && (
          <div className="nx-card danger">
            <div className="nx-card-head"><p className="nx-head-title evil">☠ Muertes de esta noche</p></div>
            <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nightDeaths.map(id => {
                const p = players.find(pl => pl.id === id);
                const role = p?.role ? ROLE_BY_ID[p.role] : null;
                return p ? (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="nx-avatar">
                      {p.avatar ? <img src={p.avatar} /> : p.name[0]}
                    </div>
                    <RoleIcon role={role} size={20} radius={4} />
                    <span className="nx-sub">{p.name}{role ? ` · ${role.name}` : ''}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Mapa de sospechas (agregado) */}
        <SuspicionMap players={players} />

        {/* Registro: qué acabo de hacer */}
        <StatusLog log={game.statusLog} />
      </aside>

    </div>
  );
}

// ── Roster: la lista de jugadores, siempre a un vistazo ──────────────
// Pulsar una fila abre el mismo panel que pulsar su ficha en la mesa,
// para que no haya dos caminos distintos según dónde pinches.
function RosterList({ players, send, searchRef, onOpen }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = term ? players.filter(p => p.name.toLowerCase().includes(term)) : players;

  return (
    <div className="nx-card">
      <div className="nx-card-head">
        <p className="nx-head-title">👥 Jugadores {players.filter(p => p.alive).length}/{players.length}</p>
        <input ref={searchRef} className="nx-input" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar (B)" style={{ width: 120, fontSize: 13, padding: '4px 8px' }} />
      </div>
      <div className="nx-card-body" style={{ padding: 8 }}>
        <div className="nx-list tall">
          {shown.map(p => {
            const role = ALL_ROLES.find(r => r.id === p.role);
            const ident = formatIdentity(p);
            return (
              <div key={p.id} className={`nx-row${p.alive ? '' : ' dead'}`} onClick={() => onOpen(p.id)}>
                <span className="nx-seat-num">{players.indexOf(p) + 1}</span>
                <div className="nx-avatar">
                  {role ? <RoleIcon role={role} size={null} style={{ width: '100%', height: '100%' }} /> : p.avatar ? <img src={p.avatar} /> : p.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span className="nx-row-name">{p.name}</span>
                    <span className={`nx-row-role${role?.alignment === 'evil' ? ' evil' : ''}`}>{role?.name || '—'}</span>
                  </div>
                  {ident.hasFalse && (
                    <div className="identity-false" style={{ fontSize: 12 }} title={ident.tooltip}>
                      <span className="mask">{MASK}</span>&nbsp;se cree {ident.believedName}
                    </div>
                  )}
                  <StatusChips player={p} compact />
                </div>
                <button className={`nx-icon-btn ${p.alive ? 'danger' : 'good'}`} title={p.alive ? 'Matar' : 'Revivir'}
                  onClick={e => { e.stopPropagation(); send(p.alive ? 'KILL_PLAYER' : 'REVIVE_PLAYER', { playerId: p.id }); }}>
                  {p.alive ? '☠' : '♻'}
                </button>
              </div>
            );
          })}
          {shown.length === 0 && <p className="nx-hint" style={{ padding: 8 }}>Nadie con ese nombre.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Registro: la memoria del narrador ────────────────────────────────
function StatusLog({ log }) {
  const [open, setOpen] = useState(false);
  const entries = Array.isArray(log) ? log.slice(-30).reverse() : [];
  if (entries.length === 0) return null;
  return (
    <div className="nx-card">
      <div className="nx-card-head clickable" onClick={() => setOpen(o => !o)}>
        <p className="nx-head-title">📜 Registro ({entries.length})</p>
        <span className="nx-mono">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="nx-card-body" style={{ padding: 8 }}>
          <div className="nx-list short">
            {entries.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 4px' }}>
                <span className="nx-mono nx-muted" style={{ flexShrink: 0 }}>N{e.night}</span>
                <span className="nx-sub" style={{ fontSize: 14 }}>{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menú ⋯ — todo lo que no es narrar ────────────────────────────────
// Editar una campaña (punto 7). Personalizada: nombre, reparto (JSON) y nombres
// de canales. Oficial: SOLO nombres de canales (nombre y JSON bloqueados).
// El id se conserva en el servidor para no romper la partida activa.
function EditCampaignModal({ campaign, send, onClose }) {
  const roles = campaign?.roles || {};
  const seed = [
    { id: '_meta', name: campaign?.name || '' },
    ...Object.keys(roles).map(id => {
      const r = roles[id];
      return r?.unknown ? (r.name || id) : id;
    }),
  ];
  const [name, setName] = useState(campaign?.name || '');
  const [json, setJson] = useState(JSON.stringify(seed, null, 1));
  const [locationNames, setLocationNames] = useState({ ...LOCATION_DEFAULTS, ...(campaign?.locationNames || {}) });

  const save = () => {
    const hasJson = /"[a-zA-Z]/.test(json || '');
    send('EDIT_CAMPAIGN', {
      campaignId: campaign.id,
      ...(campaign.isCustom ? { name, ...(hasJson ? { json } : {}) } : {}),
      locationNames,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="nx-menu-card" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
        <div className="nx-menu-head">
          <span className="panel-label" style={{ margin: 0, color: 'var(--gold-hot)' }}>✎ Editar campaña</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="nx-btn sm">✕ Cerrar</button>
        </div>
        <div className="nx-menu-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {campaign.isCustom ? (
            <>
              <div>
                <p className="panel-label" style={{ margin: '0 0 4px' }}>Nombre</p>
                <input value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)' }} />
              </div>
              <div style={{ marginTop: 10 }}>
                <p className="panel-label" style={{ margin: '0 0 4px' }}>Script (JSON). Dejar vacío = solo cambio de nombre</p>
                <textarea value={json} onChange={e => setJson(e.target.value)} rows={12}
                  style={{ width: '100%', background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-100)', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </>
          ) : (
            <p className="nx-hint" style={{ fontStyle: 'italic' }}>
              Campaña oficial: solo deja cambiar el nombre de los canales. El nombre y el guion no se pueden editar.
            </p>
          )}
          <div style={{ marginTop: 10 }}>
            <LocationNamesFields values={locationNames} onChange={(k, v) => setLocationNames(prev => ({ ...prev, [k]: v }))} />
          </div>
          <button onClick={save} className="btn-action primary" style={{ width: '100%', marginTop: 10, fontSize: 12, padding: '8px 0' }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsMenu({ tab, setTab, onClose, game, send, rankings, discordMembers, players }) {
  const [confirmWin, setConfirmWin] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="nx-menu-card" onClick={e => e.stopPropagation()}>
        <div className="nx-menu-head">
          {MENU_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`nx-btn sm${tab === t.id ? ' on' : ''}`}>
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="nx-btn sm">✕ Cerrar</button>
        </div>

        <div className="nx-menu-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {tab === 'partida' && (
            <>
              <AutoModeBox game={game} send={send} players={players} />
              <ChannelLimitsControl game={game} send={send} />
              <ChannelControl players={players} send={send} />

              <div className="nx-card danger">
                <div className="nx-card-head"><p className="nx-head-title evil">Terminar la partida a mano</p></div>
                <div className="nx-card-body">
                  {confirmWin ? (
                    <>
                      <p className="nx-sub" style={{ marginBottom: 8 }}>
                        ¿Declarar la victoria del <strong style={{ color: confirmWin === 'good' ? 'var(--good)' : 'var(--blood-hi)' }}>{confirmWin === 'good' ? 'Bien' : 'Mal'}</strong>?
                      </p>
                      <div className="nx-btn-row">
                        <button className="nx-btn danger" onClick={() => { send('DECLARE_WINNER', { winner: confirmWin }); setConfirmWin(null); onClose(); }}>Sí, terminar</button>
                        <button className="nx-btn" onClick={() => setConfirmWin(null)}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <div className="nx-btn-row">
                      <button className="nx-btn good" onClick={() => setConfirmWin('good')}>✨ Gana el Bien</button>
                      <button className="nx-btn danger" onClick={() => setConfirmWin('evil')}>⚔ Gana el Mal</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="nx-card">
                <div className="nx-card-head"><p className="nx-head-title">Empezar de cero</p></div>
                <div className="nx-card-body">
                  <p className="nx-hint" style={{ marginBottom: 8 }}>Borra la partida actual y vuelve al montaje. No se puede deshacer.</p>
                  {confirmReset ? (
                    <div className="nx-btn-row">
                      <button className="nx-btn danger" onClick={() => { send('RESET_GAME', {}); setConfirmReset(false); onClose(); }}>Sí, resetear</button>
                      <button className="nx-btn" onClick={() => setConfirmReset(false)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="nx-btn" onClick={() => setConfirmReset(true)}>Resetear partida</button>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'discord' && (
            <>
              <NarratorsPicker game={game} discordMembers={discordMembers} send={send} />
              <DiscordMemberPicker discordMembers={discordMembers} players={players} send={send} />
            </>
          )}

          {tab === 'admin' && <AdminPanel send={send} />}

          {tab === 'ranking' && <RankingsManager rankings={rankings} send={send} />}

          {tab === 'atajos' && (
            <div className="nx-card">
              <div className="nx-card-head"><p className="nx-head-title">⌨ Atajos de teclado</p></div>
              <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {HOTKEYS.map(h => (
                  <div key={h.keys} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="nx-kbd" style={{ minWidth: 84, textAlign: 'center' }}>{h.keys}</span>
                    <span className="nx-sub">{h.what}</span>
                  </div>
                ))}
                <p className="nx-hint">Se desactivan solos mientras escribes en un campo de texto.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modo automático (partida sin narrador) — vive en el menú, no estorba narrando.
function AutoModeBox({ game, send, players }) {
  return (
    <div className="nx-card">
      <div className="nx-card-head"><p className="nx-head-title">🤖 Partida sin narrador</p></div>
      <div className="nx-card-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {[
            { label: 'Día', key: 'dayMs', val: game.autoDayMs ?? 300000 },
            { label: 'Nominaciones', key: 'nomMs', val: game.autoNomMs ?? 420000 },
          ].map(({ label, key, val }) => (
            <div key={key} style={{ flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '8px 10px' }}>
              <p className="nx-hint" style={{ marginBottom: 4 }}>{label} (minutos)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="nx-btn sm" disabled={val <= 60000}
                  onClick={() => send('SET_AUTO_TIMINGS', { [key]: val - 60000 })}>−</button>
                <span className="nx-mono" style={{ fontSize: 18, color: 'var(--gold-hot)', flex: 1, textAlign: 'center' }}>
                  {Math.round(val / 60000)}
                </span>
                <button className="nx-btn sm" disabled={val >= 1800000}
                  onClick={() => send('SET_AUTO_TIMINGS', { [key]: val + 60000 })}>+</button>
              </div>
            </div>
          ))}
        </div>
        {game.autoMode ? (
          <button className="nx-btn danger" onClick={() => send('STOP_AUTO_MODE', {})}>Detener el modo automático</button>
        ) : (
          <>
            <p className="nx-hint" style={{ marginBottom: 8 }}>
              Reparte los personajes al azar y lleva los tiempos solo. Solo para jugar sin narrador.
            </p>
            <button className="nx-btn" disabled={players.length < 5}
              onClick={() => send('AUTO_MODE', {})}>
              Iniciar modo automático{players.length < 5 ? ' (hacen falta 5 jugadores)' : ''}
            </button>
          </>
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
          <option value="NARRATOR">🎙 Narrador</option>
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

  if (advice.length === 0 && deferred.length === 0) {
    return (
      <p className="nx-hint" style={{ padding: '4px 2px' }}>
        ✓ Nada pendiente ahora mismo.
      </p>
    );
  }

  return (
    <div className="nx-card danger">
      <div className="nx-card-head">
        <p className="nx-head-title evil">⚠ Pendiente ({advice.length + deferred.length})</p>
      </div>
      <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Lo que hay que resolver con un botón */}
        {deferred.map(d => (
          <div key={d.id} className="nx-alert danger">
            <p>{d.label}</p>
            <button onClick={() => send('RESOLVE_DEFERRED', { id: d.id })} className="nx-btn sm">✓ Hecho</button>
          </div>
        ))}
        {/* Lo que solo hay que tener presente */}
        {advice.map((a, i) => (
          <div key={'a' + i} className={`nx-alert${a.severity === 'danger' ? ' danger' : ''}`}>
            <p>{a.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Contadores de día ────────────────────────────────────────────────
// El Yaggababble mata de noche a tantos jugadores como veces dijo su frase
// DURANTE EL DÍA. El contador estaba escondido dentro del panel del jugador y
// era estado local de React: se perdía al cerrarlo. Aquí está siempre visible
// mientras el personaje esté vivo, y el valor vive en el servidor.
function DayCounters({ game, send }) {
  const owners = (game.players || []).filter(p => p.alive && p.role === 'YAGGABABBLE');
  if (!owners.length) return null;
  const cfg = ABILITY_PANELS.YAGGABABBLE?.counter;
  if (!cfg) return null;
  return (
    <div className="nx-card">
      <div className="nx-card-head">
        <p className="nx-head-title">🗣 Yaggababble — {owners.map(p => p.name).join(', ')}</p>
      </div>
      <div className="nx-card-body">
        <NarratorCounter cfg={cfg} game={game} send={send} compact />
        <p className="nx-hint" style={{ margin: 0 }}>
          Súbelo cada vez que diga su frase secreta en público. Esta noche elegirá esa cantidad de víctimas.
        </p>
      </div>
    </div>
  );
}

// ── Guía del narrador ────────────────────────────────────────────────
// Personajes cuya regla NO se automatiza a propósito: depende de algo dicho
// en voz alta o de tu criterio. La página te dice QUÉ toca y CON QUÉ control,
// pero la decisión sigue siendo tuya. Se abre solo si hay algo urgente.
function RoleHints({ game }) {
  const hints = game.roleHints || [];
  const urgent = hints.filter(h => h.severity === 'warn' || h.severity === 'danger');
  const [open, setOpen] = useState(urgent.length > 0);
  if (hints.length === 0) return null;

  const color = s => (s === 'danger' ? 'var(--blood-hi)' : s === 'warn' ? 'var(--gold-hot)' : 'var(--moon)');

  return (
    <div className="nx-card">
      <div className="nx-card-head clickable" onClick={() => setOpen(o => !o)}>
        <p className={`nx-head-title${urgent.length ? '' : ' good'}`}>
          🎙 Decides tú ({hints.length}{urgent.length ? ` · ${urgent.length} urgente${urgent.length > 1 ? 's' : ''}` : ''})
        </p>
        <span className="nx-mono">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="nx-card-body">
          <div className="nx-list" style={{ maxHeight: '38vh', gap: 10 }}>
            {hints.map((h, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${color(h.severity)}`, paddingLeft: 9 }}>
                <p className="nx-sub" style={{ fontWeight: 600 }}>
                  {h.playerName} <span className="nx-muted" style={{ fontWeight: 400 }}>· {h.roleName}</span>
                  {!h.alive && <span style={{ color: 'var(--blood-hi)' }}> ☠</span>}
                  {h.impaired && <span style={{ color: 'var(--moon)' }}> 🧪 no funciona</span>}
                </p>
                <p className="nx-sub" style={{ color: 'var(--bone-300)' }}>{h.text}</p>
                {h.needs && <p className="nx-mono" style={{ marginTop: 3 }}>▸ {h.needs}</p>}
              </div>
            ))}
          </div>
          <p className="nx-hint" style={{ marginTop: 8 }}>
            Pulsa a ese jugador (en la mesa o en la lista) para abrir sus controles.
          </p>
        </div>
      )}
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
    <div className="nx-card">
      <div className="nx-card-head clickable" onClick={() => setOpen(o => !o)}>
        <p className="nx-head-title">👁 Sospechas de los jugadores ({total})</p>
        <span className="nx-mono">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="nx-card-body">
          <div className="nx-list short" style={{ gap: 8 }}>
            {withSusp.map(p => (
              <div key={p.id}>
                <p className="nx-sub" style={{ fontWeight: 600 }}>{p.name} <span style={{ color: 'var(--moon)' }}>👁 {p.accusations.length}</span></p>
                {p.accusations.map((a, i) => {
                  const sr = ALL_ROLES.find(r => r.id === a.roleId);
                  return (
                    <p key={i} className="nx-hint" style={{ marginLeft: 10 }}>
                      {a.accuserName} → {sr?.name || a.roleId}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// Nombres de los emplazamientos POR CAMPAÑA (puntos 2 y 6): cada campaña lleva
// su propia lista de nombres, que se aplican (web + canales de voz reales de
// Discord) al elegirla. Campos reutilizables en el import y en la edición.
const LOCATION_KEYS = ['PLAZA', 'MERCADO', 'TABERNA', 'CEMENTERIO', 'BOSQUE'];
const LOCATION_DEFAULTS = { PLAZA: 'Plaza', MERCADO: 'Mercado', TABERNA: 'Taberna', CEMENTERIO: 'Cementerio', BOSQUE: 'Bosque' };

function LocationNamesFields({ values, onChange }) {
  return (
    <div>
      <p className="panel-label" style={{ margin: '0 0 4px' }}>🗺 Nombre de los emplazamientos</p>
      <p className="nx-hint" style={{ margin: '0 0 8px' }}>
        Así se renombran los canales de voz y se muestran en la web con esta campaña. Son por campaña.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LOCATION_KEYS.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', width: 74, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</span>
            <input value={values[k] || ''} onChange={e => onChange(k, e.target.value)}
              style={{ flex: 1, background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '4px 8px', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Importar campaña personalizada: pegar JSON del script (formato BotC).
function ImportCampaignBox({ send, importResult }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState('');
  const [name, setName] = useState('');
  const [locationNames, setLocationNames] = useState({ ...LOCATION_DEFAULTS });

  const doImport = () => {
    if (!json.trim()) return;
    send('IMPORT_CAMPAIGN', { json: json.trim(), name: name.trim() || undefined, locationNames });
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
            style={{ width: '100%', marginBottom: 6, background: 'var(--ink-700)', border: 'var(--hairline-bone)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-100)', resize: 'vertical' }} />
          <LocationNamesFields values={locationNames} onChange={(k, v) => setLocationNames(prev => ({ ...prev, [k]: v }))} />
          <button onClick={doImport} disabled={!json.trim()} className="btn-action primary" style={{ width: '100%', marginTop: 8, opacity: json.trim() ? 1 : 0.4 }}>
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
  // El rol de partida ya no está hardcodeado: lo trae la config del bot (/admin).
  const { state } = useGame();
  const GAME_ROLE_ID = state.config?.boctRoleId || '1499987378755076218';
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

// Narradores de la partida: cualquier usuario de Discord de la lista puede
// narrar (ve las habitaciones de noche y es teletransportado con la Plaza).
function NarratorsPicker({ game, discordMembers, send }) {
  const ids = Array.isArray(game.narratorDiscordIds) ? game.narratorDiscordIds : [];
  const [selectId, setSelectId] = useState('');

  const nameOf = id => discordMembers.find(m => m.id === id)?.displayName || id;
  const addNarrator = () => {
    if (!selectId || ids.includes(selectId)) return;
    send('SET_NARRATORS', { discordIds: [...ids, selectId] });
    setSelectId('');
  };
  const removeNarrator = id => send('SET_NARRATORS', { discordIds: ids.filter(x => x !== id) });

  return (
    <div style={{ padding: '8px 10px', background: 'rgba(201,162,74,0.06)', borderRadius: 4, border: '1px solid rgba(201,162,74,0.25)' }}>
      <p className="panel-label" style={{ margin: '0 0 6px', color: 'var(--gold-hot)' }}>🎙 Narradores ({ids.length})</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {ids.length === 0 && (
          <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-500)', fontStyle: 'italic' }}>Narrador por defecto</span>
        )}
        {ids.map(id => (
          <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-100)', background: 'rgba(0,0,0,0.25)', border: 'var(--hairline-bone)', borderRadius: 3, padding: '2px 6px' }}>
            🎙 {nameOf(id)}
            {ids.length > 1 && (
              <button onClick={() => removeNarrator(id)} title="Quitar narrador"
                style={{ background: 'none', border: 'none', color: 'var(--blood-hi)', cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
            )}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={selectId} onChange={e => setSelectId(e.target.value)}
          style={{ flex: 1, fontSize: 11, background: 'var(--ink-600)', border: 'var(--hairline-bone)', borderRadius: 2, color: 'var(--bone-200)', padding: '4px 6px' }}>
          <option value="">Agregar narrador…</option>
          {discordMembers.filter(m => !ids.includes(m.id)).map(m => (
            <option key={m.id} value={m.id}>{m.displayName}</option>
          ))}
        </select>
        <button onClick={addNarrator} disabled={!selectId} className="btn-action primary"
          style={{ padding: '4px 10px', fontSize: 11, opacity: selectId ? 1 : 0.4 }}>+</button>
      </div>
    </div>
  );
}

function ChannelLimitsControl({ game, send }) {
  const { state } = useGame();
  const locationNames = state.config?.locationNames || {};
  const CHANNELS = ['MERCADO', 'TABERNA', 'CEMENTERIO', 'BOSQUE'];
  const LABELS = { MERCADO: 'Mercado', TABERNA: 'Taberna', CEMENTERIO: 'Cementerio', BOSQUE: 'Bosque' };
  const limits = game.channelLimits || {};

  return (
    <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: 'var(--hairline-bone)' }}>
      <p className="panel-label" style={{ margin: '0 0 8px' }}>Límites de canales</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CHANNELS.map(ch => (
          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)', flex: 1 }}>{locationNames[ch] || LABELS[ch]}</span>
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
  const { state } = useGame();
  const locationNames = state.config?.locationNames || {};
  const [open, setOpen] = useState(false);
  const [secretFeedback, setSecretFeedback] = useState({});
  const outOfPlaza = players.filter(p => p.discordChannel && p.discordChannel !== 'PLAZA');
  const CHANNEL_LABELS = { PLAZA: 'Plaza', MERCADO: 'Mercado', TABERNA: 'Taberna', CEMENTERIO: 'Cementerio', BOSQUE: 'Bosque' };
  const nameOf = ch => locationNames[ch] || CHANNEL_LABELS[ch] || ch;

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
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--bone-400)' }}>{nameOf(ch)}</span>
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

// ── Panel Admin (punto 9 / Q8) ─────────────────────────────────────
// Los IDs de Discord ya no están hardcodeados: se editan aquí y se guardan en
// server/config.json (persistente en Render). Solo narrador o admin.
const ADMIN_CHANNEL_KEYS = ['PLAZA', 'MERCADO', 'TABERNA', 'CEMENTERIO', 'BOSQUE', 'CONFESIONARIO'];
function AdminPanel({ send }) {
  const { state } = useGame();
  const cfg = state.adminConfig;
  const [form, setForm] = useState(null);

  useEffect(() => {
    send('GET_CONFIG', {});
  }, [send]);

  // Cuando llega la config del server, la volcamos al formulario local.
  useEffect(() => {
    if (cfg && !form) {
      setForm({
        guildId: cfg.guildId || '',
        nightCategoryId: cfg.nightCategoryId || '',
        boctRoleId: cfg.boctRoleId || '',
        narratorUserIds: Array.isArray(cfg.narratorUserIds) ? [...cfg.narratorUserIds] : [],
        adminUserIds: Array.isArray(cfg.adminUserIds) ? [...cfg.adminUserIds] : [],
        channels: { ...(cfg.channels || {}) },
      });
    }
  }, [cfg, form]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const save = () => {
    if (!form) return;
    send('SET_CONFIG', {
      guildId: form.guildId,
      nightCategoryId: form.nightCategoryId,
      boctRoleId: form.boctRoleId,
      narratorUserIds: form.narratorUserIds,
      adminUserIds: form.adminUserIds,
      channels: form.channels,
    });
  };

  const field = {
    width: '100%', background: 'var(--ink-700)', border: 'var(--hairline-bone)',
    borderRadius: 2, padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 11,
    color: 'var(--bone-100)', marginTop: 4,
  };

  return (
    <div className="nx-card">
      <div className="nx-card-head"><p className="nx-head-title">🛡 Admin — IDs de Discord</p></div>
      <div className="nx-card-body">
        <p className="nx-hint" style={{ marginBottom: 8 }}>
          Si cambias de servidor o recreas los canales, actualiza aquí los IDs en vez de tocarlos en el código. Se guardan en <span className="nx-mono">server/config.json</span>.
        </p>
        {!form ? (
          <p className="nx-hint">Cargando config…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p className="panel-label" style={{ margin: 0 }}>Servidor (Guild ID)</p>
              <input value={form.guildId} onChange={e => set('guildId', e.target.value)} style={field} />
            </div>
            <div>
              <p className="panel-label" style={{ margin: 0 }}>Categoría de habitaciones de noche</p>
              <input value={form.nightCategoryId} onChange={e => set('nightCategoryId', e.target.value)} style={field} />
            </div>
            <div>
              <p className="panel-label" style={{ margin: 0 }}>Rol de partida (Jugador)</p>
              <input value={form.boctRoleId} onChange={e => set('boctRoleId', e.target.value)} style={field} />
            </div>

            <div>
              <p className="panel-label" style={{ margin: 0 }}>Canales de voz</p>
              {ADMIN_CHANNEL_KEYS.map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-400)', width: 92, flexShrink: 0 }}>{k}</span>
                  <input value={form.channels[k] || ''} onChange={e => set('channels', { ...form.channels, [k]: e.target.value })}
                    style={{ ...field, marginTop: 0, flex: 1 }} />
                </div>
              ))}
            </div>

            <div>
              <p className="panel-label" style={{ margin: 0 }}>Narradores (IDs de Discord)</p>
              <input
                value={form.narratorUserIds.join(', ')}
                onChange={e => set('narratorUserIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                style={field} />
            </div>
            <div>
              <p className="panel-label" style={{ margin: 0 }}>Admins (IDs de Discord, opcional)</p>
              <input
                value={form.adminUserIds.join(', ')}
                onChange={e => set('adminUserIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                style={field} />
              <p className="nx-hint" style={{ marginTop: 4 }}>Solo estos IDs pueden cambiar la config del bot. Vacío = solo el narrador.</p>
            </div>

            <button onClick={save} className="btn-action primary" style={{ fontSize: 12, padding: '8px 0' }}>
              Guardar configuración
            </button>
          </div>
        )}
      </div>
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
