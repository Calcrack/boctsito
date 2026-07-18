# Gherkin — Boctsito (Blood on the Clocktower)

Especificación ejecutable del comportamiento de la página para **todos los roles** de las 4 campañas + Viajeros.
Fuente canónica: `Mecanicas Personajes.txt`.

**Convenciones:**
- `@auto` — la página lo aplica automáticamente (motor `server/gameLogic.js`).
- `@narrador` — la página guía al narrador (NightWalkthrough / fichas / avisos), pero la decisión es humana.
- `*` en una habilidad = "cada noche salvo la primera".
- "borracho o envenenado" = el jugador tiene ficha `POISONED` o `DRUNK_NIGHT` (o es el Borracho `drunkAs`): su habilidad NO funciona y su información puede ser falsa.

---

## Feature: Reglas globales de victoria

  @auto
  Escenario: El Bien gana cuando no quedan Demonios vivos
    Dado una partida en curso sin Ateo en juego
    Y ningún jugador con la Mente Maestra viva y sobria
    Cuando el último Demonio muere (ejecución, habilidad o muerte manual del narrador)
    Entonces la página declara ganador al equipo del Bien
    Y muestra la pantalla de fin de partida a todos

  @auto
  Escenario: El Mal gana cuando solo quedan 2 jugadores vivos
    Dado una partida en curso con el Demonio vivo
    Cuando el número de jugadores vivos baja a 2
    Entonces la página declara ganador al equipo del Mal

  @auto
  Escenario: Con Ateo en juego, la página nunca termina la partida sola
    Dado una partida con el Ateo en juego (no hay malvados reales)
    Cuando muere cualquier jugador o queda cualquier número de vivos
    Entonces la página NO declara ganador automáticamente
    Y solo el narrador puede terminar la partida (DECLARE_WINNER)

  @auto
  Escenario: El Demonio ejecutado con Dama Escarlata viva y 5+ vivos NO termina la partida
    Dado 5 o más jugadores vivos
    Y la Dama Escarlata viva
    Cuando el Demonio es ejecutado
    Entonces la Dama Escarlata se convierte en el nuevo Diablillo
    Y la partida continúa sin anuncio de victoria

  @auto
  Escenario: El Demonio muere con Mente Maestra viva — la partida espera 1 día más
    Dado la Mente Maestra viva, sobria y sana
    Y no hay Dama Escarlata viva con 5+ jugadores
    Cuando el Demonio muere (nominación y ejecución, o muerte manual del narrador)
    Entonces la página NO termina la partida
    Y NO anuncia que el Demonio ha muerto
    Y registra un aviso privado al narrador: "se juega 1 día más"
    Y al día siguiente se resuelve según la Feature "Mente Maestra"

---

## Feature: Fases y fichas de estado (motor)

  @auto
  Escenario: El veneno dura la noche y el día siguiente
    Dado que el Envenenador envenena a la Empática en la noche 2
    Entonces la Empática está envenenada durante la noche 2 y el día 3
    Cuando comienza la noche 3 (anochecer)
    Entonces la ficha de veneno caduca antes de que actúen los roles

  @auto
  Escenario: La protección del Monje caduca al amanecer
    Dado que el Monje protege al Soldado esta noche
    Cuando amanece
    Entonces la ficha "A salvo" desaparece

  @auto
  Escenario: Las fichas manuales del narrador nunca caducan solas
    Dado que el narrador colocó una ficha manual sobre un jugador
    Cuando pasan amaneceres y anocheceres
    Entonces la ficha sigue hasta que el narrador la quite

---

## Feature: Nominaciones y votación (mecánica base)

  @auto
  Escenario: Umbral de ejecución = 50% de los vivos, redondeado hacia arriba
    Dado 7 jugadores vivos
    Cuando una nominación recibe 4 votos
    Entonces alcanza el umbral (4 ≥ ⌈7/2⌉)

  @auto
  Escenario: Un muerto solo vota una vez el resto de la partida y solo a favor
    Dado un jugador muerto que no ha usado su voto fantasma
    Cuando vota a favor en una nominación
    Entonces su voto cuenta y pierde el voto fantasma
    Y si intenta votar de nuevo la página lo rechaza

  @auto
  Escenario: Empate de votos = nadie es ejecutado
    Dado dos nominaciones resueltas con el mismo máximo de votos sobre el umbral
    Cuando el narrador finaliza las nominaciones
    Entonces nadie es ejecutado y se anuncia el empate

  @auto
  Escenario: Cada jugador vivo solo puede nominar una vez por día
    Dado que un jugador ya nominó hoy
    Cuando intenta nominar de nuevo
    Entonces la página rechaza la nominación

---

## Feature: Orden de la primera noche — Trouble Brewing

  El motor despierta en cola interactiva, en este orden exacto:
  POISONER → WASHERWOMAN → LIBRARIAN → INVESTIGATOR → COOK → EMPATH → FORTUNE_TELLER → BUTLER → SPY.
  Antes de la cola: info de Esbirros/Demonio (se reconocen entre sí) y bluffs del Demonio.

  @auto
  Escenario: El Envenenador actúa antes que todos los roles de información
    Dado la primera noche con Envenenador y Empática en juego
    Cuando el Envenenador envenena a la Empática
    Entonces la Empática despierta DESPUÉS y su número de vecinos malvados puede ser falso

  @auto
  Escenario: Los roles de solo-primera-noche no despiertan después
    Dado Lavandera, Bibliotecario, Investigador y Cocinero en juego
    Cuando comienza la noche 2
    Entonces ninguno de ellos aparece en la cola nocturna

  @auto
  Escenario: El Demonio no actúa la primera noche en Trouble Brewing
    Dado el Diablillo en juego
    Cuando se construye la cola de la primera noche
    Entonces el Diablillo no está en la cola (solo recibe bluffs e info de Esbirros)

## Feature: Orden de las otras noches — Trouble Brewing

  Orden: POISONER → MONK → IMP → RAVENKEEPER → FORTUNE_TELLER → EMPATH → UNDERTAKER → BUTLER → SPY.

  @auto
  Escenario: El Monje protege antes de que el Diablillo ataque
    Dado la noche 3 con Monje y Diablillo vivos
    Cuando el Monje protege al Alcalde y luego el Diablillo ataca al Alcalde
    Entonces el Alcalde no muere

  @auto
  Escenario: El Criacuervos despierta solo si murió esta noche
    Dado que el Diablillo mata al Criacuervos
    Entonces la página pide al Criacuervos elegir un jugador antes del amanecer
    Y recibe el rol de ese jugador

  @auto
  Escenario: El Enterrador solo despierta si hubo ejecución hoy
    Dado que nadie fue ejecutado hoy
    Cuando se construye la cola nocturna
    Entonces el Enterrador no está en la cola

## Feature: Orden de la primera noche — Bad Moon Rising

  Orden: LUNATIC → PUKKA → SAILOR → COURTIER → GODFATHER → DEVILS_ADVOCATE → GRANDMOTHER → CHAMBERMAID.

  @auto
  Escenario: El Lunático actúa antes que el Demonio real
    Dado el Lunático y el Pukka en juego
    Cuando se construye la cola de la primera noche
    Entonces el Lunático va antes que el Pukka

  @auto
  Escenario: El Pukka envenena desde la primera noche
    Dado el Pukka en juego la primera noche
    Cuando el Pukka elige a la Abuela
    Entonces la Abuela queda envenenada y su información de nieto puede ser falsa (la Sirvienta y la Abuela actúan después)

## Feature: Orden de las otras noches — Bad Moon Rising

  Orden: SAILOR → COURTIER → INNKEEPER → DEVILS_ADVOCATE → LUNATIC → EXORCIST → ZOMBUUL → PUKKA → SHABALOTH → PO → ASSASSIN → GODFATHER → GAMBLER → GOSSIP → PROFESSOR → MINSTREL → TEA_LADY → PACIFIST → FOOL → MOONCHILD → GRANDMOTHER → CHAMBERMAID.

  @auto
  Escenario: El Posadero protege antes de que actúe el Demonio
    Dado la noche 2 con Posadero y Shabaloth vivos
    Cuando el Posadero elige a dos jugadores y el Shabaloth ataca a uno de ellos
    Entonces el atacado no muere (ficha SAFE_TONIGHT)

  @auto
  Escenario: El Exorcista bloquea al Demonio antes de que despierte
    Dado el Exorcista elige al Zombuul (que es el Demonio)
    Entonces el Zombuul queda marcado como Exorcizado y no ataca esta noche

  @auto
  Escenario: El Asesino actúa después del Demonio
    Dado el Asesino decide matar la noche 4
    Cuando se resuelve la cola
    Entonces el ataque del Asesino se aplica tras los ataques del Demonio (ignora protecciones)

## Feature: Orden de la primera noche — Sects & Violets

  Orden: PHILOSOPHER → SNAKE_CHARMER → EVIL_TWIN → WITCH → CERENOVUS → CLOCKMAKER → DREAMER → SEAMSTRESS → MATHEMATICIAN.

  @auto
  Escenario: El Filósofo actúa primero por si gana una habilidad de información
    Dado el Filósofo en juego
    Cuando se construye la cola de la primera noche
    Entonces el Filósofo es el primero de la cola

  @auto
  Escenario: El Relojero recibe su información tras colocarse las maldiciones
    Dado Relojero, Bruja y Descerebrado en juego
    Cuando se resuelve la primera noche
    Entonces el Relojero recibe la distancia Demonio↔Esbirro después de que Bruja y Descerebrado eligieran

## Feature: Orden de las otras noches — Sects & Violets

  Orden: PHILOSOPHER → SNAKE_CHARMER → WITCH → CERENOVUS → PIT_HAG → FANG_GU → NO_DASHII → VORTOX → VIGORMORTIS → SWEETHEART → SAGE → BARBER → JUGGLER → DREAMER → FLOWERGIRL → TOWN_CRIER → ORACLE → SEAMSTRESS → MATHEMATICIAN.

  @auto
  Escenario: El Brujo del Caldero transforma antes de que ataque el Demonio
    Dado la noche 3 con Brujo del Caldero y Vortox vivos
    Cuando el Brujo del Caldero transforma a un jugador
    Entonces la transformación ocurre antes del ataque del Vortox

  @auto
  Escenario: El Sabio recibe su información tras morir a manos del Demonio
    Dado que el Fang Gu mata al Sabio esta noche
    Entonces el Sabio (después de los ataques de Demonio) recibe 2 jugadores, uno de los cuales es el Demonio

## Feature: Orden de la primera noche — The Carousel

  Orden: POPPY_GROWER → MAGICIAN → BOFFIN → KAZALI → LEGION → LIL_MONSTA → LLEECH → RIOT → LEVIATHAN → MEZEPHELES → SUMMONER → YAGGABABBLE → SHUGENJA → STEWARD → PUZZLEMASTER → ALCHEMIST → BOUNTY_HUNTER → KNIGHT → NOBLE → DAMSEL → SNITCH → BALLOONIST → GENERAL → HIGH_PRIESTESS → KING → WIDOW.

  @auto
  Escenario: El Cultivador de Adormidera actúa antes que la info del mal
    Dado el Cultivador de Adormidera en juego
    Cuando se genera la información de la primera noche
    Entonces los Esbirros y el Demonio NO reciben quiénes son sus compañeros

  @auto
  Escenario: La Viuda mira el Grimorio al final de la primera noche
    Dado la Viuda en juego
    Cuando se construye la cola de la primera noche
    Entonces la Viuda es la última (ve el Grimorio con todas las fichas ya colocadas)

  @auto
  Escenario: La Marioneta no entra en la cola interactiva
    Dado la Marioneta en juego
    Cuando se construye la cola de la primera noche
    Entonces la Marioneta no despierta (cree ser buena; el Demonio la conoce)

