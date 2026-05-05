import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

function RankingsPanel({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rankings')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({}); setLoading(false); });
  }, []);

  const rows = data ? Object.values(data).sort((a, b) => (b.wins_as_good + b.wins_as_demon) - (a.wins_as_good + a.wins_as_demon)) : [];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', border: 'var(--hairline)', borderRadius: 4, padding: '20px' }}>
      <p className="panel-label" style={{ marginBottom: 16 }}>🏆 Rankings</p>

      {loading ? (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-400)', textAlign: 'center', padding: '24px 0' }}>Cargando...</p>
      ) : rows.length === 0 ? (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-400)', textAlign: 'center', padding: '24px 0', fontStyle: 'italic' }}>
          Aún no hay partidas registradas.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r, i) => (
            <div key={r.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: i === 0 ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.02)',
              border: i === 0 ? '1px solid rgba(201,162,74,0.2)' : 'var(--hairline-bone)',
              borderRadius: 4, padding: '10px 12px',
            }}>
              <span style={{ fontSize: 18, minWidth: 24 }}>{medals[i] || ''}</span>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--ink-700)', border: 'var(--hairline)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-100)',
              }}>
                {r.avatar
                  ? <img src={r.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (r.name?.[0] || '?').toUpperCase()
                }
              </div>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone-100)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--good)' }}>{r.wins_as_good || 0}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aldea</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--blood-hi)' }}>{r.wins_as_demon || 0}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Demonio</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--bone-400)' }}>{r.total_games || 0}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onBack}
        style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: 16 }}>
        ← Volver
      </button>
    </div>
  );
}

export default function Login() {
  const { state, send } = useGame();
  const [mode, setMode] = useState(null);
  const [password, setPassword] = useState('');
  const { playerList = [], error, connected } = state;

  useEffect(() => {
    if (mode === 'player') send('GET_PLAYER_LIST', {});
  }, [mode]);

  const handleNarrator = () => send('NARRATOR_LOGIN', { password });
  const handlePlayer = (playerName) => send('PLAYER_JOIN', { playerName });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at center, var(--ink-850) 0%, var(--ink-900) 70%, #030305 100%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
            Los Campanarios
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 600, color: 'var(--bone-50)', margin: 0, lineHeight: 1.2 }}>
            Blood on the<br />Clock Tower
          </h1>
          <div style={{ width: 40, height: 1, background: 'var(--gold)', margin: '16px auto 0', opacity: 0.5 }} />
        </div>

        {/* Connection status */}
        {!connected && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-400)', textAlign: 'center', marginBottom: 16 }}>
            Conectando al servidor...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(168,58,45,0.15)', border: '1px solid var(--blood-dim)', borderRadius: 3, padding: '10px 14px', marginBottom: 16, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)' }}>
            {error}
          </div>
        )}

        {/* Mode selector */}
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setMode('player')} className="btn-action primary"
              style={{ padding: '16px 0', fontSize: 16, width: '100%', letterSpacing: '0.1em' }}>
              Soy jugador
            </button>
            <button onClick={() => setMode('narrator')} className="btn-action"
              style={{ padding: '16px 0', fontSize: 16, width: '100%', letterSpacing: '0.1em' }}>
              Soy narrador
            </button>
            <button onClick={() => setMode('rankings')} className="btn-action"
              style={{ padding: '12px 0', fontSize: 14, width: '100%', letterSpacing: '0.08em', opacity: 0.8 }}>
              🏆 Rankings
            </button>
          </div>
        )}

        {/* Player list */}
        {mode === 'player' && (
          <div style={{ background: 'rgba(0,0,0,0.3)', border: 'var(--hairline)', borderRadius: 4, padding: '20px 20px' }}>
            <p className="panel-label">Selecciona tu jugador</p>

            {playerList.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-400)', fontStyle: 'italic', marginBottom: 8 }}>Sin jugadores registrados</p>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-500)' }}>El narrador debe agregar jugadores primero</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
                {playerList.map(p => (
                  <button key={p.id} onClick={() => handlePlayer(p.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(0,0,0,0.3)', border: 'var(--hairline-bone)',
                      borderRadius: 3, padding: '10px 12px', cursor: 'pointer',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,162,74,0.5)'; e.currentTarget.style.background = 'rgba(201,162,74,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', background: 'var(--ink-700)',
                      border: 'var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-100)', overflow: 'hidden', flexShrink: 0,
                    }}>
                      {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setMode(null)}
              style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              ← Volver
            </button>
          </div>
        )}

        {/* Narrator password */}
        {mode === 'narrator' && (
          <div style={{ background: 'rgba(0,0,0,0.3)', border: 'var(--hairline)', borderRadius: 4, padding: '20px 20px' }}>
            <p className="panel-label">Panel Narrador</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--bone-400)', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNarrator()}
                placeholder="••••"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--ink-700)', border: 'var(--hairline)',
                  borderRadius: 2, padding: '10px 12px',
                  fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--bone-100)',
                  textAlign: 'center', letterSpacing: '0.3em',
                }}
              />
            </div>
            <button onClick={handleNarrator} className="btn-action primary" style={{ width: '100%', padding: '12px 0', marginBottom: 10 }}>
              Entrar
            </button>
            <button onClick={() => setMode(null)}
              style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-400)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              ← Volver
            </button>
          </div>
        )}

        {/* Rankings */}
        {mode === 'rankings' && <RankingsPanel onBack={() => setMode(null)} />}

      </div>
    </div>
  );
}
