import React from 'react';
import { useGame } from '../context/GameContext';

const CHANNELS = [
  { key: 'PLAZA',      label: 'Plaza' },
  { key: 'MERCADO',    label: 'Mercado' },
  { key: 'TABERNA',    label: 'Taberna' },
  { key: 'CEMENTERIO', label: 'Cementerio' },
  { key: 'BOSQUE',     label: 'Bosque' },
];

export default function DiscordChannels() {
  const { state, send } = useGame();
  const { game, playerId } = state;

  if (!game) return null;
  const me = game.players.find(p => p.id === playerId);
  if (!me?.discordId) return null;

  const isDay = ['day', 'nominations', 'voting'].includes(game.phase);
  if (!isDay) return null;

  return (
    <div>
      <p className="panel-label" style={{ marginBottom: 8 }}>Canal Discord</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CHANNELS.map(ch => (
          <button key={ch.key}
            onClick={() => send('MOVE_TO_CHANNEL', { channel: ch.key })}
            className="btn-night">
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  );
}