## Feature: Orden de las otras noches — The Carousel

  Orden: POPPY_GROWER → PREACHER → LYCANTHROPE → ENGINEER → HUNTSMAN → LLEECH → KAZALI → LEGION → LIL_MONSTA → OJO → AL_HADIKHIA → MEZEPHELES → FEARMONGER → HARPY → ORGAN_GRINDER → SUMMONER → YAGGABABBLE → ACROBAT → CANNIBAL → BOUNTY_HUNTER → CULT_LEADER → NIGHTWATCHMAN → BALLOONIST → GENERAL → HIGH_PRIESTESS → KING.

  @auto
  Escenario: El Predicador actúa antes que los Esbirros
    Dado el Predicador elige al Sembrador de Miedo esta noche
    Entonces el Sembrador de Miedo pierde su habilidad antes de poder usarla

  @auto
  Escenario: El Licántropo actúa antes que el Demonio
    Dado el Licántropo elige a un jugador bueno esta noche
    Entonces ese jugador muere y el ataque del Demonio de esta noche no mata

  @auto
  Escenario: El Ingeniero cambia los roles en juego antes de que actúe el Demonio
    Dado el Ingeniero usa su habilidad esta noche
    Entonces los nuevos Esbirros/Demonio quedan definidos antes de los ataques

---

# CAMPAÑA: TROUBLE BREWING

## Feature: Lavandera (Aldeano)
  «Primera noche: ves 2 jugadores, uno de los cuales es un Aldeano específico.»

  @auto
  Escenario: Información verdadera la primera noche
    Dado la Lavandera sobria y sana la primera noche
    Cuando se resuelve su turno en la cola
    Entonces recibe 2 nombres y un rol de Aldeano, y al menos uno de los dos ES ese Aldeano

  @auto
  Escenario: Lavandera envenenada recibe información falsa
    Dado que el Envenenador eligió a la Lavandera la primera noche
    Cuando la Lavandera recibe su información
    Entonces la pareja mostrada puede no contener al Aldeano indicado

  @auto
  Escenario: El Espía puede registrar como Aldeano para la Lavandera
    Dado el Espía en juego registrando como bueno
    Cuando la Lavandera recibe su par
    Entonces el Espía puede aparecer mostrado como un rol de Aldeano falso

## Feature: Bibliotecario (Aldeano)
  «Primera noche: ves 2 jugadores, uno de los cuales es un Forastero específico.»

  @auto
  Escenario: Detecta un Forastero real
    Dado el Bibliotecario sobrio y sano y el Santo en juego
    Cuando recibe su información la primera noche
    Entonces uno de los 2 jugadores mostrados es el Santo

  @auto
  Escenario: Sin Forasteros en juego
    Dado una partida sin Forasteros
    Cuando el Bibliotecario recibe su información
    Entonces recibe "0" / ningún Forastero (o información falsa si está borracho)

## Feature: Investigador (Aldeano)
  «Primera noche: ves 2 jugadores, uno de los cuales es un Esbirro específico.»

  @auto
  Escenario: Detecta un Esbirro real
    Dado el Investigador sobrio y sano y el Barón en juego
    Cuando recibe su información
    Entonces uno de los 2 mostrados es el Barón

  @auto
  Escenario: El Recluso puede registrar como Esbirro
    Dado el Recluso en juego registrando como malvado esta noche
    Cuando el Investigador recibe su par
    Entonces el Recluso puede aparecer como un Esbirro (p. ej. Envenenador)

## Feature: Cocinero (Aldeano)
  «Primera noche: sabes cuántas parejas de malvados son vecinos.»

  @auto
  Escenario: Dos malvados sentados juntos
    Dado el Diablillo y el Envenenador en asientos contiguos
    Cuando el Cocinero recibe su número
    Entonces recibe "1"

  @auto
  Escenario: Cocinero borracho
    Dado que el Cocinero es en realidad el Borracho (drunkAs COOK)
    Cuando recibe su número
    Entonces el número puede ser falso

## Feature: Empática (Aldeano)
  «Cada noche: cuántos de tus 2 vecinos vivos son malvados.»

  @auto
  Escenario: Vecinos vivos se recalculan al morir gente
    Dado que el vecino izquierdo de la Empática murió ayer
    Cuando la Empática recibe su número esta noche
    Entonces se cuenta el siguiente vecino VIVO en esa dirección

  @auto
  Escenario: Empática envenenada
    Dado la Empática envenenada esta noche
    Cuando recibe su número
    Entonces el número puede ser incorrecto (0-2 aleatorio distinto del real)

## Feature: Adivina (Aldeano)
  «Cada noche: elige 2 jugadores y sabes si alguno es el Demonio.»

  @auto
  Escenario: Detecta al Demonio
    Dado la Adivina sobria y sana
    Cuando elige al Diablillo y a un Aldeano
    Entonces recibe "SÍ hay Demonio"

  @auto
  Escenario: Señuelo (red herring) registra como Demonio
    Dado que el narrador marcó a un jugador bueno como señuelo en el montaje
    Cuando la Adivina elige al señuelo y a otro bueno
    Entonces recibe "SÍ hay Demonio" aunque ninguno lo sea

  @auto
  Escenario: Adivina envenenada
    Dado la Adivina envenenada
    Cuando elige 2 jugadores
    Entonces la respuesta es aleatoria (puede ser falsa)

## Feature: Enterrador (Aldeano)
  «Cada noche*: sabes qué rol fue ejecutado hoy.»

  @auto
  Escenario: Recibe el rol del ejecutado
    Dado que la Virgen fue ejecutada hoy
    Cuando el Enterrador despierta esta noche
    Entonces recibe "Virgen"

  @auto
  Escenario: Sin ejecución no despierta
    Dado que hoy nadie fue ejecutado
    Cuando se construye la cola nocturna
    Entonces el Enterrador no está en la cola

## Feature: Monje (Aldeano)
  «Cada noche*: elige 1 jugador (no tú). Protegido del Demonio esta noche.»

  @auto
  Escenario: Protege del ataque del Diablillo
    Dado el Monje protege al Cazador
    Cuando el Diablillo ataca al Cazador esta noche
    Entonces el Cazador no muere

  @auto
  Escenario: Monje envenenado no protege
    Dado el Monje envenenado esta noche
    Cuando "protege" a un jugador y el Diablillo lo ataca
    Entonces el jugador muere

  @auto
  Escenario: La protección no evita al Asesino
    Dado el Monje protege a un jugador
    Cuando el Asesino elige a ese jugador
    Entonces el jugador muere igualmente

## Feature: Criacuervos (Aldeano)
  «Si mueres de noche: elige 1 jugador y descubres su rol.»

  @auto
  Escenario: Muere de noche y aprende un rol
    Dado que el Diablillo mata al Criacuervos
    Cuando el Criacuervos elige al Espía... 
    Entonces recibe el rol real (o el falso si el Espía registra como bueno / si el Criacuervos está envenenado)

  @auto
  Escenario: El Borracho que cree ser Criacuervos recibe rol falso
    Dado el Borracho con drunkAs Criacuervos muere de noche
    Cuando elige un jugador
    Entonces recibe un rol falso

## Feature: Virgen (Aldeano)
  «La 1ª vez que te nominan, si el nominador es Aldeano, es ejecutado de inmediato.»

  @auto
  Escenario: Nominada por un Aldeano
    Dado la Virgen sana y sin usar su poder
    Cuando un Aldeano la nomina
    Entonces el nominador muere ejecutado inmediatamente y no hay votación
    Y el poder de la Virgen queda gastado

  @auto
  Escenario: Nominada por un Forastero o malvado
    Dado la Virgen sana y sin usar su poder
    Cuando un Forastero la nomina
    Entonces nadie muere pero el poder queda gastado igualmente

  @auto
  Escenario: Virgen envenenada
    Dado la Virgen envenenada
    Cuando un Aldeano la nomina
    Entonces nadie muere y el poder queda gastado

## Feature: Cazador / Slayer (Aldeano)
  «Una vez por partida, de día: elige 1 jugador. Si es el Demonio, muere.»

  @auto
  Escenario: Dispara al Demonio
    Dado el Cazador sobrio, sano y sin usar su tiro
    Cuando dispara al Diablillo durante el día
    Entonces el Diablillo muere
    Y si no hay Dama Escarlata (5+ vivos) ni Mente Maestra, el Bien gana

  @auto
  Escenario: Dispara al Demonio con Dama Escarlata viva
    Dado 5+ vivos y la Dama Escarlata viva
    Cuando el Cazador mata al Diablillo
    Entonces la Dama Escarlata se convierte en Diablillo y la partida sigue

  @auto
  Escenario: Dispara envenenado
    Dado el Cazador envenenado
    Cuando dispara al Demonio
    Entonces no pasa nada y el tiro queda gastado

  @auto
  Escenario: El Borracho que cree ser Cazador
    Dado el Borracho con drunkAs Cazador
    Cuando dispara a cualquiera
    Entonces no pasa nada y el tiro queda gastado

## Feature: Soldado (Aldeano)
  «No puedes morir por ataques del Demonio.»

  @auto
  Escenario: El Diablillo lo ataca
    Dado el Soldado sobrio y sano
    Cuando el Diablillo lo ataca de noche
    Entonces no muere

  @auto
  Escenario: Soldado envenenado
    Dado el Soldado envenenado
    Cuando el Diablillo lo ataca
    Entonces muere

  @auto
  Escenario: El Soldado sí puede ser ejecutado
    Dado el Soldado vivo
    Cuando es ejecutado por votación
    Entonces muere con normalidad

## Feature: Alcalde (Aldeano)
  «Si solo quedan 3 vivos y no hay ejecución, gana el Bien. Si mueres de noche, otro puede morir en tu lugar.»

  @auto
  Escenario: Victoria del Alcalde
    Dado 3 jugadores vivos con el Alcalde sano entre ellos
    Cuando el día termina sin ejecución (el narrador inicia la noche)
    Entonces la página declara la victoria del Bien automáticamente

  @auto
  Escenario: Rebote del ataque nocturno
    Dado el Diablillo ataca al Alcalde sano
    Cuando se resuelve el ataque
    Entonces el Alcalde puede no morir y otro jugador (no Demonio) muere en su lugar

  @auto
  Escenario: Alcalde envenenado no rebota
    Dado el Alcalde envenenado
    Cuando el Diablillo lo ataca
    Entonces muere él

## Feature: Mayordomo (Forastero)
  «Cada noche elige un Amo. Solo puedes votar si tu Amo vota.»

  @auto
  Escenario: Voto restringido
    Dado el Mayordomo eligió a Ana como Amo anoche
    Cuando el Mayordomo intenta votar a favor sin que Ana haya votado
    Entonces la página rechaza su voto

  @auto
  Escenario: Vota después de su Amo
    Dado Ana (Amo) ya votó a favor en la nominación
    Cuando el Mayordomo vota a favor
    Entonces su voto se acepta

  @auto
  Escenario: Mayordomo envenenado vota libre
    Dado el Mayordomo envenenado
    Cuando vota sin que su Amo vote
    Entonces el voto se acepta

## Feature: Borracho (Forastero)
  «Crees ser un Aldeano. No lo eres. Tu información es falsa.»

  @auto
  Escenario: Recibe un rol de Aldeano falso al repartir
    Dado el Borracho en la bolsa
    Cuando se reparten los roles
    Entonces el jugador ve un rol de Aldeano que NO está en juego (drunkAs)
    Y el narrador ve "Borracho (cree ser X)"

  @auto
  Escenario: Toda su información es falsa
    Dado el Borracho cree ser la Empática
    Cuando "actúa" cada noche
    Entonces despierta como si fuera la Empática pero sus números pueden ser falsos

  @auto
  Escenario: Sus acciones no tienen efecto
    Dado el Borracho cree ser el Monje
    Cuando "protege" a un jugador
    Entonces el jugador NO queda protegido realmente

