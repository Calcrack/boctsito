import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';
import RoleIcon from './RoleIcon';

// Paleta literal (misma estética gótica de theme.css) — html2canvas no resuelve
// correctamente variables CSS dentro de gradientes, así que aquí se usan los
// valores exactos del tema para que la captura sea fiel al diseño.
const LIT = {
  good:    '#6d8cb8',
  evil:    '#d4483a',
  bone50:  '#f4efe4',
  bone200: '#c9beaa',
  bone300: '#b0a690',
  bone400: '#8a8170',
  gold:    '#c9a24a',
  goldHot: '#e8c270',
  ink900:  '#0a0a10',
  ink700:  '#1a1a23',
  goodBg:  '#080f1a',
  evilBg:  '#1a0608',
};

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

  // Cuando acaba la partida, el narrador captura el panel (título + jugadores)
  // y lo envía al servidor para que el bot lo publique en el canal configurado.
  useEffect(() => {
    if (!effWinner || !effIsNarrator || sentRef.current) return;
    const node = captureRef.current;
    if (!node) return;
    const t = setTimeout(() => {
      html2canvas(node, { backgroundColor: LIT.ink900, scale: 2, logging: false, useCORS: true, allowTaint: false, imageTimeout: 0 })
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

  const playerEntry = (p) => {
    const isDrunk = p.role === 'DRUNK';
    const drunkFakeRole = isDrunk && p.drunkAs ? ROLE_BY_ID[p.drunkAs] : null;
    const role = p.role ? ROLE_BY_ID[p.role] : null;
    return (
      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: p.alive ? 1 : 0.5, padding: '3px 0' }}>
        <RoleIcon role={role} size={26} radius={4} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: LIT.ink700, border: `1px solid ${LIT.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 10, fontWeight: 700, color: LIT.bone200,
            flexShrink: 0,
          }}>
            {(p.name || '?')[0].toUpperCase()}
          </span>
          <span style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 15, fontWeight: 700, color: LIT.bone50, letterSpacing: '0.02em',
          }}>
            {p.name}
          </span>
        </div>
        <span style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 12, fontStyle: 'italic',
          color: LIT.bone400, marginLeft: 2, minWidth: 74, textAlign: 'left',
        }}>
          {role?.name}
        </span>
        {isDrunk && drunkFakeRole && (
          <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 10, color: LIT.gold, fontStyle: 'italic' }}>
            creía ser {drunkFakeRole.name}
          </span>
        )}
        {p.isSmokeScreen && (
          <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 10, color: LIT.evil, fontStyle: 'italic' }}>
            Cortina de Humo
          </span>
        )}
        {!p.alive && <span style={{ color: LIT.evil, fontSize: 13 }}>☠</span>}
      </div>
    );
  };

  const teamBlock = (team, label, accent) => (
    <div style={{
      background: 'rgba(0,0,0,0.32)',
      border: `1px solid ${accent}`,
      borderRadius: 6,
      padding: '14px 16px',
      textAlign: 'center',
    }}>
      <p style={{ fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, margin: '0 0 12px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {team.map(playerEntry)}
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
        <div ref={captureRef} style={{ background: '#0c0c13', borderRadius: 10, padding: '30px 34px', border: '1px solid rgba(201,162,74,0.35)', boxShadow: '0 20px 60px -20px rgba(0,0,0,0.8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ fontSize: 42, color: isGoodWin ? LIT.good : LIT.evil, marginBottom: 6, textShadow: `0 0 24px ${isGoodWin ? LIT.good : LIT.evil}` }}>
              {isGoodWin ? '✦' : '☠'}
            </div>
            <h1 style={{ fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif', fontSize: 32, fontWeight: 400, color: '#f2efe6', margin: 0, letterSpacing: '0.06em', textShadow: `0 0 30px ${isGoodWin ? 'rgba(109,140,184,0.5)' : 'rgba(212,72,58,0.5)'}` }}>
              {isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado'}
            </h1>
            {winReason && (
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, color: '#c9c2b4', fontStyle: 'italic', margin: '8px 0 0' }}>
                {winReason}
              </p>
            )}
            <div style={{ color: LIT.gold, fontSize: 16, letterSpacing: '0.5em', marginTop: 6 }}>✦</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {teamBlock(goodTeam, 'Aldeanos & Forasteros', LIT.good)}
            {teamBlock(evilTeam, 'Esbirros & Demonio', LIT.evil)}
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