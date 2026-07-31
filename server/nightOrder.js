// ── Orden nocturno global ───────────────────────────────────────────
// Posiciones oficiales de BotC con TODAS las ediciones combinadas.
// Las colas de cada campaña (`queueFirst` / `queueOther`) mandan; esto sirve
// para colocar en su sitio a los personajes que el Narrador reparte desde
// otra campaña (p. ej. el Abogado del Diablo en una partida de Carousel),
// que antes no entraban en la cola y nunca salían en la guía de noche.
//
// ESPEJO de GLOBAL_FIRST_NIGHT_ORDER / GLOBAL_OTHER_NIGHT_ORDER en
// client/src/components/NightWalkthrough.jsx — `gherkin.guide.test.js`
// comprueba que no se separen.

const GLOBAL_FIRST_NIGHT_ORDER = [
  'STORM_CATCHER',
  'POPPY_GROWER', 'MAGICIAN', 'PREACHER', 'ENGINEER',
  'KAZALI', 'LEGION', 'LIL_MONSTA', 'RIOT', 'LEVIATHAN', 'YAGGABABBLE', 'LLEECH',
  'LUNATIC', 'MARIONETTE', 'GNOME', 'WRAITH',
  // Sin asterisco en su habilidad → también despiertan la primera noche.
  'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER',
  'WIDOW', 'XAAN', 'SUMMONER', 'SHUGENJA', 'STEWARD',
  'PHILOSOPHER',
  'BARISTA', 'BUREAUCRAT', 'THIEF',
  'SAILOR', 'COURTIER', 'GODFATHER', 'DEVILS_ADVOCATE',
  'POISONER', 'PUKKA',
  'SNAKE_CHARMER', 'EVIL_TWIN', 'WITCH', 'CERENOVUS',
  'PUZZLEMASTER', 'ALCHEMIST', 'AMNESIAC', 'APPRENTICE',
  'PIXIE', 'CLOCKMAKER', 'DREAMER', 'SEAMSTRESS', 'MATHEMATICIAN',
  'WASHERWOMAN', 'LIBRARIAN', 'INVESTIGATOR', 'COOK', 'EMPATH', 'FORTUNE_TELLER', 'VILLAGE_IDIOT',
  'BUTLER', 'SPY', 'OGRE', 'HERMIT',
  'BOUNTY_HUNTER', 'CULT_LEADER', 'NIGHTWATCHMAN', 'KNIGHT', 'BOFFIN', 'NOBLE', 'DAMSEL', 'SNITCH',
  'GRANDMOTHER', 'CHAMBERMAID',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
  'JUGGLER',
  'HUNTSMAN', 'POLITICIAN', 'FISHERMAN', 'ARTIST', 'SAVANT', 'WIZARD',
];

const GLOBAL_OTHER_NIGHT_ORDER = [
  'TOYMAKER',
  'POPPY_GROWER',
  'LUNATIC',
  'LLEECH', 'KAZALI', 'LEGION', 'LIL_MONSTA', 'HARLOT', 'OJO', 'AL_HADIKHIA', 'LORD_OF_TYPHON', 'FIDDLER',
  'BARISTA', 'BUREAUCRAT', 'THIEF', 'DUCHESS',
  'WIDOW', 'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER', 'SUMMONER', 'YAGGABABBLE', 'XAAN', 'WRAITH',
  'PHILOSOPHER', 'SAILOR', 'COURTIER', 'INNKEEPER',
  'POISONER', 'MONK',
  'DEVILS_ADVOCATE', 'EXORCIST',
  'SNAKE_CHARMER', 'WITCH', 'CERENOVUS', 'PIT_HAG',
  'ZOMBUUL', 'PUKKA', 'SHABALOTH', 'PO',
  'FANG_GU', 'NO_DASHII', 'VORTOX', 'VIGORMORTIS',
  'SCARLET_WOMAN', 'IMP', 'ASSASSIN', 'GODFATHER',
  'GAMBLER',
  'PREACHER', 'LYCANTHROPE', 'HUNTSMAN', 'ENGINEER', 'ACROBAT',
  'CANNIBAL', 'RAVENKEEPER',
  'UNDERTAKER', 'EMPATH', 'FORTUNE_TELLER', 'VILLAGE_IDIOT', 'BUTLER',
  'SWEETHEART', 'SAGE', 'BARBER', 'DREAMER',
  'FLOWERGIRL', 'TOWN_CRIER', 'ORACLE', 'SEAMSTRESS', 'MATHEMATICIAN', 'JUGGLER',
  'GOSSIP', 'PROFESSOR', 'BONE_COLLECTOR', 'MINSTREL', 'TEA_LADY', 'PACIFIST', 'FOOL', 'MOONCHILD', 'TINKER',
  'GRANDMOTHER', 'CHAMBERMAID', 'HERMIT',
  'SPY',
  'BOUNTY_HUNTER', 'CULT_LEADER', 'NIGHTWATCHMAN',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
  'CACKLEJACK', 'ZENOMANCER',
  'AMNESIAC', 'DAMSEL', 'POLITICIAN', 'FISHERMAN', 'ARTIST', 'SAVANT', 'WIZARD',
];

function globalOrderFor(isFirstNight) {
  return isFirstNight ? GLOBAL_FIRST_NIGHT_ORDER : GLOBAL_OTHER_NIGHT_ORDER;
}

// Devuelve `campaignOrder` con los `extraIds` insertados en su posición
// global. Los que no figuren en el orden global van al final, para que un
// personaje de guion propio siga apareciendo en vez de desaparecer.
function withSupplements(campaignOrder, extraIds, isFirstNight) {
  const globalOrder = globalOrderFor(isFirstNight);
  const globalPos = new Map(globalOrder.map((id, i) => [id, i]));
  const present = new Set(campaignOrder);

  const missing = [...new Set(extraIds)].filter(id => !present.has(id));
  if (!missing.length) return campaignOrder.slice();

  missing.sort((a, b) => (globalPos.get(a) ?? Infinity) - (globalPos.get(b) ?? Infinity));

  const out = campaignOrder.slice();
  for (const id of missing) {
    const pos = globalPos.get(id);
    if (pos === undefined) { out.push(id); continue; }
    let insertAt = out.length;
    for (let i = 0; i < out.length; i++) {
      const otherPos = globalPos.get(out[i]);
      if (otherPos !== undefined && pos < otherPos) { insertAt = i; break; }
    }
    out.splice(insertAt, 0, id);
  }
  return out;
}

module.exports = {
  GLOBAL_FIRST_NIGHT_ORDER,
  GLOBAL_OTHER_NIGHT_ORDER,
  globalOrderFor,
  withSupplements,
};
