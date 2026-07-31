import React from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID } from '../data/roles';
import RoleIcon from './RoleIcon';

const TYPE_LABELS = { townfolk: 'Aldeano', outsider: 'Forastero', minion: 'Esbirro', demon: 'Demonio' };

export default function RoleReveal({ player }) {
  const { send } = useGame();
  const displayRoleId = player.displayRole || player.role;
  const role = displayRoleId ? ROLE_BY_ID[displayRoleId] : null;
  if (!role) return null;

  const isEvil = role.alignment === 'evil';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: isEvil
        ? 'radial-gradient(ellipse at center, #1a0a08 0%, var(--ink-900) 70%)'
        : 'radial-gradient(ellipse at center, #080f1a 0%, var(--ink-900) 70%)',
    }}>
      <div style={{
        maxWidth: 380,
        width: '100%',
        background: 'var(--ink-800)',
        border: isEvil ? '1px solid var(--blood)' : '1px solid var(--good)',
        borderRadius: 8,
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-deep)',
      }}>
        {role.img ? (
          <RoleIcon role={role} size={140} radius={8}
            style={{ objectFit: 'contain', margin: '0 auto 24px', display: 'block' }} />
        ) : (
          <div style={{ fontSize: 72, marginBottom: 24 }}>
            {role.type === 'demon' ? '☠' : role.type === 'minion' ? '◆' : '✦'}
          </div>
        )}

        <p style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: isEvil ? 'var(--blood-hi)' : 'var(--good)',
          marginBottom: 8,
        }}>
          {TYPE_LABELS[role.type] || role.type}
        </p>

        <h2 style={{
          fontFamily: 'var(--title)',
          fontSize: 26,
          fontWeight: 400,
          color: 'var(--bone-50)',
          margin: '0 0 20px',
          letterSpacing: '0.04em',
        }}>
          {role.name}
        </h2>

        <div style={{
          borderTop: isEvil ? '1px solid var(--blood-dim)' : '1px solid var(--good)',
          paddingTop: 16,
          marginBottom: 20,
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-200)', lineHeight: 1.6 }}>
            {role.ability}
          </p>
        </div>

        {player.nightInfo && (
          <div style={{
            background: 'rgba(201,162,74,0.08)',
            border: 'var(--hairline)',
            borderRadius: 4,
            padding: '12px 16px',
            marginBottom: 16,
            textAlign: 'left',
          }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
              Información esta noche
            </p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-100)', whiteSpace: 'pre-line' }}>
              {player.nightInfo}
            </p>
          </div>
        )}

        {isEvil && (
          <div style={{
            background: 'rgba(168,58,45,0.12)',
            border: '1px solid var(--blood-dim)',
            borderRadius: 4,
            padding: '10px 14px',
            marginBottom: 16,
          }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', fontStyle: 'italic' }}>
              Equipo del Mal — no reveles tu rol.
            </p>
          </div>
        )}

        <button onClick={() => send('ACKNOWLEDGE_ROLE', {})}
          className={`btn-action ${isEvil ? 'danger' : 'primary'}`}
          style={{ width: '100%', padding: '14px 0', fontSize: 15 }}>
          Entendido
        </button>
      </div>
    </div>
  );
}