## Feature: Recluso (Forastero)
  «Puedes registrar como malvado / Esbirro / Demonio.»

  @auto
  Escenario: La Adivina lo detecta como Demonio
    Dado el Recluso registrando como malvado esta noche
    Cuando la Adivina lo elige
    Entonces puede recibir "SÍ hay Demonio"

  @auto
  Escenario: El Enterrador puede ver un rol malvado
    Dado el Recluso ejecutado hoy y registrando como Esbirro
    Cuando el Enterrador despierta
    Entonces puede recibir un rol de Esbirro (p. ej. Envenenador)

## Feature: Santo (Forastero)
  «Si eres ejecutado, el Bien pierde.»

  @auto
  Escenario: Ejecutado sano
    Dado el Santo sobrio y sano
    Cuando es ejecutado por votación
    Entonces la página declara inmediatamente la victoria del Mal

  @auto
  Escenario: Ejecutado envenenado
    Dado el Santo envenenado
    Cuando es ejecutado
    Entonces la partida continúa (no gana el Mal)

  @auto
  Escenario: Muerto de noche no pasa nada
    Dado el Santo vivo
    Cuando el Diablillo lo mata de noche
    Entonces la partida continúa con normalidad

## Feature: Envenenador (Esbirro)
  «Cada noche: envenena 1 jugador esa noche y el día siguiente.»

  @auto
  Escenario: Envenena información
    Dado el Envenenador elige a la Adivina
    Cuando la Adivina actúa esta noche
    Entonces su respuesta puede ser falsa

  @auto
  Escenario: El veneno se mueve cada noche
    Dado el Envenenador envenenó a Ana anoche
    Cuando esta noche envenena a Beto
    Entonces Ana queda limpia y solo Beto está envenenado

  @auto
  Escenario: Envenena habilidades pasivas
    Dado el Envenenador elige al Soldado
    Cuando el Diablillo ataca al Soldado esa noche
    Entonces el Soldado muere

## Feature: Espía (Esbirro)
  «Cada noche ve el Grimorio. Puede registrar como bueno.»

  @auto
  Escenario: Ve el Grimorio completo
    Dado el Espía vivo
    Cuando despierta cada noche
    Entonces recibe la lista de todos los jugadores con rol y estado real

  @auto
  Escenario: Registra como bueno para la información
    Dado el Espía en juego
    Cuando la Lavandera / el Investigador / la Adivina lo evalúan
    Entonces puede aparecer como Aldeano bueno

## Feature: Dama Escarlata (Esbirro)
  «Si hay 5+ vivos y el Demonio muere, te conviertes en el Demonio.»

  @auto
  Escenario: Hereda por ejecución
    Dado 5+ vivos y la Dama Escarlata viva
    Cuando el Diablillo es ejecutado
    Entonces ella se convierte en Diablillo y la partida NO termina

  @auto
  Escenario: Hereda por disparo del Cazador
    Dado 5+ vivos y la Dama Escarlata viva
    Cuando el Cazador mata al Diablillo de día
    Entonces ella se convierte en Diablillo y la partida sigue

  @auto
  Escenario: Con 4 vivos no hereda
    Dado exactamente 4 jugadores vivos
    Cuando el Demonio es ejecutado
    Entonces el Bien gana (la Dama Escarlata no se transforma)

## Feature: Barón (Esbirro)
  «+2 Forasteros en el montaje.»

  @auto
  Escenario: Modifica la distribución
    Dado una partida de 9 jugadores (5/2/1/1) con Barón seleccionado
    Cuando se calcula la distribución
    Entonces quedan 3 Aldeanos y 4 Forasteros (los +2 reemplazan Aldeanos)

  @auto
  Escenario: Su muerte no revierte el montaje
    Dado el Barón muerto el día 2
    Cuando continúa la partida
    Entonces los Forasteros extra siguen en juego

## Feature: Diablillo (Demonio)
  «Cada noche*: elige 1 jugador: muere. Si te suicidas, un Esbirro se convierte en Diablillo.»

  @auto
  Escenario: Ataque normal
    Dado el Diablillo sobrio la noche 2
    Cuando ataca a un Aldeano sin protección
    Entonces el Aldeano muere y se anuncia al amanecer

  @auto
  Escenario: Suicidio pasa el testigo (star-pass)
    Dado el Diablillo y el Envenenador vivos
    Cuando el Diablillo se elige a sí mismo
    Entonces el Diablillo muere y el Envenenador se convierte en el nuevo Diablillo

  @auto
  Escenario: Diablillo envenenado no mata
    Dado el Diablillo envenenado (p. ej. por el Encantador de Serpientes en otra campaña)
    Cuando ataca
    Entonces nadie muere

# CAMPAÑA: BAD MOON RISING

## Feature: Abuela (Aldeano)
  «Primera noche: conoces 1 jugador bueno y su rol. Si el Demonio lo mata, tú mueres también.»

  @auto
  Escenario: Conoce a su nieto
    Dado la Abuela sobria la primera noche
    Cuando el narrador elige al nieto en su turno
    Entonces la Abuela recibe nombre y rol del nieto

  @auto
  Escenario: El Demonio mata al nieto
    Dado el nieto marcado en la partida
    Cuando el Demonio mata al nieto de noche
    Entonces la Abuela muere también esa misma noche

  @auto
  Escenario: Abuela envenenada no muere con el nieto
    Dado la Abuela envenenada
    Cuando el Demonio mata al nieto
    Entonces la Abuela no muere

## Feature: Marinero (Aldeano)
  «Cada noche: elige un vivo. O tú o él está borracho hasta el anochecer. No puedes morir.»

  @narrador
  Escenario: El narrador decide quién se emborracha
    Dado el Marinero elige al Tahúr
    Cuando el narrador resuelve el paso del Marinero
    Entonces coloca la ficha de borracho en el Marinero O en el Tahúr hasta el próximo anochecer

  @auto
  Escenario: Marinero sobrio no puede morir
    Dado el Marinero sobrio y sano
    Cuando el Demonio lo ataca de noche
    Entonces no muere (safeTonight del patrón del Marinero)

  @auto
  Escenario: Marinero borracho puede morir
    Dado el Marinero borracho por su propia habilidad
    Cuando es ejecutado
    Entonces muere con normalidad

## Feature: Sirvienta (Aldeano)
  «Cada noche: elige 2 vivos (no tú): sabes cuántos despertaron por su habilidad.»

  @narrador
  Escenario: Cuenta despertares
    Dado la Sirvienta elige al Exorcista y al Bufón la noche 2
    Cuando el Exorcista despertó y el Bufón no
    Entonces la Sirvienta recibe "1"

  @narrador
  Escenario: Sirvienta envenenada
    Dado la Sirvienta envenenada
    Cuando elige 2 jugadores
    Entonces el número puede ser falso

## Feature: Exorcista (Aldeano)
  «Cada noche*: elige un jugador (≠ anoche). Si es el Demonio, no despierta esta noche.»

  @auto
  Escenario: Bloquea al Demonio
    Dado el Exorcista elige al Pukka
    Entonces el Pukka queda Exorcizado: sabe quién es el Exorcista y no actúa esta noche
    Y el ataque del Pukka esta noche no ocurre

  @auto
  Escenario: Elige a un no-Demonio
    Dado el Exorcista elige a un Esbirro
    Entonces no pasa nada esta noche

  @narrador
  Escenario: No puede repetir objetivo
    Dado el Exorcista eligió a Ana anoche
    Cuando la página muestra su panel esta noche
    Entonces el narrador debe hacer que elija a un jugador distinto

## Feature: Posadero (Aldeano)
  «Cada noche*: elige 2 jugadores: no pueden morir esta noche, pero 1 está borracho hasta el anochecer.»

  @auto
  Escenario: Protege a dos y emborracha a uno
    Dado el Posadero elige a Ana y Beto, y el narrador marca borracho a Beto
    Cuando el Demonio ataca a Ana esta noche
    Entonces Ana no muere
    Y Beto está borracho hasta el próximo anochecer

  @auto
  Escenario: El Asesino ignora al Posadero
    Dado el Posadero protege a Ana
    Cuando el Asesino mata a Ana
    Entonces Ana muere (el Asesino ignora toda protección)

## Feature: Tahúr (Aldeano)
  «Cada noche*: elige un jugador y adivina su rol. Si fallas, mueres.»

  @narrador
  Escenario: Adivina correcto
    Dado el Tahúr elige a Ana y adivina "Envenenadora"
    Cuando Ana es realmente la Envenenadora
    Entonces el Tahúr no muere

  @narrador
  Escenario: Adivina incorrecto
    Dado el Tahúr elige a Ana y adivina "Monje"
    Cuando Ana no es el Monje
    Entonces el narrador marca la muerte del Tahúr esa noche

## Feature: Cotilla (Aldeano)
  «Cada día: declaración pública. Si es verdadera, esa noche muere un jugador.»

  @narrador
  Escenario: Declaración verdadera
    Dado la Cotilla declaró públicamente algo verdadero hoy
    Cuando llega la noche
    Entonces el narrador elige un jugador que muere por la habilidad de la Cotilla

  @narrador
  Escenario: Declaración falsa
    Dado la Cotilla declaró algo falso
    Cuando llega la noche
    Entonces nadie muere por esta habilidad

## Feature: Cortesano (Aldeano)
  «Una vez por partida, de noche: elige un ROL: ese jugador está borracho 3 noches y 3 días.»

  @narrador
  Escenario: Emborracha al Demonio por rol
    Dado el Cortesano usa su habilidad y nombra "Zombuul"
    Cuando el Zombuul está en juego
    Entonces el jugador Zombuul queda borracho 3 noches y 3 días (fichas del narrador)

  @narrador
  Escenario: Nombra un rol que no está en juego
    Dado el Cortesano nombra "Bufón" y no hay Bufón
    Entonces nadie se emborracha y la habilidad queda gastada

## Feature: Profesor (Aldeano)
  «Una vez por partida, de noche*: elige un muerto. Si es Aldeano, revive.»

  @auto
  Escenario: Revive a un Aldeano
    Dado el Profesor sobrio usa su habilidad sobre un Monje muerto
    Entonces el Monje vuelve a la vida y recupera su rol activo

  @auto
  Escenario: Elige a un no-Aldeano
    Dado el Profesor elige a un Forastero muerto
    Entonces no revive y la habilidad queda gastada

  @auto
  Escenario: Profesor envenenado
    Dado el Profesor envenenado
    Cuando usa su habilidad sobre un Aldeano muerto
    Entonces no revive

## Feature: Juglar (Aldeano)
  «Si un Esbirro muere ejecutado, todos los demás están borrachos hasta el próximo anochecer.»

  @auto
  Escenario: Esbirro ejecutado activa la borrachera colectiva
    Dado el Juglar vivo y sobrio
    Cuando el Asesino (Esbirro) es ejecutado hoy
    Entonces al empezar la noche TODOS los demás jugadores (salvo Viajeros) quedan borrachos hasta el próximo anochecer
    Y el Demonio no puede matar esa noche (está borracho)

  @auto
  Escenario: Esbirro muerto de noche no activa nada
    Dado el Juglar vivo
    Cuando un Esbirro muere por ataque nocturno
    Entonces nadie se emborracha

