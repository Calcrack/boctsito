import React from 'react';
import ROLE_FORMA from '../data/roleForma';

// Icono con el arte "forma" de un rol (rolesnotoken). Si el rol no tiene
// forma descargada, dibuja su primera letra con el color de su tipo.
const TYPE_COLOR = {
  townfolk: 'var(--good)',
  outsider: 'var(--moon)',
  minion:   'var(--blood-hi)',
  demon:    'var(--blood-hi)',
  traveler: 'var(--gold)',
  fabled:   'var(--gold)',
};

export default function FormaIcon({ roleId, role, size = 16, style = {}, alt }) {
  const r = role || {};
  const src = roleId ? ROLE_FORMA[roleId] : (r.forma || ROLE_FORMA[r.id]);
  const color = TYPE_COLOR[r.type] || 'var(--bone-400)';

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? r.name ?? roleId ?? ''}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <span style={{
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.max(8, Math.round(size * 0.55)),
      lineHeight: 1,
      color,
      fontFamily: 'var(--serif)',
      fontWeight: 600,
      flexShrink: 0,
      ...style,
    }}>
      {(r.name || roleId || '?')[0].toUpperCase()}
    </span>
  );
}