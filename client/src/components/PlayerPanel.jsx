import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { ALL_ROLES } from '../data/roles';
import GameTable from './GameTable';
import RoleReveal from './RoleReveal';
import NightScreen from './NightScreen';
import DiscordChannels from './DiscordChannels';
import PlayerChip from './PlayerChip';
import { playDaySound, playNightSound } from '../utils/sounds';

// ── Phase sound hook ──────────────────────────────────────────────
function usePhaseSound(phase) {
  const prev = useRef(null);
  useEffect(() => {
    if (!prev.current) { prev.current = phase; return; }
    const wasNight = ['first_night', 'night'].includes(prev.current);
    const isNight  = ['first_night', 'night'].includes(phase);
    const wasDay   = ['day', 'nominations', 'voting'].includes(prev.current);
    const isDay    = ['day', 'nominations', 'voting'].includes(phase);
    if (!wasDay && isDay) playDaySound();
    else if (!wasNight && isNight) playNightSound();
    prev.current = phase;
  }, [phase]);
}

// ── Role info panel ───────────────────────────────────────────────
function RoleInfoPanel() {
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState(null);
  const types = [
    { key: 'townfolk', label: 'Aldeanos', color: 'var(--good)' },
    { key: 'outsider', label: 'Forasteros', color: 'var(--moon)' },
    { key: 'minion',   label: 'Esbirros', color: 'var(--blood-hi)' },
    { key: 'demon',    label: 'Demonio', color: 'var(--blood-hi)' },
  ];
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="btn-action"
        style={{ width: '100%', fontSize: 14, padding: '10px 0', opacity: 0.8 }}>
        📖 {open ? 'Cerrar Guía de Roles' : 'Información de los Roles'}
      </button>
      {open && (
        <div style={{ background: 'rgba(0,0,0,0.35)', border: 'var(--hairline)', borderRadius: 4, padding: '12px 14px', marginTop: 6, maxHeight: 380, overflowY: 'auto' }}>
          {types.map(t => (
            <div key={t.key} style={{ marginBottom: 10 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.color, marginBottom: 5 }}>{t.label}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ALL_ROLES.filter(r => r.type === t.key).map(r => (
                  <button key={r.id}
                    onClick={() => setPopup(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(0,0,0,0.25)',
                      border: 'var(--hairline-bone)',
                      borderRadius: 3, padding: '5px 8px', cursor: 'pointer',
                    }}>
                    {r.img && <img src={r.img} style={{ width: 20, height: 20, borderRadius: 2, objectFit: 'cover' }} />}
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}>{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role detail popup */}
      {popup && (
        <div className="modal-overlay" onClick={() => setPopup(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <button className="modal-close" onClick={() => setPopup(null)}>✕</button>
            {popup.img && (
              <img src={popup.img} alt={popup.name}
                style={{ width: 96, height: 96, borderRadius: 10, objectFit: 'cover', marginBottom: 16, border: popup.alignment === 'evil' ? '2px solid var(--blood-hi)' : '2px solid var(--good)' }} />
            )}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 600, color: 'var(--bone-50)', margin: '0 0 6px' }}>{popup.name}</p>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: popup.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)', margin: '0 0 18px' }}>{popup.type}</p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-200)', lineHeight: 1.7, textAlign: 'left' }}>{popup.ability}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini seating circle ───────────────────────────────────────────
function MiniCircle({ players, playerId }) {
  const n = players.length || 1;
  const radius = 74;
  const containerSize = 200;
  const positions = Array.from({ length: n }, (_, i) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return { x: Math.round(radius * Math.cos(angle)), y: Math.round(radius * Math.sin(angle)) };
  });

  return (
    <div style={{ position: 'relative', width: containerSize, height: containerSize, margin: '8px auto 0' }}>
      {/* Center disc */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(201,162,74,0.07)', border: '1px solid rgba(201,162,74,0.25)' }} />
      </div>

      {players.map((p, i) => {
        const pos = positions[i];
        const isMe = p.id === playerId;
        const isDead = !p.alive;
        const avatarSize = 28;
        const half = avatarSize / 2;
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: `calc(50% + ${pos.x}px - ${half}px)`,
            top: `calc(50% + ${pos.y}px - ${half}px)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{
              width: avatarSize, height: avatarSize, borderRadius: '50%',
              overflow: 'hidden', background: 'var(--ink-700)',
              border: isMe ? '2px solid var(--good)' : isDead ? '1px solid var(--blood-dim)' : '1px solid rgba(201,162,74,0.6)',
              opacity: isDead ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'var(--bone-100)', fontFamily: 'var(--serif)',
              flexShrink: 0,
            }}>
              {p.avatar
                ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} />
                : p.name[0].toUpperCase()
              }
            </div>
            <span style={{
              fontSize: 7, fontFamily: 'var(--serif)',
              color: isMe ? 'var(--gold-hot)' : isDead ? 'var(--blood-hi)' : 'var(--bone-500)',
              maxWidth: 40, textAlign: 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1,
            }}>
              {p.name.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Nomination card with expandable voters ────────────────────────
function NominationCard({ nom, game }) {
  const [expanded, setExpanded] = useState(false);
  const nominator = game.players.find(p => p.id === nom.nominatorId);
  const nominee   = game.players.find(p => p.id === nom.nomineeId);
  const forCount  = Array.isArray(nom.votes)   ? nom.votes.length   : 0;
  const agt       = Array.isArray(nom.against) ? nom.against.length : 0;

  const Avatar = ({ p, size = 28 }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--ink-700)', border: 'var(--hairline)',
      overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--serif)', fontSize: size * 0.45, color: 'var(--bone-100)',
    }}>
      {p?.avatar
        ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (p?.name?.[0] || '?').toUpperCase()
      }
    </div>
  );

  return (
    <div style={{
      background: nom.executed ? 'rgba(168,58,45,0.1)' : 'rgba(0,0,0,0.2)',
      border: nom.executed ? '1px solid var(--blood-dim)' : 'var(--hairline-bone)',
      borderRadius: 4, overflow: 'hidden', marginBottom: 4,
    }}>
      <button onClick={() => setExpanded(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        {/* Nominator → Nominee avatars */}
        <Avatar p={nominator} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--bone-500)' }}>→</span>
        <Avatar p={nominee} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: nom.executed ? 'var(--blood-hi)' : 'var(--bone-200)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nom.nomineeName}
          </span>
        </div>
        {/* Vote counts */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--blood-hi)', background: 'rgba(168,58,45,0.15)', borderRadius: 2, padding: '2px 6px' }}>⚔ {forCount}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--good)', background: 'rgba(109,140,184,0.15)', borderRadius: 2, padding: '2px 6px' }}>🛡 {agt}</span>
          {nom.resolved && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: nom.executed ? 'var(--blood-hi)' : 'var(--bone-500)' }}>{nom.executed ? '☠' : '✕'}</span>}
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-500)' }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 10px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'rgba(168,58,45,0.08)', borderRadius: 3, padding: '6px 8px' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 4 }}>⚔ Matar ({forCount})</p>
            {Array.isArray(nom.votes) && nom.votes.map((v, i) => {
              const vp = game.players.find(p => p.id === (v.id || v));
              const vname = v.name || vp?.name || String(v);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
                  {vp?.avatar && <img src={vp.avatar} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)' }}>{vname}</span>
                </div>
              );
            })}
          </div>
          <div style={{ background: 'rgba(109,140,184,0.08)', borderRadius: 3, padding: '6px 8px' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', color: 'var(--good)', marginBottom: 4 }}>🛡 Salvar ({agt})</p>
            {Array.isArray(nom.against) && nom.against.map((v, i) => {
              const vp = game.players.find(p => p.id === (v.id || v));
              const vname = v.name || vp?.name || String(v);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
                  {vp?.avatar && <img src={vp.avatar} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)' }}>{vname}</span>
                </div>
              );
            })}
          </div>
          {nom.pendingVoters > 0 && !nom.resolved && (
            <div style={{ gridColumn: '1 / -1', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--gold)', fontStyle: 'italic', textAlign: 'center' }}>
              ⏳ {nom.pendingVoters} sin votar
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayerPanel() {
  const { state, send, logout } = useGame();
  const { game, playerId, error } = state;
  const [uiScale, setUiScale] = useState(() => parseFloat(localStorage.getItem('boct_uiscale') || '1'));

  usePhaseSound(game?.phase);

  if (!game) return null;
  const { phase, nominations, activeNomination } = game;
  const me = game.players.find(p => p.id === playerId);

  if (!me) return <div style={{ padding: 32, fontFamily: 'var(--serif)', color: 'var(--bone-400)' }}>Conectando...</div>;
  if (me.showRole) return <RoleReveal player={me} />;
  if (phase === 'first_night' || phase === 'night') return <NightScreen player={me} />;

  const myRole = me.role ? ALL_ROLES.find(r => r.id === (me.displayRole || me.role)) : null;
  const isNight = false;
  const isVoting = phase === 'voting';
  const activeNom = nominations.find(n => n.id === activeNomination);
  const phaseLabel = { day: 'Día', nominations: 'Nominaciones', voting: 'Votación', lobby: 'En espera', role_reveal: 'Reparto' }[phase] || phase;

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
            <span>{phaseLabel} · Día {game.dayNumber}</span>
          </div>
        </div>
        <div className="topbar-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlayerChip name={me.name} avatar={me.avatar} size="sm" color={me.alive ? 'var(--gold-hot)' : 'var(--blood-hi)'} />
            {!me.alive && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--blood-hi)' }}>☠ Muerto</span>}
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'var(--hairline-bone)', borderRadius: 2, padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bone-400)', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </header>

      {/* ── Left panel ── */}
      <aside className="left-panel" style={{ zoom: uiScale }}>
        {error && (
          <div style={{ background: 'rgba(168,58,45,0.12)', border: '1px solid var(--blood-dim)', borderRadius: 3, padding: '10px 14px', fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--blood-hi)' }}>
            {error}
          </div>
        )}

        {/* Role info guide */}
        <RoleInfoPanel />

        {/* My role card */}
        {myRole && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: myRole.alignment === 'evil' ? '1px solid var(--blood-dim)' : 'var(--hairline)',
            borderRadius: 6, padding: '16px 14px',
          }}>
            <p className="panel-label" style={{ color: myRole.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--gold)' }}>Tu rol</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {myRole.img && (
                <img src={myRole.img} alt={myRole.name}
                  style={{ width: 52, height: 52, borderRadius: 4, objectFit: 'cover', border: 'var(--hairline)', flexShrink: 0 }} />
              )}
              <div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, color: 'var(--bone-50)', margin: '0 0 5px' }}>{myRole.name}</h3>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-300)', lineHeight: 1.5 }}>{myRole.ability}</p>
              </div>
            </div>
            {me.bluffRole && myRole.alignment === 'evil' && (
              <div style={{ marginTop: 10, background: 'rgba(168,58,45,0.1)', borderRadius: 3, padding: '7px 10px' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--blood-hi)', fontStyle: 'italic' }}>
                  Fingiendo ser: {ALL_ROLES.find(r => r.id === me.bluffRole)?.name}
                </p>
              </div>
            )}
            {me.nightInfo && (
              <div style={{ marginTop: 10, background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 3, padding: '9px 12px' }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 5 }}>Información</p>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-100)' }}>{me.nightInfo}</p>
              </div>
            )}
          </div>
        )}

        {/* Discord channels */}
        <DiscordChannels />

        {/* Seating order — mini circle */}
        <div>
          <p className="panel-label">
            Jugadores <span className="count">{game.players.filter(p => p.alive).length}/{game.players.length}</span>
          </p>
          <MiniCircle players={game.players} playerId={playerId} />
        </div>
      </aside>

      {/* ── Stage ── */}
      <main className="stage" style={{ position: 'relative' }}>
        <GameTable isNarrator={false} />
      </main>

      {/* ── Right panel ── */}
      <aside className="right-panel" style={{ padding: '18px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {game.autoPhaseInfo && <PhaseCountdown key={game.autoPhaseInfo.endsAt} autoPhaseInfo={game.autoPhaseInfo} pendingNight={game.pendingNightAfterNomination} />}

        {/* Active voting */}
        {isVoting && activeNom && (
          <VotingPanel nomination={activeNom} game={game} playerId={playerId} send={send} />
        )}

        {/* 80% consensus vote buttons (auto mode only) */}
        {game.autoMode && (
          <ConsensusPanel game={game} playerId={playerId} send={send} />
        )}

        {/* Nomination history */}
        {nominations.length > 0 && (
          <div>
            <p className="panel-label">Nominaciones</p>
            {nominations.map(n => (
              <NominationCard key={n.id} nom={n} game={game} />
            ))}
          </div>
        )}

        {/* Phase instructions */}
        {phase === 'day' && (
          <div style={{ background: 'rgba(201,162,74,0.05)', border: 'var(--hairline)', borderRadius: 4, padding: '14px 16px' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-300)', fontStyle: 'italic', lineHeight: 1.6 }}>
              Debate con los demás jugadores. Cuando el narrador abra las nominaciones, podrás nominar a alguien para ejecutar.
            </p>
          </div>
        )}
        {phase === 'nominations' && !activeNomination && (
          <div style={{ background: 'rgba(201,162,74,0.05)', border: 'var(--hairline)', borderRadius: 4, padding: '14px 16px' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--gold-hot)', fontStyle: 'italic' }}>
              Nominaciones abiertas — toca un jugador para nominarle.
            </p>
          </div>
        )}

        {/* Pending night notice */}
        {game.pendingNightAfterNomination && (
          <div style={{ background: 'rgba(168,58,45,0.1)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--blood-hi)', fontStyle: 'italic' }}>
              ⏳ Tiempo terminado — esperando fin de la nominación actual...
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function PhaseCountdown({ autoPhaseInfo, pendingNight }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.floor((autoPhaseInfo.endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, Math.floor((autoPhaseInfo.endsAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [autoPhaseInfo.endsAt]);
  const mins = Math.floor(remaining / 60), secs = remaining % 60;
  const urgent = remaining < 60, isNom = autoPhaseInfo.phase === 'nominations';
  return (
    <div style={{
      background: isNom ? 'rgba(168,58,45,0.18)' : 'rgba(201,162,74,0.12)',
      border: `1px solid ${urgent ? 'var(--blood-hi)' : isNom ? 'rgba(168,58,45,0.5)' : 'rgba(201,162,74,0.4)'}`,
      borderRadius: 8, padding: '10px 24px', textAlign: 'center',
      boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: isNom ? 'var(--blood-hi)' : 'var(--gold)', margin: '0 0 3px' }}>
        {isNom ? '⚖️ Nominaciones' : '🚶 Tiempo libre'}
      </p>
      {pendingNight ? (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--blood-hi)', margin: 0 }}>Esperando nominación...</p>
      ) : (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 700, color: urgent ? 'var(--blood-hi)' : 'var(--gold-hot)', margin: 0 }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
      )}
      {!isNom && <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-400)', margin: '3px 0 0', fontStyle: 'italic' }}>Muévete libremente — luego todos a la Plaza</p>}
    </div>
  );
}

function VotingPanel({ nomination, game, playerId, send }) {
  const me = game.players.find(p => p.id === playerId);
  const living = game.players.filter(p => p.alive).length;
  const required = Math.ceil(living / 2);
  const forVoters  = Array.isArray(nomination.votes)   ? nomination.votes   : [];
  const agstVoters = Array.isArray(nomination.against) ? nomination.against : [];
  const forCount   = forVoters.length;
  const againstCount = agstVoters.length;
  const alreadyVoted = !!nomination.myVote;
  const myGhostDeclined = !!nomination.myGhostDeclined;
  const deadCanStillVote = !me?.alive && (me?.deadVoteNominationId === null || me?.deadVoteNominationId === nomination.id);
  // Solo se vota cuando la votación está abierta y es mi turno (orden horario desde el nominador).
  const votingOpen = !nomination.stage || nomination.stage === 'voting';
  const order = Array.isArray(nomination.voteOrder) ? nomination.voteOrder : [];
  const myTurn = order.length === 0 || order[nomination.voteTurnIndex || 0] === playerId;
  const canVote = votingOpen && myTurn && (me?.alive || deadCanStillVote) && !alreadyVoted && !myGhostDeclined;
  const isDead = !me?.alive;
  const turnPlayer = order.length ? game.players.find(p => p.id === order[nomination.voteTurnIndex || 0]) : null;
  const pct = Math.min(100, (forCount / required) * 100);

  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [ghostDeclined, setGhostDeclined] = useState(myGhostDeclined);

  const doVoteKill = () => { send('VOTE', { nominationId: nomination.id, inFavor: true }); setConfirmKill(false); };
  const doVoteSave = () => { send('VOTE', { nominationId: nomination.id, inFavor: false }); setConfirmSave(false); };
  const doGhostDecline = () => {
    setGhostDeclined(true);
    send('GHOST_DECLINE_VOTE', { nominationId: nomination.id });
  };

  const nomineePlayer = game.players.find(p => p.id === nomination.nomineeId) || game.players.find(p => p.name === nomination.nomineeName);
  const nominatorPlayer = game.players.find(p => p.id === nomination.nominatorId);
  const pendingCount = typeof nomination.pendingVoters === 'number' ? nomination.pendingVoters : 0;

  return (
    <div style={{ background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 4, padding: '14px 16px' }}>
      <p className="panel-label" style={{ color: 'var(--gold-hot)' }}>Votación en curso</p>

      <VoteTurnBanner nomination={nomination} game={game} playerId={playerId} />

      {/* Nominee display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          border: '2px solid var(--blood-hi)', boxShadow: '0 0 12px rgba(168,58,45,0.5)',
          overflow: 'hidden', background: 'var(--ink-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-100)', flexShrink: 0,
        }}>
          {nomineePlayer?.avatar
            ? <img src={nomineePlayer.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : nomination.nomineeName[0]
          }
        </div>
        <div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--blood-hi)', fontWeight: 600, margin: 0 }}>{nomination.nomineeName}</p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-400)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            nominado por
            {nominatorPlayer?.avatar
              ? <img src={nominatorPlayer.avatar} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} />
              : null}
            {nomination.nominatorName}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 600, color: 'var(--gold-hot)' }}>{forCount}/{required}</span>
        <div className="vote-bar-track" style={{ flex: 1, margin: 0 }}>
          <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ background: 'rgba(168,58,45,0.08)', borderRadius: 3, padding: '7px 10px' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 4 }}>⚔ Matar ({forCount})</p>
          {forVoters.map((v, i) => {
            const vp = game.players.find(p => p.id === (v.id || v));
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
                {(v.avatar || vp?.avatar) && <img src={v.avatar || vp.avatar} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)' }}>{v.name || vp?.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ background: 'rgba(109,140,184,0.08)', borderRadius: 3, padding: '7px 10px' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--good)', marginBottom: 4 }}>🛡 Salvar ({againstCount})</p>
          {agstVoters.map((v, i) => {
            const vp = game.players.find(p => p.id === (v.id || v));
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
                {(v.avatar || vp?.avatar) && <img src={v.avatar || vp.avatar} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)' }}>{v.name || vp?.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {pendingCount > 0 && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--gold)', fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}>
          ⏳ {pendingCount} jugador{pendingCount !== 1 ? 'es' : ''} sin votar
        </p>
      )}

      {canVote && !ghostDeclined ? (
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmKill(true)} className="btn-action danger" style={{ flex: 1 }}>⚔️ Matar</button>
            {!isDead && (
              <button onClick={() => setConfirmSave(true)} className="btn-action" style={{ flex: 1 }}>🛡 Salvar</button>
            )}
          </div>
          {isDead && (
            <button onClick={doGhostDecline} className="btn-action" style={{ width: '100%', opacity: 0.7 }}>
              No usar voto fantasma
            </button>
          )}
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-400)', textAlign: 'center', fontStyle: 'italic' }}>
          {ghostDeclined ? 'Decidiste no usar tu voto fantasma.'
            : alreadyVoted ? `Votaste: ${nomination.myVote === 'for' ? '⚔ Matar' : '🛡 Salvar'}`
            : !votingOpen ? 'Fase de argumentos — la votación aún no está abierta.'
            : !myTurn ? `⏳ Espera tu turno — vota ${turnPlayer?.name || '...'}`
            : 'Sin voto disponible'}
        </p>
      )}
      {isDead && canVote && !ghostDeclined && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--gold)', textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
          Voto fantasma — solo Matar, una vez por partida
        </p>
      )}

      {/* Confirm Kill popup */}
      {confirmKill && (
        <div className="modal-overlay" onClick={() => setConfirmKill(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            {nomineePlayer?.avatar && (
              <img src={nomineePlayer.avatar} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--blood-hi)', boxShadow: '0 0 24px rgba(168,58,45,0.6)', marginBottom: 16 }} />
            )}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-50)', marginBottom: 6 }}>
              ¿Ejecutar a <strong style={{ color: 'var(--blood-hi)' }}>{nomination.nomineeName}</strong>?
            </p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-400)', marginBottom: 20, fontStyle: 'italic' }}>Este voto no se puede cambiar.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doVoteKill} className="btn-action danger" style={{ flex: 1 }}>Sí, matar</button>
              <button onClick={() => setConfirmKill(false)} className="btn-action" style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Save popup */}
      {confirmSave && (
        <div className="modal-overlay" onClick={() => setConfirmSave(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            {nomineePlayer?.avatar && (
              <img src={nomineePlayer.avatar} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--good)', boxShadow: '0 0 24px rgba(109,140,184,0.5)', marginBottom: 16 }} />
            )}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-50)', marginBottom: 6 }}>
              ¿Salvar a <strong style={{ color: 'var(--good)' }}>{nomination.nomineeName}</strong>?
            </p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-400)', marginBottom: 20, fontStyle: 'italic' }}>Este voto no se puede cambiar.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doVoteSave} className="btn-action" style={{ flex: 1 }}>Sí, salvar</button>
              <button onClick={() => setConfirmSave(false)} className="btn-action danger" style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Banner: fase de argumentos (acusador/acusado) o turno de voto horario.
function VoteTurnBanner({ nomination, game, playerId }) {
  const order = Array.isArray(nomination.voteOrder) ? nomination.voteOrder : [];
  const turnIdx = nomination.voteTurnIndex || 0;
  const inArguments = nomination.stage === 'arguments';

  // Quién está "activo": en argumentos = el orador; en voto = el del turno.
  const activeId = inArguments
    ? (nomination.argSpeaker === 'nominee' ? nomination.nomineeId
       : nomination.argSpeaker === 'nominator' ? nomination.nominatorId : null)
    : (order[turnIdx] || null);
  const activePlayer = activeId ? game.players.find(p => p.id === activeId) : null;
  const isMe = activeId === playerId;
  const timer = nomination.argueTimer;
  const timerActive = timer && timer.playerId === activeId;

  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!timerActive) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timerActive, timer?.endsAt, timer?.playerId]);

  if (inArguments && !activePlayer) {
    return (
      <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--gold)', fontStyle: 'italic', textAlign: 'center', marginBottom: 10 }}>
        ⏳ Fase de argumentos — el narrador dará la palabra.
      </p>
    );
  }
  if (!inArguments && order.length === 0) return null;
  if (!inArguments && !activePlayer) {
    return (
      <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--good)', fontStyle: 'italic', textAlign: 'center', marginBottom: 10 }}>
        ✓ Todos han pasado por su turno
      </p>
    );
  }

  const urgent = remaining <= 10;
  return (
    <div style={{
      background: isMe ? 'rgba(201,162,74,0.14)' : 'rgba(109,140,184,0.1)',
      border: `1px solid ${isMe ? 'var(--gold)' : 'rgba(109,140,184,0.35)'}`,
      borderRadius: 6, padding: '10px 12px', marginBottom: 12, textAlign: 'center',
    }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: isMe ? 'var(--gold-hot)' : 'var(--good)', margin: '0 0 4px' }}>
        {inArguments ? '🗣 Argumentos' : `Turno ${turnIdx + 1}/${order.length}`}
      </p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-50)', margin: 0, fontWeight: 600 }}>
        {inArguments
          ? (isMe ? '👉 Es tu turno de argumentar' : `Habla: ${activePlayer.name}`)
          : (isMe ? '👉 Es tu turno de votar' : `Vota: ${activePlayer.name}`)}
      </p>
      {timerActive && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 700, color: urgent ? 'var(--blood-hi)' : 'var(--gold-hot)', margin: '6px 0 0' }}>
          {remaining}s
        </p>
      )}
    </div>
  );
}

function ConsensusPanel({ game, playerId, send }) {
  const { phase, autoVotes } = game;
  const total = game.players.length;
  const threshold = Math.ceil(total * 0.8);
  if (!autoVotes) return null;
  const castVote = (voteType) => send('CAST_AUTO_VOTE', { voteType });
  const VoteBtn = ({ voteType, label }) => {
    const info = autoVotes[voteType];
    if (!info) return null;
    const active = info.myVote;
    return (
      <button onClick={() => castVote(voteType)} style={{
        flex: 1, padding: '10px 6px', borderRadius: 3, cursor: 'pointer',
        background: active ? 'rgba(201,162,74,0.15)' : 'rgba(0,0,0,0.25)',
        border: `1px solid ${active ? 'var(--gold)' : 'rgba(201,162,74,0.2)'}`,
        fontFamily: 'var(--serif)', fontSize: 14,
        color: active ? 'var(--gold-hot)' : 'var(--bone-300)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: info.count >= threshold ? 'var(--good)' : 'var(--bone-500)' }}>
          {info.count}/{threshold}
        </span>
      </button>
    );
  };
  if (phase === 'day') return (
    <div style={{ background: 'rgba(0,0,0,0.2)', border: 'var(--hairline)', borderRadius: 4, padding: '12px 14px' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-500)', marginBottom: 8 }}>Votación rápida (80%)</p>
      <div style={{ display: 'flex', gap: 6 }}><VoteBtn voteType="skipDay" label="⚡ Ir a Nominaciones" /></div>
    </div>
  );
  if (phase === 'nominations' || phase === 'voting') return (
    <div style={{ background: 'rgba(0,0,0,0.2)', border: 'var(--hairline)', borderRadius: 4, padding: '12px 14px' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bone-500)', marginBottom: 8 }}>Votación rápida (80%)</p>
      <div style={{ display: 'flex', gap: 6 }}>
        <VoteBtn voteType="skipNom" label="🌙 Ir a la Noche" />
        <VoteBtn voteType="extend" label="⏱ +1:30" />
      </div>
    </div>
  );
  return null;
}