## Feature: Dama del Té (Aldeano)
  «Si tus 2 vecinos vivos son buenos, no pueden morir.»

  @narrador
  Escenario: Vecinos buenos protegidos
    Dado la Dama del Té con dos vecinos vivos buenos
    Cuando el Demonio ataca a uno de ellos
    Entonces el narrador ve el aviso de protección y el vecino no muere

  @narrador
  Escenario: Un vecino malvado rompe la protección
    Dado que un vecino vivo de la Dama del Té es malvado
    Cuando el Demonio ataca al otro vecino
    Entonces el vecino muere con normalidad

## Feature: Pacifista (Aldeano)
  «Los jugadores buenos ejecutados pueden no morir.»

  @narrador
  Escenario: El narrador decide salvar
    Dado el Pacifista vivo y sobrio
    Cuando un jugador bueno es ejecutado
    Entonces la página avisa al narrador que puede decidir que no muera (y revivirlo)

  @auto
  Escenario: Pacifista muerto no salva
    Dado el Pacifista muerto
    Cuando un bueno es ejecutado
    Entonces muere con normalidad y no hay aviso

## Feature: Bufón / Fool (Aldeano)
  «La primera vez que mueras, no mueres.»

  @auto
  Escenario: Sobrevive su primera muerte nocturna
    Dado el Bufón sobrio que nunca ha muerto
    Cuando el Demonio lo ataca
    Entonces no muere y su habilidad queda gastada
    Y el narrador recibe el aviso correspondiente

  @auto
  Escenario: La segunda muerte es real
    Dado el Bufón que ya gastó su habilidad
    Cuando vuelve a morir por cualquier causa
    Entonces muere

  @auto
  Escenario: Bufón envenenado muere a la primera
    Dado el Bufón envenenado
    Cuando el Demonio lo ataca
    Entonces muere

## Feature: Matón / Goon (Forastero)
  «El primer jugador que te elija cada noche se emborracha y tú adoptas su alineación.»

  @narrador
  Escenario: Un bueno lo elige
    Dado el Monje elige al Matón esta noche
    Entonces el Monje queda borracho hasta el anochecer y el Matón se vuelve bueno (sin cambio)

  @narrador
  Escenario: El Demonio lo elige
    Dado el Pukka elige al Matón
    Entonces el Pukka queda borracho (su veneno no aplica) y el Matón se vuelve MALVADO

## Feature: Lunático (Forastero)
  «Crees ser el Demonio. El Demonio sabe quién eres y a quién eliges.»

  @auto
  Escenario: Cree ser el Demonio
    Dado el Lunático en la bolsa
    Cuando se reparten roles
    Entonces el jugador ve un Demonio como su rol (believedRole)
    Y no despierta con los malvados reales

  @auto
  Escenario: Sus ataques no matan
    Dado el Lunático "ataca" a un jugador
    Entonces nadie muere por esa elección
    Y el Demonio real es informado de la elección del Lunático

## Feature: Manitas / Tinker (Forastero)
  «Puedes morir en cualquier momento.»

  @narrador
  Escenario: El narrador puede matarlo cuando quiera
    Dado el Manitas vivo
    Cuando el narrador decide que muere (botón matar)
    Entonces muere sin necesidad de causa

## Feature: Hijo de la Luna (Forastero)
  «Cuando sepas que moriste, elige públicamente 1 vivo: si es bueno, muere esa noche.»

  @narrador
  Escenario: Elige a un bueno
    Dado el Hijo de la Luna acaba de morir
    Cuando elige públicamente a un jugador bueno
    Entonces esa noche el narrador marca su muerte

  @narrador
  Escenario: Elige a un malvado
    Dado el Hijo de la Luna muerto elige a un malvado
    Entonces nadie muere

## Feature: Padrino (Esbirro)
  «Primera noche: sabes qué Forasteros hay. Si un Forastero muere de día, esa noche eliges un jugador: muere. [-1 o +1 Forastero]»

  @auto
  Escenario: Conoce a los Forasteros
    Dado el Padrino la primera noche
    Entonces recibe la lista de roles Forastero en juego

  @auto
  Escenario: Mata tras ejecución de un Forastero
    Dado que el Recluso (Forastero) fue ejecutado hoy
    Cuando llega la noche
    Entonces la página recuerda al narrador que el Padrino elige una víctima
    Y el elegido muere (GODFATHER_KILL)

  @narrador
  Escenario: Modificador de Forasteros en el montaje
    Dado el Padrino seleccionado en el montaje
    Entonces el narrador elige −1 o +1 Forastero en la distribución

## Feature: Abogado del Diablo (Esbirro)
  «Cada noche: elige un vivo (≠ anoche): si es ejecutado mañana, no muere.»

  @auto
  Escenario: Salva de la ejecución
    Dado el Abogado del Diablo eligió a Ana anoche
    Cuando Ana es ejecutada hoy
    Entonces Ana NO muere (sigue ejecutada a efectos de "hubo ejecución")
    Y la ficha de protección se consume

  @auto
  Escenario: La protección caduca al anochecer
    Dado Ana protegida por el Abogado hoy
    Cuando no es ejecutada y llega la noche
    Entonces la ficha desaparece

## Feature: Asesino (Esbirro)
  «Una vez por partida, de noche*: elige un jugador: muere aunque no debiera poder.»

  @auto
  Escenario: Ignora protecciones
    Dado el Monje protege a Ana y el Posadero también
    Cuando el Asesino elige a Ana
    Entonces Ana muere

  @auto
  Escenario: Ignora al Soldado y al Bufón... pero no al veneno propio
    Dado el Asesino envenenado por el Cortesano
    Cuando usa su tiro
    Entonces nadie muere y la habilidad queda gastada

## Feature: Mente Maestra (Esbirro)
  «Si el Demonio muere por ejecución (terminando la partida), se juega 1 día más. Si alguien es ejecutado ese día, su equipo pierde.»

  @auto
  Escenario: El Demonio es ejecutado — la página NO termina la partida
    Dado la Mente Maestra viva, sobria y sana
    Y ningún otro Demonio ni Dama Escarlata elegible
    Cuando el Demonio es nominado y ejecutado
    Entonces la página NO muestra pantalla de victoria
    Y NO anuncia que el Demonio murió
    Y avisa en privado al narrador: "Mente Maestra: se juega 1 día más"

  @auto
  Escenario: El narrador mata al Demonio manualmente — misma espera
    Dado la Mente Maestra viva y sobria
    Cuando el narrador mata al Demonio con el botón de matar
    Entonces la partida NO termina y se espera el día extra

  @auto
  Escenario: Día extra — ejecutan a un bueno
    Dado el día extra de la Mente Maestra en curso
    Cuando un jugador bueno es ejecutado (muera o no, p. ej. salvado por el Abogado del Diablo)
    Entonces la página declara la victoria del MAL inmediatamente

  @auto
  Escenario: Día extra — ejecutan a un malvado
    Dado el día extra en curso
    Cuando un jugador malvado es ejecutado
    Entonces la página declara la victoria del BIEN

  @auto
  Escenario: Día extra — nadie es ejecutado
    Dado el día extra en curso
    Cuando el narrador inicia la noche sin que hubiera ejecución
    Entonces la página declara la victoria del BIEN

  @auto
  Escenario: Con 2 vivos durante el día extra la partida no termina por eso
    Dado el Demonio muerto y el día extra en curso con 2 vivos
    Entonces el Mal NO gana por "solo 2 vivos" (la habilidad prevalece)

  @auto
  Escenario: Mente Maestra borracha no activa el día extra
    Dado la Mente Maestra emborrachada por el Cortesano
    Cuando el Demonio es ejecutado
    Entonces el Bien gana inmediatamente (ejemplo canónico del Po)

## Feature: Zombuul (Demonio)
  «Cada noche*: si nadie murió de día, elige un jugador: muere. La 1ª vez que mueras, sigues vivo pero pareces muerto.»

  @auto
  Escenario: Primera "muerte" por ejecución
    Dado el Zombuul sano es ejecutado
    Entonces aparece como muerto para todos
    Y la partida NO termina (sigue siendo el Demonio vivo en secreto)
    Y el narrador recibe el aviso "el Zombuul sigue vivo"
    Y la Mente Maestra NO se activa (la partida no habría terminado)

  @auto
  Escenario: Sigue actuando "muerto"
    Dado el Zombuul aparentemente muerto
    Cuando llega la noche y nadie murió hoy de día
    Entonces el narrador sigue resolviendo su ataque (panel del Zombuul)

  @auto
  Escenario: Segunda muerte es real
    Dado el Zombuul aparentemente muerto
    Cuando el narrador lo mata de verdad (segunda muerte)
    Entonces el Demonio está muerto de verdad y se evalúa el fin de partida (Mente Maestra incluida)

  @narrador
  Escenario: Solo mata si nadie murió de día
    Dado que hoy hubo una ejecución con muerte
    Cuando llega la noche
    Entonces el Zombuul no ataca (aviso ℹ en el panel)

## Feature: Pukka (Demonio)
  «Cada noche: elige un jugador: se envenena. El envenenado de anoche muere y queda sano.»

  @auto
  Escenario: Cadena de veneno
    Dado el Pukka envenenó a Ana anoche
    Cuando esta noche elige a Beto
    Entonces Ana muere y Beto queda envenenado

  @auto
  Escenario: Actúa desde la primera noche
    Dado el Pukka la primera noche
    Entonces está en la cola y envenena (nadie muere aún)

  @auto
  Escenario: Víctima protegida no muere pero sigue la cadena
    Dado Ana envenenada por el Pukka anoche y protegida por el Posadero esta noche
    Cuando el Pukka elige a Beto
    Entonces Ana no muere y Beto queda envenenado

## Feature: Shabaloth (Demonio)
  «Cada noche*: elige 2 jugadores: mueren. Puede regurgitar (revivir) a uno de los que mató anoche.»

  @auto
  Escenario: Mata a dos por noche
    Dado el Shabaloth la noche 2
    Cuando elige a Ana y Beto sin protección
    Entonces ambos mueren

  @auto
  Escenario: Regurgita a una víctima de anoche
    Dado el Shabaloth mató a Ana anoche
    Cuando la página recuerda al narrador la regurgitación esta noche
    Entonces el narrador puede revivir a Ana

## Feature: Po (Demonio)
  «Cada noche*: puedes elegir un jugador: muere. Si anoche no elegiste, esta noche eliges 3.»

  @auto
  Escenario: Noche sin ataque carga la furia
    Dado el Po decide no atacar esta noche
    Entonces la página registra el aviso "próxima noche ataca ×3"

  @auto
  Escenario: Ataque triple
    Dado el Po no atacó anoche
    Cuando esta noche elige a 3 jugadores
    Entonces los 3 mueren (salvo protegidos)

# CAMPAÑA: SECTS & VIOLETS

## Feature: Relojero (Aldeano)
  «Primera noche: distancia (en asientos) entre el Demonio y su Esbirro más cercano.»

  @auto
  Escenario: Distancia correcta
    Dado el Vortox con un Esbirro a 3 asientos
    Cuando el Relojero recibe su número la primera noche
    Entonces recibe "3"

  @auto
  Escenario: Con Vortox la información es falsa
    Dado el Vortox como Demonio
    Cuando el Relojero recibe su número
    Entonces el número es FORZOSAMENTE falso

## Feature: Soñador (Aldeano)
  «Cada noche: elige un jugador: recibes 1 rol bueno y 1 malvado; uno es el correcto.»

  @narrador
  Escenario: Sondea a un malvado
    Dado el Soñador elige a la Bruja
    Cuando el narrador resuelve el paso
    Entonces la página propone un par (rol bueno falso + "Bruja")

  @narrador
  Escenario: Soñador envenenado
    Dado el Soñador envenenado
    Entonces el par mostrado puede no contener el rol real

