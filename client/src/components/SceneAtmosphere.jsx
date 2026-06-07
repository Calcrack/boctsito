import React, { useMemo } from 'react';

/**
 * SceneAtmosphere — partículas ambientales (brasas/polvo) que flotan
 * hacia arriba. El color sigue var(--scene-accent) automáticamente,
 * cambiando de oro → luna-azul → índigo con la fase del juego.
 * Montado una vez en App, pointer-events: none.
 */
export default function SceneAtmosphere() {
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left:  `${5 + (i * 7.1) % 88}%`,
      dur:   `${7 + (i * 1.31) % 9}s`,
      delay: `${(i * 0.83) % 7}s`,
      w:     i % 3 === 0 ? 2 : 1.5,
      h:     i % 3 === 0 ? 5 : 3.5,
    }))
  , []);

  return (
    <div className="scene-particles" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="scene-particle"
          style={{
            left:             p.left,
            width:            p.w,
            height:           p.h,
            animationDuration: p.dur,
            animationDelay:    p.delay,
          }}
        />
      ))}
    </div>
  );
}
