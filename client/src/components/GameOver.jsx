import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';
import PlayerChip from './PlayerChip';
import RoleIcon from './RoleIcon';

export default function GameOver({ mock, onCaptured }) {
  const { state, send } = useGame();
  const { game, isNarrator } = state;

  const captureRef = useRef(null);
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
    const node = captureRef.current;
    if (!node) return;
    const t = setTimeout(() => {
      html2canvas(node, { backgroundColor: '#0d0d14', scale: 2, logging: false, useCORS: true, allowTaint: false, imageTimeout: 0 })
        .then(canvas => {
          sentRef.current = true;
          const dataUrl = canvas.toDataURL('image/png');
          if (mock && onCaptured) onCaptured(dataUrl);
          else send('GAME_OVER_SHOT', { imageDataUrl: dataUrl, caption: mock ? '🧪 TEST' : null });
        })
        .catch(err => console.error('[GameOver] captura falló:', err));
    }, 350);
    return () => clearTimeout(t);
  }, [effWinner, effIsNarrator, send, mock, onCaptured]);

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
      background: 'rgba(0,0,0,0.35)',
      border: `1px solid ${isGood ? 'rgba(143,208,168,0.35)' : 'rgba(224,82,70,0.35)'}`,
      borderRadius: 6,
      padding: '14px 16px',
    }}>
      <p style={{ fontFamily: 'Consolas, monospace', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: isGood ? '#8fd0a8' : '#e05246', margin: '0 0 10px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {team.map(p => {
          const isDrunk = p.role === 'DRUNK';
          const drunkFakeRole = isDrunk && p.drunkAs ? ROLE_BY_ID[p.drunkAs] : null;
          const role = p.role ? ROLE_BY_ID[p.role] : null;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: p.alive ? 1 : 0.55 }}>
              <RoleIcon role={role} size={26} radius={4} />
              <PlayerChip name={p.name} avatar={p.avatar} size="lg" />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{ fontFamily: 'Consolas, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c9c2b4', display: 'block' }}>
                  {role?.name}
                </span>
                {isDrunk && drunkFakeRole && (
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: '#d8b45a', fontStyle: 'italic', display: 'block' }}>
                    creía ser {drunkFakeRole.name}
                  </span>
                )}
                {p.isSmokeScreen && (
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: '#e05246', fontStyle: 'italic', display: 'block' }}>
                    Cortina de Humo
                  </span>
                )}
              </div>
              {!p.alive && <span style={{ color: '#e05246', fontSize: 13 }}>☠</span>}
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
        ? 'radial-gradient(ellipse at center top, #080f1a 0%, #0a0a10 70%)'
        : 'radial-gradient(ellipse at center top, #1a0608 0%, #0a0a10 70%)',
    }}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div ref={captureRef} style={{ background: '#0d0d14', borderRadius: 10, padding: '28px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 40, color: isGoodWin ? '#8fd0a8' : '#e05246', marginBottom: 8 }}>
              {isGoodWin ? '✦' : '☠'}
            </div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#f2eee6', margin: 0, letterSpacing: '0.04em' }}>
              {isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado'}
            </h1>
            {winReason && (
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#c9c2b4', fontStyle: 'italic', margin: '8px 0 0' }}>
                {winReason}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {teamBlock(goodTeam, 'Aldeanos & Forasteros', true)}
            {teamBlock(evilTeam, 'Esbirros & Demonio', false)}
          </div>
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