## Feature: Encantador de Serpientes (Aldeano)
  «Cada noche: elige un vivo. Si es el Demonio: intercambiáis rol y alineación; el nuevo Encantador queda envenenado.»

  @narrador
  Escenario: Acierta al Demonio
    Dado el Encantador elige al No Dashii
    Cuando el narrador confirma el intercambio
    Entonces el Encantador se vuelve No Dashii malvado
    Y el viejo Demonio se vuelve Encantador bueno envenenado permanentemente

  @auto
  Escenario: Elige a un no-Demonio
    Dado el Encantador elige a un Aldeano
    Entonces no pasa nada

## Feature: Matemático (Aldeano)
  «Cada noche: cuántas habilidades funcionaron anormalmente desde el amanecer.»

  @narrador
  Escenario: Cuenta anomalías
    Dado que el Soldado envenenado murió por el Demonio hoy
    Cuando el Matemático despierta
    Entonces recibe al menos "1"

  @narrador
  Escenario: Sin anomalías
    Dado un día sin interferencias entre habilidades
    Entonces el Matemático recibe "0"

## Feature: Niña de las Flores (Aldeano)
  «Cada noche*: sabes si un Demonio votó hoy.»

  @narrador
  Escenario: El Demonio votó
    Dado que el Vigormortis votó en una nominación hoy
    Cuando la Niña de las Flores despierta
    Entonces recibe "SÍ"

  @narrador
  Escenario: El Demonio no votó
    Dado que ningún Demonio votó hoy
    Entonces recibe "NO"

## Feature: Pregonero (Aldeano)
  «Cada noche*: sabes si algún Esbirro nominó hoy.»

  @narrador
  Escenario: Un Esbirro nominó
    Dado que la Bruja nominó hoy
    Entonces el Pregonero recibe "SÍ"

  @narrador
  Escenario: Nadie del mal nominó
    Dado que solo nominaron buenos hoy
    Entonces recibe "NO"

## Feature: Oráculo (Aldeano)
  «Cada noche*: sabes cuántos muertos son malvados.»

  @narrador
  Escenario: Cuenta muertos malvados
    Dado 2 malvados y 1 bueno muertos
    Cuando el Oráculo despierta
    Entonces recibe "2"

  @narrador
  Escenario: Oráculo con Vortox
    Dado el Vortox en juego
    Entonces el número recibido es falso

## Feature: Erudito (Aldeano)
  «Cada día: visita al narrador: 2 afirmaciones, 1 verdadera y 1 falsa.»

  @narrador
  Escenario: Visita diaria
    Dado el Erudito visita al narrador de día
    Entonces el narrador le da 1 verdad y 1 mentira (fuera de la página, con apoyo del panel)

  @narrador
  Escenario: Con Vortox ambas son falsas
    Dado el Vortox en juego
    Entonces las 2 afirmaciones del Erudito son falsas

## Feature: Costurera (Aldeano)
  «Una vez por partida, de noche: elige 2 jugadores (no tú): sabes si son de la misma alineación.»

  @narrador
  Escenario: Compara dos jugadores
    Dado la Costurera elige a un Aldeano y a la Bruja
    Entonces recibe "NO son de la misma alineación"

  @narrador
  Escenario: El Recluso puede registrar como malvado
    Dado la Costurera elige al Recluso y a la Bruja
    Entonces puede recibir "SÍ"

## Feature: Filósofo (Aldeano)
  «Una vez por partida, de noche: elige un rol bueno: ganas su habilidad; si está en juego, ese jugador queda borracho.»

  @narrador
  Escenario: Gana una habilidad no en juego
    Dado el Filósofo elige "Empática" y no hay Empática
    Entonces desde ahora actúa como Empática cada noche

  @narrador
  Escenario: Elige una habilidad en juego
    Dado el Filósofo elige "Soñador" y hay Soñador en juego
    Entonces el Soñador real queda borracho permanentemente
    Y el Filósofo usa la habilidad del Soñador

## Feature: Artista (Aldeano)
  «Una vez por partida, de día: 1 pregunta de sí/no al narrador.»

  @narrador
  Escenario: Pregunta honesta
    Dado el Artista hace su pregunta en privado
    Entonces el narrador responde "sí", "no" o "no lo sé" con honestidad
    Y la habilidad queda gastada (ficha SIN HABILIDAD)

  @narrador
  Escenario: Pregunta no contestable
    Dado el Artista pregunta algo que no es de sí/no
    Entonces el narrador le pide reformular sin gastar la habilidad

## Feature: Malabarista (Aldeano)
  «Día 1: adivina en público hasta 5 roles. Esa noche sabes cuántos acertaste.»

  @narrador
  Escenario: Cuenta aciertos
    Dado el Malabarista adivinó 5 roles públicamente el día 1
    Cuando despierta esa noche
    Entonces recibe el número de aciertos exactos

  @narrador
  Escenario: Con Vortox el número es falso
    Dado el Vortox en juego
    Entonces el número de aciertos recibido es falso

## Feature: Sabio (Aldeano)
  «Si el Demonio te mata, sabes que es 1 de 2 jugadores.»

  @narrador
  Escenario: Muere a manos del Demonio
    Dado el Fang Gu mata al Sabio esta noche
    Entonces el Sabio recibe 2 nombres, uno de los cuales es el Demonio

  @auto
  Escenario: Muere ejecutado
    Dado el Sabio es ejecutado de día
    Entonces no recibe nada

## Feature: Mutante (Forastero)
  «Si finges ser Forastero (estás "loco"), puedes ser ejecutado.»

  @narrador
  Escenario: Revela ser Forastero
    Dado el Mutante dice en público que es un Forastero
    Entonces el narrador puede ejecutarlo directamente (botón matar + anuncio)

  @narrador
  Escenario: Se mantiene oculto
    Dado el Mutante finge ser Aldeano toda la partida
    Entonces nunca es ejecutado por su habilidad

## Feature: Encanto / Sweetheart (Forastero)
  «Cuando mueres, 1 jugador queda borracho a partir de ese momento.»

  @narrador
  Escenario: Borrachera permanente al morir
    Dado el Encanto muere (de día o de noche)
    Entonces el narrador elige un jugador que queda borracho el resto de la partida
    Y la página se lo recuerda con un pendiente

## Feature: Barbero (Forastero)
  «Si mueres hoy o esta noche, el Demonio puede intercambiar los roles de 2 jugadores (no otro Demonio).»

  @narrador
  Escenario: El Demonio intercambia
    Dado el Barbero murió hoy
    Cuando llega la noche
    Entonces el Demonio puede elegir 2 jugadores que intercambian roles (la alineación NO cambia)
    Y cada uno es informado de su nuevo rol

  @narrador
  Escenario: El Demonio declina
    Dado el Barbero murió hoy
    Cuando el Demonio niega con la cabeza
    Entonces no hay intercambio

## Feature: Torpe / Klutz (Forastero)
  «Cuando sepas que moriste, elige en público 1 vivo: si es malvado, tu equipo pierde.»

  @narrador
  Escenario: Elige a un malvado
    Dado el Torpe acaba de morir y elige públicamente a la Bruja
    Entonces el narrador declara la victoria del Mal (DECLARE_WINNER)

  @narrador
  Escenario: Elige a un bueno
    Dado el Torpe muerto elige a un Aldeano
    Entonces la partida continúa

## Feature: Gemela Malvada (Forastero)
  «Tú y un jugador de alineación opuesta os conocéis. Si el gemelo bueno es ejecutado, gana el Mal. El Bien no puede ganar mientras ambos vivan.»

  @auto
  Escenario: Se conocen la primera noche
    Dado la Gemela Malvada en juego con su gemelo elegido en el montaje
    Cuando se resuelve la primera noche
    Entonces ambos jugadores se ven mutuamente (nombre y rol contrario)

  @auto
  Escenario: Ejecutan al gemelo bueno
    Dado la pareja de gemelos definida y la gemela malvada VIVA y sana
    Cuando el gemelo bueno es ejecutado
    Entonces la página declara la victoria del Mal

  @narrador
  Escenario: El Bien no gana con ambos vivos
    Dado ambos gemelos vivos
    Cuando el Demonio muere
    Entonces el narrador debe recordar que el Bien no puede ganar (aviso en pendientes)

## Feature: Bruja (Esbirro)
  «Cada noche: maldice a un jugador. Si nomina mañana, muere. Con 3 vivos pierde la habilidad.»

  @auto
  Escenario: El maldito nomina y muere
    Dado la Bruja sana maldijo a Ana anoche
    Cuando Ana nomina hoy
    Entonces Ana muere en el acto (la nominación sigue su curso)

  @auto
  Escenario: El maldito no nomina
    Dado Ana maldita hoy
    Cuando Ana no nomina en todo el día
    Entonces no muere y la maldición se recoloca la noche siguiente

  @auto
  Escenario: Con 3 vivos la maldición no mata
    Dado exactamente 3 jugadores vivos
    Cuando el maldito nomina
    Entonces NO muere (la Bruja perdió su habilidad)

  @auto
  Escenario: Bruja envenenada
    Dado la Bruja envenenada esta noche pasada
    Cuando su maldito nomina
    Entonces no muere

## Feature: Descerebrado / Cerenovus (Esbirro)
  «Cada noche: elige jugador + rol bueno: mañana está "loco" como ese rol o puede ser ejecutado.»

  @narrador
  Escenario: Impone la locura
    Dado el Descerebrado elige a Ana como "Sabio"
    Cuando amanece
    Entonces Ana debe fingir ser el Sabio todo el día
    Y si no lo hace, el narrador puede ejecutarla

  @narrador
  Escenario: La locura cambia de objetivo
    Dado el Descerebrado eligió a Beto esta noche
    Entonces la locura de Ana termina y empieza la de Beto

## Feature: Brujo del Caldero / Pit-Hag (Esbirro)
  «Cada noche*: elige jugador + rol (no en juego): se transforma. Si crea un Demonio, las muertes de esa noche son arbitrarias.»

  @narrador
  Escenario: Transforma a un jugador
    Dado el Brujo del Caldero elige a Ana → "Bufón" (no en juego)
    Entonces Ana se convierte en el Bufón (misma alineación) y es informada

  @narrador
  Escenario: Crea un Demonio
    Dado el Brujo del Caldero convierte a un malvado en Vortox
    Entonces el narrador decide arbitrariamente las muertes de esta noche
    Y la página muestra el aviso correspondiente

  @narrador
  Escenario: Rol ya en juego
    Dado el Brujo del Caldero elige un rol que YA está en juego
    Entonces no pasa nada

## Feature: Fang Gu (Demonio)
  «Cada noche*: elige un jugador: muere. El 1er Forastero que mates se convierte en Fang Gu y tú mueres. [+1 Forastero]»

  @auto
  Escenario: Salta al primer Forastero
    Dado el Fang Gu ataca al Mutante (Forastero) por primera vez
    Entonces el Mutante se convierte en el nuevo Fang Gu malvado
    Y el viejo Fang Gu muere
    Y la partida continúa (hay Demonio vivo)

  @auto
  Escenario: Ataque normal a no-Forastero
    Dado el Fang Gu ataca a un Aldeano
    Entonces el Aldeano muere con normalidad

  @auto
  Escenario: Solo salta una vez
    Dado que el salto ya ocurrió antes
    Cuando el nuevo Fang Gu ataca a otro Forastero
    Entonces el Forastero simplemente muere

  @auto
  Escenario: Montaje +1 Forastero
    Dado el Fang Gu seleccionado en el montaje
    Entonces la distribución tiene 1 Forastero extra

