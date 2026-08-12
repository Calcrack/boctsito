import React, { useState } from 'react';

// ── Ficha de personaje ─────────────────────────────────────────────
// Muchos personajes (Viajeros, Fabulosos, roles de guiones propios) no
// tienen arte. Antes se pintaba un <img> con `src` nulo o con una ruta
// inexistente y salía el icono gris de "imagen rota". Aquí se dibuja en
// su lugar la inicial del personaje con el color de su tipo.
const TYPE_COLOR = {
  townfolk: 'var(--good)',
  outsider: 'var(--moon)',
  minion:   'var(--blood-hi)',
  demon:    'var(--blood-hi)',
  traveler: 'var(--gold)',
  fabled:   'var(--gold)',
};

// `size` en píxeles; pásalo a null si el tamaño lo pone el CSS del padre.
// `forma` = usar el arte grande (rolesnotoken) en vez de la ficha circular.
export default function RoleIcon({ role, size = 24, radius, className, style = {}, alt, forma }) {
  const [failed, setFailed] = useState(false);
  if (!role) return null;

  const box = size == null
    ? { ...style }
    : {
        width: size,
        height: size,
        borderRadius: radius === undefined ? Math.max(2, Math.round(size * 0.08)) : radius,
        flexShrink: 0,
        ...style,
      };

  // `img` es la clave del catálogo del cliente; `image` la que manda el
  // servidor para los roles homebrew de guiones importados.
  const src = (forma && (role.forma || role.img)) || role.img || role.image || null;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt ?? role.name ?? ''}
        className={className}
        onError={() => setFailed(true)}
        style={{ objectFit: 'cover', ...box }}
      />
    );
  }

  const color = TYPE_COLOR[role.type] || 'var(--bone-400)';
  return (
    <span
      className={className}
      title={role.name}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        border: `1px solid ${color}`,
        color,
        fontFamily: 'var(--serif)',
        fontWeight: 600,
        fontSize: size == null ? '0.9em' : Math.max(9, Math.round(size * 0.5)),
        lineHeight: 1,
        userSelect: 'none',
        overflow: 'hidden',
        ...box,
      }}>
      {(role.name || '?').trim()[0].toUpperCase()}
    </span>
  );
}
