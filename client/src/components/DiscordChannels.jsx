import React from 'react';
import { useGame } from '../context/GameContext';

// Los 5 emplazamientos a los que un jugador puede moverse. El NOMBRE visible
// sale de la config persistente (config.locationNames); key sigue siendo la
// de Discord para los movimientos MOVE_TO_CHANNEL.
const CHANNELS = ['PLAZA', 'MERCADO', 'TABERNA', 'CEMENTERIO', 'BOSQUE'];
const DEFAULT_NAMES = { PLAZA: 'Plaza', MERCADO: 'Mercado', TABERNA: 'Taberna', CEMENTERIO: 'Cementerio', BOSQUE: 'Bosque' };

export default function DiscordChannels() {
  const { state, send } = useGame();
  const { game, playerId, config } = state;
  const locationNames = config?.locationNames || {};

  if (!game) return null;
  const me = game.players.find(p => p.id === playerId);
  if (!me?.discordId) return null;

  const isDay = ['day', 'nominations', 'voting'].includes(game.phase);
  if (!isDay) return null;

  return (
    <div>
      <p className="panel-label" style={{ marginBottom: 8 }}>Canal Discord</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CHANNELS.map(key => (
          <button key={key}
            onClick={() => send('MOVE_TO_CHANNEL', { channel: key })}
            className="btn-night">
            {locationNames[key] || DEFAULT_NAMES[key] || key}
          </button>
        ))}
      </div>
    </div>
  );
}
