import { useEffect, useRef, useState, useCallback } from 'react';

const DEADZONE = 0.5;
const HOLD_DELAY = 380;
const HOLD_INTERVAL = 130;

const BTN_A = 0, BTN_B = 1, BTN_LB = 4, BTN_RB = 5;
const BTN_UP = 12, BTN_DOWN = 13, BTN_LEFT = 14, BTN_RIGHT = 15;
const NAV_BTNS = new Set([BTN_UP, BTN_DOWN, BTN_LEFT, BTN_RIGHT, BTN_LB, BTN_RB]);

function getScope() {
  const overlays = document.querySelectorAll('.modal-overlay');
  return overlays.length > 0 ? overlays[overlays.length - 1] : document.body;
}

function getFocusables(scope) {
  return Array.from(
    scope.querySelectorAll('button:not([disabled]), [data-gamepad]')
  ).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }).sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const rowA = Math.round(ar.top / 44);
    const rowB = Math.round(br.top / 44);
    return rowA !== rowB ? rowA - rowB : ar.left - br.left;
  });
}

function applyFocus(elements, idx) {
  document.querySelectorAll('.gamepad-focused').forEach(el => el.classList.remove('gamepad-focused'));
  const el = elements[idx];
  if (el) {
    el.classList.add('gamepad-focused');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ── Visual components ─────────────────────────────────────────

function DpadIcon({ up, down, left, right }) {
  const S = 48, A = 16;
  const base = '#1a1815';
  const lit = '#c9a24a';
  const glow = 'rgba(201,162,74,0.7)';
  const border = 'rgba(201,162,74,0.18)';

  const Arm = ({ x, y, active, rx = 3 }) => (
    <rect x={x} y={y} width={A} height={A} rx={rx}
      fill={active ? lit : base}
      stroke={active ? lit : border} strokeWidth={active ? 1.5 : 1}
      style={{ filter: active ? `drop-shadow(0 0 5px ${glow})` : 'none' }}
    />
  );

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      {/* Arms */}
      <Arm x={A} y={0}    active={up}    rx={4} />
      <Arm x={A} y={A*2}  active={down}  rx={4} />
      <Arm x={0}  y={A}   active={left}  rx={4} />
      <Arm x={A*2} y={A}  active={right} rx={4} />
      {/* Center */}
      <rect x={A} y={A} width={A} height={A}
        fill={(up || down || left || right) ? '#2a2620' : '#141210'}
        stroke={border} strokeWidth={1} />
      {/* Arrow markers */}
      {up    && <polygon points={`${A+8},${5} ${A+4},${12} ${A+12},${12}`} fill="rgba(0,0,0,0.45)" />}
      {down  && <polygon points={`${A+8},${A*2+11} ${A+4},${A*2+4} ${A+12},${A*2+4}`} fill="rgba(0,0,0,0.45)" />}
      {left  && <polygon points={`${5},${A+8} ${12},${A+4} ${12},${A+12}`} fill="rgba(0,0,0,0.45)" />}
      {right && <polygon points={`${A*2+11},${A+8} ${A*2+4},${A+4} ${A*2+4},${A+12}`} fill="rgba(0,0,0,0.45)" />}
    </svg>
  );
}

function StickIcon({ x, y }) {
  const S = 40, R = 17;
  const cx = S / 2, cy = S / 2;
  const quantX = Math.round(x * 10) / 10;
  const quantY = Math.round(y * 10) / 10;
  const active = Math.abs(quantX) > 0.15 || Math.abs(quantY) > 0.15;
  const dotX = cx + quantX * (R - 7);
  const dotY = cy + quantY * (R - 7);

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <circle cx={cx} cy={cy} r={R} fill="#141210" stroke="rgba(201,162,74,0.2)" strokeWidth={1} />
      <line x1={cx} y1={cy - R + 5} x2={cx} y2={cy + R - 5} stroke="rgba(201,162,74,0.08)" strokeWidth={1} />
      <line x1={cx - R + 5} y1={cy} x2={cx + R - 5} y2={cy} stroke="rgba(201,162,74,0.08)" strokeWidth={1} />
      <circle cx={dotX} cy={dotY} r={6}
        fill={active ? '#c9a24a' : '#2e2b27'}
        stroke={active ? 'rgba(201,162,74,0.5)' : 'transparent'}
        strokeWidth={1}
        style={{ filter: active ? 'drop-shadow(0 0 5px rgba(201,162,74,0.9))' : 'none' }} />
    </svg>
  );
}

function BtnIcon({ label, active, color }) {
  const S = 28;
  const baseColor = '#141210';
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <circle cx={S / 2} cy={S / 2} r={S / 2 - 1.5}
        fill={active ? color : baseColor}
        stroke={active ? color : 'rgba(201,162,74,0.2)'} strokeWidth={active ? 1.5 : 1}
        style={{ filter: active ? `drop-shadow(0 0 6px ${color})` : 'none' }} />
      <text x={S / 2} y={S / 2 + 4} textAnchor="middle"
        fontSize={11} fontWeight="700" fontFamily="monospace"
        fill={active ? 'rgba(0,0,0,0.8)' : 'rgba(201,162,74,0.35)'}>
        {label}
      </text>
    </svg>
  );
}

