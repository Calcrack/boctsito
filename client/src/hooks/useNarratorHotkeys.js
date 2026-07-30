import { useEffect } from 'react';

// ── Atajos de teclado del narrador ───────────────────────────────────
// Narrar es repetir el mismo gesto veinte veces por noche: avanzar paso,
// aplicar, avanzar. Con el teclado no hay que soltar la vista de la mesa.
// Se desactivan solos mientras escribes en un campo de texto.

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export const HOTKEYS = [
  { keys: 'Espacio',  what: 'Acción principal (la del botón grande)' },
  { keys: '→ / ←',    what: 'Siguiente / anterior paso de la noche' },
  { keys: '1 … 9',    what: 'Ir directo a ese paso de la noche' },
  { keys: 'B',        what: 'Buscar un jugador' },
  { keys: 'Esc',      what: 'Cerrar lo que esté abierto' },
];

export default function useNarratorHotkeys({ onMain, onNext, onPrev, onGoTo, onSearch, onEscape, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const el = document.activeElement;
      if (el && (TYPING.has(el.tagName) || el.isContentEditable)) {
        if (e.key === 'Escape') el.blur();
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onMain?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrev?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          onSearch?.();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            onGoTo?.(Number(e.key) - 1);
          }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onMain, onNext, onPrev, onGoTo, onSearch, onEscape]);
}
