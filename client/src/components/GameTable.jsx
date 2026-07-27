import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';
import { formatIdentity, MASK } from '../utils/identity';
import ActionModal from './ActionModal';

function getCirclePositions(count, radius) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

const CORNER_CHANNELS = {
  TABERNA:    { top: '8px',    left: '8px',    label: 'Taberna' },
  MERCADO:    { top: '8px',    right: '8px',   label: 'Mercado' },
  BOSQUE:     { bottom: '8px', left: '8px',    label: 'Bosque' },
  CEMENTERIO: { bottom: '8px', right: '8px',   label: 'Cementerio' },
};

function CornerGroup({ channel, players, cornerCfg, isNarrator, playerId, onClick }) {
  return (
    <div style={{
      position: 'absolute',
      ...Object.fromEntries(Object.entries(cornerCfg).filter(([k]) => k !== 'label')),
      display: 'flex', flexDirection: 'column', alignItems: 'right' in cornerCfg ? 'flex-end' : 'flex-start',
      gap: 4, zIndex: 10,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.7 }}>
        {cornerCfg.label}
      </span>
      {players.map(player => {
        const isMe = player.id === playerId;
        const isDead = !player.alive;
        return (
          <div key={player.id}
            onClick={() => isNarrator && onClick(player)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: isNarrator ? 'pointer' : 'default', opacity: isDead ? 0.5 : 1,
            }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
              border: isMe ? '2px solid var(--good)' : isDead ? '1px solid var(--blood-dim)' : '1px solid var(--gold)',
              background: 'var(--ink-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: 'var(--bone-100)', fontFamily: 'var(--serif)',
            }}>
              {player.avatar
                ? <img src={player.avatar} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : player.name[0].toUpperCase()}
            </div>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 9, color: 'var(--bone-300)', maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Subtle twinkling stars background
function Celestials({ isNight }) {
  const starsRef = useRef(
    Array.from({ length: 30 }, () => ({
      w: Math.random() * 2 + 1,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 3).toFixed(1)}s`,
      dur: `${(2 + Math.random() * 2).toFixed(1)}s`,
    }))
  );

  return (
    <>
      <div className="stars">
        {starsRef.current.map((s, i) => (
          <div key={i} className="star" style={{ width: s.w, height: s.w, top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.dur }} />
        ))}
      </div>
      <div className="celestial sun" style={{ opacity: isNight ? 0 : 0.7 }} />
      <div className="celestial moon" style={{ opacity: isNight ? 0.7 : 0 }}>
        <div className="crater c1" /><div className="crater c2" /><div className="crater c3" />
      </div>
    </>
  );
}

function Seat({ player, isMe, isNarrator, canAct, nominated, activeActor, voteTurn, seatSize, posX, posY, onClick }) {
  const role = player.role ? ROLE_BY_ID[player.role] : null;
  const isDead = !player.alive;
  const sz = seatSize;
  // Contadores discretos (la capa limpia no vuelca contenido sobre el círculo).
  const tokenCount = isNarrator
    ? ((player.tokens || []).length + (player.isMaster ? 1 : 0) + (player.isSmokeScreen ? 1 : 0))
    : 0;
  const suspicionCount = (player.accusations || []).length;

  const classes = [
    'seat',
    isMe ? 'my-player' : '',
    nominated ? 'nominated' : '',
    isDead ? 'dead' : '',
  ].filter(Boolean).join(' ');

  const ring = activeActor
    ? '0 0 0 3px var(--gold-hot), 0 0 22px rgba(201,162,74,0.7)'
    : voteTurn
      ? '0 0 0 3px var(--good), 0 0 22px rgba(109,140,184,0.7)'
      : undefined;

  const isClickable = isNarrator
    || (canAct && !isMe && player.alive)
    || (isMe && player.alignment === 'evil')
    || (isDead && !player.deadVoteNominationId);

  return (
    <div
      className={classes}
      data-gamepad={isClickable ? '' : undefined}
      style={{ '--sz': `${sz}px`, left: `calc(50% + ${posX}px)`, top: `calc(50% + ${posY}px)`, ...(ring ? { borderRadius: '50%', boxShadow: ring } : {}) }}
      onClick={() => isClickable && onClick(player)}
    >
      {player.handRaised && <div className="hand-raised">✋</div>}

      <div className="medallion">
        <div className="medallion-inner">
          <div
            className="medallion-avatar"
            style={{
              background: isDead ? 'var(--ink-800)'
                : (player.alignment === 'evil' && isNarrator) ? 'rgba(168,58,45,0.25)'
                : isMe ? 'rgba(109,140,184,0.2)'
                : 'var(--ink-700)',
            }}
          >
            {player.avatar
              ? <img src={player.avatar} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : player.name[0].toUpperCase()
            }
          </div>
        </div>

        {isDead && (
          <img src="/assets/ficha-muerto.png" alt="" className="death-shroud"
            onError={e => { e.target.style.display = 'none'; }} />
        )}

        {/* Sospechas: contador pequeño */}
        {suspicionCount > 0 && (
          <div className="seat-counters">
            <span className="seat-counter suspicions" title={`${suspicionCount} sospecha(s) — clic para ver`}>👁 {suspicionCount}</span>
          </div>
        )}

        {isDead && !player.deadVoteNominationId && (
          <div className="dead-vote-token">
            <img src="/assets/token-ultimo-voto.png" alt="Voto disponible"
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
        )}
      </div>

      {/* Fichas de efecto: íconos superpuestos sobre la foto (solo narrador) */}
      {isNarrator && (player.tokens || []).length > 0 && (
        <div className="seat-token-row">
          {(player.tokens || []).slice(0, 3).map((t, i) => {
            const tImg = t.img || ROLE_BY_ID[t.roleId]?.img;
            const typeClass = `type-${(t.type || '').toLowerCase()}`;
            return tImg
              ? <img key={i} src={tImg} className={`seat-token-icon ${typeClass}`}
                     title={t.label} onError={e => { e.target.style.display = 'none'; }} />
              : <span key={i} className={`seat-token-dot ${typeClass}`} title={t.label}>●</span>;
          })}
          {(player.tokens || []).length > 3 && (
            <span className="seat-token-overflow">+{(player.tokens || []).length - 3}</span>
          )}
        </div>
      )}

      {/* Conexión — solo el narrador la ve */}
      {isNarrator && player.presence && player.presence !== 'online' && (
        <span
          title={player.presence === 'away' ? 'Ausente (no responde)' : 'Desconectado'}
          style={{
            position: 'absolute', top: 2, left: 2, fontSize: 11, lineHeight: 1,
            color: player.presence === 'away' ? 'var(--gold)' : 'var(--bone-500)',
            textShadow: '0 0 4px #000', pointerEvents: 'none',
          }}>
          {player.presence === 'away' ? '⏱' : '○'}
        </span>
      )}

      {/* Role token mini-badge */}
      {role && (isNarrator || isMe) && (
        <div className={`role-token-mini ${role.alignment}`}>
          <img src={role.img} alt={role.name} onError={e => { e.target.style.display = 'none'; }} />
        </div>
      )}

      <div className="seat-nameplate">
        <div className="seat-name">{player.name}</div>
        {(isNarrator || isMe) && role && (
          <div className="seat-role-label"
            style={{ color: role.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)' }}>
            {role.name}
          </div>
        )}
        {isNarrator && (() => {
          const id = formatIdentity(player);
          if (!id.hasFalse) return null;
          return (
            <div className="identity-false" title={id.tooltip}>
              <span className="mask">{MASK}</span> se cree {id.believedName}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function GameTable({ isNarrator = false, activeActorId = null }) {
  const { state } = useGame();
  const { game, playerId } = state;
  const [actionTarget, setActionTarget] = useState(null);
  const containerRef = useRef(null);
  const [containerDims, setContainerDims] = useState({ w: 480, h: 480 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!game) return null;
  const { players, phase, nominations } = game;
  const canAct = isNarrator || ['day', 'nominations', 'voting'].includes(phase);
  const isNight = ['first_night', 'night'].includes(phase);

  const containerSize = Math.min(containerDims.w, containerDims.h, 700);
  const cx = containerDims.w / 2;
  const cy = containerDims.h / 2;
  const circlePlayers = players.filter(p => !CORNER_CHANNELS[p.discordChannel]);
  const n = circlePlayers.length || 1;
  const radius = containerSize * 0.37;
  const seatSize = Math.max(48, Math.min(80, (containerSize * 0.18)));
  const positions = getCirclePositions(n, radius);

  const phaseLabel = {
    lobby: 'En espera', role_reveal: 'Reparto', first_night: 'Primera Noche',
    day: 'Día', nominations: 'Nominaciones', voting: 'Votación',
    night: 'Noche', game_over: 'Fin de partida',
  }[phase] || phase;

  const nomineeIds = new Set(nominations.filter(n => !n.resolved).map(n => n.nomineeId));

  // Jugador cuyo turno de voto es ahora (votación activa en sentido horario)
  const activeNom = nominations.find(n => n.id === game.activeNomination && !n.resolved);
  const voteTurnId = activeNom && Array.isArray(activeNom.voteOrder)
    ? activeNom.voteOrder[activeNom.voteTurnIndex] || null
    : null;

  const cornerGroups = {};
  players.forEach(p => {
    if (CORNER_CHANNELS[p.discordChannel]) {
      const ch = p.discordChannel;
      if (!cornerGroups[ch]) cornerGroups[ch] = [];
      cornerGroups[ch].push(p);
    }
  });

  return (
    <div ref={containerRef} className="table-container">
      <Celestials isNight={isNight} />

      {/* Table disc in center */}
      <div className="table-disc" style={{ '--table-radius': `${containerSize / 2}px` }}>
        {phase === 'voting' && game.activeNomination ? (() => {
          const nom = nominations.find(n => n.id === game.activeNomination);
          const nominee = nom
            ? (players.find(p => p.id === nom.nomineeId)
               || (nom.nomineeId === 'NARRATOR' ? { name: nom.nomineeName || '🎙 Narrador', avatar: null } : null))
            : null;
          if (!nominee) return null;
          return (
            <div className="table-center" style={{ flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', opacity: 0.8 }}>⚖️ Votación</div>
              <div style={{
                width: Math.max(56, containerSize * 0.1),
                height: Math.max(56, containerSize * 0.1),
                borderRadius: '50%',
                border: '3px solid var(--blood-hi)',
                boxShadow: '0 0 18px rgba(168,58,45,0.6)',
                overflow: 'hidden',
                background: 'var(--ink-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-100)',
              }}>
                {nominee.avatar
                  ? <img src={nominee.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : nominee.name[0]
                }
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', fontWeight: 600 }}>{nominee.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-400)' }}>
                {nom.votes?.length || 0}/{Math.ceil(players.filter(p => p.alive).length / 2)}
              </div>
            </div>
          );
        })() : (
          <div className="table-center">
            <div className="table-center-phase">{isNight ? 'Noche' : 'Día'}</div>
            <div className="table-center-day" style={{ color: isNight ? 'var(--moon)' : 'var(--gold-hot)' }}>
              {phaseLabel}
            </div>
            <div className="table-center-sub">
              {players.filter(p => p.alive).length}/{players.length} vivos
            </div>
          </div>
        )}
      </div>

      {/* Nomination lines */}
      <svg className="nomination-svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
        {nominations.filter(nom => !nom.resolved).map(nom => {
          const fi = circlePlayers.findIndex(p => p.id === nom.nominatorId);
          const ti = circlePlayers.findIndex(p => p.id === nom.nomineeId);
          if (fi === -1 || ti === -1) return null;
          const fp = positions[fi];
          const tp = positions[ti];
          return (
            <line key={nom.id}
              x1={cx + fp.x} y1={cy + fp.y}
              x2={cx + tp.x} y2={cy + tp.y}
              stroke="var(--blood-hi)" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="5 3"
            />
          );
        })}
      </svg>

      {/* Circle seats */}
      {circlePlayers.map((player, i) => (
        <Seat
          key={player.id}
          player={player}
          isMe={player.id === playerId}
          isNarrator={isNarrator}
          canAct={canAct}
          nominated={nomineeIds.has(player.id)}
          activeActor={isNarrator && player.id === activeActorId}
          voteTurn={player.id === voteTurnId}
          seatSize={seatSize}
          posX={positions[i].x}
          posY={positions[i].y}
          onClick={setActionTarget}
        />
      ))}

      {/* Corner location groups */}
      {Object.entries(cornerGroups).map(([channel, grpPlayers]) => (
        <CornerGroup
          key={channel}
          channel={channel}
          players={grpPlayers}
          cornerCfg={CORNER_CHANNELS[channel]}
          isNarrator={isNarrator}
          playerId={playerId}
          onClick={setActionTarget}
        />
      ))}

      {actionTarget && (
        <ActionModal target={actionTarget} onClose={() => setActionTarget(null)} isNarrator={isNarrator} />
      )}
    </div>
  );
}
