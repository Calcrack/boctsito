import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID, ALL_ROLES } from '../data/roles';
import RoleIcon from './RoleIcon';
import SheetLink from './SheetLink';
import GameTable from './GameTable';

const SORTED_ROLES_FOR_PARSE = [...ALL_ROLES].sort((a, b) => b.name.length - a.name.length);

function RichNightInfo({ text, players = [] }) {
  if (!text) return null;
  const sortedPlayers = [...players].sort((a, b) => b.name.length - a.name.length);

  const renderLine = (str) => {
    const parts = [];
    let remaining = str;
    let key = 0;
    while (remaining.length > 0) {
      let bestRole = null, bestRoleIdx = Infinity;
      for (const role of SORTED_ROLES_FOR_PARSE) {
        const idx = remaining.indexOf(role.name);
        if (idx !== -1 && idx < bestRoleIdx) { bestRoleIdx = idx; bestRole = role; }
      }
      let bestPlayer = null, bestPlayerIdx = Infinity;
      for (const p of sortedPlayers) {
        const idx = remaining.indexOf(p.name);
        if (idx !== -1 && idx < bestPlayerIdx) { bestPlayerIdx = idx; bestPlayer = p; }
      }

      let useRole = false, usePlayer = false;
      if (bestRole && bestPlayer) {
        if (bestRoleIdx < bestPlayerIdx) useRole = true;
        else usePlayer = true;
      } else if (bestRole) useRole = true;
      else if (bestPlayer) usePlayer = true;

      if (useRole) {
        if (bestRoleIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, bestRoleIdx)}</span>);
        parts.push(
          <span key={key++} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle', margin: '0 5px' }}>
            <span>{bestRole.name}</span>
            <RoleIcon role={bestRole} size={38} radius={4} alt="" />
          </span>
        );
        remaining = remaining.slice(bestRoleIdx + bestRole.name.length);
      } else if (usePlayer) {
        if (bestPlayerIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, bestPlayerIdx)}</span>);
        const p = bestPlayer;
        parts.push(
          <span key={key++} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, verticalAlign: 'middle', margin: '0 5px' }}>
            <span>{p.name}</span>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ink-700)', border: '2px solid rgba(201,162,74,0.45)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--bone-200)', overflow: 'hidden', flexShrink: 0 }}>
              {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
            </span>
          </span>
        );
        remaining = remaining.slice(bestPlayerIdx + p.name.length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }
    return parts;
  };

  const lines = text.split('\n');
  return (
    <span style={{ display: 'block' }}>
      {lines.map((line, i) => (
        <span key={i} style={{ display: 'block', paddingBottom: i < lines.length - 1 ? 10 : 0 }}>
          {renderLine(line)}
        </span>
      ))}
    </span>
  );
}

function NightSkipPanel({ game, playerId, send }) {
  if (!game?.autoMode) return null;
  if (!['first_night', 'night'].includes(game.phase)) return null;
  const { autoVotes } = game;
  if (!autoVotes?.skipNight) return null;
  const total = game.players.length;
  const threshold = Math.ceil(total * 0.8);
  const info = autoVotes.skipNight;
  const reached = info.count >= threshold;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 200 }}>
      <button
        onClick={() => send('CAST_AUTO_VOTE', { voteType: 'skipNight' })}
        style={{
          background: info.myVote ? 'rgba(201,162,74,0.2)' : 'rgba(10,11,20,0.85)',
          border: `1px solid ${reached ? 'var(--good)' : info.myVote ? 'var(--gold)' : 'rgba(201,162,74,0.3)'}`,
          borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
        }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: reached ? 'var(--good)' : 'var(--gold)', margin: '0 0 3px', textAlign: 'center' }}>
          ⚡ Saltar al día
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: info.myVote ? 'var(--gold-hot)' : 'var(--bone-300)', margin: 0, textAlign: 'center' }}>
          {info.count}/{threshold}
        </p>
      </button>
    </div>
  );
}

