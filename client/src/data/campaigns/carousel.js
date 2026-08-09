// ── The Carousel (cliente / UI) ─────────────────────────────────

export const roles = [
  // ── ALDEANOS ────────────────────────────────────────────────────────
  { id: 'ACROBAT', name: 'Acróbata', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/acrobat.png',
    ability: 'Cada noche* elige 1 jugador: si está borracho o envenenado, o acaba estándolo esta noche, mueres.', night: { action: 'ACROBAT', targets: 1 } },
  { id: 'ALCHEMIST', name: 'Alquimista', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/alchemist.png',
    ability: 'Tienes la habilidad de un Esbirro. Cuando la uses, el Narrador puede pedirte que hagas otra elección.', night: { passive: true } },
  { id: 'AMNESIAC', name: 'Amnésico', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/amnesiac.png',
    ability: 'No sabes cuál es tu habilidad. Cada día intenta adivinarla en privado y sabes lo cerca que estás.' },
  { id: 'ATHEIST', name: 'Ateo', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/atheist.png',
    ability: 'El Narrador puede romper las reglas. Si el Narrador es ejecutado, ganan los buenos, aunque estés muerto. [No hay malos]' },
  { id: 'BALLOONIST', name: 'Aeronauta', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/balloonist.png',
    ability: 'Cada noche descubres 1 jugador de un tipo diferente al de la noche anterior. [+0 o +1 Forastero]', night: { passive: true } },
  { id: 'BANSHEE', name: 'Banshee', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/banshee.png',
    ability: 'Si el Demonio te mata, todos los jugadores lo saben. A partir de ahora, puedes nominar 2 veces por día y votar 2 veces por nominación.' },
  { id: 'BOUNTY_HUNTER', name: 'Cazarrecompensas', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/bounty-hunter.png',
    ability: 'Empiezas conociendo 1 jugador malo. Si ese jugador muere, descubres 1 jugador malo esta noche. [1 Aldeano es malo]', night: { passive: true } },
  { id: 'CANNIBAL', name: 'Caníbal', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/cannibal.png',
    ability: 'Tienes la habilidad del último jugador muerto ejecutado. Si es malo, estás envenenado hasta que 1 bueno muera ejecutado.', night: { passive: true } },
  { id: 'CHOIRBOY', name: 'Niño del Coro', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/choirboy.png',
    ability: 'Si el Demonio mata al Rey, descubres qué jugador es el Demonio [+ Rey]' },
  { id: 'CULT_LEADER', name: 'Líder de Culto', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/cult-leader.png',
    ability: 'Cada noche te conviertes al alineamiento de 1 vecino vivo. Si todos los jugadores buenos eligen unirse a tu culto, tu bando gana.', night: { passive: true } },
  { id: 'ENGINEER', name: 'Ingeniero', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/engineer.png',
    ability: 'Una vez por partida, por la noche, elige qué Esbirros o qué Demonio está en juego.', night: { action: 'ENGINEER', targets: 1 } },
  { id: 'FARMER', name: 'Granjero', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/farmer.png',
    ability: 'Cuando mueres por la noche, 1 jugador vivo bueno se convierte en Granjero.' },
  { id: 'FISHERMAN', name: 'Pescador', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/fisherman.png',
    ability: 'Una vez por partida, durante el día, puedes visitar al Narrador para que te aconseje sobre cómo debe ganar tu bando.' },
  { id: 'GENERAL', name: 'General', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/general.png',
    ability: 'Cada noche sabes qué alineamiento cree el Narrador que está ganando: bueno, malo o ninguno.', night: { passive: true } },
  { id: 'HIGH_PRIESTESS', name: 'Suma Sacerdotisa', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/high-priestess.png',
    ability: 'Cada noche sabes con qué jugador cree el Narrador que deberías hablar más.', night: { passive: true } },
  { id: 'HUNTSMAN', name: 'Cazador', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/huntsman.png',
    ability: 'Una vez por partida, por la noche, elige 1 jugador vivo: si es la Damisela se convierte en 1 Aldeano que no esté en juego. [+ Damisela]', night: { action: 'HUNTSMAN', targets: 1 } },
  { id: 'KING', name: 'Rey', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/king.png',
    ability: 'Cada noche, si hay igual o más muertos que vivos, descubres 1 personaje vivo. El Demonio sabe que eres el Rey.', night: { passive: true } },
  { id: 'KNIGHT', name: 'Caballero', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/knight.png',
    ability: 'Empiezas conociendo 2 jugadores que no son el Demonio.', night: { passive: true } },
  { id: 'LYCANTHROPE', name: 'Licántropo', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/lycanthrope.png',
    ability: 'Cada noche* elige 1 jugador vivo: si es bueno, muere y el Demonio no mata esta noche. Un jugador bueno aparece como malo.', night: { action: 'LYCANTHROPE_KILL', targets: 1 } },
  { id: 'MAGICIAN', name: 'Mago', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/magician.png',
    ability: 'El Demonio piensa que eres un Esbirro. Los Esbirros piensan que eres un Demonio.', night: { passive: true } },
  { id: 'NIGHTWATCHMAN', name: 'Sereno', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/nightwatchman.png',
    ability: 'Una vez por partida, por la noche, elige 1 jugador: descubre que eres Sereno.', night: { action: 'NIGHTWATCHMAN', targets: 1 } },
  { id: 'NOBLE', name: 'Noble', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/noble.png',
    ability: 'Empiezas conociendo 3 jugadores, 1 y solo 1 de ellos es malo.', night: { passive: true } },
  { id: 'POPPY_GROWER', name: 'Cultivador de Opio', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/poppy-grower.png',
    ability: 'Los Esbirros y el Demonio no se conocen. Si mueres, se conocen esta noche.', night: { passive: true } },
  { id: 'PREACHER', name: 'Predicador', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/preacher.png',
    ability: 'Cada noche elige 1 jugador: si es Esbirro lo sabe. Los Esbirros elegidos no tienen habilidad.', night: { action: 'PREACHER', targets: 1 } },
  { id: 'SHUGENJA', name: 'Shugenja', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/shugenja.png',
    ability: 'Empiezas sabiendo si el jugador malo más cercano está a tu izquierda o tu derecha. Si es equidistante, la información es arbitraria.', night: { passive: true } },
  { id: 'STEWARD', name: 'Administrador', alignment: 'good', type: 'townfolk', img: '/assets/roles/carousel/steward.png',
    ability: 'Empiezas conociendo 1 jugador bueno.', night: { passive: true } },

  // ── FORASTEROS ──────────────────────────────────────────────────────
  { id: 'DAMSEL', name: 'Damisela', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/damsel.png',
    ability: 'Los Esbirros saben que una Damisela está en juego. Si un Esbirro adivina quién eres (una vez por partida) tu equipo pierde.' },
  { id: 'GOLEM', name: 'Gólem', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/golem.png',
    ability: 'Sólo puedes nominar 1 vez. Cuando lo hagas, si el nominado no es el Demonio, muere.' },
  { id: 'HATTER', name: 'Sombrerero', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/hatter.png',
    ability: 'Si mueres hoy o esta noche, los Esbirros y el Demonio pueden elegir nuevos Esbirros y Demonios que ser.' },
  { id: 'HERETIC', name: 'Hereje', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/heretic.png',
    ability: 'Quien gane, pierde y quien pierda gana, aunque estés muerto.' },
  { id: 'PLAGUE_DOCTOR', name: 'Doctor de Plaga', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/plague-doctor.png',
    ability: 'Cuando mueres, el Narrador gana la habilidad de un Esbirro.' },
  { id: 'POLITICIAN', name: 'Político', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/politician.png',
    ability: 'Si eres el jugador más responsable de que tu equipo pierda, cambias de alineamiento y ganas, aunque estés muerto.' },
  { id: 'PUZZLEMASTER', name: 'Maestro del Puzle', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/puzzlemaster.png',
    ability: 'Un jugador está borracho, aunque estés muerto. Si adivinas quién es (una vez por partida), descubres quién es el Demonio, pero si fallas recibes información falsa.' },
  { id: 'SNITCH', name: 'Soplón', alignment: 'good', type: 'outsider', img: '/assets/roles/carousel/snitch.png',
    ability: 'Los Esbirros empiezan conociendo 3 faroles.' },

  // ── ESBIRROS ────────────────────────────────────────────────────────
  { id: 'BOFFIN', name: 'Rata de Laboratorio', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/boffin.png',
    ability: 'El Demonio (incluso borracho o envenenado) tiene la habilidad de un bueno que no esté en juego. Ambos sabéis cuál.', night: { passive: true, evil: true } },
  { id: 'BOOMDANDY', name: 'Boomdandy', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/boomdandy.png',
    ability: 'Si eres ejecutado, todos los jugadores menos 3 mueren. Después de una cuenta atrás de 10 a 1, el jugador con más jugadores apuntándole muere.', night: { evil: true } },
  { id: 'FEARMONGER', name: 'Fearmonger', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/fearmonger.png',
    ability: 'Cada noche elige 1 jugador: si le nominas y ejecutas, su equipo pierde. Todos los jugadores saben si has elegido a un nuevo jugador.', night: { action: 'FEARMONGER', targets: 1, evil: true } },
  { id: 'GOBLIN', name: 'Goblin', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/goblin.png',
    ability: 'Si públicamente declaras ser Goblin cuando te nominen y eres ejecutado ese día, tu equipo gana.', night: { evil: true } },
  { id: 'HARPY', name: 'Arpía', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/harpy.png',
    ability: 'Cada noche elige 2 jugadores: mañana, el primer jugador está loco sobre que el segundo es malo o uno o ambos pueden morir.', night: { action: 'HARPY', targets: 2, evil: true } },
  { id: 'MARIONETTE', name: 'Marioneta', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/marionette.png',
    ability: 'Piensas que eres un personaje bueno, pero no lo eres. El Demonio sabe quién eres. [Estás adyacente al Demonio]', night: { passive: true, evil: true },
    misperception: { believes: 'unusedGood', wakesWithEvil: false, demonKnows: true } },
  { id: 'MEZEPHELES', name: 'Mezepheles', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/mezepheles.png',
    ability: 'Empiezas conociendo 1 palabra secreta. El primer jugador bueno en decirla se convierte en malo esta noche.', night: { action: 'MEZEPHELES', targets: 1, evil: true } },
  { id: 'ORGAN_GRINDER', name: 'Organillero', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/organ-grinder.png',
    ability: 'Todos los jugadores cierran los ojos al votar y su voto se cuenta en secreto. Cada noche decides si estás borracho hasta el crepúsculo o no.', night: { action: 'ORGAN_GRINDER', targets: 1, evil: true } },
  { id: 'PSYCHOPATH', name: 'Psicópata', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/psychopath.png',
    ability: 'Cada día, antes de las nominaciones, puedes elegir públicamente 1 jugador: muere. Si eres ejecutado, solo mueres si pierdes a piedra-papel-tijera.', night: { evil: true } },
  { id: 'SUMMONER', name: 'Invocador', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/summoner.png',
    ability: 'Recibes 3 faroles. En la tercera noche elige 1 jugador: se vuelve malo y el Demonio que elijas. [No hay Demonio]', night: { action: 'SUMMONER', targets: 1, evil: true } },
  { id: 'VIZIER', name: 'Visir', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/vizier.png',
    ability: 'Todos los jugadores saben que eres el Visir. No puedes morir durante el día. Si algún bueno vota, puedes elegir ejecutar inmediatamente.', night: { evil: true } },
  { id: 'WIDOW', name: 'Viuda', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/widow.png',
    ability: 'En tu primera noche ves el Grimorio y eliges 1 jugador: está envenenado. 1 jugador bueno sabe que el Viuda está en juego.', night: { action: 'WIDOW', targets: 1, evil: true } },
  // Espejo del servidor: el Hechicero es Esbirro malvado.
  { id: 'WIZARD', name: 'Hechicero', alignment: 'evil', type: 'minion', img: '/assets/roles/carousel/wizard.png',
    ability: 'Una vez por partida pídele en privado un deseo al Narrador: si se concede, tu deseo puede tener un precio y deja pistas de su naturaleza.', night: { passive: true } },

  // ── DEMONIOS ────────────────────────────────────────────────────────
  // Yaggababble es Demonio, no Esbirro.
  { id: 'YAGGABABBLE', name: 'Yaggababble', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/yaggababble.png',
    ability: 'Empiezas conociendo 1 frase secreta. Cada vez que la digas públicamente hoy, 1 jugador puede morir.', night: { action: 'YAGGABABBLE', targets: 1, evil: true } },
  { id: 'AL_HADIKHIA', name: 'Al-Hadikhia', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/al-hadikhia.png',
    ability: 'Cada noche* puedes elegir a 3 jugadores (todos descubren quiénes son): cada uno elige en silencio si vive o muere, pero si todos viven, todos mueren.', night: { action: 'AL_HADIKHIA_KILL', targets: 3, evil: true } },
  { id: 'KAZALI', name: 'Kazali', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/kazali.png',
    ability: 'Cada noche* elige 1 jugador: muere. [Eliges los Esbirros en juego y qué jugadores son. -? a +? Forasteros]', night: { action: 'KAZALI_KILL', targets: 1, evil: true } },
  { id: 'LEGION', name: 'Legión', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/legion.png',
    ability: 'Cada noche* 1 jugador puede morir. Las ejecuciones fallan si sólo votan los malos. Apareces también como Esbirro. [La mayoría de jugadores son Legión]', night: { action: 'LEGION_KILL', targets: 1, evil: true } },
  { id: 'LEVIATHAN', name: 'Leviatán', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/leviathan.png',
    ability: 'Si más de 1 jugador bueno es ejecutado, los malos ganan. Todos los jugadores saben que estás en juego. Después del día 5, los malos ganan.', night: { evil: true } },
  { id: 'LIL_MONSTA', name: 'Lil’ Monsta', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/lil-monsta.png',
    ability: 'Cada noche los Esbirros eligen quién cuida a Lil’ Monsta y «es el Demonio». Cada noche* 1 jugador puede morir. [+1 Esbirro]', night: { action: 'LIL_MONSTA_ASSIGN', targets: 1, evil: true } },
  { id: 'LLEECH', name: 'Lleech', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/lleech.png',
    ability: 'Cada noche* elige 1 jugador: muere. Empiezas eligiendo 1 jugador: está envenenado. Mueres si y sólo si ese jugador está muerto.', night: { action: 'LLEECH_KILL', targets: 1, evil: true } },
  { id: 'OJO', name: 'Ojo', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/ojo.png',
    ability: 'Cada noche* elige 1 personaje: muere. Si no está en juego, el Narrador decide quién muere.', night: { action: 'OJO_KILL', targets: 1, evil: true } },
  { id: 'RIOT', name: 'Riot', alignment: 'evil', type: 'demon', img: '/assets/roles/carousel/riot.png',
    ability: 'En día 3, los Esbirros se convierten en Riot y los nominados mueren pero pueden nominar a un jugador vivo inmediatamente. Esto debe pasar.', night: { evil: true } },
];

