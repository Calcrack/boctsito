import React from 'react';
import { useGame } from '../context/GameContext';

export default function NotificationStack() {
  const { state } = useGame();
  const { notifications } = state;

  return (
    <div className="notif-stack">
      {notifications.map(n => (
        <div key={n.id} className={`notif-item ${n.type || 'info'}`}>
          {n.message}
        </div>
      ))}
    </div>
  );
}
