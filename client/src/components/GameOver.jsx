import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';
import PlayerChip from './PlayerChip';
import RoleIcon from './RoleIcon';

export default function GameOver({ mock }) {
  const { state, send } = useGame();
  const { game, isNarrator } = state;

  const gameOverRef = useRef(null);
  const sentRef = useRef(false);

  // Para pruebas: si llega `mock`, se ignoran el estado real y la condición de
  // narrador y se captura igualmente (los datos de `mock` se renderizan abajo).
  const effWinner = mock ? mock.winner : (game?.winner || null);
  const effPlayers = mock ? mock.players || [] : ((game?.players) || []);
  const effWinReason = mock ? mock.winReason : (game?.winReason || null);
  const effIsNarrator = mock ? true : isNarrator;

  // Cuando acaba la partida, el narrador captura la pantalla completa de fin de
  // partida (título, roles, jugadores y fondo) y la envía al servidor para que
  // el bot la publique en el canal configurado.
  useEffect(() => {
    if (!effWinner || !effIsNarrator || sentRef.current) return;
    const node = gameOverRef.current;
    if (!node) return;
    const t = setTimeout(() => {
      html2canvas(node, { backgroundColor: null, scale: 2, logging: false, useCORS: true, allowTaint: false, imageTimeout: 0 })
        .then(canvas => {
          sentRef.current = true;
          send('GAME_OVER_SHOT', { imageDataUrl: canvas.toDataURL('image/png') });
        })
        .catch(err => console.error('[GameOver] captura falló:', err));
    }, 350);
    return () => clearTimeout(t);
  }, [effWinner, effIsNarrator, send]);

  if (mock) {
    if (!mock.winner) return null;
  } else {
    if (!game) return null;
    if (!game.winner) return null;
  }
  const { winner, players = [], winReason } = mock || { winner: game.winner, players: game.players, winReason: game.winReason };

  const isGoodWin = winner === 'good';

  const goodTeam = players.filter(p => p.alignment === 'good');
  const evilTeam = players.filter(p => p.alignment === 'evil');

  const teamBlock = (team, label, isGood) => (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: `1px solid ${isGood ? 'rgba(109,140,184,0.3)' : 'rgba(168,58,45,0.3)'}`,
      borderRadius: 6,
      padding: '16px 18px',
    }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: isGood ? 'var(--good)' : 'var(--blood-hi)', marginBottom: 12 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {team.map(p => {
          const isDrunk = p.role === 'DRUNK';
          const drunkFakeRole = isDrunk && p.drunkAs ? ROLE_BY_ID[p.drunkAs] : null;
          const role = p.role ? ROLE_BY_ID[p.role] : null;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: p.alive ? 1 : 0.55 }}>
              <RoleIcon role={role} size={30} radius={4} />
              <PlayerChip name={p.name} avatar={p.avatar} size="lg" />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bone-400)', display: 'block' }}>
                  {role?.name}
                </span>
                {isDrunk && drunkFakeRole && (
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--gold)', fontStyle: 'italic', display: 'block' }}>
                    creía ser {drunkFakeRole.name}
                  </span>
                )}
                {p.isSmokeScreen && (
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--blood-hi)', fontStyle: 'italic', display: 'block' }}>
                    Cortina de Humo
                  </span>
                )}
              </div>
              {!p.alive && <span style={{ color: 'var(--blood-hi)', fontSize: 14 }}>☠</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      background: isGoodWin
        ? 'radial-gradient(ellipse at center top, #080f1a 0%, var(--ink-900) 70%)'
        : 'radial-gradient(ellipse at center top, #1a0608 0%, var(--ink-900) 70%)',
    }} ref={gameOverRef}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 60, color: isGoodWin ? 'var(--good)' : 'var(--blood-hi)', marginBottom: 16 }}>
            {isGoodWin ? '✦' : '☠'}
          </div>
          <h1 style={{ fontFamily: 'var(--title)', fontSize: 34, fontWeight: 400, color: 'var(--bone-50)', margin: '0 0 8px', letterSpacing: '0.04em' }}>
            {isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado'}
          </h1>
          {winReason && (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--bone-300)', fontStyle: 'italic' }}>
              {winReason}
            </p>
          )}
          <div className="flourish-divider" style={{ maxWidth: 200, margin: '4px auto 0' }}>✦</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {teamBlock(goodTeam, 'Aldeanos & Forasteros', true)}
          {teamBlock(evilTeam, 'Esbirros & Demonio', false)}
        </div>

        {isNarrator && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => send('RESET_GAME', {})} className="btn-action primary" style={{ padding: '16px 48px', fontSize: 18 }}>
              Nueva Partida
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