## Feature: No Dashii (Demonio)
  «Cada noche*: elige un jugador: muere. Tus 2 Aldeanos vecinos están envenenados.»

  @auto
  Escenario: Mata de noche
    Dado el No Dashii la noche 2
    Cuando ataca a un jugador sin protección
    Entonces muere

  @narrador
  Escenario: Vecinos Aldeanos envenenados permanentemente
    Dado el No Dashii sentado entre dos Aldeanos
    Entonces el narrador mantiene fichas de veneno en ambos vecinos Aldeanos
    Y si el vecino muere, el veneno pasa al siguiente Aldeano vivo en esa dirección

## Feature: Vortox (Demonio)
  «Cada noche*: elige un jugador: muere. La info de los Aldeanos es falsa. Cada día sin ejecución, gana el Mal.»

  @auto
  Escenario: Día sin ejecución = victoria del Mal
    Dado el Vortox vivo y sano
    Cuando el narrador inicia la noche sin que hubiera ejecución hoy
    Entonces la página declara la victoria del Mal automáticamente

  @auto
  Escenario: Información forzosamente falsa
    Dado el Vortox en juego
    Cuando cualquier Aldeano recibe información
    Entonces la información es falsa (no aleatoria: nunca verdadera)

  @auto
  Escenario: Vortox ejecutado
    Dado el Vortox es ejecutado
    Entonces se aplican las reglas normales de muerte del Demonio (Dama Escarlata / Mente Maestra / fin de partida)

## Feature: Vigormortis (Demonio)
  «Cada noche*: elige un jugador: muere. Los Esbirros que mates conservan su habilidad y envenenan a 1 Aldeano vecino. [-1 Forastero]»

  @auto
  Escenario: Mata a un Esbirro que sigue activo
    Dado el Vigormortis mata a la Bruja
    Entonces la Bruja muere pero CONSERVA su habilidad (marca vigormortisAlive)
    Y un Aldeano vecino de la Bruja queda envenenado (narrador coloca la ficha)

  @auto
  Escenario: Montaje -1 Forastero
    Dado el Vigormortis seleccionado en el montaje
    Entonces la distribución tiene 1 Forastero menos

  @auto
  Escenario: Mata a un Aldeano normal
    Dado el Vigormortis ataca a un Aldeano
    Entonces muere sin efectos extra

# CAMPAÑA: THE CAROUSEL

## Feature: Acróbata (Aldeano)
  «Cada noche*: elige un jugador. Si está o se vuelve borracho/envenenado esta noche, mueres.»

  @auto
  Escenario: Elige a un jugador borracho
    Dado el Acróbata elige a un jugador con ficha de borracho o veneno
    Entonces el Acróbata muere esa noche

  @auto
  Escenario: Elige a un jugador sobrio y sano
    Dado el Acróbata elige a un jugador limpio
    Entonces no pasa nada

  @auto
  Escenario: Acróbata envenenado no muere por su habilidad
    Dado el Acróbata envenenado
    Cuando elige a un borracho
    Entonces no muere

## Feature: Alquimista (Aldeano)
  «Tienes una habilidad de Esbirro.»

  @narrador
  Escenario: Recibe su habilidad la primera noche
    Dado el Alquimista en juego con habilidad elegida en el montaje (p. ej. Envenenador)
    Cuando se resuelve la primera noche
    Entonces el Alquimista sabe qué habilidad de Esbirro tiene
    Y despierta cada noche cuando ese Esbirro lo haría

  @narrador
  Escenario: Sigue siendo bueno
    Dado el Alquimista con habilidad de Esbirro
    Entonces gana con el Bien y no despierta con los malvados

## Feature: Amnésico (Aldeano)
  «No sabes tu habilidad. Cada día adivinas en privado: frío/templado/caliente/bingo.»

  @narrador
  Escenario: El narrador inventa la habilidad
    Dado el Amnésico en juego
    Entonces el narrador decide su habilidad secreta y lo despierta cuando corresponda

  @narrador
  Escenario: Adivinanza diaria
    Dado el Amnésico pregunta en privado "¿mi habilidad da información de muertos?"
    Entonces el narrador responde frío, templado, caliente o bingo

## Feature: Ateo (Aldeano)
  «El narrador puede romper las reglas. Si el narrador es ejecutado, ganan los buenos. [No hay malvados]»

  @auto
  Escenario: Montaje sin malvados
    Dado el Ateo seleccionado en la bolsa
    Cuando se montan los asientos
    Entonces la página impide colocar roles malvados (SETUP_LOCK lo valida)

  @auto
  Escenario: La página nunca termina la partida sola
    Dado el Ateo en juego
    Cuando muere cualquier jugador
    Entonces no se evalúa ninguna condición de victoria automática

  @narrador
  Escenario: Ejecutan al narrador
    Dado el grupo nomina y "ejecuta" al narrador
    Entonces el narrador declara la victoria del Bien manualmente

## Feature: Aeronauta (Aldeano)
  «Cada noche: aprendes 1 jugador de tipo distinto al de anoche.»

  @narrador
  Escenario: Tipos siempre distintos
    Dado el Aeronauta recibió un Aldeano anoche
    Cuando despierta esta noche
    Entonces el jugador mostrado es de otro tipo (Forastero/Esbirro/Demonio/Viajero)

  @narrador
  Escenario: Envenenado puede repetir tipo
    Dado el Aeronauta envenenado
    Entonces puede recibir un jugador del mismo tipo que anoche

## Feature: Banshee (Aldeano)
  «Si el Demonio te mata, todos lo saben. Puedes nominar 2 veces por día y votar 2 veces.»

  @narrador
  Escenario: Muerta por el Demonio
    Dado el Demonio mata a la Banshee sana
    Entonces se anuncia a todos "La Banshee ha despertado"
    Y desde entonces puede nominar 2 veces al día y votar doble

  @narrador
  Escenario: Muerta por otra causa
    Dado la Banshee ejecutada de día
    Entonces no gana poderes y no se anuncia nada

## Feature: Cazarrecompensas (Aldeano)
  «Comienzas sabiendo 1 jugador malvado. Si muere, aprendes otro esta noche.»

  @auto
  Escenario: Conoce a un malvado
    Dado el Cazarrecompensas la primera noche
    Entonces recibe el nombre de 1 jugador malvado real

  @narrador
  Escenario: Relevo al morir su objetivo
    Dado el malvado conocido muere
    Cuando llega la noche
    Entonces el Cazarrecompensas recibe otro malvado (panel BOUNTY_HUNTER_REVEAL)

## Feature: Caníbal (Aldeano)
  «Tienes la habilidad del último ejecutado. Si es malvado, estás envenenado.»

  @narrador
  Escenario: Gana la habilidad del ejecutado bueno
    Dado el Monje fue ejecutado hoy
    Entonces el Caníbal tiene la habilidad del Monje desde esta noche (sin saber cuál es)

  @narrador
  Escenario: Ejecutado malvado lo envenena
    Dado un Esbirro fue ejecutado hoy
    Entonces el Caníbal queda envenenado y cree tener una habilidad

## Feature: Niño Coro (Aldeano)
  «Si el Demonio mata al Rey, aprendes cuál es el Demonio.»

  @narrador
  Escenario: El Rey cae
    Dado el Rey en juego y el Niño Coro vivo y sano
    Cuando el Demonio mata al Rey de noche
    Entonces el Niño Coro recibe quién es el Demonio

  @narrador
  Escenario: El Rey muere ejecutado
    Dado el Rey es ejecutado de día
    Entonces el Niño Coro no recibe nada

## Feature: Líder Cultista (Aldeano)
  «Cada noche adoptas la alineación de un vecino vivo. Si todos los buenos se unen a tu culto, ganas.»

  @narrador
  Escenario: Cambio de alineación nocturno
    Dado el Líder Cultista con un vecino malvado
    Cuando el narrador lo decide en su paso nocturno
    Entonces el Líder puede volverse malvado (y viceversa)

  @narrador
  Escenario: Victoria del culto
    Dado todos los buenos vivos declararon unirse al culto hoy
    Entonces el narrador declara la victoria del equipo del Líder Cultista

## Feature: Ingeniero (Aldeano)
  «Una vez por partida, de noche: elige qué Esbirros o qué Demonio está en juego.»

  @narrador
  Escenario: Cambia al Demonio
    Dado el Ingeniero usa su habilidad y pide "Ojo"
    Entonces el Demonio actual se transforma en el Ojo antes de que actúe esta noche

  @narrador
  Escenario: Ingeniero envenenado
    Dado el Ingeniero envenenado
    Cuando usa su habilidad
    Entonces no pasa nada y la habilidad queda gastada

## Feature: Granjero (Aldeano)
  «Si mueres de noche, un bueno vivo se convierte en Granjero.»

  @narrador
  Escenario: Herencia del arado
    Dado el Granjero muere de noche
    Entonces el narrador elige un bueno vivo que se convierte en el nuevo Granjero
    Y es informado de su nuevo rol

## Feature: Pescador (Aldeano)
  «Una vez por partida, de día: pide consejo al narrador.»

  @narrador
  Escenario: Consejo honesto
    Dado el Pescador visita al narrador
    Entonces recibe un consejo honesto para ayudar a su equipo
    Y la habilidad queda gastada

## Feature: General (Aldeano)
  «Cada noche: qué alineación cree el narrador que va ganando.»

  @narrador
  Escenario: Lectura del narrador
    Dado el General despierta
    Entonces recibe "buenos", "malvados" o "empate" según el juicio del narrador

## Feature: Sacerdotisa Mayor (Aldeano)
  «Cada noche: qué jugador cree el narrador que deberías conocer.»

  @narrador
  Escenario: Señal de la Sacerdotisa
    Dado la Sacerdotisa Mayor despierta
    Entonces el narrador señala al jugador que más le convenga conocer al Bien

## Feature: Cazador / Huntsman (Aldeano)
  «Una vez por partida: elige un jugador; si es la Damisela, se convierte en un Aldeano no en juego.»

  @auto
  Escenario: Salva a la Damisela
    Dado el Cazador elige a la Damisela
    Entonces la Damisela se convierte en un Aldeano que no está en juego
    Y el equipo malvado ya no puede ganar adivinándola

  @auto
  Escenario: Falla el tiro
    Dado el Cazador elige a alguien que no es la Damisela
    Entonces no pasa nada y la habilidad queda gastada

  @auto
  Escenario: Actúa antes que el Demonio
    Dado el Cazador y el Demonio actúan la misma noche
    Entonces el Cazador va antes en la cola

## Feature: Rey (Aldeano)
  «Cada noche, si los muertos ≥ vivos, aprendes un rol vivo.»

  @narrador
  Escenario: Mayoría muerta
    Dado 5 muertos y 4 vivos
    Cuando el Rey despierta
    Entonces recibe el rol de un jugador vivo (elección del narrador)

  @narrador
  Escenario: Mayoría viva
    Dado más vivos que muertos
    Entonces el Rey no recibe información

## Feature: Caballero (Aldeano)
  «Comienzas sabiendo 2 jugadores que NO son el Demonio.»

  @auto
  Escenario: Dos descartes seguros
    Dado el Caballero sobrio la primera noche
    Entonces recibe 2 nombres que no son el Demonio

  @auto
  Escenario: Caballero envenenado
    Dado el Caballero envenenado la primera noche
    Entonces uno de los mostrados PUEDE ser el Demonio

## Feature: Licántropo (Aldeano)
  «Cada noche*: elige un jugador. Si es bueno, muere y el Demonio no mata esta noche.»

  @auto
  Escenario: Mata a un bueno y bloquea al Demonio
    Dado el Licántropo elige a un Aldeano
    Entonces el Aldeano muere
    Y el ataque del Demonio de esta noche no mata (la página lo bloquea)

  @auto
  Escenario: Elige a un malvado
    Dado el Licántropo elige a un Esbirro
    Entonces nadie muere por el Licántropo y el Demonio mata normal

