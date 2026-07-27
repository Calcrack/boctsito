import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ALL_ROLES, ROLE_BY_ID } from '../data/roles';
import PlayerChip from './PlayerChip';
import StatusChips from './StatusChips';
import NarratorTabs from './NarratorTools';

// Explicación de cada efecto/ficha y su caducidad, para el panel de detalle.
const TOKEN_EXPLAIN = {
  POISONED:   'Su habilidad e información son FALSAS. Se limpia al próximo anochecer.',
  PROTECTED:  'Protegido del Demonio esta noche. Se limpia al amanecer.',
  DRUNK_NIGHT:'Borracho esta noche: su habilidad no funciona. Se limpia al anochecer.',
  DIES:       'Marcado para morir esta noche.',
  MASTER:     'Es el Amo del Mayordomo (solo vota si el Amo vota).',
  SAFE_TONIGHT:'No puede morir esta noche.',
  EXECUTED_TODAY:'Ejecutado hoy: el Enterrador aprende su personaje esta noche.',
};
function expiryLabel(t) {
  const e = t.expiry || [];
  if (t.manual) return 'manual (no caduca sola)';
  if (e.includes('PERMANENT')) return 'permanente';
  if (e.includes('UNTIL_NEXT_DUSK')) return 'hasta el próximo anochecer';
  if (e.includes('AT_DAWN')) return 'se limpia al amanecer';
  if (e.includes('ONE_DAY')) return 'dura el día de hoy';
  return t.temp ? 'temporal' : 'permanente';
}

