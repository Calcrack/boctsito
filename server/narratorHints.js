// ── Guía del narrador: qué te toca decidir AHORA ─────────────────────
// Estos personajes NO se automatizan a propósito: la regla depende de algo
// dicho en voz alta, de tu criterio o de una decisión que solo tú puedes
// tomar. La página no decide por ti — solo te recuerda, en el momento
// exacto, qué tienes que resolver y con qué botón.
//
// Cada entrada: { when(ctx) → bool, text, severity, needs? }
//   ctx = { game, p, isFirstNight, isNight, isDay, alive, dead }
//   needs = pista de qué control usar (se muestra en el mini-panel)
const { ROLES } = require('./roles');

const NIGHT_PHASES = ['first_night', 'night'];
const nightStar = c => c.isNight && c.game.nightNumber > 1;   // "cada noche*"
const anyNight = c => c.isNight;

const HINTS = {

  // ── Bad Moon Rising ────────────────────────────────────────────────
  GAMBLER: [{
    when: nightStar,
    text: 'Pídele un jugador y un personaje. Si FALLA la conjetura, mátalo. Si está borracho o envenenado, muere aunque acierte.',
    needs: 'Objetivo + selector de personaje, después "Matar" si falla.',
    severity: 'warn',
  }],

  GOSSIP: [{
    when: anyNight,
    text: '¿Su afirmación pública de hoy era VERDADERA? Si sí, elige tú quién muere esta noche. Si el Cotilla está borracho o envenenado, no muere nadie.',
    needs: 'Botón de confirmación + "Matar" sobre la víctima que elijas.',
    severity: 'warn',
  }],

  COURTIER: [{
    when: c => anyNight(c) && !c.p.courtierUsed,
    text: 'Aún no ha usado su borrachera. Si nombra un personaje, marca borracho a su portador 3 días y 3 noches (ficha manual: la página no la caduca sola).',
    needs: 'Selector de personaje + ficha manual "Borracho" sobre el portador.',
    severity: 'info',
  }],

  MOONCHILD: [{
    when: c => !c.p.alive && !c.p.moonchildResolved,
    text: 'Ha muerto: debe elegir EN PÚBLICO a un jugador vivo. Si el elegido es bueno, mátalo esta noche. Si el Hijo de la Luna estaba envenenado, no muere nadie.',
    needs: 'Selector de objetivo + "Matar" si el elegido es bueno.',
    severity: 'warn',
  }],

  // ── Sects & Violets ────────────────────────────────────────────────
  SNAKE_CHARMER: [{
    when: anyNight,
    text: 'Si elige al Demonio y está sano: intercambiad personaje Y alineación entre los dos, y deja envenenado al que ahora es Aldeano. Anuncia en tu cabeza quién es el nuevo Demonio.',
    needs: '"Cambiar rol" en ambos jugadores + ficha "Envenenado" en el ex-Demonio.',
    severity: 'warn',
  }],

  PHILOSOPHER: [{
    when: c => anyNight(c) && !c.p.philosopherUsed,
    text: 'Si nombra un personaje BUENO, gana esa habilidad desde ahora y, si ese personaje está en juego, su portador queda borracho el resto de la partida. Desde esa noche despiértalo en la posición del personaje robado.',
    needs: 'Selector de personaje + ficha manual "Borracho" al portador original.',
    severity: 'info',
  }],

  JUGGLER: [{
    when: c => c.isDay && c.game.dayNumber === 1,
    text: 'Es su primer día: anota hasta 5 conjeturas jugador–personaje que diga en público. Esta noche tendrás que decirle cuántas acertó (número falso si está borracho o envenenado).',
    needs: 'Campo de texto para las conjeturas; esta noche, el contador.',
    severity: 'info',
  }],

  KLUTZ: [{
    when: c => !c.p.alive && !c.p.klutzResolved,
    text: 'Ha muerto: debe elegir EN PÚBLICO a un jugador vivo. Si señala a un MALVADO, su equipo pierde de inmediato — salvo que el Torpe estuviera envenenado. El aviso sigue aquí hasta que lo resuelvas.',
    needs: 'Si acierta: "Terminar partida" declarando ganador al bando contrario.',
    severity: 'danger',
  }],

  CERENOVUS: [{
    when: anyNight,
    text: 'Elige jugador + personaje: mañana ese jugador debe AFIRMAR que es ese personaje. Usa "Cambiar rol" en modo solo-creído. Si no cumple durante el día, puedes ejecutarlo. Envenenado: no impone locura.',
    needs: '"Cambiar rol" → modo creído.',
    severity: 'warn',
  }],

  PIT_HAG: [{
    when: anyNight,
    text: 'Elige jugador + personaje: pasa a ser ese personaje (avísale). Si el personaje YA está en juego, no pasa nada. Si crea un Demonio, elige tú al azar un jugador que muere esta noche y recuerda que ahora hay más de un Demonio.',
    needs: '"Cambiar rol" (real) + "Matar" si creó un Demonio.',
    severity: 'warn',
  }],

  // ── The Carousel ───────────────────────────────────────────────────
  CANNIBAL: [{
    when: c => c.isNight && !!c.game.lastExecutedRole,
    text: c => {
      const r = ROLES[c.game.lastExecutedRole]?.name || '?';
      const evil = c.game.lastExecutedWasEvil;
      return `Hereda la habilidad de ${r} (último ejecutado). ${evil
        ? 'Era MALVADO: márcalo ENVENENADO — la habilidad heredada no funciona y su información debe ser falsa.'
        : 'Era bueno: la habilidad funciona. Despiértalo en la posición de ese personaje en la cola.'}`;
    },
    needs: '"Cambiar rol" en modo creído, o ficha manual con la habilidad actual.',
    severity: 'info',
  }],

  CULT_LEADER: [{
    when: anyNight,
    text: 'Cada noche adopta la alineación de un vecino vivo — decídelo tú y cámbiasela si procede. Si TODOS los buenos vivos se han unido a su culto, puedes declarar su victoria.',
    needs: 'Ficha manual de alineación; "Terminar partida" si gana el culto.',
    severity: 'info',
  }],

  ENGINEER: [{
    when: c => anyNight(c) && !c.p.engineerUsed,
    text: 'Aún tiene su uso: puede elegir QUÉ Esbirros o QUÉ Demonio están en juego. Aplica los cambios de rol uno a uno y avisa a cada afectado. Envenenado: no cambia nada y el uso se gasta igual.',
    needs: '"Cambiar rol" sobre cada malvado afectado.',
    severity: 'warn',
  }],

  LYCANTHROPE: [{
    when: nightStar,
    text: 'Si elige a un jugador BUENO y está sano: ese jugador muere Y el Demonio no mata esta noche. Si elige a un malvado o está envenenado, no muere nadie y el Demonio mata normal.',
    needs: '"Matar" al elegido + saltar el ataque del Demonio en la cola.',
    severity: 'warn',
  }],

  PREACHER: [{
    when: anyNight,
    text: 'Si el elegido es Esbirro y el Predicador está sano: díselo y ese Esbirro pierde su habilidad PARA SIEMPRE (ficha permanente). Envenenado: el Esbirro la conserva y la información puede ser falsa.',
    needs: 'Ficha manual "Sin habilidad (Predicador)" sobre el Esbirro.',
    severity: 'warn',
  }],

  DAMSEL: [{
    when: c => c.isFirstNight,
    text: 'Avisa a CADA Esbirro de que hay una Damisela en juego (sin decir quién).',
    needs: 'Info nocturna a cada Esbirro.',
    severity: 'warn',
  }, {
    when: c => c.isDay && c.p.alive,
    text: 'Si un Esbirro señala públicamente a la Damisela correcta, ganan los malvados — salvo que ella esté envenenada. Si falla, ese Esbirro no puede reintentarlo: márcalo.',
    needs: '"Terminar partida" si acierta; ficha "Ya lo intentó" si falla.',
    severity: 'info',
  }],

  HATTER: [{
    when: c => !c.p.alive && !c.p.hatterResolved,
    text: 'Ha muerto: esta noche los Esbirros y el Demonio pueden elegir personajes NUEVOS. Aplícalos uno a uno y comprueba que no queden dos iguales. Si el Sombrerero estaba envenenado, no se abre el reparto.',
    needs: '"Cambiar rol" en cada malvado vivo.',
    severity: 'warn',
  }],

  SNITCH: [{
    when: c => c.isFirstNight,
    text: 'Cada Esbirro recibe 3 faroles (personajes que NO están en juego), además de conocer al Demonio. Puedes ajustarlos desde el panel de cada Esbirro.',
    needs: 'Editor de faroles por Esbirro.',
    severity: 'warn',
  }],

  HARPY: [{
    when: anyNight,
    text: 'Elige 2 jugadores EN ORDEN: mañana el primero debe creer y actuar como si el segundo fuera malvado. Si no lo hace, puedes ejecutarlo. Envenenada: nadie recibe la creencia.',
    needs: 'Info privada al primero + ejecución manual si no cumple.',
    severity: 'warn',
  }],

  MEZEPHELES: [{
    when: c => c.isFirstNight,
    text: 'Escribe su palabra secreta y envíasela.',
    needs: 'Campo de texto "Palabra secreta".',
    severity: 'warn',
  }, {
    when: c => c.isNight && c.game.nightNumber > 1 && !c.game.mezephelesTriggered,
    text: 'Si algún jugador BUENO dijo la palabra hoy, el PRIMERO que la dijo se vuelve malvado esta noche: cámbiale la alineación y avísale. Solo el primero cuenta.',
    needs: 'Ficha/ cambio de alineación sobre el jugador.',
    severity: 'info',
  }],

  ORGAN_GRINDER: [{
    when: anyNight,
    text: 'Pregúntale si quiere estar borracho esta noche. Mientras esté vivo y sano, MAÑANA se vota a ciegas: nadie puede ver quién más votó, solo tú ves el recuento.',
    needs: 'Interruptor borracho sí/no.',
    severity: 'warn',
  }],

  // ── Viajeros ───────────────────────────────────────────────────────
  BISHOP: [{
    when: c => c.isDay,
    text: 'Con el Obispo en juego SOLO tú nominas, y debes nominar hoy al menos a un jugador BUENO y a uno MALVADO.',
    needs: 'Nominar desde tu panel.',
    severity: 'warn',
  }],

  BUTCHER: [{
    when: c => c.isDay && !!c.game.executedToday,
    text: 'Con el Carnicero en juego, tras la primera ejecución del día se puede nominar OTRA VEZ: vuelve a abrir nominaciones.',
    needs: 'Botón "Abrir nominaciones".',
    severity: 'warn',
  }],

  VOUDON: [{
    when: c => c.isDay,
    text: 'Con el Voudon en juego solo votan él y los MUERTOS. Rechaza los votos de los vivos y deja votar a los muertos sin gastar voto fantasma; sus votos matan.',
    needs: 'Control manual de la votación.',
    severity: 'warn',
  }],

  // ── Extra ──────────────────────────────────────────────────────────
  WIZARD: [{
    when: c => c.game.wish && c.game.wish.status && c.game.wish.status !== 'none' && c.game.wish.status !== 'granted' && c.game.wish.status !== 'denied',
    text: 'El Hechicero tiene un deseo pendiente. Atiéndelo EN PRIVADO: concédelo con su precio, pídele otro o deniégalo definitivamente. Nunca lo hagas público sin decidirlo tú.',
    needs: 'Panel de deseos en su pestaña de Habilidad.',
    severity: 'warn',
  }, {
    when: c => c.p.alive && (!c.game.wish || c.game.wish.status === 'none'),
    text: 'Sigue con su deseo sin gastar. Puede pedírtelo en cualquier momento, en privado.',
    needs: 'Panel de deseos (aparece cuando lo pida).',
    severity: 'info',
  }],

  LORD_OF_TYPHON: [{
    when: c => c.isFirstNight,
    text: 'Comprueba el montaje: TODOS los malvados deben estar sentados en línea, con el Señor de Typhon justo en el centro. Hay 1 Esbirro más de lo normal.',
    needs: 'Orden de asientos en el asistente de montaje.',
    severity: 'warn',
  }, {
    when: nightStar,
    text: 'Ataca cada noche* como un Demonio normal: elige un jugador y muere.',
    needs: 'Panel "Atacar a" en la guía de noche.',
    severity: 'info',
  }],

  FIDDLER: [{
    when: c => nightStar(c) && !c.p.fiddlerUsed,
    text: 'Todavía no ha usado su duelo. Si lo pide, elige con él un jugador del bando contrario: mañana TODOS votan cuál de los 2 gana la partida.',
    needs: 'Panel "Rival del duelo" + votación especial al día siguiente.',
    severity: 'warn',
  }, {
    when: c => c.isDay && c.game.fiddlerDuel && !c.game.fiddlerDuel.resolved,
    text: 'Hay un duelo del Violinista pendiente: abre la votación entre los 2 candidatos y termina la partida con el bando del ganador.',
    needs: '"Terminar partida" declarando ganador al bando del elegido.',
    severity: 'danger',
  }],

  XAAN: [{
    when: c => c.isNight,
    text: c => {
      const outs = c.game.players.filter(p => p.type === 'outsider').length;
      return `La noche X es la noche ${outs} (= nº de Forasteros). Vas por la noche ${c.game.nightNumber}. En la noche X, TODOS los Aldeanos quedan envenenados hasta el anochecer.`;
    },
    needs: 'Botón "Envenenar a todos los Aldeanos" en su paso de la guía.',
    severity: 'warn',
  }],

  GNOME: [{
    when: c => c.isFirstNight,
    text: 'Elige el jugador que todos conocerán y anúncialo EN PÚBLICO: comparte alineación con el Gnomo.',
    needs: 'Panel "Jugador conocido por todos".',
    severity: 'warn',
  }, {
    when: c => c.isDay && c.p.alive,
    text: 'Si alguien nomina al jugador conocido, el Gnomo puede matar al nominador. Pregúntaselo en privado.',
    needs: '"Matar" sobre quien haya nominado.',
    severity: 'info',
  }],

  WRAITH: [{
    when: anyNight,
    text: 'No tiene acción: solo abre los ojos. Despiértalo SIEMPRE que despiertes a cualquier otro malvado.',
    needs: 'Ninguno — solo recordarlo en cada paso del mal.',
    severity: 'info',
  }],

  OGRE: [{
    when: c => c.isFirstNight,
    text: 'Elige un jugador (no él): el Ogro copia su alineación EN SILENCIO. Nunca debe saber cuál copió, ni siquiera si no cambió nada.',
    needs: 'Panel "Copiar alineación de".',
    severity: 'warn',
  }],

  PIXIE: [{
    when: c => c.isFirstNight,
    text: 'Muéstrale 1 Aldeano en juego e impón la locura de ser ese personaje. Si la cumple, hereda su habilidad cuando el original muera.',
    needs: 'Panel "Aldeano que conoce" + "Cambiar rol" en modo creído.',
    severity: 'info',
  }],

  VILLAGE_IDIOT: [{
    when: anyNight,
    text: 'Puede haber hasta 3 Tontos del Pueblo y exactamente UNO está borracho: a ese dale siempre la alineación CONTRARIA a la real.',
    needs: 'Panel "Descubrir alineación de" + ficha "Borracho" en el elegido.',
    severity: 'warn',
  }],

  HERMIT: [{
    when: anyNight,
    text: 'Tiene TODAS las habilidades de Forastero del guion: resuélvelas una por una, en el orden en que actuaría cada Forastero.',
    needs: 'Los paneles de cada Forastero, uno tras otro.',
    severity: 'warn',
  }],

  DUCHESS: [{
    when: nightStar,
    text: 'Marca a los 3 visitantes de hoy. Cada uno sabe cuántos visitantes eran malvados, pero a UNO de ellos debes darle el número FALSO.',
    needs: 'Panel de la Duquesa: 3 objetivos + número por visitante.',
    severity: 'warn',
  }],

  TOYMAKER: [{
    when: c => c.isNight && !c.game.toymakerSkipUsed,
    text: 'El Demonio puede decidir no atacar esta noche, y DEBE hacerlo al menos 1 vez por partida. Todavía no ha usado esa noche.',
    needs: 'Botón "No ataca" en el paso del Juguetero.',
    severity: 'warn',
  }],

  STORM_CATCHER: [{
    when: c => c.isFirstNight,
    text: 'Nombra un personaje bueno: si está en juego, solo puede morir por ejecución, pero los malvados saben quién lo tiene.',
    needs: 'Selector de personaje + aviso al equipo malvado.',
    severity: 'info',
  }],

  CACKLEJACK: [{
    when: anyNight,
    text: 'El jugador que cambia de personaje esta noche es uno DISTINTO del que se eligió de día.',
    needs: '"Cambiar rol" sobre el jugador distinto.',
    severity: 'info',
  }],

  ZENOMANCER: [{
    when: () => true,
    text: 'Escribe la misión de cada jugador. Cuando alguien la complete, dale información VERDADERA desde su panel.',
    needs: 'Campo de misión por jugador + botón "misión completada".',
    severity: 'info',
  }],
};