## Feature: Mago (Aldeano)
  «El Demonio cree que eres un Esbirro. Los Esbirros creen que eres el Demonio.»

  @auto
  Escenario: Confusión en la info del mal
    Dado el Mago en juego la primera noche
    Cuando se genera la información del equipo malvado
    Entonces el Demonio ve al Mago listado entre sus Esbirros
    Y los Esbirros ven al Mago señalado como Demonio

## Feature: Guardián Nocturno (Aldeano)
  «Una vez por partida, de noche*: elige un jugador: aprende que eres el Guardián Nocturno.»

  @auto
  Escenario: Se revela a un jugador
    Dado el Guardián Nocturno elige a Ana
    Entonces Ana recibe "X es el Guardián Nocturno"
    Y la habilidad queda gastada

  @auto
  Escenario: Envenenado no revela
    Dado el Guardián envenenado
    Cuando elige a Ana
    Entonces Ana no recibe nada

## Feature: Noble (Aldeano)
  «Comienzas conociendo 3 jugadores, exactamente 1 malvado.»

  @auto
  Escenario: Trío con un malvado
    Dado el Noble sobrio la primera noche
    Entonces recibe 3 nombres: exactamente 1 es malvado y 2 son buenos

## Feature: Cultivador de Adormidera (Aldeano)
  «Esbirros y Demonio no se conocen. Si mueres, se conocen esa noche.»

  @auto
  Escenario: El mal empieza a ciegas
    Dado el Cultivador vivo la primera noche
    Entonces ni Esbirros ni Demonio reciben info de quiénes son sus compañeros

  @narrador
  Escenario: Su muerte reúne al mal
    Dado el Cultivador muere
    Cuando llega esa noche
    Entonces el narrador informa a Esbirros y Demonio de quiénes son

## Feature: Predicador (Aldeano)
  «Cada noche: elige un jugador. Si es Esbirro, lo sabes y pierde su habilidad.»

  @auto
  Escenario: Neutraliza a un Esbirro
    Dado el Predicador elige a la Arpía
    Entonces el Predicador sabe que eligió un Esbirro
    Y la Arpía pierde su habilidad mientras el Predicador viva y esté sano

  @auto
  Escenario: Elige a un no-Esbirro
    Dado el Predicador elige a un Aldeano
    Entonces no recibe confirmación y nada cambia

## Feature: Rata de Laboratorio / Boffin (Aldeano)
  «El Demonio tiene la habilidad de un bueno no en juego. Ambos lo saben.»

  @narrador
  Escenario: Demonio con habilidad buena
    Dado la Rata de Laboratorio en juego y la habilidad elegida en el montaje
    Cuando se resuelve la primera noche
    Entonces el Demonio y la Rata saben qué habilidad buena tiene el Demonio

## Feature: Shugenja (Aldeano)
  «Empiezas sabiendo si el malvado más cercano está a tu izquierda o derecha.»

  @auto
  Escenario: Dirección correcta
    Dado el Shugenja sobrio con el malvado más cercano a 2 asientos a la izquierda
    Entonces recibe "izquierda"

  @auto
  Escenario: Equidistante
    Dado malvados a la misma distancia por ambos lados
    Entonces el narrador/motor elige una dirección arbitraria (la info es válida)

## Feature: Administrador / Steward (Aldeano)
  «Empiezas conociendo a 1 jugador bueno.»

  @auto
  Escenario: Un bueno confirmado
    Dado el Administrador sobrio la primera noche
    Entonces recibe el nombre de un jugador realmente bueno

  @auto
  Escenario: Administrador borracho
    Dado el Administrador es el objetivo del veneno inicial
    Entonces el mostrado puede ser malvado

## Feature: Damisela (Forastero)
  «Los Esbirros saben que hay Damisela. Si un Esbirro adivina quién es, el Bien pierde.»

  @auto
  Escenario: Los Esbirros son avisados
    Dado la Damisela en juego la primera noche
    Entonces cada Esbirro recibe "hay una Damisela en juego"

  @narrador
  Escenario: Un Esbirro la adivina
    Dado un Esbirro declara públicamente su adivinanza de Damisela (una por partida)
    Cuando acierta
    Entonces el narrador declara la victoria del Mal

  @auto
  Escenario: El Cazador la salva
    Dado el Cazador la convirtió en Aldeano
    Cuando un Esbirro la adivina después
    Entonces no pasa nada (ya no es la Damisela)

## Feature: Gólem (Forastero)
  «Solo puedes nominar una vez. Si el nominado no es el Demonio, muere.»

  @auto
  Escenario: Nomina a un no-Demonio
    Dado el Gólem sano que nunca nominó
    Cuando nomina a un Aldeano
    Entonces el Aldeano muere inmediatamente y no hay votación

  @auto
  Escenario: Nomina al Demonio
    Dado el Gólem nomina al Demonio
    Entonces el Demonio NO muere por el Gólem y la nominación sigue su curso normal

  @auto
  Escenario: Solo una nominación por partida
    Dado el Gólem ya nominó una vez
    Cuando intenta nominar de nuevo
    Entonces la página rechaza la nominación

  @auto
  Escenario: Gólem envenenado
    Dado el Gólem envenenado
    Cuando nomina a un Aldeano
    Entonces el Aldeano no muere y la nominación sigue normal (gasta su única nominación)

## Feature: Sombrerero (Forastero)
  «Si mueres hoy o esta noche, Esbirros y Demonio pueden elegir nuevos roles.»

  @narrador
  Escenario: Renovación del mal
    Dado el Sombrerero muere hoy
    Cuando llega la noche
    Entonces el narrador ofrece a cada malvado cambiar su rol por otro no en juego
    Y aplica los cambios elegidos

## Feature: Hereje (Forastero)
  «Quien gana, pierde. Quien pierde, gana.»

  @narrador
  Escenario: Inversión del resultado
    Dado el Hereje en juego al terminar la partida
    Cuando el narrador declara el resultado
    Entonces debe invertir el ganador (aviso en la página al declarar)

## Feature: Doctor de la Peste (Forastero)
  «Cuando mueres, el narrador gana una habilidad de Esbirro.»

  @narrador
  Escenario: El narrador se corrompe
    Dado el Doctor de la Peste muere
    Entonces el narrador elige una habilidad de Esbirro y la usa el resto de la partida

## Feature: Político (Forastero)
  «Si fuiste el mayor responsable de que tu equipo pierda, cambias de bando y ganas.»

  @narrador
  Escenario: Traición premiada
    Dado el Político causó activamente la derrota del Bien
    Cuando termina la partida
    Entonces el narrador lo declara ganador con el Mal

## Feature: Maestro Acertijos / Puzzlemaster (Forastero)
  «1 jugador está borracho desde el inicio. Si adivinas quién, aprendes al Demonio.»

  @auto
  Escenario: Borracho del puzle desde el montaje
    Dado el Maestro Acertijos en juego
    Cuando se monta la partida
    Entonces el narrador marca al jugador borracho del puzle (puzzlemasterDrunk)

  @narrador
  Escenario: Adivina al borracho
    Dado el Maestro Acertijos hace su única adivinanza de día
    Cuando acierta al borracho
    Entonces recibe quién es el Demonio
    Cuando falla
    Entonces no recibe nada y pierde la habilidad

## Feature: Soplón / Snitch (Forastero)
  «Cada Esbirro recibe 3 bluffs.»

  @auto
  Escenario: Bluffs para los Esbirros
    Dado el Soplón en juego la primera noche
    Entonces cada Esbirro recibe 3 roles buenos no en juego como bluffs

## Feature: Pólvora / Boomdandy (Esbirro)
  «Si eres ejecutado, todos excepto 3 mueren.»

  @auto
  Escenario: Explosión al ser ejecutado
    Dado la Pólvora es ejecutada
    Entonces la página avisa al narrador del estallido
    Y el narrador resuelve: todos menos 3 jugadores mueren (elección con dedos apuntando)

  @narrador
  Escenario: Pólvora envenenada
    Dado la Pólvora envenenada
    Cuando es ejecutada
    Entonces no explota nada

## Feature: Sembrador de Miedo / Fearmonger (Esbirro)
  «Cada noche elige un jugador. Si lo nominas y ejecutas, su equipo pierde. Cada día se anuncia que ha elegido a alguien.»

  @auto
  Escenario: Marca nocturna y anuncio
    Dado el Sembrador de Miedo elige a Ana esta noche
    Entonces Ana queda marcada (ficha)
    Y la página recuerda anunciar al amanecer "el Sembrador de Miedo ha elegido a un jugador"

  @auto
  Escenario: Ejecuta a su marcado
    Dado Ana marcada y el Sembrador de Miedo vivo y sano
    Cuando el propio Sembrador la nomina y Ana es ejecutada
    Entonces la página termina la partida: el equipo de Ana pierde

  @auto
  Escenario: Otro jugador la nomina
    Dado Ana marcada
    Cuando otro jugador (no el Sembrador) la nomina y es ejecutada
    Entonces no se activa nada especial

## Feature: Goblin (Esbirro)
  «Si reclamas públicamente ser el Goblin al ser nominado y te ejecutan, tu equipo gana.»

  @auto
  Escenario: Reclamo exitoso
    Dado el Goblin sano es nominado y reclama públicamente ser el Goblin
    Cuando es ejecutado
    Entonces la página avisa al narrador para declarar la victoria del Mal

  @narrador
  Escenario: Sin reclamo no hay premio
    Dado el Goblin ejecutado sin haber reclamado
    Entonces muere como un Esbirro normal

## Feature: Arpía (Esbirro)
  «Cada noche elige 2 jugadores: mañana el 1º está loco creyendo que el 2º es malvado.»

  @narrador
  Escenario: Siembra la paranoia
    Dado la Arpía elige a Ana y Beto
    Cuando amanece
    Entonces Ana debe actuar como si Beto fuera malvado o el narrador puede matarla (a ella o a Beto)

## Feature: Marioneta (Esbirro)
  «Crees ser bueno, pero eres un Esbirro. El Demonio te conoce.»

  @auto
  Escenario: Cree ser buena
    Dado la Marioneta en la bolsa
    Cuando se reparten los roles
    Entonces el jugador ve un rol bueno no en juego (believedRole)
    Y NO despierta con el mal

  @auto
  Escenario: El Demonio la conoce
    Dado la Marioneta en juego
    Cuando el Demonio recibe su info de primera noche
    Entonces ve quién es su Marioneta

  @auto
  Escenario: Debe sentarse junto al Demonio
    Dado el montaje con Marioneta
    Entonces la página valida que esté a 1 asiento del Demonio

## Feature: Mezefeles (Esbirro)
  «Comienzas sabiendo una palabra. El 1er bueno que la diga se vuelve malvado.»

  @narrador
  Escenario: Recibe su palabra
    Dado el Mezefeles la primera noche
    Entonces recibe su palabra secreta

  @narrador
  Escenario: La palabra corrompe
    Dado un jugador bueno dice la palabra en público
    Entonces esa noche el narrador lo convierte en malvado y se lo notifica

## Feature: Organillero (Esbirro)
  «Todos votan con ojos cerrados. Cada noche eliges si estás borracho.»

  @narrador
  Escenario: Votación a ciegas
    Dado el Organillero vivo y sobrio
    Cuando hay una votación
    Entonces los jugadores cierran los ojos y solo el narrador cuenta los votos

  @narrador
  Escenario: Borrachera voluntaria
    Dado el Organillero elige estar borracho esta noche
    Entonces la votación de mañana es normal (con ojos abiertos)

## Feature: Psicópata (Esbirro)
  «Cada día, antes de nominaciones, puedes matar públicamente a un jugador.»

  @narrador
  Escenario: Asesinato diurno
    Dado el Psicópata declara su ataque antes de las nominaciones
    Entonces el narrador mata a la víctima públicamente (el Psicópata queda expuesto)