export default function ActionModal({ target, onClose, isNarrator }) {
  const { state, send } = useGame();
  const { game, playerId } = state;
  const [accusedRole, setAccusedRole] = useState('');
  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmNarratorKill, setConfirmNarratorKill] = useState(false);
  const [fakeShooterId, setFakeShooterId] = useState('');

  if (!game) return null;
  const { phase, nominations, activeNomination } = game;
  const me = game.players.find(p => p.id === playerId);

  const activeNom = nominations.find(n => n.id === activeNomination);
  const isNomineeInActiveVote = activeNom?.nomineeId === target.id;
  const deadCanStillVote = !me?.alive &&
    (me?.deadVoteNominationId === null || me?.deadVoteNominationId === activeNomination);
  // Votación abierta + es mi turno (orden horario desde el nominador).
  const votingOpen = activeNom && (!activeNom.stage || activeNom.stage === 'voting');
  const myTurn = Array.isArray(activeNom?.voteOrder)
    ? activeNom.voteOrder[activeNom.voteTurnIndex || 0] === playerId
    : true;
  const canVote = phase === 'voting' && votingOpen && isNomineeInActiveVote && myTurn && (me?.alive || deadCanStillVote);

  const myVoteOnThis = activeNom?.myVote === 'for' ? 'favor' : activeNom?.myVote === 'against' ? 'contra' : null;

  // Las nominaciones las gestiona SOLO el narrador (NOMINATE_AS).
  const canNominate = false;
  const hasAlreadyNominated = nominations.some(n => n.nominatorId === playerId);

  const role   = target.role ? ROLE_BY_ID[target.role] : null;
  const myRole = me?.role ? ROLE_BY_ID[me.role] : null;
  // El disparo del Cazador lo ejecuta SOLO el narrador (cuando el jugador se lo pide).
  const slayerInGame = isNarrator
    ? game.players.find(p => (p.role === 'SLAYER' || p.drunkAs === 'SLAYER') && p.alive && !p.slayerUsed)
    : null;
  const canNarratorSlayer = !!slayerInGame && target.alive && target.id !== slayerInGame.id && ['day', 'nominations'].includes(phase);
  const isSelfEvil = target.id === playerId && me?.alignment === 'evil';
  // El disparo fingido (malvado que finge ser Cazador) también lo ejecuta SOLO el narrador.
  const fakeShooters = isNarrator
    ? game.players.filter(p => p.alignment === 'evil' && p.alive && !p.impShotUsed && p.id !== target.id)
    : [];
  const canNarratorFakeShot = fakeShooters.length > 0 && target.alive && ['day', 'nominations'].includes(phase);

  const handleNominate = () => { send('NOMINATE', { nomineeId: target.id }); onClose(); };
  const handleVoteKill = () => {
    send('VOTE', { nominationId: activeNomination, inFavor: true });
    setConfirmKill(false);
    onClose();
  };
  const handleVoteSaveConfirm = () => { send('VOTE', { nominationId: activeNomination, inFavor: false }); setConfirmSave(false); onClose(); };
  const handleGhostDecline  = () => { send('GHOST_DECLINE_VOTE', { nominationId: activeNomination }); onClose(); };
  const handleSuspect   = () => { if (accusedRole) { send('ACCUSE', { targetId: target.id, accusedRole }); onClose(); } };
  const handleNarratorSlayer = () => { send('SLAYER_ACTION', { slayerId: slayerInGame.id, targetId: target.id }); onClose(); };
  const handleBluff     = (roleId) => send('SET_BLUFF_ROLE', { roleId });
  const handleFakeShot  = () => {
    if (!fakeShooterId) return;
    send('IMP_DAY_SHOT', { shooterId: fakeShooterId, targetId: target.id });
    onClose();
  };

  const handleNarratorKill   = () => { send('KILL_PLAYER', { playerId: target.id }); onClose(); };
  const killWarnings = (() => {
    const w = [];
    if (target.protected) w.push('🛡 Protegido esta noche (Monje / Posadero / Marinero)');
    if (target.role === 'SOLDIER' && !target.poisoned) w.push('⚔ Soldado: inmune a ataques del Demonio');
    if (target.role === 'FOOL' && target.foolUsed === false && !target.poisoned) w.push('🃏 Tonto: primera muerte anulada (se consumirá)');
    return w;
  })();
  const handleNarratorRevive = () => { send('REVIVE_PLAYER', { playerId: target.id }); onClose(); };
  const handleRevealRole     = () => { send('REVEAL_ROLE', { playerId: target.id }); onClose(); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <PlayerChip name={target.name} avatar={target.avatar} size="lg" color={target.alive ? 'var(--bone-50)' : 'var(--blood-hi)'} />
          <div style={{ marginLeft: 4 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: target.alive ? 'var(--good)' : 'var(--blood-hi)', margin: 0 }}>
              {target.alive ? '● Vivo' : '☠ Muerto'}
              {isNarrator && role && ` · ${role.name}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Narrator section — Info · Acciones · Rol · Habilidad */}
          {isNarrator && (
            <div style={{ borderBottom: 'var(--hairline-bone)', paddingBottom: 12 }}>
              <NarratorTabs target={target} game={game} send={send} onClose={onClose} />
            </div>
          )}

          {/* Bluff role selector */}
          {isSelfEvil && (
            <div style={{ borderBottom: 'var(--hairline-bone)', paddingBottom: 12 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--blood-hi)', marginBottom: 8 }}>Rol que finges ser</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                <button onClick={() => handleBluff(null)} className="btn-night" style={{ fontSize: 9 }}>Ninguno</button>
                {ALL_ROLES.filter(r => r.alignment === 'good').map(r => (
                  <button key={r.id} onClick={() => handleBluff(r.id)}
                    className="btn-night"
                    style={{ fontSize: 9, borderColor: me.bluffRole === r.id ? 'var(--blood-hi)' : undefined, color: me.bluffRole === r.id ? 'var(--blood-hi)' : undefined }}>
                    {r.name}
                  </button>
                ))}
              </div>
              {me.bluffRole && (
                <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--blood-hi)', fontStyle: 'italic', marginTop: 6 }}>
                  Fingiendo ser: {ALL_ROLES.find(r => r.id === me.bluffRole)?.name}
                </p>
              )}
            </div>
          )}

          {/* Suspicion */}
          {!isNarrator && !isSelfEvil && (
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-400)', marginBottom: 6 }}>Marcar sospecha (solo tú la verás)</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={accusedRole} onChange={e => setAccusedRole(e.target.value)}
                  style={{ flex: 1, background: 'var(--ink-700)', border: 'var(--hairline)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}>
                  <option value="">— Creo que es... —</option>
                  {ALL_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={handleSuspect} disabled={!accusedRole} className="btn-action" style={{ opacity: accusedRole ? 1 : 0.4 }}>
                  Sospecha
                </button>
              </div>
              {(() => {
                const mine = (target.accusations || [])[0]; // el servidor solo me envía la mía
                return mine ? (
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', marginTop: 6 }}>
                    Tu sospecha: su personaje es {ROLE_BY_ID[mine.roleId]?.name}
                  </p>
                ) : null;
              })()}
            </div>
          )}

          {/* Nominate */}
          {!isNarrator && !isSelfEvil && canNominate && !hasAlreadyNominated && (
            <button onClick={handleNominate} className="btn-action danger" style={{ width: '100%', padding: '12px 0' }}>
              Nominar para ejecución
            </button>
          )}
          {!isNarrator && !isSelfEvil && canNominate && hasAlreadyNominated && (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-400)', textAlign: 'center', fontStyle: 'italic' }}>Ya nominaste a alguien hoy</p>
          )}

          {/* Vote */}
          {!isNarrator && canVote && (
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--gold-hot)', textAlign: 'center', marginBottom: 8 }}>
                ¿Ejecutar a {activeNom?.nomineeName}?
              </p>
              {myVoteOnThis && (
                <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-400)', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
                  Ya votaste: {myVoteOnThis === 'favor' ? 'Matar' : 'Salvar'}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmKill(true)} className="btn-action danger" style={{ flex: 1 }}>Matar</button>
                {me?.alive
                  ? <button onClick={() => setConfirmSave(true)} className="btn-action" style={{ flex: 1 }}>Salvar</button>
                  : <button onClick={handleGhostDecline} className="btn-action" style={{ flex: 1 }}>Abstenerme</button>
                }
              </div>
              {!me?.alive && <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>Voto de muerto — solo una nominación en toda la partida</p>}
            </div>
          )}

          {/* Disparo del Cazador — solo el narrador, cuando el jugador se lo pide */}
          {isNarrator && canNarratorSlayer && (
            <div style={{ borderBottom: 'var(--hairline-bone)', paddingBottom: 12 }}>
              <button onClick={handleNarratorSlayer} className="btn-action primary" style={{ width: '100%' }}>
                🏹 Disparo del Cazador ({slayerInGame.name}) → {target.name}
              </button>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-400)', fontStyle: 'italic', marginTop: 4, textAlign: 'center' }}>
                Ejecuta el tiro único del Cazador en nombre de {slayerInGame.name} — gasta su habilidad
              </p>
            </div>
          )}

          {/* Disparo fingido (malvado que finge ser Cazador) — solo el narrador, cuando el jugador se lo pide */}
          {isNarrator && canNarratorFakeShot && (
            <div style={{ borderBottom: 'var(--hairline-bone)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={fakeShooterId} onChange={e => setFakeShooterId(e.target.value)}
                  style={{ flex: 1, background: 'var(--ink-700)', border: 'var(--hairline)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}>
                  <option value="">— Malvado que finge... —</option>
                  {fakeShooters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={handleFakeShot} disabled={!fakeShooterId} className="btn-action" style={{ opacity: fakeShooterId ? 1 : 0.4 }}>
                  🏹 Disparo fingido → {target.name}
                </button>
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--bone-400)', fontStyle: 'italic', marginTop: 4, textAlign: 'center' }}>
                Anuncia el disparo fallido de un malvado que finge ser el Cazador — una vez por jugador
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Confirm kill popup */}
      {confirmKill && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setConfirmKill(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
            {target.avatar && (
              <img src={target.avatar} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--blood-hi)', boxShadow: '0 0 24px rgba(168,58,45,0.6)', marginBottom: 16 }} />
            )}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--bone-50)', textAlign: 'center', marginBottom: 8 }}>
              ¿Ejecutar a <strong style={{ color: 'var(--blood-hi)' }}>{activeNom?.nomineeName}</strong>?
            </p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-400)', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' }}>
              Este voto no se puede cambiar.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleVoteKill} className="btn-action danger" style={{ flex: 1 }}>Sí, matar</button>
              <button onClick={() => setConfirmKill(false)} className="btn-action" style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm save popup */}
      {confirmSave && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setConfirmSave(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
            {target.avatar && (
              <img src={target.avatar} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--good)', boxShadow: '0 0 24px rgba(109,140,184,0.5)', marginBottom: 16 }} />
            )}
            <p style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--bone-50)', textAlign: 'center', marginBottom: 8 }}>
              ¿Salvar a <strong style={{ color: 'var(--good)' }}>{activeNom?.nomineeName}</strong>?
            </p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-400)', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' }}>
              Este voto no se puede cambiar.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleVoteSaveConfirm} className="btn-action" style={{ flex: 1 }}>Sí, salvar</button>
              <button onClick={() => setConfirmSave(false)} className="btn-action danger" style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
