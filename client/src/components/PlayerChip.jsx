import React from 'react';

export default function PlayerChip({ name, avatar, size = 'sm', color }) {
  const avatarSize = size === 'lg' ? 26 : 20;
  const fontSize   = size === 'lg' ? 15 : 13;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'rgba(201,162,74,0.12)',
      border: '1px solid rgba(201,162,74,0.25)',
      borderRadius: 4,
      padding: '1px 7px 1px 3px',
      verticalAlign: 'middle',
    }}>
      <span style={{
        width: avatarSize, height: avatarSize,
        borderRadius: '50%',
        background: 'var(--ink-700)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--serif)',
        fontSize: avatarSize * 0.5,
        color: 'var(--bone-200)',
      }}>
        {avatar
          ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (name?.[0] || '?').toUpperCase()
        }
      </span>
      <span style={{
        fontFamily: 'var(--serif)',
        fontSize,
        fontWeight: 600,
        color: color || 'var(--bone-50)',
        lineHeight: `${avatarSize}px`,
        display: 'inline-block',
      }}>
        {name}
      </span>
    </span>
  );
}