import { useEffect, useRef, useState, useCallback } from 'react';

const DEADZONE = 0.5;
const HOLD_DELAY = 380;
const HOLD_INTERVAL = 130;

// Standard gamepad button indices
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

export default function GamepadController() {
  const [connected, setConnected] = useState(false);
  const prev = useRef({});
  const hold = useRef({});
  const idxRef = useRef(0);
  const prevScopeRef = useRef(null);
  const rafRef = useRef(null);

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

      // Reset focus when scope changes (modal opens/closes)
      const scope = getScope();
      if (scope !== prevScopeRef.current) {
        prevScopeRef.current = scope;
        idxRef.current = 0;
        const els = getFocusables(scope);
        applyFocus(els, 0);
      }

      // Merge physical buttons + left stick as virtual d-pad
      const pressed = gp.buttons.map(b => b.pressed || b.value > 0.5);
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
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
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [moveFocus, doConfirm, doCancel]);

  if (!connected) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(7,7,10,0.88)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(201,162,74,0.22)', borderRadius: 6,
      padding: '6px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--mono)', fontSize: 11,
      color: 'var(--bone-400)', zIndex: 999,
      letterSpacing: '0.08em',
      pointerEvents: 'none', userSelect: 'none',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: 'var(--good)', fontSize: 7 }}>●</span>
      <span style={{ color: 'var(--bone-300)' }}>MANDO</span>
      <span style={{ color: 'var(--bone-600)' }}>·</span>
      <span><span style={{ color: 'var(--gold)' }}>D-PAD</span> navega</span>
      <span style={{ color: 'var(--bone-600)' }}>·</span>
      <span><span style={{ color: 'var(--gold)' }}>A</span> confirma</span>
      <span style={{ color: 'var(--bone-600)' }}>·</span>
      <span><span style={{ color: 'var(--gold)' }}>B</span> cancela</span>
    </div>
  );
}
