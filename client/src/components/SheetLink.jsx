import React from 'react';
import FormaIcon from './FormaIcon';

// Hoja de campaña: la genera el servidor con el guion activo (también los
// guiones importados, porque lee la campaña del servidor y no el catálogo
// local) y se abre en una pestaña nueva, lista para imprimir.
export default function SheetLink({ game, compact = false }) {
  if (!game) return null;
  return (
    <a href={`/hoja-campana?game=${encodeURIComponent(game.id)}`} target="_blank" rel="noopener noreferrer"
      title={`Todos los personajes de ${game.campaignName || 'este guion'}, con su habilidad`}
      style={{
        textDecoration: 'none', background: 'none', border: 'var(--hairline-bone)', borderRadius: 2,
        padding: compact ? '3px 8px' : '4px 10px', fontFamily: 'var(--mono)',
        fontSize: compact ? 10 : 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--gold)', cursor: 'pointer', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
      <FormaIcon roleId="STEWARD" size={compact ? 14 : 16} />
      Hoja de campaña
    </a>
  );
}