export const firstNightOrder = [
  'EVIL_INFO',
  'POPPY_GROWER', 'MAGICIAN',
  'PREACHER',     // antes de los Esbirros: les quita la habilidad esta noche
  'ENGINEER',     // antes que nadie: decide qué Esbirros / Demonio hay en juego
  'BOFFIN',       // demon conoce su habilidad buena antes de actuar
  'KAZALI', 'LEGION', 'LIL_MONSTA', 'LLEECH', 'RIOT', 'LEVIATHAN',
  // MARIONETTE excluida: pasiva, no despierta con el mal
  // Sin asterisco en su habilidad → estos Esbirros SÍ actúan la primera noche.
  'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER', 'SUMMONER', 'YAGGABABBLE',
  // La Viuda envenena ANTES que los personajes de información: si actuaba al
  // final, todos ellos ya habían recibido información verdadera.
  'WIDOW',
  'SHUGENJA', 'STEWARD',
  'PUZZLEMASTER', 'ALCHEMIST',
  'HUNTSMAN',     // salva a la Damisela antes de que los Esbirros la busquen
  'BOUNTY_HUNTER', 'CULT_LEADER', 'NIGHTWATCHMAN', 'KNIGHT', 'NOBLE', 'DAMSEL', 'SNITCH',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
];