// Devuelve los avisos activos ahora mismo, uno por jugador afectado.
function computeRoleHints(game) {
  const out = [];
  const isNight = NIGHT_PHASES.includes(game.phase);
  const isFirstNight = game.phase === 'first_night';
  const isDay = ['day', 'nominations', 'voting'].includes(game.phase);
  if (game.phase === 'lobby' || game.phase === 'game_over') return out;

  const alive = game.players.filter(p => p.alive);
  const dead = game.players.filter(p => !p.alive);

  for (const p of game.players) {
    const list = HINTS[p.role];
    if (!list) continue;
    const ctx = { game, p, isFirstNight, isNight, isDay, alive, dead };
    for (const h of list) {
      let active = false;
      try { active = !!h.when(ctx); } catch (e) { active = false; }
      if (!active) continue;
      const text = typeof h.text === 'function' ? h.text(ctx) : h.text;
      out.push({
        kind: 'roleHint',
        severity: h.severity || 'info',
        playerId: p.id,
        playerName: p.name,
        roleId: p.role,
        roleName: ROLES[p.role]?.name || p.role,
        alive: p.alive,
        impaired: !!(p.poisoned || p.drunkAs),
        needs: h.needs || null,
        text,
      });
    }
  }
  return out;
}

// Los avisos de un jugador concreto (para su mini-panel).
function hintsForPlayer(game, playerId) {
  return computeRoleHints(game).filter(h => h.playerId === playerId);
}

const HINTED_ROLES = new Set(Object.keys(HINTS));

module.exports = { computeRoleHints, hintsForPlayer, HINTED_ROLES, HINTS };
