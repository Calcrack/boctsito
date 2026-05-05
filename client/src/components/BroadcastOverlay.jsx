import React from 'react';
import { useGame } from '../context/GameContext';

const TYPE_ICONS = {
  execution: '☠',
  warning: '⚠',
  success: '✦',
  info: '◆',
};

export default function BroadcastOverlay() {
  const { state, dispatch } = useGame();
  const { broadcastEvent } = state;

  if (!broadcastEvent) return null;

  const icon = TYPE_ICONS[broadcastEvent.type] || TYPE_ICONS.info;

  return (
    <div className="broadcast-overlay" onClick={() => dispatch({ type: 'CLEAR_BROADCAST' })}>
      <div
        className={`broadcast-card ${broadcastEvent.type === 'execution' ? 'execution' : 'warning'}`}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, color: 'var(--bone-400)', lineHeight: 1 }}>{icon}</div>
        <h2>{broadcastEvent.title}</h2>
        <p>{broadcastEvent.message}</p>
        <button
          onClick={() => dispatch({ type: 'CLEAR_BROADCAST' })}
          className="btn-action"
          style={{ marginTop: 20 }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
