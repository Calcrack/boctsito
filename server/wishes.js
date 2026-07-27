// ── Catálogo de deseos del Hechicero ─────────────────────────────────
// Cada entrada trae el efecto mecánico ya programado más un precio y una
// pista sugeridos, ambos editables por el narrador antes de aplicar.
//
// `effect` describe qué necesita la interfaz para resolverlo:
//   needs: 'none' | 'player' | 'twoPlayers' | 'playerAndRole' | 'winner'
//   apply: qué hace el motor (lo interpreta applyWish en gameLogic)

const WISH_CATALOG = [
  // ── Información ────────────────────────────────────────────────────
  { id: 'SEE_GRIMOIRE', group: 'Información', label: 'Ver el Grimorio',
    needs: 'none', apply: 'GRANT_GRIMOIRE',
    price: 'Los malvados saben que alguien está mirando.',
    clue: 'Alguien ha aprendido más de lo que debía.' },
  { id: 'KNOW_DEMON', group: 'Información', label: 'Saber quién es el Demonio',
    needs: 'none', apply: 'REVEAL_DEMON',
    price: 'El Demonio sabe que el Hechicero lo conoce.',
    clue: 'Un secreto ha dejado de serlo.' },
  { id: 'KNOW_ALIGNMENT', group: 'Información', label: 'Saber la alineación de un jugador',
    needs: 'player', apply: 'REVEAL_ALIGNMENT',
    price: 'Ese jugador queda envenenado esta noche.',
    clue: 'Alguien ha sido examinado de cerca.' },
  { id: 'KNOW_NOT_IN_PLAY', group: 'Información', label: 'Saber 3 personajes que no están en juego',
    needs: 'none', apply: 'REVEAL_NOT_IN_PLAY',
    price: '', clue: 'Se han descartado tres caminos.' },
  { id: 'SEE_NIGHT_INFO', group: 'Información', label: 'Ver toda la información de esta noche',
    needs: 'none', apply: 'REVEAL_NIGHT_INFO',
    price: 'El Hechicero queda borracho mañana.',
    clue: 'Alguien ha escuchado todos los susurros de la noche.' },

  // ── Cambiar personajes ─────────────────────────────────────────────
  { id: 'BECOME_DEMON', group: 'Cambiar personajes', label: 'Convertirse en el Demonio',
    needs: 'none', apply: 'BECOME_DEMON',
    price: 'El Demonio anterior muere; el Hechicero pasa a ser malvado.',
    clue: 'El aprendiz se ha transformado en maestro.' },
  { id: 'CHANGE_ROLE', group: 'Cambiar personajes', label: 'Cambiar el personaje de un jugador',
    needs: 'playerAndRole', apply: 'SET_ROLE',
    price: 'Ese jugador no sabrá por qué ha cambiado.',
    clue: 'Alguien ya no es quien era.' },
  { id: 'SWAP_ROLES', group: 'Cambiar personajes', label: 'Intercambiar dos personajes',
    needs: 'twoPlayers', apply: 'SWAP_ROLES',
    price: 'Las alineaciones no cambian, así que alguien tiene una habilidad que no le sirve.',
    clue: 'Dos destinos se han cruzado.' },
  { id: 'STEAL_ABILITY', group: 'Cambiar personajes', label: 'Robar la habilidad de otro jugador',
    needs: 'player', apply: 'STEAL_ABILITY',
    price: 'La víctima queda borracha el resto de la partida.',
    clue: 'Alguien ha perdido lo que le hacía útil.' },
  { id: 'MAKE_EVIL', group: 'Cambiar personajes', label: 'Volver malvado a un jugador bueno',
    needs: 'player', apply: 'SET_ALIGNMENT_EVIL',
    price: 'El Hechicero no sabrá si funcionó.',
    clue: 'El mal ha ganado un converso.' },
  { id: 'MAKE_GOOD', group: 'Cambiar personajes', label: 'Volver bueno a un jugador malvado',
    needs: 'player', apply: 'SET_ALIGNMENT_GOOD',
    price: 'Los malvados restantes lo notarán esta noche.',
    clue: 'Alguien ha cambiado de bando.' },

  // ── Vida y muerte ──────────────────────────────────────────────────
  { id: 'KILL', group: 'Vida y muerte', label: 'Matar a un jugador',
    needs: 'player', apply: 'KILL',
    price: 'El Hechicero queda envenenado el resto de la partida.',
    clue: 'Una muerte no tiene explicación.' },
  { id: 'REVIVE', group: 'Vida y muerte', label: 'Resucitar a un jugador',
    needs: 'player', apply: 'REVIVE',
    price: 'El resucitado pierde su habilidad.',
    clue: 'La muerte ha devuelto a alguien.' },
  { id: 'PROTECT_TONIGHT', group: 'Vida y muerte', label: 'Inmunidad a la muerte esta noche',
    needs: 'player', apply: 'PROTECT_TONIGHT',
    price: '', clue: 'Alguien duerme tranquilo esta noche.' },
  { id: 'PROTECT_FOREVER', group: 'Vida y muerte', label: 'Que el Demonio no pueda matarle nunca',
    needs: 'player', apply: 'PROTECT_FOREVER',
    price: 'Los malvados saben quién es.',
    clue: 'Hay alguien a quien la noche no alcanza.' },
  { id: 'NO_DEATHS_TONIGHT', group: 'Vida y muerte', label: 'Nadie muere esta noche',
    needs: 'none', apply: 'NO_DEATHS_TONIGHT',
    price: 'Mañana morirán dos.',
    clue: 'La noche ha sido inusualmente tranquila.' },

  // ── Estados ────────────────────────────────────────────────────────
  { id: 'DRUNK_ALL_GOOD', group: 'Estados', label: 'Emborrachar a todos los buenos',
    needs: 'none', apply: 'DRUNK_ALL_GOOD',
    price: 'Toda la información será falsa a partir de ahora.',
    clue: 'Hay cosas mal.' },
  { id: 'POISON', group: 'Estados', label: 'Envenenar a un jugador',
    needs: 'player', apply: 'POISON',
    price: '', clue: 'Alguien no está en su mejor momento.' },
  { id: 'CURE', group: 'Estados', label: 'Curar a un jugador (quitar veneno y borrachera)',
    needs: 'player', apply: 'CURE',
    price: '', clue: 'Alguien ha recuperado la claridad.' },
  { id: 'HIDE_FROM_DEMON', group: 'Estados', label: 'Ocultar su personaje al Demonio',
    needs: 'none', apply: 'HIDE_FROM_DEMON',
    price: '', clue: 'Hay un nombre que el mal no consigue leer.' },

  // ── Votación y fases ───────────────────────────────────────────────
  { id: 'DOUBLE_VOTE', group: 'Votación y fases', label: 'Voto doble el resto de la partida',
    needs: 'player', apply: 'DOUBLE_VOTE',
    price: 'Todos sabrán que su voto cuenta doble.',
    clue: 'Una voz pesa más que las demás.' },
  { id: 'RESTORE_GHOST_VOTE', group: 'Votación y fases', label: 'Recuperar el voto fantasma',
    needs: 'player', apply: 'RESTORE_GHOST_VOTE',
    price: '', clue: 'Un muerto ha recuperado la voz.' },
  { id: 'RESTORE_ALL_GHOST_VOTES', group: 'Votación y fases', label: 'Todos los muertos recuperan su voto',
    needs: 'none', apply: 'RESTORE_ALL_GHOST_VOTES',
    price: 'El próximo día será el último.',
    clue: 'Los muertos han recuperado la voz.' },

  // ── Partida ────────────────────────────────────────────────────────
  { id: 'WIN_GAME', group: 'Partida', label: 'Ganar la partida',
    needs: 'winner', apply: 'DECLARE_WINNER',
    price: 'Puedes retrasarlo al final del día en vez de aplicarlo ya.',
    clue: 'Uno de estos tres jugadores es el Demonio.' },
];

module.exports = { WISH_CATALOG };
