import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Login from './components/Login';
import NarratorPanel from './components/NarratorPanel';
import PlayerPanel from './components/PlayerPanel';
import NotificationStack from './components/NotificationStack';
import BroadcastOverlay from './components/BroadcastOverlay';
import GameOver from './components/GameOver';
import GamepadController from './components/GamepadController';

function AppInner() {
  const { state } = useGame();
  const { isNarrator, playerId, game } = state;

  const isLoggedIn = isNarrator || !!playerId;

  if (!isLoggedIn) return <Login />;

  if (!game) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ink-900)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--gold)', marginBottom: 12 }}>☾</div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-400)', fontStyle: 'italic' }}>
          Conectando a la partida...
        </p>
      </div>
    </div>
  );

  if (game.phase === 'game_over') return <GameOver />;

  return (
    <>
      {isNarrator ? <NarratorPanel /> : <PlayerPanel />}
      <NotificationStack />
      <BroadcastOverlay />
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
      <GamepadController />
    </GameProvider>
  );
}