// ── Main controller ───────────────────────────────────────────

const INIT_HUD = { up: false, down: false, left: false, right: false, a: false, b: false, sx: 0, sy: 0 };

export default function GamepadController() {
  const [connected, setConnected] = useState(false);
  const [hud, setHud] = useState(INIT_HUD);

  const prev = useRef({});
  const hold = useRef({});
  const idxRef = useRef(0);
  const prevScopeRef = useRef(null);
  const rafRef = useRef(null);
  const prevHudRef = useRef(INIT_HUD);

  const moveFocus = useCallback((delta) => {
    const scope = getScope();
    const els = getFocusables(scope);
    if (!els.length) return;
    idxRef.current = ((idxRef.current + delta) % els.length + els.length) % els.length;
    applyFocus(els, idxRef.current);
  }, []);

  const doConfirm = useCallback(() => {
    const scope = getScope();
    const els = getFocusables(scope);
    idxRef.current = Math.min(idxRef.current, els.length - 1);
    const el = els[idxRef.current];
    if (el) el.click();
  }, []);

  const doCancel = useCallback(() => {
    const closeBtn = document.querySelector('.modal-overlay .modal-close');
    if (closeBtn) { closeBtn.click(); return; }
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.click();
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setHud(INIT_HUD);
      document.querySelectorAll('.gamepad-focused').forEach(el => el.classList.remove('gamepad-focused'));
    };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  useEffect(() => {
    const handleBtn = (i) => {
      if (i === BTN_A) doConfirm();
      else if (i === BTN_B) doCancel();
      else if (i === BTN_UP || i === BTN_LEFT || i === BTN_LB) moveFocus(-1);
      else if (i === BTN_DOWN || i === BTN_RIGHT || i === BTN_RB) moveFocus(+1);
    };

    const poll = (now) => {
      rafRef.current = requestAnimationFrame(poll);
      const gp = Array.from(navigator.getGamepads()).find(Boolean);
      if (!gp) return;

      const scope = getScope();
      if (scope !== prevScopeRef.current) {
        prevScopeRef.current = scope;
        idxRef.current = 0;
        applyFocus(getFocusables(scope), 0);
      }

      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      const pressed = gp.buttons.map(b => b.pressed || b.value > 0.5);
      if (ax < -DEADZONE) pressed[BTN_LEFT]  = true;
      if (ax >  DEADZONE) pressed[BTN_RIGHT] = true;
      if (ay < -DEADZONE) pressed[BTN_UP]    = true;
      if (ay >  DEADZONE) pressed[BTN_DOWN]  = true;

      pressed.forEach((isPressed, i) => {
        const was = prev.current[i] || false;
        if (isPressed && !was) {
          handleBtn(i);
          if (NAV_BTNS.has(i)) hold.current[i] = now + HOLD_DELAY;
        } else if (isPressed && was && NAV_BTNS.has(i)) {
          if (hold.current[i] !== undefined && now >= hold.current[i]) {
            handleBtn(i);
            hold.current[i] = now + HOLD_INTERVAL;
          }
        } else if (!isPressed && was) {
          delete hold.current[i];
        }
        prev.current[i] = isPressed;
      });

      // Update HUD only when values change (avoid re-render flood)
      const next = {
        up: pressed[BTN_UP] || false,
        down: pressed[BTN_DOWN] || false,
        left: pressed[BTN_LEFT] || false,
        right: pressed[BTN_RIGHT] || false,
        a: pressed[BTN_A] || false,
        b: pressed[BTN_B] || false,
        sx: Math.round(ax * 10) / 10,
        sy: Math.round(ay * 10) / 10,
      };
      const ph = prevHudRef.current;
      if (
        next.up !== ph.up || next.down !== ph.down ||
        next.left !== ph.left || next.right !== ph.right ||
        next.a !== ph.a || next.b !== ph.b ||
        next.sx !== ph.sx || next.sy !== ph.sy
      ) {
        prevHudRef.current = next;
        setHud(next);
      }
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [moveFocus, doConfirm, doCancel]);

  if (!connected) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(7,7,10,0.88)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(201,162,74,0.2)', borderRadius: 8,
      padding: '8px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 999, pointerEvents: 'none', userSelect: 'none',
    }}>
      {/* D-pad */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <DpadIcon up={hud.up} down={hud.down} left={hud.left} right={hud.right} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: 'rgba(201,162,74,0.35)', textTransform: 'uppercase' }}>navega</span>
      </div>

      <div style={{ width: 1, height: 52, background: 'rgba(201,162,74,0.1)' }} />

      {/* Left stick */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <StickIcon x={hud.sx} y={hud.sy} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: 'rgba(201,162,74,0.35)', textTransform: 'uppercase' }}>stick</span>
      </div>

      <div style={{ width: 1, height: 52, background: 'rgba(201,162,74,0.1)' }} />

      {/* A / B */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BtnIcon label="A" active={hud.a} color="#4ade80" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em', color: 'rgba(201,162,74,0.5)' }}>confirma</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BtnIcon label="B" active={hud.b} color="#f87171" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em', color: 'rgba(201,162,74,0.5)' }}>cancela</span>
        </div>
      </div>
    </div>
  );
}
