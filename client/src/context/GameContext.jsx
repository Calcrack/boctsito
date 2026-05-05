import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';

const GameContext = createContext(null);

// Local dev → ws://localhost:3001
// Via tunnel (HTTPS) → wss://tunnel-host (same port 443, same host)
const WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `ws://localhost:3001`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

const initialState = {
  connected: false,
  socketId: null,
  gameId: null,
  playerId: null,
  playerName: null,
  isNarrator: false,
  game: null,
  playerList: [],
  notifications: [],
  discordMembers: [],
  broadcastEvent: null,
  error: null,
  rankings: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true, socketId: action.payload.socketId };
    case 'DISCONNECTED':
      return { ...state, connected: false };
    case 'NARRATOR_OK':
      return { ...state, isNarrator: true, gameId: action.payload.gameId, error: null };
    case 'PLAYER_OK':
      return { ...state, playerId: action.payload.playerId, playerName: action.payload.playerName, gameId: 'main', error: null };
    case 'PLAYER_LIST':
      return { ...state, playerList: action.payload.players };
    case 'GAME_STATE':
      return { ...state, game: action.payload };
    case 'DISCORD_MEMBERS':
      return { ...state, discordMembers: action.payload.members };
    case 'ADD_NOTIFICATION': {
      const notif = { id: Date.now() + Math.random(), ...action.payload };
      return { ...state, notifications: [...state.notifications.slice(-9), notif] };
    }
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'SET_BROADCAST':
      return { ...state, broadcastEvent: action.payload };
    case 'CLEAR_BROADCAST':
      return { ...state, broadcastEvent: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_RANKINGS':
      return { ...state, rankings: action.payload };
    case 'LOGOUT':
      return { ...initialState, connected: state.connected, socketId: state.socketId };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const autoRejoinRef = useRef(null); // { playerName } persisted across reconnects

  const logout = useCallback(() => {
    localStorage.removeItem('boct_session');
    autoRejoinRef.current = null;
    dispatch({ type: 'LOGOUT' });
  }, []);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const connect = useCallback(() => {
    const rs = wsRef.current?.readyState;
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
    clearTimeout(reconnectTimerRef.current);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    let heartbeatId;
    ws.onopen = () => {
      if (wsRef.current !== ws) { ws.close(); return; }
      dispatch({ type: 'CONNECTED', payload: {} });
      // Keep connection alive in throttled/background browser tabs
      heartbeatId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 25000);
    };
    ws.onclose = () => {
      clearInterval(heartbeatId);
      if (wsRef.current !== ws) return; // stale close, ignore
      dispatch({ type: 'DISCONNECTED' });
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => {};
    ws.onmessage = (e) => {
      const { type, payload } = JSON.parse(e.data);
      switch (type) {
        case 'CONNECTED':
          dispatch({ type: 'CONNECTED', payload });
          if (payload.socketId) {
            const saved = autoRejoinRef.current
              || JSON.parse(localStorage.getItem('boct_session') || 'null');
            if (saved?.playerName) {
              autoRejoinRef.current = saved;
              ws.send(JSON.stringify({ type: 'PLAYER_JOIN', payload: { playerName: saved.playerName } }));
            }
          }
          break;
        case 'NARRATOR_OK':
          dispatch({ type: 'NARRATOR_OK', payload });
          break;
        case 'PLAYER_OK':
          dispatch({ type: 'PLAYER_OK', payload });
          autoRejoinRef.current = { playerName: payload.playerName };
          localStorage.setItem('boct_session', JSON.stringify({ playerName: payload.playerName }));
          break;
        case 'PLAYER_LIST':
          dispatch({ type: 'PLAYER_LIST', payload });
          break;
        case 'GAME_STATE':
          dispatch({ type: 'GAME_STATE', payload });
          break;
        case 'DISCORD_MEMBERS':
          dispatch({ type: 'DISCORD_MEMBERS', payload });
          break;
        case 'NOTIFICATION': {
          const id = Date.now() + Math.random();
          dispatch({ type: 'ADD_NOTIFICATION', payload: { ...payload, id } });
          setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 5000);
          break;
        }
        case 'ERROR':
          dispatch({ type: 'SET_ERROR', payload: payload.message });
          setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 4000);
          break;
        case 'CHANNEL_FULL': {
          const id = Date.now() + Math.random();
          const msg = `Canal ${payload.channel} lleno (máx. ${payload.limit})`;
          dispatch({ type: 'ADD_NOTIFICATION', payload: { message: msg, type: 'error', id } });
          setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 4000);
          break;
        }
        case 'BROADCAST_EVENT':
          dispatch({ type: 'SET_BROADCAST', payload });
          setTimeout(() => dispatch({ type: 'CLEAR_BROADCAST' }), 6000);
          break;
        case 'GAME_OVER': {
          const id = Date.now() + Math.random();
          const msg = `Ganó el equipo ${payload.winner === 'good' ? 'del Bien' : 'del Mal'}`;
          dispatch({ type: 'ADD_NOTIFICATION', payload: { message: msg, type: 'gameover', id } });
          setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 8000);
          break;
        }
        case 'RANKINGS':
          dispatch({ type: 'SET_RANKINGS', payload });
          break;
        case 'KICKED_SESSION': {
          // Another tab/device joined as same player — rejoin immediately
          const saved2 = autoRejoinRef.current || JSON.parse(localStorage.getItem('boct_session') || 'null');
          if (saved2?.playerName && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PLAYER_JOIN', payload: { playerName: saved2.playerName } }));
          }
          break;
        }
        case 'PONG':
          break;
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <GameContext.Provider value={{ state, dispatch, send, logout }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() { return useContext(GameContext); }