## Feature: Mente Maestra (Esbirro — Carousel)
  Igual que en Bad Moon Rising: ver Feature "Mente Maestra" de BMR.

  @auto
  Escenario: Demonio ejecutado con Mente Maestra en Carousel
    Dado el Kazali ejecutado y la Mente Maestra viva y sobria
    Entonces la partida continúa 1 día más sin anuncio de victoria

## Feature: Invocador / Summoner (Esbirro)
  «Recibes 3 bluffs. La noche 3 eliges un jugador: se convierte en un Demonio malvado.»

  @narrador
  Escenario: Invocación en la noche 3
    Dado el Invocador vivo la noche 3
    Cuando elige a Ana y un Demonio del guion
    Entonces Ana se convierte en ese Demonio malvado
    Y hasta esa noche NO había Demonio real en juego

  @narrador
  Escenario: Invocador muerto antes de la noche 3
    Dado el Invocador muere el día 2
    Entonces el narrador decide cómo continúa el mal (regla de la campaña)

## Feature: Visir (Esbirro)
  «Todos saben que eres el Visir. No puedes morir durante el día.»

  @auto
  Escenario: Anuncio público
    Dado el Visir en juego
    Cuando empieza la partida
    Entonces todos los jugadores saben quién es el Visir

  @auto
  Escenario: Inmune a la ejecución
    Dado el Visir sano es nominado y la votación alcanza el umbral
    Cuando se finaliza la nominación
    Entonces el Visir NO muere y la página lo indica

  @auto
  Escenario: Visir envenenado sí muere
    Dado el Visir envenenado
    Cuando es ejecutado
    Entonces muere con normalidad

## Feature: Viuda (Esbirro)
  «Tu primera noche: miras el Grimorio y envenenas a un jugador.»

  @auto
  Escenario: Ve el Grimorio y envenena
    Dado la Viuda la primera noche (última en la cola)
    Cuando mira el Grimorio y elige a Ana
    Entonces Ana queda envenenada permanentemente (WIDOW_POISON)
    Y un jugador bueno es informado de que hay Viuda en juego

## Feature: Yaggababble (Esbirro)
  «Sabes una frase secreta. Por cada vez que la dijiste en público hoy, un jugador puede morir esta noche.»

  @narrador
  Escenario: Frase repetida = muertes
    Dado el Yaggababble dijo su frase 2 veces hoy en público
    Cuando llega la noche
    Entonces el narrador puede matar hasta 2 jugadores por esta habilidad

## Feature: Al-Hadikhia (Demonio)
  «Cada noche*: elige 3 jugadores: cada uno elige en silencio vivir o morir; si los 3 viven, mueren los 3.»

  @narrador
  Escenario: El dilema
    Dado Al-Hadikhia elige a Ana, Beto y Carla
    Cuando Ana elige morir y los otros vivir
    Entonces Ana muere y los demás viven

  @narrador
  Escenario: Todos eligen vivir
    Dado los 3 elegidos dicen vivir
    Entonces los 3 mueren

  @narrador
  Escenario: Un muerto puede revivir
    Dado Al-Hadikhia elige a un jugador muerto
    Cuando ese jugador elige vivir
    Entonces revive (y cuenta como vivo para la regla de los 3)

## Feature: Kazali (Demonio)
  «Cada noche*: un jugador muere. Tú eliges qué jugadores son tus Esbirros en el montaje.»

  @auto
  Escenario: Ataque nocturno
    Dado el Kazali la noche 2
    Cuando ataca a un jugador sin protección
    Entonces muere (KAZALI_KILL)

  @narrador
  Escenario: Elige a sus Esbirros
    Dado el Kazali en el montaje
    Entonces el narrador aplica las elecciones de Esbirro del Kazali sobre jugadores buenos

## Feature: Legión (Demonio)
  «Cada noche*: un jugador puede morir. Las ejecuciones fallan si solo votaron malvados.»

  @auto
  Escenario: Muerte nocturna opcional
    Dado Legión la noche 2
    Cuando el narrador decide que muera un jugador
    Entonces muere (LEGION_KILL)

  @narrador
  Escenario: Ejecución con solo votos malvados
    Dado una votación donde solo votaron jugadores Legión
    Entonces el narrador anula la ejecución (regla especial de Legión)

## Feature: Leviatán (Demonio)
  «Si se ejecuta a más de 1 bueno, gana el Mal. Después del día 5, gana el Mal.»

  @narrador
  Escenario: Cuenta regresiva pública
    Dado el Leviatán en juego
    Entonces se anuncia públicamente su presencia y el número de día actual
    Y nadie muere por las noches

  @narrador
  Escenario: Segundo bueno ejecutado
    Dado ya fue ejecutado 1 bueno
    Cuando se ejecuta un 2º bueno
    Entonces el narrador declara la victoria del Mal

  @narrador
  Escenario: Sobrevive al día 5
    Dado termina el día 5 sin que el Leviatán haya muerto
    Entonces el narrador declara la victoria del Mal

## Feature: Pequeña Monsta (Demonio)
  «Cada noche los Esbirros eligen quién cuida a Pequeña Monsta y "es" el Demonio.»

  @narrador
  Escenario: La niñera rota
    Dado los Esbirros eligen esta noche al cuidador de la ficha
    Entonces ese jugador cuenta como el Demonio (si lo ejecutan, muere como Demonio)

  @narrador
  Escenario: Muerte del cuidador
    Dado el cuidador es ejecutado
    Entonces se evalúa el fin de partida como muerte de Demonio (Dama Escarlata / Mente Maestra aplican)

## Feature: Sangijuela / Lleech (Demonio)
  «Primera noche: envenenas a un anfitrión. Cada noche*: un jugador muere. Mueres si tu anfitrión muere.»

  @auto
  Escenario: Ataque nocturno
    Dado la Sangijuela la noche 2
    Cuando ataca a un jugador
    Entonces muere (LLEECH_KILL)

  @narrador
  Escenario: Anfitrión inmortal... hasta que cae
    Dado el anfitrión envenenado por la Sangijuela
    Cuando el anfitrión muere
    Entonces la Sangijuela muere también (el narrador la mata y se evalúa fin de partida)

  @narrador
  Escenario: Ejecutar a la Sangijuela no basta
    Dado la Sangijuela ejecutada mientras su anfitrión vive
    Entonces NO muere (el narrador lo indica y la partida sigue)

## Feature: Ojo (Demonio)
  «Cada noche*: elige un ROL: ese jugador muere. Si no está en juego, el narrador elige quién muere.»

  @auto
  Escenario: Elige un rol en juego
    Dado el Ojo nombra "Monje" y hay Monje
    Entonces el Monje muere (OJO_KILL)

  @narrador
  Escenario: Elige un rol ausente
    Dado el Ojo nombra un rol que no está en juego
    Entonces el narrador elige la víctima que quiera

## Feature: Motín / Riot (Demonio)
  «El día 3 los Esbirros se vuelven Motín y los nominados mueren al ser nominados.»

  @narrador
  Escenario: El tercer día sangriento
    Dado la partida llega al día 3 con Motín vivo
    Entonces todos los Esbirros se convierten en Motín
    Y ese día cada jugador nominado muere inmediatamente (el nominado puede nominar a su vez)

  @narrador
  Escenario: Fin del día 3
    Dado el día 3 de Motín terminó sin que el Bien lo matara
    Entonces el narrador declara la victoria del Mal

# VIAJEROS

## Feature: Aprendiz (Viajero)
  @narrador
  Escenario: Gana habilidad según alineación
    Dado el Aprendiz bueno entra en partida
    Entonces recibe una habilidad de Aldeano en su primera noche
    Dado el Aprendiz malvado
    Entonces recibe una habilidad de Esbirro

  @auto
  Escenario: No cuenta para las condiciones de victoria
    Dado el Aprendiz vivo con 2 residentes vivos más
    Entonces la página no lo cuenta para "solo quedan 2 vivos"

## Feature: Barista (Viajero)
  @narrador
  Escenario: Sobrio y sano o actúa dos veces
    Dado el Barista en juego
    Cuando el narrador elige un jugador cada noche
    Entonces ese jugador o queda sobrio/sano con info verdadera o actúa dos veces
    Y el jugador afectado sabe cuál de las dos

## Feature: Coleccionista de Huesos (Viajero)
  @narrador
  Escenario: Revive una habilidad muerta
    Dado el Coleccionista elige a un Monje muerto
    Entonces esa noche el Monje muerto recupera su habilidad hasta el crepúsculo

## Feature: Obispo (Viajero)
  @narrador
  Escenario: Solo el narrador nomina
    Dado el Obispo en juego hoy
    Entonces los jugadores no pueden nominar
    Y el narrador nomina al menos 1 jugador del bando contrario al Obispo

## Feature: Carnicero (Viajero)
  @narrador
  Escenario: Segunda nominación
    Dado hubo una ejecución hoy
    Entonces el Carnicero puede nominar a 1 jugador adicional

## Feature: Desviado (Viajero)
  @narrador
  Escenario: Exilio sin causa no cuenta
    Dado intentan exiliar al Desviado sin causa justa
    Entonces el narrador anula el exilio

## Feature: Meretriz (Viajero)
  @narrador
  Escenario: Trato arriesgado
    Dado la Meretriz elige a Ana de noche
    Cuando Ana acepta mostrarse
    Entonces la Meretriz aprende su rol
    Y el narrador puede decidir matarlas a ambas

## Feature: Juez (Viajero)
  @narrador
  Escenario: Anula o fuerza ejecución
    Dado el Juez usa su poder único
    Entonces puede cancelar la ejecución actual o forzar una adicional (el narrador la aplica)

## Feature: Institutriz (Viajero)
  @narrador
  Escenario: Baile de asientos
    Dado la Institutriz elige hasta 3 parejas hoy
    Entonces esas parejas intercambian asientos (el narrador reordena la mesa)

## Feature: Voudon (Viajero)
  @narrador
  Escenario: Solo los muertos votan
    Dado el Voudon vivo
    Entonces solo los muertos y el Voudon pueden votar
    Y no se necesita mayoría para ejecutar (gana la nominación con más votos)

---

# INTERACCIONES CRÍTICAS (regresión)

  @auto
  Escenario: Mente Maestra + Dama Escarlata
    Dado ambas vivas con 5+ jugadores
    Cuando el Demonio es ejecutado
    Entonces la Dama Escarlata se transforma PRIMERO (hay Demonio) y la Mente Maestra no se activa

  @auto
  Escenario: Mente Maestra + Zombuul primera muerte
    Dado el Zombuul ejecutado por primera vez y Mente Maestra viva
    Entonces NO empieza el día extra (el Demonio sigue vivo en secreto)

  @auto
  Escenario: Virgen durante el día extra de la Mente Maestra
    Dado el día extra en curso
    Cuando un Aldeano nomina a la Virgen sana y es ejecutado por su poder
    Entonces cuenta como ejecución de un bueno: el Mal gana

  @auto
  Escenario: Santo ejecutado en día extra
    Dado el día extra en curso
    Cuando el Santo sano es ejecutado
    Entonces el Mal gana (por partida doble: Santo y día extra)

  @auto
  Escenario: Juglar bloquea al Asesino
    Dado un Esbirro ejecutado hoy con Juglar vivo
    Cuando el Asesino intenta matar esta noche
    Entonces está borracho y su tiro no mata (habilidad sin efecto)

  @auto
  Escenario: Vortox + día extra imposible
    Dado el Vortox ejecutado con Mente Maestra viva
    Cuando el día extra transcurre sin ejecución
    Entonces ganan los buenos (la habilidad del Vortox murió con él)