function SpyGrimoire({ players }) {
  return (
    <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.3)', border: 'var(--hairline)', borderRadius: 4, padding: '12px 14px' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Grimorio</p>
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {players.map(p => {
          const role = p.role ? ROLE_BY_ID[p.role] : null;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: p.alive ? 1 : 0.4 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ink-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', flexShrink: 0, overflow: 'hidden' }}>
                {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
              </div>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-200)', flex: 1 }}>{p.name}</span>
              {role && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: role.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)', padding: '2px 7px', background: role.alignment === 'evil' ? 'rgba(168,58,45,0.15)' : 'rgba(109,140,184,0.15)', borderRadius: 2 }}>
                  {role.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PASSIVE_INFO_ROLES = new Set(['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','UNDERTAKER','SPY']);

function FrozenTableroToggle({ players }) {
  const [open, setOpen] = useState(false);
  if (!players || players.length === 0) return null;
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 400,
          background: 'rgba(10,11,20,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(201,162,74,0.35)', borderRadius: 6,
          padding: '8px 14px', cursor: 'pointer',
          fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--gold)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        {open ? '✕ Cerrar' : '👁 Ver pueblo'}
      </button>
      {open && (
        <div style={{
          position: 'fixed', bottom: 64, right: 20, zIndex: 399,
          background: 'rgba(10,11,20,0.95)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(201,162,74,0.25)', borderRadius: 8,
          padding: '14px 16px', maxWidth: 280, width: '90vw',
          boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
            Pueblo · amanecer anterior
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: p.alive ? 1 : 0.45 }}>
                {p.avatar
                  ? <img src={p.avatar} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: p.alive ? '1px solid var(--gold-dim)' : '1px solid var(--blood-dim)', flexShrink: 0 }} />
                  : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink-700)', border: p.alive ? '1px solid var(--gold-dim)' : '1px solid var(--blood-dim)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-300)' }}>{p.name[0]}</div>
                }
                <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: p.alive ? 'var(--bone-200)' : 'var(--bone-500)' }}>
                  {p.alive ? '' : '☠ '}{p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const INTERACTIVE_ROLES = {
  BUTLER:       { action: 'BUTLER_MASTER',    targets: 1, label: 'Elige a tu Amo esta noche',              desc: 'Solo podrás votar si tu Amo ya ha votado.',                                    pool: 'living_others' },
  FORTUNE_TELLER:{ action: 'FORTUNE_TELLER', targets: 2, label: 'Elige 2 jugadores para consultar',       desc: 'Sabrás si alguno de ellos es el Demonio.',                                     pool: 'living', waitForInfo: true },
  RAVENKEEPER:  { action: 'RAVENKEEPER_INFO', targets: 1, label: 'Moriste — elige un jugador para ver su rol', desc: 'Conocerás su rol verdadero.',                                             pool: 'all', onlyWhenPending: true, waitForInfo: true },
  MONK:         { action: 'MONK_PROTECT',     targets: 1, label: 'Elige un jugador para proteger',         desc: 'Estará protegido del Demonio esta noche. No puedes elegirte a ti mismo.',     pool: 'living_others' },
  POISONER:     { action: 'POISONER_ACTION',  targets: 1, label: 'Elige un jugador para envenenar',        desc: 'Su habilidad dará información falsa esta noche.',                              pool: 'living_others' },
  IMP:          { action: 'IMP_KILL',         targets: 1, label: 'Elige un jugador para matar',            desc: 'Si te eliges a ti mismo, un Esbirro tomará tu lugar como Demonio.',           pool: 'all_living' },
};


function getCirclePositions(count, radius = 160) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    return { x: Math.round(radius * Math.cos(angle)), y: Math.round(radius * Math.sin(angle)) };
  });
}

const nightBg = 'radial-gradient(ellipse at center top, #0a0b14 0%, var(--ink-900) 70%)';

// Punto 5: la rueda de jugadores deja de estar abajo y pasa a estar ARRIBA,
// centrada, alrededor de la luna del anuncio. Sin botón para ocultarla y
// adaptándose al tamaño de pantalla (GameTable usa un ResizeObserver: seats
// se recolocan solos según el ancho/alto del contenedor).
function WheelNightLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: nightBg, display: 'flex', flexDirection: 'column', padding: '12px 12px 28px' }}>
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: '42vh' }}>
        <GameTable isNarrator={false} />
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div style={{ width: '100%', maxWidth: 540, textAlign: 'center' }}>{children}</div>
      </div>
    </div>
  );
}

