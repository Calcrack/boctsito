import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';
import PlayerChip from './PlayerChip';
import RoleIcon from './RoleIcon';

const COLORS = {
  ink900: '#07070a',
  good: '#6d8cb8',
  bloodHi: '#d4483a',
  bone50: '#f4efe4',
  bone300: '#b0a690',
  bone400: '#8a8170',
  gold: '#c9a24a',
  mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace",
  serif: "'Cormorant Garamond', 'Cormorant', Georgia, serif",
  title: "'Cinzel Decorative', 'Cinzel', 'Cormorant Garamond', Georgia, serif",
};

export default function GameOver() {
  const { state, send } = useGame();
  const { game, isNarrator } = state;
  const captureRef = useRef(null);
  const screenshotSent = useRef(false);

  console.log('[GameOver] RENDER', { phase: game?.phase, winner: game?.winner });

  useEffect(() => {
    console.log('[GameOver] useEffect fired', { hasGame: !!game?.winner, hasRef: !!captureRef.current, sent: screenshotSent.current });
    if (!game?.winner || !captureRef.current || screenshotSent.current) return;
    screenshotSent.current = true;
    const timer = setTimeout(() => {
      if (!captureRef.current) return;
      console.log('[GameOver] Capturando con html2canvas...');
      html2canvas(captureRef.current, { backgroundColor: '#07070a', useCORS: true, logging: true }).then(canvas => {
        console.log('[GameOver] Screenshot tomado, enviando al server...');
        send('SCREENSHOT_GAME_OVER', { image: canvas.toDataURL('image/png') });
      }).catch(err => console.error('[GameOver] html2canvas error:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [game?.winner, send]);

  if (!game) return null;
  const { winner, players = [], winReason } = game;
  if (!winner) return null;

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
      <p style={{ fontFamily: COLORS.mono, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: isGood ? COLORS.good : COLORS.bloodHi, marginBottom: 12 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {team.map(p => {
          const isDrunk = p.role === 'DRUNK';
          const drunkFakeRole = isDrunk && p.drunkAs ? ROLE_BY_ID[p.drunkAs] : null;
          const role = p.role ? ROLE_BY_ID[p.role] : null;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: p.alive ? 1 : 0.55 }}>
              <RoleIcon role={role} size={30} radius={4} />
              <PlayerChip name={p.name} avatar={p.avatar} size="lg" />
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{ fontFamily: COLORS.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: COLORS.bone400, display: 'block' }}>
                  {role?.name}
                </span>
                {isDrunk && drunkFakeRole && (
                  <span style={{ fontFamily: COLORS.serif, fontSize: 10, color: COLORS.gold, fontStyle: 'italic', display: 'block' }}>
                    creía ser {drunkFakeRole.name}
                  </span>
                )}
                {p.isSmokeScreen && (
                  <span style={{ fontFamily: COLORS.serif, fontSize: 10, color: COLORS.bloodHi, fontStyle: 'italic', display: 'block' }}>
                    Cortina de Humo
                  </span>
                )}
              </div>
              {!p.alive && <span style={{ color: COLORS.bloodHi, fontSize: 14 }}>☠</span>}
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
        ? 'radial-gradient(ellipse at center top, #080f1a 0%, #07070a 70%)'
        : 'radial-gradient(ellipse at center top, #1a0608 0%, #07070a 70%)',
    }}>
      <div ref={captureRef} style={{
        maxWidth: 720,
        width: '100%',
        background: COLORS.ink900,
        borderRadius: 12,
        padding: 32,
        border: '1px solid rgba(201,162,74,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 60, color: isGoodWin ? COLORS.good : COLORS.bloodHi, marginBottom: 16 }}>
            {isGoodWin ? '✦' : '☠'}
          </div>
          <h1 style={{ fontFamily: COLORS.title, fontSize: 34, fontWeight: 400, color: COLORS.bone50, margin: '0 0 8px', letterSpacing: '0.04em' }}>
            {isGoodWin ? 'El Bien ha ganado' : 'El Mal ha ganado'}
          </h1>
          {winReason && (
            <p style={{ fontFamily: COLORS.serif, fontSize: 20, color: COLORS.bone300, fontStyle: 'italic' }}>
              {winReason}
            </p>
          )}
          <div style={{ maxWidth: 200, margin: '4px auto 0', textAlign: 'center', color: COLORS.gold, fontSize: 14, opacity: 0.6 }}>✦</div>
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