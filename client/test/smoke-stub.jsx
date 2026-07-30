// stub de GameContext para el smoke test de render (se borra después)
import React from 'react';

const ROLES = ['POISONER', 'IMP', 'MONK', 'MAYOR', 'SOLDIER', 'EMPATH', 'RECLUSE', 'WIZARD'];

function mkGame(phase, extra = {}) {
  const players = ROLES.map((r, i) => ({
    id: 'p' + i, name: 'Jugador ' + i, role: r, alive: i !== 6,
    type: ['minion', 'demon', 'townfolk', 'townfolk', 'townfolk', 'townfolk', 'outsider', 'minion'][i],
    alignment: ['evil', 'evil', 'good', 'good', 'good', 'good', 'good', 'evil'][i],
    tokens: [], accusations: [], poisoned: false, discordId: null,
    nightInfo: i === 0 ? 'Envenenador: envenenaste a X.' : null,
  }));
  return {
    phase, dayNumber: 2, nightNumber: 2, campaignId: 'TROUBLE_BREWING',
    players, nominations: [], activeNomination: null, nightDeaths: ['p6'],
    advice: [{ severity: 'warn', text: 'Aviso largo de prueba para comprobar que el texto no se corta.' }],
    deferredEffects: [{ id: 'd1', label: 'El Barbero ha muerto: resuelve el intercambio.' }],
    roleHints: [{ severity: 'warn', playerId: 'p7', playerName: 'Jugador 7', roleId: 'WIZARD', roleName: 'Hechicero', alive: true, impaired: false, text: 'Deseo pendiente.', needs: 'Panel de deseos.' }],
    statusLog: [{ t: Date.now(), night: 2, day: 2, message: 'Envenenado → Jugador 3' }],
    campaignRoles: [], wish: { status: 'pending', text: 'quiero ser demonio' },
    ...extra,
  };
}

export const SCENARIOS = {
  lobby: mkGame('lobby'),
  role_reveal: mkGame('role_reveal'),
  first_night: mkGame('first_night', { nightNumber: 1 }),
  night: mkGame('night'),
  day: mkGame('day'),
  nominations: mkGame('nominations', {
    nominations: [{ id: 'n1', nominatorId: 'p2', nomineeId: 'p3', nominatorName: 'Jugador 2', nomineeName: 'Jugador 3', votes: ['p2', 'p3'], against: [], resolved: true, meetsThreshold: true, executed: false, tally: 2 }],
  }),
  voting: mkGame('voting', {
    activeNomination: 'n1',
    nominations: [{ id: 'n1', nominatorId: 'p2', nomineeId: 'p3', nominatorName: 'Jugador 2', nomineeName: 'Jugador 3', votes: [], against: [], resolved: false, stage: 'voting', voteOrder: ['p2', 'p3'], voteTurnIndex: 0, pendingVoters: ['p3'] }],
  }),
};

let CURRENT = SCENARIOS.night;
export function setScenario(k) { CURRENT = SCENARIOS[k]; }
export function GameProvider({ children }) { return <>{children}</>; }
export function useGame() {
  return {
    state: {
      game: CURRENT, isNarrator: true, playerId: null,
      discordMembers: [], rankings: {}, campaigns: [], importResult: null,
    },
    send: () => {},
  };
}