export default function NightScreen({ player }) {
  const { send, state, logout } = useGame();
  const { game, nightPlayerSnapshot } = state;
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [actionSent, setActionSent] = useState(false);
  const [evilInfoAcknowledged, setEvilInfoAcknowledged] = useState(false);

  const displayRoleId = player.displayRole || player.role;
  const role = displayRoleId ? ROLE_BY_ID[displayRoleId] : null;
  const phase = game?.phase;
  // Lo decide el servidor (Espía todas las noches, Viuda la suya). Antes se
  // comprobaba `role === 'SPY'` aquí y además el Grimorio colgaba de
  // `player.nightInfo`, que en modo manual nunca llega al jugador.
  const seesGrimoire = !!game?.viewerSeesGrimoire;
  const isMyTurn = player.id === game?.currentNightActor;
  const iNightReady = game?.iNightReady;

  useEffect(() => { if (iNightReady && !submitted) setSubmitted(true); }, [iNightReady]);
  useEffect(() => {
    if (player.pendingRavenkeeper) { setSubmitted(false); setActionSent(false); }
  }, [player.pendingRavenkeeper]);

  const isPassiveRole = PASSIVE_INFO_ROLES.has(player.role) ||
    (player.role === 'DRUNK' && PASSIVE_INFO_ROLES.has(displayRoleId));
  const isPassiveTurn = isPassiveRole && isMyTurn && !!player.nightInfo && !submitted;

  const interactiveConfig = (() => {
    if (!game || !['first_night', 'night'].includes(phase)) return null;
    if (player.pendingRavenkeeper) return INTERACTIVE_ROLES.RAVENKEEPER;
    if (submitted) return null;
    if (isPassiveRole) return null;
    const cfg = INTERACTIVE_ROLES[displayRoleId];
    if (!cfg) return null;
    if (phase === 'first_night' && ['MONK', 'IMP'].includes(displayRoleId)) return null;
    if (!isMyTurn) return null;
    return cfg;
  })();

  const isInNightQueue = !!game?.isInNightQueue;
  const waitingForTurn = player.alive && !isMyTurn && !submitted && isInNightQueue && !player.pendingRavenkeeper;

  const allPlayers = game?.players || [];
  const living = allPlayers.filter(p => p.alive);
  const diedTonight = allPlayers.filter(p => p.diedThisNight);

  const pool = (() => {
    if (!interactiveConfig) return [];
    const base = (() => {
      if (interactiveConfig.pool === 'living_others') return living.filter(p => p.id !== player.id);
      if (interactiveConfig.pool === 'living') return living;
      if (interactiveConfig.pool === 'all_living') return living;
      return allPlayers;
    })();
    if (interactiveConfig.pool === 'all') return base;
    const baseIds = new Set(base.map(p => p.id));
    return [...base, ...diedTonight.filter(p => !baseIds.has(p.id) && p.id !== player.id)];
  })();

  const positions = getCirclePositions(pool.length);

  const toggleSelect = (id) => {
    const max = interactiveConfig?.targets || 1;
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= max) return max === 1 ? [id] : [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const handleSubmit = () => {
    if (!interactiveConfig || selected.length < interactiveConfig.targets) return;
    send('PLAYER_NIGHT_ACTION', { action: interactiveConfig.action, targetIds: selected });
    if (interactiveConfig.waitForInfo) {
      setActionSent(true);
    } else {
      send('NIGHT_READY', {});
      setSubmitted(true);
    }
  };

  const handleNightInfoAck = () => {
    send('NIGHT_READY', {});
    setSubmitted(true);
    setActionSent(false);
  };

  const handleAcknowledge = () => {
    send('PLAYER_NIGHT_ACTION', { action: 'INFO_ACKNOWLEDGE', targetIds: [] });
    send('NIGHT_READY', {});
    setSubmitted(true);
  };

  const handleNightReady = () => {
    send('NIGHT_READY', {});
  };

  // Strip the role-name header line (e.g. "🍳 Cocinero\n") when the role card
  // is already visible above the info box — only for non-evil players.
  const stripHeader = (text) => {
    if (!text || player.alignment === 'evil') return text;
    const nl = text.indexOf('\n');
    if (nl === -1) return text;
    return text.slice(nl + 1);
  };

  const infoBox = (children) => (
    <div style={{ background: 'rgba(201,162,74,0.06)', border: 'var(--hairline)', borderRadius: 6, padding: '20px 24px', textAlign: 'left', marginBottom: 20 }}>
      {children}
    </div>
  );

  const infoLabel = (
    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
      Información de esta noche
    </p>
  );

  const ReadyBtn = ({ style = {} }) => (
    iNightReady ? (
      <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--good)', fontStyle: 'italic', ...style }}>
        ✓ Listo — esperando al resto...
      </div>
    ) : (
      <button onClick={handleNightReady} className="btn-action primary"
        style={{ width: '100%', padding: '26px 0', fontSize: 26, fontStyle: 'normal', letterSpacing: '0.06em', ...style }}>
        ✓ Hecho
      </button>
    )
  );

  const ExitBtn = () => (
    <button
      onClick={logout}
      style={{
        position: 'fixed', top: 16, left: 16, zIndex: 300,
        background: 'rgba(10,11,20,0.7)', backdropFilter: 'blur(6px)',
        border: 'var(--hairline-bone)', borderRadius: 4,
        padding: '6px 12px', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--bone-400)',
      }}
    >
      ← Salir
    </button>
  );

  // De noche no hay barra superior: la hoja de campaña va flotando arriba a
  // la derecha, para poder consultar los personajes del guion mientras esperas.
  const SheetBtn = () => (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 300,
      background: 'rgba(10,11,20,0.7)', backdropFilter: 'blur(6px)', borderRadius: 4,
    }}>
      <SheetLink game={game} compact />
    </div>
  );

  // ── Modo manual (con narrador): el jugador NO elige nada ─────────────
  const narratorDriven = ['first_night', 'night'].includes(phase) && !game?.autoMode;
  if (narratorDriven) {
    return (
      <WheelNightLayout>
        <ExitBtn /><SheetBtn />
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
          {!player.alive ? (
            <div style={{ fontSize: 64, color: 'var(--bone-400)', marginBottom: 16 }}>☠</div>
          ) : (
            <div style={{ fontSize: 70, color: 'var(--moon)', marginBottom: 16, opacity: 0.85 }}>☾</div>
          )}
          <h2 style={{ fontFamily: 'var(--title)', fontSize: 24, fontWeight: 400, color: 'var(--bone-300)', marginBottom: 10, letterSpacing: '0.04em' }}>
            {player.alive ? 'Es de noche' : 'Has muerto'}
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--bone-400)', fontStyle: 'italic', marginBottom: 24 }}>
            El narrador dirige la noche. Observa y espera.
          </p>
          {role && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20, background: 'rgba(201,162,74,0.05)', border: 'var(--hairline)', borderRadius: 6, padding: '16px 20px' }}>
              <RoleIcon role={role} size={56} radius={6} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-200)' }}>{role.name}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-500)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.5 }}>{role.ability}</div>
              </div>
            </div>
          )}
          {player.nightInfo && infoBox(<>
            {infoLabel}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-100)', lineHeight: 2.4 }}>
              <RichNightInfo text={stripHeader(player.nightInfo)} players={allPlayers} />
            </p>
          </>)}
          {seesGrimoire && game?.players && <SpyGrimoire players={game.players} />}
        </div>
      </WheelNightLayout>
    );
  }

  // ── Dead player ─────────────────────────────────────────────────────
  if (!player.alive && !player.pendingRavenkeeper) {
    return (
      <div style={{ minHeight: '100vh', background: nightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ExitBtn /><SheetBtn />
        <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <div style={{ fontSize: 80, color: 'var(--bone-400)', marginBottom: 24 }}>☠</div>
          <h2 style={{ fontFamily: 'var(--title)', fontSize: 28, fontWeight: 400, color: 'var(--bone-300)', marginBottom: 12, letterSpacing: '0.04em' }}>
            Has muerto
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--bone-400)', fontStyle: 'italic' }}>
            Observa en silencio.
          </p>
          {role && (
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <RoleIcon role={role} size={48} radius={6} />
              <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-400)' }}>{role.name}</span>
            </div>
          )}
          <div style={{ marginTop: 32 }}>
            <ReadyBtn />
          </div>
        </div>
        <NightSkipPanel game={game} playerId={player.id} send={send} />
        <FrozenTableroToggle players={nightPlayerSnapshot} />
      </div>
    );
  }

  // ── Evil team info ───────────────────────────────────────────────────
  const isEvilWithPendingInfo = player.alignment === 'evil' &&
    !isPassiveRole && !!player.nightInfo && !evilInfoAcknowledged && !iNightReady &&
    ['first_night', 'night'].includes(phase);

  if (isEvilWithPendingInfo) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at center top, #160608 0%, var(--ink-900) 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ExitBtn /><SheetBtn />
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>◆</div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 24 }}>
            {displayRoleId === 'IMP' ? 'Información del Demonio' : 'Información del Esbirro'}
          </p>
          {infoBox(<>
            {infoLabel}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-100)', lineHeight: 2.4 }}>
              <RichNightInfo text={player.nightInfo} players={allPlayers} />
            </p>
          </>)}
          <button onClick={() => setEvilInfoAcknowledged(true)} className="btn-action danger" style={{ width: '100%', padding: '22px 0', fontSize: 22 }}>
            Entendido
          </button>
        </div>
        <NightSkipPanel game={game} playerId={player.id} send={send} />
      </div>
    );
  }

  // ── Passive info screen ──────────────────────────────────────────────
  if (isPassiveTurn) {
    return (
      <div style={{ minHeight: '100vh', background: nightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ExitBtn /><SheetBtn />
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
          {role && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
              <RoleIcon role={role} size={60} radius={6} />
              <span style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--bone-100)' }}>{role.name}</span>
            </div>
          )}
          {infoBox(<>
            {infoLabel}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-100)', lineHeight: 2.4 }}><RichNightInfo text={stripHeader(player.nightInfo)} players={allPlayers} /></p>
          </>)}
          {seesGrimoire && game?.players && <SpyGrimoire players={game.players} />}
          <button onClick={handleAcknowledge} className="btn-action primary" style={{ width: '100%', padding: '22px 0', fontSize: 22 }}>
            ✓ Hecho
          </button>
        </div>
        <NightSkipPanel game={game} playerId={player.id} send={send} />
      </div>
    );
  }

  // ── Waiting for night info response ─────────────────────────────────
  if (actionSent) {
    return (
      <div style={{ minHeight: '100vh', background: nightBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ExitBtn /><SheetBtn />
        {role && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
            <RoleIcon role={role} size={60} radius={6} />
            <span style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--bone-100)' }}>{role.name}</span>
          </div>
        )}
        <div style={{ width: '100%', maxWidth: 480 }}>
          {player.nightInfo ? (
            <>
              {infoBox(<>
                {infoLabel}
                <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-100)', lineHeight: 2.4 }}>
                  <RichNightInfo text={stripHeader(player.nightInfo)} players={allPlayers} />
                </p>
              </>)}
              <button onClick={handleNightInfoAck} className="btn-action primary" style={{ width: '100%', padding: '22px 0', fontSize: 22 }}>
                ✓ Hecho
              </button>
            </>
          ) : (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-400)', fontStyle: 'italic', textAlign: 'center' }}>
              Procesando respuesta...
            </p>
          )}
        </div>
        <NightSkipPanel game={game} playerId={player.id} send={send} />
      </div>
    );
  }

  // ── Waiting (no action) ──────────────────────────────────────────────
  if (!interactiveConfig) {
    return (
      <WheelNightLayout>
        <ExitBtn /><SheetBtn />
        <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
          <div style={{ fontSize: 34, color: 'var(--moon)', marginBottom: 8, opacity: 0.8 }}>☾</div>
          <h2 style={{ fontFamily: 'var(--title)', fontSize: 26, fontWeight: 400, color: 'var(--bone-300)', marginBottom: 12, letterSpacing: '0.04em' }}>
            {waitingForTurn ? 'Espera tu turno' : 'Es de noche'}
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--bone-400)', fontStyle: 'italic', marginBottom: 28 }}>
            {waitingForTurn ? 'Pronto el narrador te llamará.' : 'Consulta tu rol y pulsa Hecho cuando estés listo.'}
          </p>
          {role && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--bone-400)', marginBottom: 24, background: 'rgba(201,162,74,0.05)', border: 'var(--hairline)', borderRadius: 6, padding: '16px 20px' }}>
              <RoleIcon role={role} size={56} radius={6} style={{ opacity: 0.85 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-200)' }}>{role.name}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-500)', fontStyle: 'italic', marginTop: 5, lineHeight: 1.5 }}>{role.ability}</div>
              </div>
            </div>
          )}
          {player.nightInfo && submitted && infoBox(<>
            {infoLabel}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-100)', lineHeight: 2.4 }}><RichNightInfo text={stripHeader(player.nightInfo)} players={allPlayers} /></p>
          </>)}
          {seesGrimoire && game?.players && <SpyGrimoire players={game.players} />}
        </div>
        {!waitingForTurn && (
          <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
            <ReadyBtn />
          </div>
        )}
        {waitingForTurn && (
          <div style={{ textAlign: 'center', maxWidth: 460, width: '100%', margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-500)', fontStyle: 'italic' }}>
              ⏳ Espera — tu turno se aproxima.
            </p>
          </div>
        )}
        <NightSkipPanel game={game} playerId={player.id} send={send} />
      </WheelNightLayout>
    );
  }

  // ── Interactive action ───────────────────────────────────────────────
  const isReady = selected.length >= interactiveConfig.targets;

  return (
    <div style={{ minHeight: '100vh', background: nightBg, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
      <ExitBtn /><SheetBtn />
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {role && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
            <RoleIcon role={role} size={58} radius={6} />
            <span style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--bone-100)' }}>{role.name}</span>
          </div>
        )}
        <p style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--gold-hot)', fontStyle: 'italic', marginBottom: 8 }}>
          {interactiveConfig.label}
        </p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-400)' }}>{interactiveConfig.desc}</p>

        {selected.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {selected.map(id => {
              const p = allPlayers.find(x => x.id === id);
              return p ? (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(109,140,184,0.15)', border: '1px solid rgba(109,140,184,0.3)', borderRadius: 4, padding: '4px 10px' }}>
                  {p.avatar && <img src={p.avatar} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />}
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--good)' }}>✓ {p.name}</span>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {pool.length > 0 ? (
        <div style={{ position: 'relative', width: 420, height: 420, margin: '0 auto', flex: 1 }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-500)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              {interactiveConfig.targets === 1 ? 'Elige 1' : `${selected.length}/${interactiveConfig.targets}`}
            </p>
          </div>
          {pool.map((p, i) => {
            const pos = positions[i];
            const isSel = selected.includes(p.id);
            const isDead = !p.alive;
            const diedNight = p.diedThisNight;
            return (
              <div key={p.id} style={{ position: 'absolute', left: `calc(50% + ${pos.x}px - 30px)`, top: `calc(50% + ${pos.y}px - 30px)` }}>
                <button
                  onClick={() => toggleSelect(p.id)}
                  style={{
                    width: 60, height: 60, borderRadius: '50%',
                    border: isSel ? '3px solid var(--gold)' : diedNight ? '2px solid var(--blood-dim)' : '2px solid rgba(201,162,74,0.25)',
                    boxShadow: isSel ? '0 0 0 3px var(--gold), var(--shadow-medallion)' : 'var(--shadow-medallion)',
                    overflow: 'hidden', background: isDead ? 'var(--ink-800)' : 'var(--ink-700)',
                    transform: isSel ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-100)',
                    opacity: isDead ? (diedNight ? 0.65 : 0.4) : 1,
                  }}
                >
                  {p.avatar
                    ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : p.name[0]
                  }
                </button>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: isSel ? 'var(--gold-hot)' : diedNight ? 'var(--blood-hi)' : 'var(--bone-400)', textAlign: 'center', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {diedNight ? `☠ ${p.name}` : p.name}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-400)', textAlign: 'center' }}>No hay jugadores disponibles</p>
      )}

      <div style={{ paddingBottom: 16 }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--good)', marginBottom: 12 }}>
              ✓ Enviado — esperando al resto...
            </p>
            {player.nightInfo && infoBox(<>
              {infoLabel}
              <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--bone-100)', lineHeight: 2.4 }}><RichNightInfo text={stripHeader(player.nightInfo)} players={allPlayers} /></p>
            </>)}
          </div>
        ) : (
          <button onClick={handleSubmit} disabled={!isReady} className="btn-action primary"
            style={{ width: '100%', padding: '22px 0', fontSize: 22, opacity: isReady ? 1 : 0.35 }}>
            Confirmar elección
          </button>
        )}
      </div>
      <NightSkipPanel game={game} playerId={player.id} send={send} />
      <FrozenTableroToggle players={nightPlayerSnapshot} />
    </div>
  );
}
