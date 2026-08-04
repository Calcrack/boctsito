import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { ALL_ROLES, ROLE_BY_ID, scriptRoles } from '../data/roles';
import { panelForRole, ABILITY_PANELS } from '../data/abilityPanels';
import StatusChips from './StatusChips';
import RoleIcon from './RoleIcon';

const label = { fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 };
const hint  = { fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-300)', fontStyle: 'italic', margin: '4px 0 0' };
const warn  = { fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--blood-hi)', fontWeight: 600, margin: '4px 0 0' };
const input = { width: '100%', background: 'var(--ink-700)', border: 'var(--hairline)', borderRadius: 2, padding: '6px 8px', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' };

const TOKEN_EXPLAIN = {
  POISONED:   'Su habilidad e información son FALSAS. Se limpia al próximo anochecer.',
  PROTECTED:  'Protegido del Demonio esta noche. Se limpia al amanecer.',
  DRUNK_NIGHT:'Borracho: su habilidad no funciona.',
  DIES:       'Marcado para morir esta noche.',
  MASTER:     'Es el Amo del Mayordomo (solo vota si el Amo vota).',
  SAFE_TONIGHT:'No puede morir esta noche.',
  EXECUTED_TODAY:'Ejecutado hoy: el Enterrador aprende su personaje esta noche.',
  BARBER_TONIGHT:'El Barbero murió: esta noche el Demonio puede intercambiar 2 personajes.',
  BOFFIN_ABILITY:'Este Demonio tiene además una habilidad buena (Rata de Laboratorio).',
  LIL_MONSTA_KEEPER:'Cuida a la Lil’ Monsta: cuenta como Demonio vivo.',
};

function expiryLabel(t) {
  const e = t.expiry || [];
  if (t.manual) return 'manual (no caduca sola)';
  if (e.includes('PERMANENT')) return 'permanente';
  if (e.includes('UNTIL_NEXT_DUSK')) return 'hasta el próximo anochecer';
  if (e.includes('AT_DAWN')) return 'se limpia al amanecer';
  if (e.includes('ONE_DAY')) return 'dura el día de hoy';
  return t.temp ? 'temporal' : 'permanente';
}

const PRESENCE = {
  online:  { dot: '●', text: 'Conectado',    color: 'var(--good)' },
  away:    { dot: '⏱', text: 'Ausente',      color: 'var(--gold)' },
  offline: { dot: '○', text: 'Desconectado', color: 'var(--bone-500)' },
};

// ── Pestaña: Info ────────────────────────────────────────────────────
function InfoTab({ target, game }) {
  const role = target.role ? ROLE_BY_ID[target.role] : null;
  const believed = target.believedRole ? ROLE_BY_ID[target.believedRole] : null;
  const drunkAs = target.drunkAs ? ROLE_BY_ID[target.drunkAs] : null;
  const seat = game.players.findIndex(p => p.id === target.id) + 1;
  const pres = PRESENCE[target.presence] || PRESENCE.offline;

  return (
    <div>
      {role && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '9px 12px', marginBottom: 8 }}>
          <RoleIcon role={role} size={42} radius={4} />
          <div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: 'var(--bone-100)', margin: 0 }}>{role.name}</p>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: role.alignment === 'evil' ? 'var(--blood-hi)' : 'var(--good)', margin: '3px 0 0' }}>{role.type}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        <Fact k="Asiento" v={`#${seat}`} />
        <Fact k="Estado" v={target.alive ? '● Vivo' : '☠ Muerto'} color={target.alive ? 'var(--good)' : 'var(--blood-hi)'} />
        <Fact k="Conexión" v={`${pres.dot} ${pres.text}`} color={pres.color} />
        <Fact k="Voto fantasma" v={target.alive ? '—' : (target.deadVoteNominationId ? 'Gastado' : 'Disponible')} />
        {target.discordChannel && <Fact k="Canal" v={target.discordChannel} />}
      </div>

      {/* Rol real vs rol creído */}
      {(believed || drunkAs) && (
        <div style={{ background: 'rgba(168,58,45,0.12)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', margin: 0 }}>
            <strong>Real:</strong> {role?.name || '?'} · <strong>Cree ser:</strong> {(believed || drunkAs)?.name}
          </p>
          <p style={warn}>
            {target.role === 'DRUNK'
              ? 'Su habilidad NO funciona nunca.'
              : target.role === 'MARIONETTE'
                ? 'Este jugador no sabe que es malvado.'
                : 'Este jugador no ve su personaje real.'}
          </p>
        </div>
      )}

      {/* Fichas activas */}
      <p style={label}>Fichas y estados</p>
      {(target.tokens && target.tokens.length > 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
          {target.tokens.map(t => {
            // `t.img` viene resuelto del servidor (arte de estado o del rol
            // dueño); ROLE_BY_ID es solo el respaldo.
            const tRole = t.img ? { img: t.img, name: t.label } : ROLE_BY_ID[t.roleId];
            const owner = ROLE_BY_ID[t.roleId]?.name;
            return (
              <div key={t.uid || t.instanceId} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '6px 8px' }}>
                <RoleIcon role={tRole} size={26} radius="50%" alt="" />
                <div>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-50)', margin: 0, fontWeight: 600 }}>
                    {t.label}{t.ordinalOf > 1 ? ` ${t.ordinal}/${t.ordinalOf}` : ''}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)' }}>
                      {' · '}{expiryLabel(t)}{owner ? ` · ${owner}` : ''}
                    </span>
                  </p>
                  {TOKEN_EXPLAIN[t.type] && <p style={hint}>{TOKEN_EXPLAIN[t.type]}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ ...hint, marginBottom: 8 }}>Sin fichas activas.</p>
      )}
      <StatusChips player={target} />

      {/* Sospechas recibidas */}
      {Array.isArray(target.accusations) && target.accusations.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ ...label, color: 'var(--moon)' }}>👁 Sospechas ({target.accusations.length})</p>
          {target.accusations.map((a, i) => {
            const sr = ROLE_BY_ID[a.roleId];
            return (
              <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-300)', margin: 0 }}>
                <strong style={{ color: 'var(--bone-100)' }}>{a.accuserName}</strong> cree que es <strong style={{ color: 'var(--gold-hot)' }}>{sr?.name || a.roleId}</strong>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Fact({ k, v, color }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '5px 8px' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--bone-500)', margin: 0 }}>{k}</p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: color || 'var(--bone-100)', margin: '2px 0 0' }}>{v}</p>
    </div>
  );
}

// ── Pestaña: Acciones ────────────────────────────────────────────────
function ActionsTab({ target, send, onClose }) {
  const [confirmKill, setConfirmKill] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [newName, setNewName] = useState('');

  const killWarnings = [];
  if (target.protected) killWarnings.push('🛡 Protegido esta noche (Monje / Posadero / Marinero)');
  if (target.role === 'SOLDIER' && !target.poisoned) killWarnings.push('⚔ Soldado: inmune a ataques del Demonio');
  if (target.role === 'FOOL' && target.foolUsed === false && !target.poisoned) killWarnings.push('🃏 Bufón: primera muerte anulada (se consumirá)');
  if (target.role === 'SAILOR' && !target.poisoned) killWarnings.push('⚓ Marinero: no puede morir');
  if (target.role === 'VIZIER' && !target.poisoned) killWarnings.push('👑 Visir: no puede morir durante el día');
  if (target.type === 'demon') killWarnings.push('👹 Es el Demonio: al morir se aplica la cadena de sucesión (Mujer Escarlata, Mente Maestra…)');

  const act = (type, payload) => send(type, payload);
  // actorId: null → la ficha se atribuye al NARRADOR. Antes se mandaba
  // `target.id` y salía con la cara de la propia víctima, además de convivir
  // con la ficha del Envenenador real como si fueran dos venenos distintos.
  const nightAct = (actionType) => send('NIGHT_NARRATOR_ACTION', { actorId: null, actionType, targetIds: [target.id] });

  return (
    <div>
      <p style={label}>Vida</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => act('REVEAL_ROLE', { playerId: target.id })} className="btn-action primary" style={{ flex: 1 }}>Revelar personaje</button>
        {target.alive
          ? <button onClick={() => setConfirmKill(true)} className="btn-action danger" style={{ flex: 1 }}>Matar jugador</button>
          : <button onClick={() => { act('REVIVE_PLAYER', { playerId: target.id }); onClose(); }} className="btn-action" style={{ flex: 1 }}>Revivir jugador</button>}
      </div>

      {confirmKill && target.alive && (
        <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(168,58,45,0.12)', border: '1px solid var(--blood-dim)', borderRadius: 4 }}>
          {killWarnings.map((w, i) => <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-200)', margin: '2px 0', fontStyle: 'italic' }}>{w}</p>)}
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--blood-hi)', fontWeight: 600, margin: '8px 0' }}>¿Confirmar muerte de {target.name}?</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { act('KILL_PLAYER', { playerId: target.id }); onClose(); }} className="btn-action danger" style={{ flex: 1 }}>Confirmar muerte</button>
            <button onClick={() => setConfirmKill(false)} className="btn-night">Cancelar</button>
          </div>
        </div>
      )}

      <p style={label}>Estados</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <button onClick={() => nightAct('POISON')} className="btn-night" style={{ fontSize: 10 }}>☠ Envenenar</button>
        <button onClick={() => nightAct('MAKE_DRUNK')} className="btn-night" style={{ fontSize: 10 }}>🍺 Emborrachar</button>
        <button onClick={() => nightAct('SAFE')} className="btn-night" style={{ fontSize: 10 }}>🛡 Proteger</button>
        <button onClick={() => nightAct('CLEAR_STATUS')} className="btn-night" style={{ fontSize: 10 }}>✨ Limpiar</button>
        <button onClick={() => act('CLEAR_STATUSES', { playerId: target.id })} className="btn-night" style={{ fontSize: 10 }}>🗑 Quitar fichas</button>
      </div>

      <p style={label}>Sesión y voz</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button onClick={() => act('MOVE_TO_SECRET', { targetPlayerId: target.id })} className="btn-night" style={{ fontSize: 10 }}>🚪 Confesionario</button>
        <button onClick={() => act('MOVE_NARRATOR_TO_ROOM', { playerId: target.id })} className="btn-night" style={{ fontSize: 10 }}>🚶 Ir a su habitación</button>
      </div>

      <p style={{ ...label, marginTop: 12 }}>Quién ocupa el asiento</p>
      <p style={{ ...hint, marginTop: 0, marginBottom: 6 }}>
        Conexión: <b style={{ color: (PRESENCE[target.presence] || PRESENCE.offline).color }}>
          {(PRESENCE[target.presence] || PRESENCE.offline).text}
        </b>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <button
          onClick={() => { if (confirm(`¿Desconectar a ${target.name}? Su asiento queda libre para volver a entrar; conserva personaje y fichas.`)) act('KICK_PLAYER_SESSION', { playerId: target.id }); }}
          className="btn-night" style={{ fontSize: 10, color: 'var(--blood-hi)' }}>
          ⏏ Desconectar
        </button>
        <button onClick={() => setReplacing(r => !r)} className="btn-night"
          style={{ fontSize: 10, borderColor: replacing ? 'var(--gold)' : undefined, color: replacing ? 'var(--gold)' : undefined }}>
          🔄 Reemplazar jugador
        </button>
      </div>

      {replacing && (
        <div style={{ background: 'rgba(0,0,0,0.25)', border: 'var(--hairline)', borderRadius: 4, padding: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del sustituto"
            style={{ ...input, marginBottom: 6 }} />
          <p style={hint}>
            El asiento conserva personaje, fichas, vivo/muerto y votos. Se cierra la sesión
            de {target.name} y el sustituto entra con el nombre nuevo.
          </p>
          <button
            onClick={() => {
              if (!newName.trim()) return;
              act('REPLACE_PLAYER', { playerId: target.id, newName: newName.trim(), discordId: null, discordTag: null, avatar: null });
              setNewName(''); setReplacing(false); onClose();
            }}
            disabled={!newName.trim()}
            className="btn-action primary" style={{ width: '100%', marginTop: 8, opacity: newName.trim() ? 1 : 0.4 }}>
            Ceder el asiento a {newName.trim() || '…'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pestaña: Rol ─────────────────────────────────────────────────────
function RoleTab({ target, game, send, onClose }) {
  const [roleId, setRoleId] = useState(target.role || '');
  const [notify, setNotify] = useState(true);
  const [mode, setMode] = useState('real');
  const [all, setAll] = useState(false);

  // Solo los personajes del guion en curso. El compendio completo queda tras
  // una casilla, porque repartir fuera de guion es la excepción, no la norma.
  const pool = useMemo(() => {
    const script = scriptRoles(game);
    if (!all) return script;
    const ids = new Set(script.map(r => r.id));
    return [...script, ...ALL_ROLES.filter(r => !ids.has(r.id))];
  }, [game, all]);
  const inScript = useMemo(() => new Set(scriptRoles(game).map(r => r.id)), [game]);

  const chosen = pool.find(r => r.id === roleId) || ROLE_BY_ID[roleId];
  const createsDemon = chosen?.type === 'demon' && target.type !== 'demon';
  const removesDemon = target.type === 'demon' && chosen && chosen.type !== 'demon';

  const apply = () => {
    if (!roleId) return;
    send('SET_PLAYER_ROLE', { playerId: target.id, roleId, notify, mode });
    onClose();
  };

  return (
    <div>
      <p style={label}>Cambiar personaje a media partida</p>
      <select value={roleId} onChange={e => setRoleId(e.target.value)} style={{ ...input, marginBottom: 6 }}>
        <option value="">— Elige personaje —</option>
        {pool.map(r => (
          <option key={r.id} value={r.id}>
            {inScript.has(r.id) ? '' : '✦ '}{r.name} ({r.type})
          </option>
        ))}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bone-400)' }}>
          Buscar en todo el compendio (✦ = fuera del guion)
        </span>
      </label>

      <p style={label}>Qué se cambia</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          ['real', 'Personaje real'],
          ['believed', 'Solo rol creído'],
          ['both', 'Ambos'],
        ].map(([v, t]) => (
          <button key={v} onClick={() => setMode(v)} className="btn-night"
            style={{ flex: 1, fontSize: 10, borderColor: mode === v ? 'var(--gold)' : undefined, color: mode === v ? 'var(--gold)' : undefined }}>
            {t}
          </button>
        ))}
      </div>
      {mode === 'believed' && <p style={hint}>Para Cerenovus, Marioneta y Lunático: el personaje real no se toca.</p>}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)' }}>Avisar al jugador de su nuevo personaje</span>
      </label>
      <p style={hint}>
        {notify
          ? 'Recibirá «Tu personaje ha cambiado». Nadie más se entera.'
          : 'Cambio silencioso: seguirá viendo su personaje anterior.'}
      </p>

      {(createsDemon || removesDemon) && (
        <p style={warn}>
          {createsDemon
            ? '⚠ Esto crea un Demonio nuevo. La partida no terminará hasta que mueran todos.'
            : '⚠ Esto puede dejar la partida sin Demonios vivos y disparar el final.'}
        </p>
      )}

      <button onClick={apply} disabled={!roleId} className="btn-action primary"
        style={{ width: '100%', marginTop: 12, opacity: roleId ? 1 : 0.4 }}>
        Aplicar cambio de personaje
      </button>
      <p style={hint}>No toca su vida, sus fichas ni la fase de la partida.</p>
    </div>
  );
}

// ── Contador del narrador (estado de servidor) ───────────────────────
// El del Yaggababble se lleva durante el DÍA (cada vez que dice su frase) y la
// noche mata a tantos jugadores como marque. Por eso no puede ser useState:
// tiene que sobrevivir al cierre del panel y al cambio de fase.
export function NarratorCounter({ cfg, game, send, compact = false }) {
  const value = game.counters?.[cfg.key] ?? 0;
  const max = cfg.max ?? 9;
  const set = (n) => send('SET_COUNTER', { key: cfg.key, value: Math.max(0, Math.min(max, n)) });
  return (
    <>
      <p style={label}>{cfg.label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button className="btn-night" style={{ fontSize: 14, padding: '2px 10px' }} onClick={() => set(value - 1)}>−</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: compact ? 16 : 20, color: 'var(--gold-hot)', minWidth: 28, textAlign: 'center' }}>{value}</span>
        <button className="btn-night" style={{ fontSize: 14, padding: '2px 10px' }} onClick={() => set(value + 1)}>+</button>
        <button className="btn-night" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => set(0)}>Reiniciar</button>
        <span style={{ ...hint, margin: 0 }}>
          {value === 0 ? 'no mata a nadie esta noche' : `esta noche elige ${value} víctima${value > 1 ? 's' : ''}`}
        </span>
      </div>
    </>
  );
}

// ── Pestaña: Habilidad ───────────────────────────────────────────────
export function AbilityTab({ target, game, send, onClose }) {
  const role = target.role ? ROLE_BY_ID[target.role] : null;
  const cfg = target.role ? panelForRole(target.role, game.phase) : null;
  // Tiene panel, pero no en esta fase: se lo decimos al narrador en vez de callarnos.
  const cfgAny = target.role ? ABILITY_PANELS[target.role] : null;
  const [targets, setTargets] = useState([]);
  const [text, setText] = useState('');
  const [pickedRole, setPickedRole] = useState('');
  // El contador del Yaggababble vive en el servidor: se lleva durante el DÍA
  // y la noche lo consume, así que no puede ser estado local de React.
  const count = game.counters?.[ABILITY_PANELS[target.role]?.counter?.key] ?? 0;

  const living = game.players.filter(p => p.alive && p.id !== target.id);
  const pool = cfg?.deadOnly ? game.players.filter(p => !p.alive)
    : cfg?.allowSelf ? game.players.filter(p => p.alive)
    : living;

  const toggleTarget = (id) => {
    setTargets(prev => prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length >= (cfg?.targets || 1) ? [...prev.slice(1), id] : [...prev, id]);
  };

  const run = (actionType) => {
    send('NIGHT_NARRATOR_ACTION', { actorId: target.id, actionType, targetIds: targets });
    setTargets([]);
  };

  if (!role) return <p style={hint}>Este jugador aún no tiene personaje asignado.</p>;

  const notActiveNow = !cfg && !!cfgAny;

  return (
    <div>
      <p style={label}>{role.name}</p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)', margin: '0 0 10px' }}>
        «{role.ability}»
      </p>

      {(target.poisoned || target.drunkAs || target.role === 'DRUNK') && (
        <p style={warn}>⚠ Borracho o envenenado: su habilidad NO funcionará y su información puede ser falsa. Ejecútala igual para que no lo note.</p>
      )}

      {/* Guía: qué te toca decidir con este personaje AHORA mismo */}
      {(game.roleHints || []).filter(h => h.playerId === target.id).map((h, i) => (
        <div key={'h' + i} style={{
          borderLeft: `2px solid ${h.severity === 'danger' ? 'var(--blood-hi)' : 'var(--gold-hot)'}`,
          paddingLeft: 8, margin: '10px 0',
        }}>
          <p style={{ ...label, color: h.severity === 'danger' ? 'var(--blood-hi)' : 'var(--gold-hot)' }}>🎙 Te toca decidir</p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', margin: '0 0 3px' }}>{h.text}</p>
          {h.needs && <p style={{ ...hint, margin: 0 }}>▸ {h.needs}</p>}
        </div>
      ))}

      {cfg?.note && (
        <p style={{ ...hint, borderLeft: '2px solid var(--gold)', paddingLeft: 8, margin: '10px 0' }}>{cfg.note}</p>
      )}

      {cfg?.once && target[cfg.once] && (
        <p style={warn}>Ya usó su habilidad de una sola vez.</p>
      )}

      {notActiveNow && <p style={hint}>Su panel no aplica en esta fase, pero puedes usar las acciones universales.</p>}

      {!cfg && !cfgAny && <p style={hint}>Habilidad pasiva o sin controles — nada que ejecutar aquí.</p>}

      {/* Selector de objetivos */}
      {cfg && cfg.targets > 0 && (
        <>
          <p style={label}>Objetivos ({targets.length}/{cfg.targets})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, maxHeight: 140, overflowY: 'auto' }}>
            {pool.map(p => (
              <button key={p.id} onClick={() => toggleTarget(p.id)} className="btn-night"
                style={{ fontSize: 10, borderColor: targets.includes(p.id) ? 'var(--gold)' : undefined, color: targets.includes(p.id) ? 'var(--gold)' : undefined }}>
                {targets.includes(p.id) && cfg.ordered ? `${targets.indexOf(p.id) + 1}. ` : ''}{p.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selector de personaje */}
      {cfg?.pickRole && (
        <>
          <p style={label}>Personaje</p>
          <select value={pickedRole} onChange={e => setPickedRole(e.target.value)} style={{ ...input, marginBottom: 10 }}>
            <option value="">— Elige personaje —</option>
            {scriptRoles(game)
              .filter(r => cfg.demonOnly ? r.type === 'demon' : cfg.anyRole ? true : true)
              .map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
          </select>
          {targets.length > 0 && pickedRole && (
            <button className="btn-action primary" style={{ width: '100%', marginBottom: 10 }}
              onClick={() => { send('SET_PLAYER_ROLE', { playerId: targets[0], roleId: pickedRole, notify: true, mode: cfg.madness ? 'believed' : 'real' }); setTargets([]); setPickedRole(''); }}>
              Aplicar «{ROLE_BY_ID[pickedRole]?.name}» a {game.players.find(p => p.id === targets[0])?.name}
            </button>
          )}
        </>
      )}

      {/* Llevar a la sala privada: Pescador, Artista, Erudito, Maestro, Amnésico */}
      {cfg?.privateRoom && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className="btn-action primary" style={{ flex: 1, fontSize: 11 }}
            onClick={() => send('MOVE_TO_SECRET', { targetPlayerId: target.id })}>
            🚪 Llevarlo al confesionario
          </button>
          <button className="btn-night" style={{ flex: 1, fontSize: 11 }}
            onClick={() => send('MOVE_NARRATOR_TO_ROOM', { playerId: target.id })}>
            🚶 Ir yo a su sala
          </button>
        </div>
      )}

      {/* Contador (Yaggababble: veces que dijo su frase hoy) */}
      {cfg?.counter && (
        <>
          <NarratorCounter cfg={cfg.counter} game={game} send={send} />
          {count > 0 && targets.length === count && (
            <button className="btn-action danger" style={{ width: '100%', marginBottom: 10 }}
              onClick={() => run(cfg.action)}>
              💀 Matar a {targets.map(id => game.players.find(p => p.id === id)?.name).join(', ')}
            </button>
          )}
        </>
      )}

      {/* Cambio de bando (Político) */}
      {cfg?.alignmentSwitch && (
        <button className="btn-action" style={{ width: '100%', marginBottom: 10 }}
          onClick={() => send('NIGHT_NARRATOR_ACTION', { actorId: target.id, actionType: cfg.action, targetIds: [] })}>
          🔄 Cambiarlo de bando (ahora es {target.alignment === 'evil' ? 'malvado' : 'bueno'})
        </button>
      )}

      {/* Texto que se guarda como dato de la partida (Amnésico) */}
      {cfg?.setText && (
        <>
          <p style={label}>{cfg.setText.label}</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2} style={{ ...input, marginBottom: 6, resize: 'vertical' }} />
          <button className="btn-action" style={{ width: '100%', marginBottom: 10 }}
            onClick={() => send('NIGHT_NARRATOR_ACTION', { actorId: target.id, actionType: cfg.setText.action, targetIds: [text] })}>
            {cfg.setText.button}
          </button>
          {game.amnesiacAbility && (
            <p style={{ ...hint, margin: '0 0 10px' }}>Habilidad fijada: «{game.amnesiacAbility}»</p>
          )}
        </>
      )}

      {/* Escala de respuesta (Amnésico frío/caliente, General bando ganador) */}
      {cfg?.scale && (
        <>
          <p style={label}>{cfg.scale.label}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {cfg.scale.options.map(o => (
              <button key={o.value} className="btn-night" style={{ flex: 1, fontSize: 11, minWidth: 78 }}
                onClick={() => send('NIGHT_NARRATOR_ACTION', { actorId: target.id, actionType: cfg.scale.action, targetIds: [o.value] })}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Respuesta binaria forzable */}
      {cfg?.toggle && (
        <>
          <p style={label}>Respuesta</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {cfg.toggle.map(opt => (
              <button key={opt} className="btn-night" style={{ flex: 1, fontSize: 10 }}
                onClick={() => send('NIGHT_NARRATOR_ACTION', { actorId: target.id, nightInfo: `${role.name}\n${opt}` })}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Texto libre que se envía como información nocturna */}
      {(cfg?.freeText || cfg?.twoTexts) && (
        <>
          <p style={label}>{cfg.freeText || cfg.twoTexts.join(' / ')}</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ ...input, marginBottom: 8, resize: 'vertical' }} />
          <button className="btn-action" style={{ width: '100%', marginBottom: 10 }}
            onClick={() => { send('NIGHT_NARRATOR_ACTION', { actorId: target.id, nightInfo: `${role.name}\n${text}` }); setText(''); }}>
            Enviárselo en privado
          </button>
        </>
      )}

      {/* Confirmación de sí/no */}
      {cfg?.confirm && (
        <button className="btn-night" style={{ width: '100%', fontSize: 11, marginBottom: 10 }}
          onClick={() => send('NIGHT_NARRATOR_ACTION', { actorId: target.id, nightInfo: `${role.name}\nConfirmado por el narrador` })}>
          ✓ {cfg.confirm}
        </button>
      )}

      {/* Ejecutar la acción nocturna programada */}
      {cfg?.action && !cfg.counter && targets.length === cfg.targets && cfg.targets > 0 && (
        <button className="btn-action primary" style={{ width: '100%' }} onClick={() => run(cfg.action)}>
          Ejecutar habilidad de {role.name}
        </button>
      )}
      {cfg?.action && cfg.targets === 0 && !cfg.scale && !cfg.alignmentSwitch && (
        <button className="btn-action primary" style={{ width: '100%' }} onClick={() => run(cfg.action)}>
          Generar información de {role.name}
        </button>
      )}
      {/* Segunda acción del mismo personaje (Lleech: marcar anfitrión) */}
      {cfg?.altAction && targets.length === 1 && (
        <button className="btn-night" style={{ width: '100%', marginTop: 6, fontSize: 11 }}
          onClick={() => run(cfg.altAction.action)}>
          {cfg.altAction.label} → {game.players.find(p => p.id === targets[0])?.name}
        </button>
      )}
      {cfg?.allowNone && (
        <button className="btn-night" style={{ width: '100%', marginTop: 6, fontSize: 11 }}
          onClick={() => { send('NIGHT_NARRATOR_ACTION', { actorId: target.id, actionType: cfg.action, targetIds: [] }); setTargets([]); }}>
          No elegir a nadie
        </button>
      )}

      {/* Exterminador: disparo único */}
      {cfg?.send === 'SLAYER_ACTION' && targets.length === 1 && (
        <button className="btn-action primary" style={{ width: '100%' }}
          onClick={() => { send('SLAYER_ACTION', { slayerId: target.id, targetId: targets[0] }); onClose(); }}>
          🏹 Disparo del Exterminador → {game.players.find(p => p.id === targets[0])?.name}
        </button>
      )}

      {/* Visir: ejecución sin votación */}
      {cfg?.executeButton && targets.length === 1 && (
        <button className="btn-action danger" style={{ width: '100%' }}
          onClick={() => { send('KILL_PLAYER', { playerId: targets[0] }); onClose(); }}>
          👑 Ejecutar sin votación a {game.players.find(p => p.id === targets[0])?.name}
        </button>
      )}

      {/* Manitas / Mutante: matar cuando quiera el narrador */}
      {cfg?.killButton && target.alive && (
        <button className="btn-action danger" style={{ width: '100%' }}
          onClick={() => { send('KILL_PLAYER', { playerId: target.id }); onClose(); }}>
          Matar a {target.name} ahora
        </button>
      )}

      {/* Paneles propios */}
      {cfg?.psychopathPanel && <PsychopathPanel target={target} game={game} send={send} />}
      {cfg?.wishPanel && <WishNarratorPanel game={game} send={send} />}
    </div>
  );
}

// ── Psicópata: asesinato diurno ──────────────────────────────────────
function PsychopathPanel({ target, game, send }) {
  const [victim, setVictim] = useState('');
  const canKill = game.phase === 'day' && target.alive;
  return (
    <div style={{ marginTop: 12, borderTop: 'var(--hairline-bone)', paddingTop: 12 }}>
      <p style={label}>🔪 Asesinato diurno</p>
      {!canKill && <p style={hint}>Solo durante el día y ANTES de abrir nominaciones.</p>}
      {canKill && (
        <>
          <select value={victim} onChange={e => setVictim(e.target.value)} style={{ ...input, marginBottom: 8 }}>
            <option value="">— Víctima anunciada en público —</option>
            {game.players.filter(p => p.alive && p.id !== target.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn-action danger" style={{ width: '100%' }} disabled={!victim}
            onClick={() => { send('PSYCHOPATH_DAY_KILL', { psychopathId: target.id, targetId: victim }); setVictim(''); }}>
            Matar en público
          </button>
          <p style={hint}>Una vez al día. El Psicópata queda expuesto ante todos.</p>
        </>
      )}
    </div>
  );
}

// ── Hechicero: panel de deseos del narrador ──────────────────────────
function WishNarratorPanel({ game, send }) {
  const [catalog, setCatalog] = useState([]);
  const [entry, setEntry] = useState(null);
  const [targetId, setTargetId] = useState('');
  const [targetId2, setTargetId2] = useState('');
  const [roleId, setRoleId] = useState('');
  const [winner, setWinner] = useState('good');
  const [price, setPrice] = useState('');
  const [clue, setClue] = useState('');
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    fetch('/api/wishes').then(r => r.json()).then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const wish = game.wish;
  if (!wish || wish.status === 'none') {
    return <div style={{ marginTop: 12, borderTop: 'var(--hairline-bone)', paddingTop: 12 }}>
      <p style={label}>🧙 Deseos</p>
      <p style={hint}>El Hechicero aún no ha pedido su deseo.</p>
    </div>;
  }

  const pickEntry = (e) => {
    setEntry(e);
    setPrice(e.price || '');
    setClue(e.clue || '');
  };

  const applyEntry = () => {
    if (!entry) return;
    send('WISH_APPLY', { apply: entry.apply, targetId, targetId2, roleId, winner });
    send('WISH_SET_TERMS', { price, clue });
    setEntry(null); setTargetId(''); setTargetId2(''); setRoleId('');
  };

  const groups = [...new Set(catalog.map(c => c.group))];

  return (
    <div style={{ marginTop: 12, borderTop: 'var(--hairline-bone)', paddingTop: 12 }}>
      <p style={label}>🧙 Deseo del Hechicero</p>

      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', margin: 0 }}>«{wish.text}»</p>
        <p style={hint}>Estado: {({ pending: 'pendiente', granted: 'concedido', denied_retry: 'denegado, puede pedir otro', denied: 'denegado en firme' })[wish.status] || wish.status}</p>
      </div>

      {wish.status === 'pending' && (
        <>
          <button className="btn-night" style={{ width: '100%', fontSize: 11, marginBottom: 8 }}
            onClick={() => send('MOVE_NARRATOR_TO_ROOM', { playerId: game.players.find(p => p.role === 'WIZARD')?.id })}>
            🚶 Ir a su habitación y hablarlo en privado
          </button>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button className="btn-action primary" style={{ flex: 1, fontSize: 11 }} onClick={() => send('WISH_RESOLVE', { decision: 'grant' })}>Conceder</button>
            <button className="btn-night" style={{ flex: 1, fontSize: 11 }} onClick={() => send('WISH_RESOLVE', { decision: 'retry' })}>Que pida otro</button>
            <button className="btn-action danger" style={{ flex: 1, fontSize: 11 }} onClick={() => send('WISH_RESOLVE', { decision: 'deny' })}>Denegar</button>
          </div>
        </>
      )}

      {wish.status === 'granted' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button className="btn-night" style={{ flex: 1, fontSize: 10, borderColor: !freeMode ? 'var(--gold)' : undefined }} onClick={() => setFreeMode(false)}>Catálogo</button>
            <button className="btn-night" style={{ flex: 1, fontSize: 10, borderColor: freeMode ? 'var(--gold)' : undefined }} onClick={() => setFreeMode(true)}>Libre</button>
          </div>

          {!freeMode && (
            <>
              <select value={entry?.id || ''} onChange={e => pickEntry(catalog.find(c => c.id === e.target.value))} style={{ ...input, marginBottom: 8 }}>
                <option value="">— Elige un deseo del catálogo —</option>
                {groups.map(g => (
                  <optgroup key={g} label={g}>
                    {catalog.filter(c => c.group === g).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </optgroup>
                ))}
              </select>

              {entry?.needs === 'player' && (
                <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{ ...input, marginBottom: 8 }}>
                  <option value="">— Sobre qué jugador —</option>
                  {game.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {entry?.needs === 'twoPlayers' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <select value={targetId} onChange={e => setTargetId(e.target.value)} style={input}>
                    <option value="">— Jugador A —</option>
                    {game.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={targetId2} onChange={e => setTargetId2(e.target.value)} style={input}>
                    <option value="">— Jugador B —</option>
                    {game.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              {entry?.needs === 'playerAndRole' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <select value={targetId} onChange={e => setTargetId(e.target.value)} style={input}>
                    <option value="">— Jugador —</option>
                    {game.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={roleId} onChange={e => setRoleId(e.target.value)} style={input}>
                    <option value="">— Personaje —</option>
                    {scriptRoles(game).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}
              {entry?.needs === 'winner' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button className="btn-night" style={{ flex: 1, fontSize: 10, borderColor: winner === 'good' ? 'var(--gold)' : undefined }} onClick={() => setWinner('good')}>Ganan los buenos</button>
                  <button className="btn-night" style={{ flex: 1, fontSize: 10, borderColor: winner === 'evil' ? 'var(--gold)' : undefined }} onClick={() => setWinner('evil')}>Ganan los malos</button>
                </div>
              )}

              {entry && (
                <>
                  <p style={label}>Precio (privado)</p>
                  <textarea value={price} onChange={e => setPrice(e.target.value)} rows={2} style={{ ...input, marginBottom: 6, resize: 'vertical' }} />
                  <p style={label}>Pista pública</p>
                  <textarea value={clue} onChange={e => setClue(e.target.value)} rows={2} style={{ ...input, marginBottom: 8, resize: 'vertical' }} />
                  <button className="btn-action primary" style={{ width: '100%' }} onClick={applyEntry}>
                    Conceder «{entry.label}»
                  </button>
                </>
              )}
            </>
          )}

          {freeMode && (
            <>
              <p style={hint}>Usa las acciones universales del mini-panel de cada jugador para montar el deseo, y escribe aquí el precio y la pista.</p>
              <p style={label}>Precio (privado)</p>
              <textarea value={price} onChange={e => setPrice(e.target.value)} rows={2} style={{ ...input, marginBottom: 6, resize: 'vertical' }} />
              <p style={label}>Pista pública</p>
              <textarea value={clue} onChange={e => setClue(e.target.value)} rows={2} style={{ ...input, marginBottom: 8, resize: 'vertical' }} />
              <button className="btn-action" style={{ width: '100%' }} onClick={() => send('WISH_SET_TERMS', { price, clue })}>
                Guardar precio y pista
              </button>
            </>
          )}

          {/* Efectos ya aplicados */}
          {(wish.effects || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={label}>Efectos aplicados</p>
              {wish.effects.map((e, i) => (
                <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-300)', margin: '2px 0' }}>· {e.summary}</p>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="btn-night" style={{ flex: 1, fontSize: 10 }} onClick={() => send('WISH_ANNOUNCE', { withClue: false })}>
              📢 Anunciar sin pista
            </button>
            <button className="btn-night" style={{ flex: 1, fontSize: 10 }} onClick={() => send('WISH_ANNOUNCE', { withClue: true })}>
              📢 Anunciar con pista
            </button>
            <button className="btn-night" style={{ flex: 1, fontSize: 10 }} onClick={() => send('WISH_SET_TERMS', { priceRevealed: true })}>
              Revelarle el precio
            </button>
          </div>
          {wish.announced && <p style={hint}>Ya anunciado{wish.clue ? ` con la pista «${wish.clue}»` : ' sin pista'}.</p>}
        </>
      )}
    </div>
  );
}

// ── Barbero: paso pendiente del Demonio ──────────────────────────────
export function BarberPanel() {
  const { state, send } = useGame();
  const game = state.game;
  const pending = game?.barberPending;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  if (!pending) return null;

  return (
    <div style={{ background: 'rgba(168,58,45,0.12)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '10px 12px', marginBottom: 10 }}>
      <p style={label}>💈 Barbero — el Demonio puede intercambiar 2 personajes</p>
      <p style={hint}>
        {pending.narratorChooses
          ? 'No queda Demonio vivo: elige tú en su nombre, o declina.'
          : `Pregunta a ${pending.demonName}: puede señalar a dos jugadores o negar con la cabeza.`}
      </p>
      <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
        <select value={a} onChange={e => setA(e.target.value)} style={input}>
          <option value="">— Jugador A —</option>
          {game.players.map(p => <option key={p.id} value={p.id}>{p.name}{p.alive ? '' : ' ☠'}</option>)}
        </select>
        <select value={b} onChange={e => setB(e.target.value)} style={input}>
          <option value="">— Jugador B —</option>
          {game.players.map(p => <option key={p.id} value={p.id}>{p.name}{p.alive ? '' : ' ☠'}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-action primary" style={{ flex: 1, fontSize: 11 }} disabled={!a || !b || a === b}
          onClick={() => { send('BARBER_SWAP', { aId: a, bId: b }); setA(''); setB(''); }}>
          Intercambiar personajes
        </button>
        <button className="btn-night" style={{ flex: 1, fontSize: 11 }} onClick={() => send('BARBER_DECLINE', {})}>
          El Demonio declina
        </button>
      </div>
      <p style={hint}>Las alineaciones NO cambian. Ambos serán avisados de su nuevo personaje.</p>
    </div>
  );
}

// ── Roshambo: lo ven el Psicópata, su nominador y el narrador ────────
export function RoshamboBox() {
  const { state, send } = useGame();
  const game = state.game;
  const rs = game?.roshambo;
  if (!rs) return null;

  const isNarrator = !!game.isNarrator;
  const OPTIONS = [['piedra', '🪨'], ['papel', '📄'], ['tijera', '✂️']];

  return (
    <div style={{ background: 'rgba(168,58,45,0.15)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '12px 14px', marginBottom: 12 }}>
      <p style={label}>🎲 Piedra · Papel · Tijera</p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-100)', margin: '0 0 8px' }}>
        <strong>{rs.psychopathName}</strong> (Psicópata) contra <strong>{rs.opponentName}</strong>
      </p>
      <p style={hint}>El Psicópata solo muere si PIERDE. Empatar o ganar significa que vive. El día está gastado igualmente.</p>

      {!rs.result && (rs.iParticipate || isNarrator) && (
        <>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {OPTIONS.map(([v, emoji]) => (
              <button key={v} className="btn-night" style={{ flex: 1, fontSize: 13 }}
                disabled={!isNarrator && !!rs.myThrow}
                onClick={() => send('ROSHAMBO_THROW', { choice: v })}>
                {emoji} {v}
              </button>
            ))}
          </div>
          {rs.myThrow && <p style={hint}>Tu tirada: {rs.myThrow}. Esperando a la otra parte…</p>}
          {isNarrator && rs.waitingFor?.length > 0 && (
            <p style={hint}>Faltan por tirar: {rs.waitingFor.join(', ')}. Si alguien está desconectado, tira tú por él.</p>
          )}
        </>
      )}

      {rs.bothThrown && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--gold-hot)', margin: '10px 0 0' }}>
          {rs.psychopathName}: {rs.psychopathThrow} · {rs.opponentName}: {rs.opponentThrow} →{' '}
          {rs.result === 'opponent' ? 'el Psicópata MUERE' : rs.result === 'tie' ? 'empate: el Psicópata VIVE' : 'el Psicópata gana y VIVE'}
        </p>
      )}
    </div>
  );
}

// ── Hechicero: el jugador pide su deseo ──────────────────────────────
export function WishRequestBox() {
  const { state, send } = useGame();
  const game = state.game;
  const wish = game?.wish;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  if (!wish) return null;

  if (wish.canAsk) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '10px 12px', marginBottom: 12 }}>
        <p style={label}>🧙 Tu deseo</p>
        {!open ? (
          <button className="btn-action primary" style={{ width: '100%' }} onClick={() => setOpen(true)}>Pedir un deseo</button>
        ) : (
          <>
            <p style={hint}>Solo lo verá el Narrador. Puede concederlo, denegarlo o pedirte otro.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Deseo que…"
              style={{ ...input, margin: '8px 0', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-action primary" style={{ flex: 1 }} disabled={!text.trim()}
                onClick={() => { send('WISH_REQUEST', { text }); setText(''); setOpen(false); }}>
                Enviar al Narrador
              </button>
              <button className="btn-night" onClick={() => setOpen(false)}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Pista pública del deseo, si el narrador la anunció.
  if (wish.status === 'announced' || (wish.announced && wish.clue)) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '10px 12px', marginBottom: 12 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--gold-hot)', margin: 0, fontStyle: 'italic' }}>
          🧙 El Hechicero ha pedido un deseo{wish.clue ? `: «${wish.clue}»` : ''}
        </p>
      </div>
    );
  }

  // Estado del propio Hechicero.
  if (wish.text) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '10px 12px', marginBottom: 12 }}>
        <p style={label}>🧙 Tu deseo</p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-200)', margin: 0 }}>«{wish.text}»</p>
        <p style={hint}>
          {{ pending: 'El Narrador lo está considerando.', granted: 'Tus deseos son órdenes.', denied: 'Ya no te quedan deseos.' }[wish.status] || ''}
        </p>
        {wish.price && <p style={warn}>Precio: {wish.price}</p>}
      </div>
    );
  }
  return null;
}

// ── Sección completa del narrador dentro del mini-panel ──────────────
export default function NarratorTabs({ target, game, send, onClose }) {
  const [tab, setTab] = useState('info');
  const TABS = [['info', 'Info'], ['actions', 'Acciones'], ['role', 'Rol'], ['ability', 'Habilidad']];

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {TABS.map(([id, t]) => (
          <button key={id} onClick={() => setTab(id)} className="btn-night"
            style={{ flex: 1, fontSize: 10, padding: '5px 0', borderColor: tab === id ? 'var(--gold)' : undefined, color: tab === id ? 'var(--gold)' : undefined }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'info'    && <InfoTab    target={target} game={game} />}
      {tab === 'actions' && <ActionsTab target={target} send={send} onClose={onClose} />}
      {tab === 'role'    && <RoleTab    target={target} game={game} send={send} onClose={onClose} />}
      {tab === 'ability' && <AbilityTab target={target} game={game} send={send} onClose={onClose} />}
    </div>
  );
}