export const otherNightOrder = [
  'POPPY_GROWER',
  'PREACHER',    // antes de esbirros: quita habilidad del esbirro elegido esa noche
  'LYCANTHROPE', // antes de demonios: si mata a bueno, bloquea ataque del demonio
  'ENGINEER',    // antes de demonios: cambia qué roles están en juego antes de que actúen
  'HUNTSMAN',    // antes de demonios: salva Damisela antes que actúe demonio (canónico)
  // Esbirros que inhabilitan: antes de los demonios y de la información.
  'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER', 'SUMMONER',
  // Ataques demoníacos: después de todo lo que protege o inhabilita.
  'LLEECH', 'KAZALI', 'LEGION', 'LIL_MONSTA', 'OJO', 'AL_HADIKHIA', 'YAGGABABBLE',
  'ACROBAT', 'CANNIBAL', 'BOUNTY_HUNTER', 'CULT_LEADER', 'NIGHTWATCHMAN',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
];

export const reminders = {
  // Simplificado: solo roles con fichas complejas
  BOUNTY_HUNTER: [{ id: 'EVIL', label: 'Es malvado', duration: 'permanent' }],
  KNIGHT: [{ id: 'NOT_DEMON', label: 'No es Demonio', duration: 'permanent' }],
  NOBLE: [{ id: 'EVIL', label: 'Es malvado', duration: 'permanent' }, { id: 'GOOD', label: 'Es bueno', duration: 'permanent' }],
  DAMSEL: [{ id: 'KNOWN', label: 'Conocida', duration: 'permanent' }],
  PUZZLEMASTER: [{ id: 'DRUNK', label: 'Borracho', duration: 'permanent' }],
  SNITCH: [{ id: 'BLUFF_1', label: 'Bluff 1', duration: 'permanent' }, { id: 'BLUFF_2', label: 'Bluff 2', duration: 'permanent' }, { id: 'BLUFF_3', label: 'Bluff 3', duration: 'permanent' }],
  STEWARD: [{ id: 'EVIL_NEIGHBOR', label: 'Vecino malvado', duration: 'permanent' }],
  MEZEPHELES: [{ id: 'TURNED_EVIL', label: 'Se volvió malvado', duration: 'permanent' }],
  PSYCHOPATH: [{ id: 'KILLS', label: 'Mata', duration: 'permanent' }],
};

export default {
  id: 'CAROUSEL',
  name: 'The Carousel',
  name_es: 'El Carrusel',
  roles,
  firstNightOrder,
  otherNightOrder,
  reminders,
};
