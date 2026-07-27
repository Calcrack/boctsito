# Gherkin — Boctsito (Blood on the Clocktower)

Especificación ejecutable **narrador-first** del comportamiento de la página para los **181 personajes**
de `Mecanicas Personajes.txt` (4 campañas + Viajeros + roles aún no implementados).

Todo escenario describe **qué ve y qué pulsa el narrador**, no solo qué hace el rol.
La regla es siempre la del `.txt`; la página nunca decide por el narrador lo que el `.txt` deja a su criterio.

## Convenciones

| Tag | Significado |
|---|---|
| `@auto` | El motor lo resuelve solo (`server/gameLogic.js`), sin intervención humana |
| `@panel` | Existe un mini-panel en la página: la **decisión es del narrador**, el **efecto lo aplica la página** |
| `@narrador` | La página solo avisa/recuerda; el narrador lo ejecuta con las herramientas genéricas del mini-panel |
| `@privado` | Requiere sala privada (`MOVE_TO_SECRET` / `MOVE_NARRATOR_TO_ROOM`) antes de resolverse |
| `@extra` | El personaje vive en `server/campaigns/extras.js`: fuera de las 4 campañas, disponible en guiones propios |

- `*` en una habilidad = "cada noche salvo la primera".
- **"borracho o envenenado"** = el jugador tiene ficha `POISONED` o `DRUNK_NIGHT`, o es el Borracho (`drunkAs`):
  su habilidad NO funciona y su información puede ser falsa. La página **siempre** genera algo plausible, nunca "nada".
- **Rol real vs rol creído**: `role` es la verdad del grimorio; `believedRole` es lo que el jugador ve
  (Marioneta, Lunático, Borracho). El mini-panel del narrador muestra los dos.
- **Mini-panel** = el modal que se abre al pulsar la ficha de un jugador en la ruleta (`ActionModal`).

---
---

# PLATAFORMA

Todo lo de esta sección aplica a **cualquier** partida, independientemente de la campaña.

## Feature: Mini-panel de jugador (clic del narrador sobre la ruleta)

  El narrador pulsa cualquier ficha de la ruleta, viva o muerta, en cualquier fase.
  El modal tiene 4 pestañas: **Info · Acciones · Rol · Habilidad**.

  @panel
  Escenario: Abrir el mini-panel muestra la ficha completa del jugador
    Dado el narrador en cualquier fase de la partida
    Cuando pulsa sobre la ficha de un jugador en la ruleta
    Entonces el modal se abre en la pestaña "Info"
    Y muestra nombre, avatar y número de asiento
    Y muestra si está vivo o muerto y si conserva su voto fantasma
    Y muestra su **estado de conexión**: ● conectado / ○ desconectado / ⏱ ausente
    Y muestra su **rol real** y, si difiere, su **rol creído** con la etiqueta de por qué difiere
    Y muestra todas sus fichas activas con su caducidad en texto claro
    Y muestra las sospechas que otros jugadores han marcado sobre él
    Y muestra en qué canal de Discord está ahora mismo

  @panel
  Escenario: Rol real distinto del rol creído
    Dado un jugador con rol real "Marioneta" y rol creído "Lavandera"
    Cuando el narrador abre su mini-panel
    Entonces la pestaña "Info" muestra «Real: Marioneta (Esbirro) · Cree ser: Lavandera»
    Y advierte «Este jugador no sabe que es malvado»

  @panel
  Escenario: El Borracho muestra su personaje falso
    Dado un jugador con rol real "Borracho" y `drunkAs` = "Monje"
    Cuando el narrador abre su mini-panel
    Entonces muestra «Real: Borracho (Forastero) · Cree ser: Monje»
    Y advierte «Su habilidad de Monje NO funciona nunca»

  @panel
  Escenario: Un jugador NO puede abrir el mini-panel de narrador
    Dado un jugador (no narrador) en cualquier fase
    Cuando pulsa sobre otra ficha de la ruleta
    Entonces solo ve la sección de jugador (marcar sospecha, votar cuando toque)
    Y nunca ve rol, fichas, conexión ni acciones de narrador

## Feature: Acciones universales del mini-panel

  Disponibles para **todos** los personajes, en la pestaña "Acciones".

  @panel
  Escenario: Matar a un jugador con avisos previos
    Dado el narrador con el mini-panel de un jugador vivo abierto
    Cuando pulsa "Matar jugador"
    Entonces la página pide confirmación
    Y antes de confirmar lista los motivos por los que podría no morir:
      | 🛡 Protegido esta noche (Monje / Posadero / Marinero / Abogado del Diablo) |
      | ⚔ Soldado: inmune a ataques del Demonio                                   |
      | 🃏 Bufón: su primera muerte se anula                                      |
      | 👹 Es el Demonio: al morir se aplican los sucesores                        |
    Y solo mata al confirmar

  @panel
  Escenario: Revivir a un jugador
    Dado un jugador muerto
    Cuando el narrador pulsa "Revivir jugador"
    Entonces vuelve a estar vivo y recupera su voto fantasma
    Y queda registrado en el registro de la partida

  @panel
  Escenario: Aplicar estados sin que sea de noche
    Dado el narrador con el mini-panel abierto en cualquier fase
    Cuando pulsa "Envenenar", "Emborrachar", "Proteger" o "Limpiar estados"
    Entonces la página coloca o quita la ficha correspondiente al instante
    Y la caducidad es la estándar de esa ficha (veneno: hasta el próximo anochecer; protección: al amanecer)

  @panel
  Escenario: Fichas manuales del grimorio
    Dado el narrador con el mini-panel abierto
    Cuando añade una ficha manual desde el catálogo de fichas
    Entonces la ficha queda marcada como manual y **nunca caduca sola**
    Y solo desaparece cuando el narrador la quita

  @panel @privado
  Escenario: Llevar a un jugador al confesionario
    Dado el narrador con el mini-panel abierto
    Cuando pulsa "Confesionario"
    Entonces la página mueve a ese jugador a la sala privada en Discord
    Y ofrece "Ir con él" para mover también al narrador

  @panel
  Escenario: Expulsar la sesión de un jugador
    Dado un jugador con la sesión abierta
    Cuando el narrador pulsa "Expulsar sesión"
    Entonces ese jugador vuelve a la pantalla de acceso
    Y su asiento y su rol se conservan intactos para cuando vuelva a entrar

## Feature: Cambiar el rol de un jugador a media partida

  Pestaña "Rol" del mini-panel. Sustituye a la reasignación en bloque, que reiniciaba la partida.

  @panel
  Escenario: Cambio de rol notificado
    Dado la partida en curso en cualquier fase
    Cuando el narrador abre la pestaña "Rol", elige "Monje" y marca "Avisar al jugador"
    Entonces el jugador pasa a ser Monje al instante
    Y **sigue vivo o muerto como estaba**, conserva sus fichas y la fase no cambia
    Y ese jugador recibe un aviso destacado: «Tu personaje ha cambiado: ahora eres el Monje»
    Y ningún otro jugador se entera
    Y queda registrado en el registro de la partida

  @panel
  Escenario: Cambio de rol silencioso
    Dado el narrador cambiando el rol de un jugador
    Cuando desmarca "Avisar al jugador"
    Entonces el rol cambia en el grimorio
    Y el jugador **no recibe ningún aviso** y sigue viendo su rol anterior

  @panel
  Escenario: Cambiar solo el rol creído
    Dado el narrador cambiando el rol de un jugador
    Cuando elige el modo "Solo rol creído"
    Entonces el rol real no se toca
    Y el jugador pasa a creer que es el nuevo personaje
    Y esto es lo que se usa para el Descerebrado, la Marioneta y el Lunático

  @panel
  Escenario: Cambio de rol que altera el número de Demonios
    Dado un solo Demonio vivo en la partida
    Cuando el narrador intenta cambiar su rol a un Aldeano
    Entonces la página avisa: «Esto dejará la partida sin Demonios vivos — ¿continuar?»
    Y solo aplica el cambio al confirmar
    Y después evalúa el fin de partida con las reglas de sucesión

  @panel
  Escenario: Convertir a un jugador en el Borracho
    Dado el narrador cambiando un rol a "Borracho"
    Entonces la página le asigna automáticamente un Aldeano falso que no esté en juego
    Y el jugador ve ese Aldeano falso, no el Borracho

  @auto
  Escenario: El cambio de rol recalcula los personajes que no están en juego
    Cuando el narrador cambia el rol de cualquier jugador
    Entonces la lista de personajes no-en-juego se recalcula
    Y los faroles del Demonio dejan de ofrecer un personaje que ahora sí está en juego

## Feature: Mini-panel por habilidad

  Pestaña "Habilidad". Los controles dependen del personaje del jugador y de la fase.

  @panel
  Escenario: El panel se adapta al personaje
    Dado el narrador abriendo la pestaña "Habilidad"
    Entonces ve los controles propios de ese personaje, por ejemplo:
      | Envenenador   | selector de 1 objetivo                                        |
      | Adivina       | 2 objetivos + interruptor "responder SÍ / NO"                  |
      | Monje         | selector de 1 objetivo (no a sí mismo)                         |
      | Lavandera     | 2 nombres + selector del personaje que se muestra              |
      | Cazador       | selector de objetivo + botón "Disparar"                        |
      | Visir         | botón "Ejecutar sin votación"                                  |
      | Invocador     | selector de objetivo + selector del Demonio en que se convierte |
      | Hechicero     | panel de deseos (catálogo + libre)                             |
      | Psicópata     | "Matar en público" y, si fue ejecutado, el Roshambo            |
    Y bajo los controles muestra el recordatorio de reglas de ese personaje

  @panel
  Escenario: Personaje sin habilidad activa en esta fase
    Dado un Soldado (habilidad pasiva)
    Cuando el narrador abre la pestaña "Habilidad"
    Entonces ve el texto de su habilidad y sus recordatorios
    Y no ve controles de acción, sino el aviso «Habilidad pasiva — nada que ejecutar»

  @panel
  Escenario: El panel avisa si la habilidad no va a funcionar
    Dado un Monje envenenado
    Cuando el narrador abre su pestaña "Habilidad"
    Entonces la página avisa en rojo «Envenenado: su protección NO funcionará»
    Y aun así permite ejecutar la acción (para que el jugador no lo note)

  @panel
  Escenario: Habilidad de una sola vez ya gastada
    Dado un Cazador que ya disparó
    Cuando el narrador abre su pestaña "Habilidad"
    Entonces el botón "Disparar" está deshabilitado
    Y muestra «Ya usó su disparo (noche 2)»
    Y ofrece "Devolver el uso" por si el narrador quiere corregir

## Feature: Ruleta congelada de noche para los jugadores

  @auto
  Escenario: Todos los jugadores ven la ruleta durante la noche
    Dado que empieza la noche
    Cuando un jugador mira su pantalla
    Entonces ve su pantalla nocturna **y** la ruleta de jugadores completa
    Y la ruleta muestra el estado exacto que tenía al anochecer

  @auto
  Escenario: La ruleta no se actualiza hasta el amanecer
    Dado que un jugador muere durante la noche
    Cuando el resto de jugadores mira la ruleta
    Entonces siguen viéndolo **vivo**
    Y no ven movimientos de canal, votos fantasma gastados ni nuevas muertes
    Cuando el narrador pulsa "Amanecer"
    Entonces la ruleta se actualiza de golpe con todo lo ocurrido

  @auto
  Escenario: El narrador siempre ve la ruleta en vivo
    Dado que es de noche y acaba de morir un jugador
    Cuando el narrador mira la ruleta
    Entonces lo ve muerto al instante, sin congelación

  @auto
  Escenario: La ruleta congelada indica que está congelada
    Dado un jugador mirando la ruleta de noche
    Entonces la página muestra el cartel «Vista del atardecer — se actualizará al amanecer»

  @auto
  Escenario: Un muerto también ve la ruleta congelada
    Dado un jugador que murió ayer
    Cuando es de noche
    Entonces ve la misma ruleta congelada que los vivos

## Feature: Presencia, conexión y sesiones

  @auto
  Escenario: El narrador ve quién está conectado
    Dado 10 jugadores en la partida y 2 con la pestaña cerrada
    Cuando el narrador mira la ruleta o el listado lateral
    Entonces esos 2 aparecen marcados ○ desconectado
    Y los otros 8 aparecen ● conectado

  @auto
  Escenario: La desconexión se refleja sin recargar
    Dado el narrador mirando la ruleta
    Cuando un jugador cierra su pestaña
    Entonces su marca pasa a ○ desconectado al momento

  @auto
  Escenario: Reconexión
    Dado un jugador desconectado
    Cuando vuelve a entrar con su mismo nombre
    Entonces recupera su asiento, su rol y su estado
    Y su marca vuelve a ● conectado

  @auto
  Escenario: Jugador que no responde
    Dado un jugador cuya sesión sigue abierta pero no responde al latido
    Entonces la página lo marca ⏱ ausente en vez de ● conectado

  @narrador
  Escenario: Jugador desconectado cuando le toca votar
    Dado una votación por turnos y el jugador de turno desconectado
    Entonces la página avisa al narrador «X está desconectado»
    Y el narrador puede votar en su nombre o saltar su turno

  @auto
  Escenario: La conexión es información solo del narrador
    Dado un jugador cualquiera mirando la ruleta
    Entonces **no** ve el estado de conexión de nadie

## Feature: Registro y avisos del narrador

  @auto
  Escenario: Toda acción del narrador queda registrada
    Cuando el narrador mata, revive, cambia un rol, concede un deseo o aplica una ficha
    Entonces se añade una línea con la hora al registro de la partida
    Y ese registro solo lo ve el narrador

  @auto
  Escenario: Los avisos pendientes no desaparecen solos
    Dado un aviso de "recuerda despertar al Demonio por el Barbero"
    Cuando pasan las fases
    Entonces el aviso sigue visible hasta que el narrador lo marca como hecho

---

# FIN DE PARTIDA Y SUCESIÓN DEL DEMONIO

**Regla maestra: la muerte del Demonio NO termina la partida por sí sola.**
Cuando muere un Demonio (por ejecución, por habilidad, o porque el narrador lo mata a mano),
la página resuelve esta cadena **en este orden** y solo declara victoria si ninguna rama la detiene.

| # | Comprobación | Resultado |
|---|---|---|
| 1 | ¿El Demonio muerto tiene sucesor propio? (Lleech → anfitrión, Pequeña Monsta → portador, Legión → queda otro Legión, Kazali/Ojo/Motín/Al-Hadikhia según su regla) | Sucede y **la partida continúa** |
| 2 | ¿Fang Gu / Vigormortis ya se transfirieron en su ataque? | Ya hay Demonio vivo, nada que hacer |
| 3 | ¿Hay Dama Escarlata viva, sana y con **5 o más** vivos? | Hereda **el mismo personaje del Demonio muerto** y la partida continúa |
| 4 | ¿El nuevo Demonio hereda una habilidad de Rata de Laboratorio? | Se coloca la ficha y se avisa al narrador |
| 5 | ¿Hay Mente Maestra viva, sobria y sana? | **Sin anuncio**: se juega 1 día extra |
| 6 | ¿Hay Ateo en juego? | La página **nunca** termina la partida sola |
| 7 | Nada de lo anterior | Ganan los buenos |

## Feature: Reglas globales de victoria

  @auto
  Escenario: El Bien gana solo cuando no queda ningún sucesor
    Dado una partida sin Ateo, sin Dama Escarlata viva y sin Mente Maestra viva
    Cuando muere el último Demonio
    Entonces la página declara ganador al Bien
    Y muestra la pantalla de fin de partida a todos con el motivo

  @auto
  Escenario: El Mal gana cuando solo quedan 2 jugadores vivos
    Dado una partida con el Demonio vivo
    Cuando el número de vivos baja a 2
    Entonces la página declara ganador al Mal

  @auto
  Escenario: Con Ateo en juego la página nunca termina la partida sola
    Dado el Ateo en juego (no hay malvados reales)
    Cuando muere cualquier jugador, o quedan 2 vivos, o "muere el Demonio"
    Entonces la página **NO** declara ganador
    Y solo el narrador puede terminar la partida a mano

  @auto
  Escenario: Muerte manual del Demonio por el narrador
    Dado el narrador matando al Demonio desde el mini-panel
    Entonces se aplica la misma cadena de sucesión que en una ejecución
    Y la página no se salta ningún paso por ser una muerte manual

## Feature: Sucesión — Dama Escarlata

  @auto
  Escenario: Hereda el personaje exacto del Demonio muerto
    Dado 5 o más vivos y la Dama Escarlata viva y sana
    Y el Demonio en juego es el Vortox
    Cuando el Vortox muere
    Entonces la Dama Escarlata se convierte en **Vortox** (no en Diablillo)
    Y la partida continúa sin ningún anuncio de victoria
    Y la página avisa al narrador del cambio y le recuerda despertarla esta noche

  @auto
  Escenario: Menos de 5 vivos — no hereda
    Dado 4 vivos y la Dama Escarlata viva
    Cuando el Demonio muere
    Entonces la Dama Escarlata sigue siendo Esbirro
    Y se pasa a comprobar la Mente Maestra

  @auto
  Escenario: Dama Escarlata envenenada — no hereda
    Dado la Dama Escarlata envenenada y 7 vivos
    Cuando el Demonio muere
    Entonces no hereda nada y la página lo avisa al narrador

  @auto
  Escenario: Dama Escarlata y Mente Maestra a la vez
    Dado 6 vivos, Dama Escarlata viva y sana, y Mente Maestra viva y sobria
    Cuando el Demonio es ejecutado
    Entonces hereda la Dama Escarlata
    Y la Mente Maestra **no** se activa (sigue habiendo Demonio vivo)

## Feature: Sucesión — Mente Maestra

  @auto
  Escenario: El Demonio muere y se juega un día más en secreto
    Dado la Mente Maestra viva, sobria y sana
    Y ninguna Dama Escarlata que pueda heredar
    Cuando el Demonio muere
    Entonces la página **NO** termina la partida
    Y **NO** anuncia que el Demonio ha muerto
    Y avisa en privado al narrador: «se juega 1 día más»
    Y la regla de "2 vivos = ganan los malos" queda suspendida durante ese día

  @auto
  Escenario: En el día extra se ejecuta a un malvado
    Dado el día extra de la Mente Maestra en curso
    Cuando se ejecuta a un jugador malvado
    Entonces ganan los buenos

  @auto
  Escenario: En el día extra se ejecuta a un bueno
    Dado el día extra de la Mente Maestra en curso
    Cuando se ejecuta a un jugador bueno
    Entonces ganan los malos

  @auto
  Escenario: En el día extra no se ejecuta a nadie
    Dado el día extra de la Mente Maestra en curso
    Cuando termina el día sin ejecución
    Entonces ganan los buenos

  @auto
  Escenario: La ejecución cuenta aunque el ejecutado no muera
    Dado el día extra y un Santo ejecutado que no muere por una protección
    Entonces la ejecución cuenta igual y decide la partida

## Feature: Sucesión — Demonios con sucesor propio

  @panel
  Escenario: Sangijuela — muere su anfitrión
    Dado la Sangijuela con su anfitrión marcado
    Cuando el anfitrión muere
    Entonces la Sangijuela muere también
    Y la página aplica la cadena de sucesión completa

  @panel
  Escenario: Pequeña Monsta — muere su portador
    Dado la Pequeña Monsta en manos de un Esbirro portador
    Cuando el portador muere
    Entonces el narrador elige en el panel qué Esbirro vivo recoge la ficha
    Y mientras haya portador vivo la página cuenta que hay Demonio vivo
    Y si no queda ningún Esbirro vivo, se aplica la cadena de sucesión

  @auto
  Escenario: Legión — sigue habiendo Demonio mientras quede un Legión
    Dado varios jugadores con el personaje Legión
    Cuando uno de ellos es ejecutado
    Entonces la partida continúa
    Y solo cuando muere el último Legión se comprueba la victoria

  @panel
  Escenario: Fang Gu — el Forastero atacado se convierte
    Dado el Fang Gu atacando a un Forastero por primera vez
    Entonces el Forastero muere o se convierte en Fang Gu según la regla
    Y si se convierte, el Fang Gu original muere y **la partida continúa**
    Y la página avisa al narrador de quién es el nuevo Demonio

  @panel
  Escenario: Vigormortis — sus Esbirros muertos conservan habilidad
    Dado el Vigormortis matando a un Esbirro
    Entonces ese Esbirro muerto conserva su habilidad
    Y la página lo marca con ficha para que el narrador siga despertándolo
    Cuando el Vigormortis muere
    Entonces se aplica la cadena de sucesión normal

  @panel
  Escenario: Kazali, Ojo, Motín, Al-Hadikhia
    Dado uno de estos Demonios en juego
    Cuando muere
    Entonces la página aplica primero su regla propia de sustitución si la tiene
    Y solo si no la hay pasa a la Dama Escarlata y la Mente Maestra

  @auto
  Escenario: Zombuul — su primera muerte es fingida
    Dado el Zombuul vivo y sano
    Cuando muere por primera vez
    Entonces se registra como muerto para todos
    Y la página **sigue contándolo como Demonio vivo**
    Y avisa al narrador de que su segunda muerte es la real

  @panel
  Escenario: Rata de Laboratorio — el nuevo Demonio hereda su habilidad
    Dado la Rata de Laboratorio en juego
    Cuando un nuevo Demonio nace por la Dama Escarlata o por el Barbero
    Entonces ese nuevo Demonio tiene también una habilidad de Rata de Laboratorio
    Y la página coloca la ficha y avisa al narrador de que puede ser distinta a la anterior

## Feature: Terminar la partida a mano

  @panel
  Escenario: El narrador declara ganador
    Dado la partida en curso en cualquier estado
    Cuando el narrador pulsa "Ganan los buenos" o "Ganan los malos"
    Entonces la página pide confirmación y muestra la pantalla de fin de partida
    Y este camino funciona siempre, incluso con Ateo en juego

  @auto
  Escenario: La pantalla de fin de partida revela todo
    Cuando la partida termina por cualquier vía
    Entonces todos los jugadores ven todos los personajes reales
    Y ven los roles creídos de quien los tuviera
    Y ven el motivo exacto de la victoria

---

# MOTOR: FASES, FICHAS Y VOTACIÓN

## Feature: Fases y fichas de estado

  @auto
  Escenario: El veneno dura la noche y el día siguiente
    Dado que el Envenenador envenena a la Empática en la noche 2
    Entonces la Empática está envenenada durante la noche 2 y el día 3
    Cuando comienza la noche 3
    Entonces la ficha de veneno caduca antes de que actúen los roles

  @auto
  Escenario: La protección caduca al amanecer
    Dado que el Monje protege al Soldado esta noche
    Cuando amanece
    Entonces la ficha "A salvo" desaparece

  @auto
  Escenario: Las fichas manuales del narrador nunca caducan solas
    Dado una ficha manual colocada por el narrador
    Cuando pasan amaneceres y anocheceres
    Entonces la ficha sigue hasta que el narrador la quita

  @auto
  Escenario: Las fichas que dependen del portador se limpian al morir
    Dado un jugador con la ficha de "Amo del Mayordomo"
    Cuando ese jugador muere
    Entonces la ficha desaparece

  @auto
  Escenario: Una ficha de reemplazo sustituye a la anterior del mismo tipo
    Dado el Envenenador que envenenó a Ana anoche
    Cuando esta noche envenena a Bea
    Entonces Ana deja de estar envenenada y Bea lo está

## Feature: Nominaciones y votación

  @auto
  Escenario: Umbral de ejecución = mitad de los vivos redondeando hacia arriba
    Dado 7 jugadores vivos
    Cuando una nominación recibe 4 votos
    Entonces alcanza el umbral

  @auto
  Escenario: Un muerto solo vota una vez en toda la partida y solo a favor
    Dado un jugador muerto que no ha usado su voto fantasma
    Cuando vota a favor
    Entonces su voto cuenta y pierde el voto fantasma
    Y si intenta votar de nuevo la página lo rechaza

  @auto
  Escenario: Empate de votos = nadie es ejecutado
    Dado dos nominaciones con el mismo máximo de votos sobre el umbral
    Cuando el narrador finaliza las nominaciones
    Entonces nadie es ejecutado y se anuncia el empate

  @auto
  Escenario: Cada vivo solo nomina una vez al día
    Dado que un jugador ya nominó hoy
    Cuando intenta nominar de nuevo
    Entonces la página lo rechaza

  @panel
  Escenario: El narrador es nominable
    Dado las nominaciones abiertas
    Entonces el narrador aparece como objetivo posible en el selector
    Y si es ejecutado se resuelve según el Ateo o como día perdido

  @panel
  Escenario: Solo el narrador registra nominaciones
    Dado un jugador que quiere nominar
    Entonces lo pide en voz alta
    Y el narrador lo registra en la página eligiendo nominador y nominado

  @panel
  Escenario: Votación por turnos en sentido horario
    Dado una nominación abierta
    Entonces la página marca el turno de cada votante empezando por el nominador
    Y el narrador puede votar en nombre de un jugador o avanzar su turno

---

# SISTEMA DE DESEOS (Hechicero)

El deseo se pide **siempre en privado al narrador**. La página nunca lo hace público por su cuenta.
El narrador dispone de un **catálogo grande de deseos preestablecidos** y de un **panel libre** para cualquier otro.

## Feature: Pedir el deseo

  @privado
  Escenario: El jugador escribe su deseo
    Dado el Hechicero vivo que aún no ha gastado su deseo
    Cuando pulsa "Pedir un deseo" y escribe el texto
    Entonces el deseo se envía **solo al narrador**
    Y ningún otro jugador ve nada
    Y el Hechicero ve «Tu deseo ha llegado al Narrador»

  @privado
  Escenario: El narrador recibe el aviso
    Dado un deseo pendiente
    Entonces el narrador ve un aviso destacado con el texto completo del deseo
    Y el aviso no desaparece hasta que lo resuelve

  @privado
  Escenario: El narrador va a la habitación del Hechicero
    Dado un deseo pendiente
    Cuando el narrador pulsa "Ir a su habitación"
    Entonces la página mueve al narrador al canal privado de ese jugador
    Y el narrador puede hablarlo con él antes de decidir

  @privado
  Escenario: El deseo se puede pedir de día o de noche
    Dado el Hechicero vivo
    Entonces puede pedir su deseo en cualquier fase
    Y de noche el narrador lo atiende en su turno de la cola nocturna

  @panel
  Escenario: Deseo hablado, no escrito
    Dado un Hechicero que prefiere decirlo en voz
    Entonces el narrador puede abrir el panel de deseos directamente
    Y escribir él mismo el texto del deseo en nombre del jugador

## Feature: Resolver el deseo

  @panel @privado
  Escenario: Las tres salidas del narrador
    Dado un deseo pendiente
    Entonces el narrador tiene tres botones:
      | Conceder              | aplica efectos, precio y pista        |
      | Denegar y pedir otro  | el Hechicero conserva su deseo        |
      | Denegar definitivo    | el Hechicero se queda sin deseos      |

  @panel
  Escenario: Denegar y pedir otro
    Cuando el narrador pulsa "Denegar y pedir otro"
    Entonces el Hechicero recibe «Ese deseo no puede concederse — pide otro»
    Y vuelve a tener el botón de pedir deseo disponible

  @panel
  Escenario: Denegar definitivo
    Cuando el narrador pulsa "Denegar definitivo"
    Entonces el Hechicero recibe «Ya no te quedan deseos»
    Y el botón de pedir deseo desaparece

  @panel
  Escenario: Conceder desde el catálogo
    Cuando el narrador pulsa "Conceder" y elige una entrada del catálogo
    Entonces la página aplica el efecto mecánico ya programado de esa entrada
    Y rellena automáticamente un **precio sugerido** y una **pista pública sugerida**
    Y el narrador puede editar ambos antes de aplicar

  @panel
  Escenario: Conceder libre
    Cuando el narrador elige la pestaña "Libre"
    Entonces dispone de todas las acciones universales del mini-panel sobre cualquier jugador
    Y de dos campos de texto: pista pública y precio
    Y puede encadenar varios efectos antes de cerrar el deseo

  @panel
  Escenario: El narrador decide si se anuncia
    Dado un deseo concedido
    Entonces el narrador elige entre:
      | No decir nada                              |
      | Anunciar que hubo un deseo, sin pista      |
      | Anunciar el deseo y dar la pista pública   |
    Y la página solo difunde lo que el narrador elija

  @panel
  Escenario: Anunciar el deseo más tarde
    Dado un deseo concedido sin anunciar
    Entonces el aviso "deseo sin anunciar" sigue en el panel del narrador
    Y puede anunciarlo en cualquier momento posterior

  @panel
  Escenario: El precio es privado por defecto
    Dado un deseo concedido con precio
    Entonces solo el narrador ve el precio
    Y puede revelárselo al Hechicero o no, con un botón aparte

  @panel
  Escenario: El Hechicero muere con el deseo activo
    Dado un deseo concedido y el Hechicero muerto
    Entonces la página pregunta al narrador «¿El deseo sigue en juego?»
    Y no retira ningún efecto por su cuenta

  @auto
  Escenario: Un solo deseo por partida
    Dado un Hechicero cuyo deseo ya fue concedido
    Entonces el botón de pedir deseo ya no aparece

## Feature: Catálogo de deseos preestablecidos

  Cada entrada trae efecto programado, precio sugerido y pista pública sugerida, todos editables.

  @panel
  Escenario: Catálogo completo disponible al conceder
    Dado el narrador concediendo un deseo
    Entonces el catálogo ofrece al menos estas entradas, agrupadas:

    **Información**
      | Ver el Grimorio                       | ve todos los roles el resto de la partida |
      | Saber quién es el Demonio             | recibe el nombre exacto                   |
      | Saber la alineación de un jugador     | recibe bueno/malvado de quien elija       |
      | Saber qué personajes no están en juego| recibe 3 personajes ausentes              |
      | Ver toda la información de una noche  | recibe copia de lo que recibieron todos   |
      | Saber quién nominó a quién en secreto | historial completo                        |

    **Cambiar personajes**
      | Convertirse en el Demonio             | mata al Demonio actual y le da su personaje |
      | Cambiar el personaje de un jugador    | abre el selector de rol                     |
      | Intercambiar dos personajes           | conserva alineaciones                       |
      | Robar la habilidad de otro jugador    | copia su personaje, el otro lo pierde       |
      | Duplicar su propia habilidad          | puede usarla dos veces                      |
      | Volver bueno a un malvado             | cambia alineación                           |
      | Volver malvado a un bueno             | cambia alineación                           |

    **Vida y muerte**
      | Matar a un jugador                    | muerte inmediata                       |
      | Resucitar a un jugador                | vuelve a estar vivo                    |
      | Inmunidad a la muerte esta noche      | ficha de protección                    |
      | Que el Demonio no pueda matarle nunca | ficha permanente                       |
      | Nadie muere esta noche                | bloquea todas las muertes nocturnas    |
      | Anular la próxima ejecución           | el ejecutado no muere                  |

    **Estados**
      | Emborrachar a todos los buenos        | ficha de borrachera a todo el Bien     |
      | Envenenar a un jugador cada noche     | ficha recurrente                       |
      | Curar a un jugador                    | limpia veneno y borrachera             |
      | Ocultar su personaje al Demonio       | no aparece en la info del Mal          |

    **Votación y fases**
      | Voto doble el resto de la partida     | su voto cuenta por 2                   |
      | Recuperar el voto fantasma            | vuelve a poder votar de muerto         |
      | Todos los muertos recuperan su voto   | voto fantasma para todos               |
      | Forzar una ejecución sin votación     | el narrador elige al ejecutado         |
      | Saltar la noche                       | se pasa directo al día siguiente       |
      | Alargar el día                        | más tiempo de debate                   |

    **Partida**
      | Ganar la partida                      | victoria del bando del Hechicero       |
      | Que gane el otro bando                | victoria del bando contrario           |
      | Repetir el día de hoy                 | se revierte la fase                    |

  @panel
  Escenario: Deseo del catálogo con efecto sobre otro jugador
    Dado el narrador eligiendo "Cambiar el personaje de un jugador"
    Entonces la página pide sobre qué jugador y a qué personaje
    Y al aplicar usa el mismo cambio de rol en vivo, con o sin aviso al afectado

  @panel
  Escenario: Deseo "Convertirse en el Demonio"
    Dado el Hechicero deseando ser el Demonio
    Cuando el narrador concede esa entrada del catálogo
    Entonces el Demonio actual muere
    Y el Hechicero recibe su personaje de Demonio y su alineación malvada
    Y la página **no** termina la partida, porque sigue habiendo Demonio vivo
    Y sugiere la pista «el aprendiz se ha transformado en maestro»

  @panel
  Escenario: Deseo "Ganar la partida"
    Cuando el narrador concede esa entrada
    Entonces puede fijar el ganador al final del día en vez de al instante
    Y la pista sugerida acota el Demonio a 3 nombres, para que el Bien conserve una oportunidad

  @panel
  Escenario: Deseo "Ver el Grimorio"
    Cuando el narrador concede esa entrada
    Entonces el Hechicero ve todos los personajes reales en su ruleta
    Y el resto de jugadores no nota nada

---

# ÓRDENES NOCTURNOS

## Feature: Cola nocturna (motor)

  @auto
  Escenario: La cola solo incluye a quien tiene algo que hacer
    Cuando empieza una noche
    Entonces la cola contiene a los personajes vivos que actúan esa noche, en el orden de su campaña
    Y los muertos con habilidad conservada (Vigormortis) también entran

  @panel
  Escenario: El narrador avanza la cola manualmente
    Dado la cola nocturna en curso
    Entonces el narrador ve de quién es el turno y su panel de habilidad
    Y puede saltar a cualquier jugador de la cola sin seguir el orden

  @auto
  Escenario: Los roles de solo-primera-noche no vuelven a despertar
    Dado Lavandera, Bibliotecario, Investigador y Cocinero en juego
    Cuando comienza la noche 2
    Entonces ninguno de ellos aparece en la cola

  @panel
  Escenario: Insertar un paso extra a mitad de noche
    Dado un efecto pendiente (Barbero, Criacuervos, Invocador)
    Entonces la página inserta ese paso en la cola de esta noche
    Y avisa al narrador antes de cerrar la noche si queda alguno sin resolver

## Feature: Orden de la primera noche — Trouble Brewing

  Orden: información de Esbirros y Demonio + faroles →
  ENVENENADOR → LAVANDERA → BIBLIOTECARIO → INVESTIGADOR → COCINERO → EMPÁTICA → ADIVINA → MAYORDOMO → ESPÍA.

  @auto
  Escenario: El Envenenador actúa antes que los roles de información
    Dado la primera noche con Envenenador y Empática
    Cuando el Envenenador envenena a la Empática
    Entonces la Empática despierta después y su número puede ser falso

  @auto
  Escenario: El Diablillo no actúa la primera noche
    Dado el Diablillo en juego
    Entonces no aparece en la cola de la primera noche
    Y solo recibe faroles e información de sus Esbirros

## Feature: Orden de las otras noches — Trouble Brewing

  Orden: ENVENENADOR → MONJE → DIABLILLO → CRIACUERVOS → ADIVINA → EMPÁTICA → ENTERRADOR → MAYORDOMO → ESPÍA.

  @auto
  Escenario: El Monje protege antes de que ataque el Diablillo
    Dado la noche 3 con Monje y Diablillo vivos
    Cuando el Monje protege al Alcalde y el Diablillo lo ataca
    Entonces el Alcalde no muere

  @auto
  Escenario: El Criacuervos despierta solo si murió esta noche
    Dado el Criacuervos atacado esta noche
    Entonces la página lo inserta en la cola tras el ataque
    Y elige un jugador cuyo personaje aprende

## Feature: Orden de la primera noche — Bad Moon Rising

  Orden: información del Mal + faroles → LUNÁTICO → ABOGADO DEL DIABLO → POOKA/asignaciones →
  MARINERO → SIRVIENTA → COTILLA(info) → CORTESANO → PROFESOR → DAMA DEL TÉ → BUFÓN.

  @auto
  Escenario: El Lunático recibe información falsa de Demonio
    Dado el Lunático en juego
    Entonces cree ser el Demonio y recibe faroles como si lo fuera
    Y el Demonio real sabe quién es el Lunático

## Feature: Orden de las otras noches — Bad Moon Rising

  Orden: ABOGADO DEL DIABLO → POSADERO → MARINERO → EXORCISTA → DEMONIO → TAHÚR →
  SIRVIENTA → CORTESANO → PROFESOR → COTILLA → JUGLAR.

  @auto
  Escenario: El Exorcista actúa antes que el Demonio
    Dado el Exorcista eligiendo al Demonio esta noche
    Entonces el Demonio no despierta ni mata esta noche

## Feature: Orden de la primera noche — Sects & Violets

  Orden: información del Mal + faroles → ENCANTADOR DE SERPIENTES → FILÓSOFO → RELOJERO →
  SOÑADOR → COSTURERA → MATEMÁTICO → PREGONERO → ORÁCULO → NIÑA DE LAS FLORES.

  @auto
  Escenario: El Encantador de Serpientes puede robar el personaje del Demonio
    Dado el Encantador eligiendo al Demonio la primera noche
    Entonces intercambian personaje y alineación
    Y la página avisa al narrador de quién es ahora el Demonio

## Feature: Orden de las otras noches — Sects & Violets

  Orden: DESCEREBRADO → BRUJO DEL CALDERO → BRUJA → ENCANTADOR DE SERPIENTES → FILÓSOFO →
  DEMONIO → BARBERO → SOÑADOR → COSTURERA → MATEMÁTICO → PREGONERO → ORÁCULO → NIÑA DE LAS FLORES.

  @auto
  Escenario: El Barbero actúa después del ataque del Demonio
    Dado el Barbero muerto esta noche por el Demonio
    Entonces el paso del intercambio se resuelve inmediatamente después

## Feature: Orden de la primera noche — The Carousel

  Orden: FAROLES → INVOCADOR → CULTIVADOR DE ADORMIDERA → MAGO → MARIONETA → VIUDA →
  ADMINISTRADOR → NOBLE → SHUGENJA → AERONAUTA → CAZARRECOMPENSAS → PREDICADOR →
  GUARDIÁN NOCTURNO → SACERDOTISA MAYOR → ALQUIMISTA → HECHICERO(si pide deseo).

  @auto
  Escenario: El Cultivador de Adormidera oculta al equipo malvado
    Dado el Cultivador en juego
    Entonces los Esbirros y el Demonio **no** se conocen entre sí
    Y la página omite ese paso de la primera noche

## Feature: Orden de las otras noches — The Carousel

  Orden: SEMBRADOR DE MIEDO → ORGANILLERO → MEZEFELES → ARPÍA → INVOCADOR(noche 3) →
  DEMONIO → CANÍBAL → BANSHEE → GRANJERO → INGENIERO → GUARDIÁN NOCTURNO →
  SACERDOTISA MAYOR → AERONAUTA → LICÁNTROPO → HECHICERO(si pide deseo).

  @auto
  Escenario: El Invocador crea el Demonio en la noche 3
    Dado una partida que empezó sin Demonio, con Invocador
    Cuando llega la noche 3
    Entonces el Invocador elige jugador y el narrador elige en qué Demonio se convierte

---
---

# CAMPAÑA: TROUBLE BREWING

## Feature: Lavandera (Aldeano) — TB
  «Empiezas sabiendo que 1 de 2 jugadores es un personaje concreto de Aldeano.»
  Panel: primera noche — 2 jugadores + selector del personaje mostrado.

  @panel
  Escenario: El narrador prepara la información
    Dado la primera noche y la Lavandera sobria
    Cuando el narrador abre su pestaña "Habilidad"
    Entonces la página propone un par correcto (un Aldeano real + un señuelo) y el personaje a mostrar
    Y el narrador puede cambiar cualquiera de los tres antes de enviar

  @auto
  Escenario: Información verdadera
    Dado la Lavandera sobria
    Entonces recibe 2 nombres y 1 personaje, y uno de esos dos es realmente ese personaje

  @auto
  Escenario: Borracha o envenenada
    Dado la Lavandera envenenada la primera noche
    Entonces la página genera igualmente 2 nombres y 1 personaje plausibles
    Y la información puede ser completamente falsa
    Y el panel avisa al narrador «Envenenada: esta info es falsa»

  @auto
  Escenario: No vuelve a despertar
    Cuando comienza la noche 2
    Entonces la Lavandera no está en la cola

  @panel
  Escenario: El Recluso puede aparecer como el Aldeano mostrado
    Dado el Recluso en juego
    Entonces el narrador puede elegir al Recluso como el "Aldeano" del par

## Feature: Bibliotecario (Aldeano) — TB
  «Empiezas sabiendo que 1 de 2 jugadores es un personaje concreto de Forastero.»
  Panel: primera noche — 2 jugadores + selector de Forastero, o botón "No hay Forasteros".

  @panel
  Escenario: Preparar la información
    Dado la primera noche con al menos un Forastero en juego
    Entonces el panel propone 2 nombres y el Forastero a mostrar, editables

  @auto
  Escenario: Sin Forasteros en juego
    Dado ningún Forastero en la partida
    Entonces el Bibliotecario recibe "0" y la página lo indica así

  @auto
  Escenario: Envenenado
    Dado el Bibliotecario envenenado
    Entonces recibe un par y un Forastero que pueden ser falsos, o un falso "0"

  @panel
  Escenario: El Espía puede aparecer como Forastero
    Dado el Espía en juego
    Entonces el narrador puede incluirlo en el par como si fuera Forastero

## Feature: Investigador (Aldeano) — TB
  «Empiezas sabiendo que 1 de 2 jugadores es un personaje concreto de Esbirro.»
  Panel: primera noche — 2 jugadores + selector de Esbirro.

  @panel
  Escenario: Preparar la información
    Dado la primera noche y un Esbirro en juego
    Entonces el panel propone el Esbirro real más un señuelo, editables

  @auto
  Escenario: Envenenado
    Dado el Investigador envenenado
    Entonces recibe un par y un Esbirro que pueden ser falsos

  @panel
  Escenario: El Recluso puede aparecer como el Esbirro
    Dado el Recluso en juego
    Entonces el narrador puede señalarlo como el Esbirro del par

## Feature: Cocinero (Aldeano) — TB
  «Empiezas sabiendo cuántos pares de jugadores malvados son vecinos.»
  Panel: primera noche — número calculado + campo editable.

  @auto
  Escenario: Cuenta automática de pares
    Dado la primera noche y el Cocinero sobrio
    Entonces la página calcula los pares de malvados sentados juntos
    Y el panel muestra ese número ya calculado

  @auto
  Escenario: Envenenado
    Dado el Cocinero envenenado
    Entonces la página genera un número distinto del real, dentro de un rango creíble

  @panel
  Escenario: El narrador ajusta el número
    Dado el Recluso o el Espía en juego
    Entonces el narrador puede subir o bajar el número manualmente antes de enviarlo

## Feature: Empática (Aldeano) — TB
  «Cada noche descubres cuántos de tus 2 vecinos vivos son malvados.»
  Panel: cada noche — número calculado + campo editable.

  @auto
  Escenario: Cuenta a los vecinos vivos, saltando muertos
    Dado la Empática con un vecino muerto
    Entonces la página cuenta el siguiente vivo en esa dirección

  @auto
  Escenario: Envenenada
    Dado la Empática envenenada
    Entonces recibe un número falso pero posible (0, 1 o 2)

  @auto
  Escenario: El número cambia al morir gente
    Dado que muere un vecino de la Empática
    Cuando llega la noche siguiente
    Entonces el número se recalcula con los nuevos vecinos vivos

## Feature: Adivina (Aldeano) — TB
  «Cada noche elige 2 jugadores: descubres si alguno es el Demonio. Hay un bueno que te aparece como Demonio.»
  Panel: cada noche — 2 objetivos + interruptor SÍ/NO forzable + marca del señuelo.

  @panel
  Escenario: El narrador fija el señuelo la primera noche
    Dado la primera noche con Adivina en juego
    Entonces el panel pide marcar qué jugador bueno aparece como Demonio
    Y esa marca se conserva toda la partida

  @auto
  Escenario: Respuesta automática
    Dado la Adivina eligiendo a dos jugadores
    Entonces la página responde SÍ si alguno es el Demonio o es el señuelo
    Y NO en caso contrario

  @panel
  Escenario: El narrador fuerza la respuesta
    Dado un caso raro (Recluso, Espía, Demonio recién sucedido)
    Entonces el narrador puede forzar SÍ o NO desde el interruptor
    Y la página envía lo que el narrador decida

  @auto
  Escenario: Envenenada
    Dado la Adivina envenenada
    Entonces recibe una respuesta que puede ser falsa

## Feature: Enterrador (Aldeano) — TB
  «Cada noche* descubres qué personaje fue ejecutado hoy.»
  Panel: cada noche tras una ejecución — personaje mostrado, editable.

  @auto
  Escenario: Aprende el personaje del ejecutado
    Dado que hoy se ejecutó a un jugador
    Entonces esa noche el Enterrador recibe su personaje

  @auto
  Escenario: Nadie fue ejecutado
    Dado un día sin ejecución
    Entonces el Enterrador no despierta y la página lo salta

  @panel
  Escenario: Ejecutado que no murió
    Dado un Santo o un Bufón ejecutado que sobrevivió
    Entonces el narrador decide en el panel si el Enterrador recibe algo

  @auto
  Escenario: Envenenado
    Dado el Enterrador envenenado
    Entonces recibe un personaje falso

## Feature: Monje (Aldeano) — TB
  «Cada noche* elige a otro jugador: queda a salvo del Demonio esta noche.»
  Panel: cada noche* — 1 objetivo distinto de sí mismo.

  @auto
  Escenario: La protección bloquea el ataque
    Dado el Monje protegiendo al Alcalde
    Cuando el Demonio ataca al Alcalde
    Entonces no muere nadie

  @auto
  Escenario: No protege de otras muertes
    Dado el Monje protegiendo a un jugador
    Cuando ese jugador es ejecutado o muere por el Asesino
    Entonces muere igual

  @auto
  Escenario: Monje envenenado
    Dado el Monje envenenado
    Entonces la ficha "A salvo" se coloca igualmente pero **no** protege
    Y el panel avisa al narrador

  @auto
  Escenario: No puede protegerse a sí mismo
    Entonces el selector del panel excluye al propio Monje

## Feature: Criacuervos (Aldeano) — TB
  «Si mueres de noche, despiertas y eliges un jugador: descubres su personaje.»
  Panel: se inserta en la cola en cuanto muere de noche.

  @auto
  Escenario: Despierta al morir de noche
    Dado el Criacuervos atacado por el Demonio
    Entonces la página lo inserta en la cola de esta noche
    Y avisa al narrador de que debe despertarlo

  @panel
  Escenario: Elige objetivo y recibe su personaje
    Cuando elige a un jugador
    Entonces recibe el personaje real de ese jugador
    Y el narrador puede sustituirlo si el Recluso o el Espía están implicados

  @auto
  Escenario: Muerte de día no activa la habilidad
    Dado el Criacuervos ejecutado de día
    Entonces no despierta

  @auto
  Escenario: Envenenado
    Dado el Criacuervos envenenado al morir
    Entonces recibe un personaje falso

## Feature: Virgen (Aldeano) — TB
  «La primera vez que te nomine un Aldeano, ese jugador es ejecutado inmediatamente.»
  Panel: aviso automático al registrar la nominación.

  @auto
  Escenario: La nomina un Aldeano
    Dado la Virgen sana y sin usar su poder
    Cuando un Aldeano la nomina
    Entonces ese nominador muere inmediatamente
    Y la nominación no llega a votarse
    Y el poder queda gastado

  @auto
  Escenario: La nomina alguien que no es Aldeano
    Cuando un Forastero, Esbirro o Demonio la nomina
    Entonces nadie muere
    Y el poder **queda gastado igualmente** (es la primera nominación)

  @auto
  Escenario: Virgen envenenada
    Dado la Virgen envenenada
    Cuando un Aldeano la nomina
    Entonces no muere nadie y el poder se gasta

  @panel
  Escenario: El Recluso la nomina
    Dado el Recluso nominando a la Virgen
    Entonces el narrador decide si registra como Aldeano y muere, o no

## Feature: Cazador / Slayer (Aldeano) — TB
  «Una vez por partida, de día, elige un jugador: si es el Demonio, muere.»
  Panel: **solo el narrador dispara**, cuando el jugador lo pide en voz alta.

  @panel
  Escenario: El narrador ejecuta el disparo
    Dado el Cazador vivo, de día, sin haber disparado
    Cuando el narrador abre el mini-panel del objetivo y pulsa "Disparo del Cazador"
    Entonces si el objetivo es el Demonio, muere
    Y si no lo es, no pasa nada
    Y el uso queda gastado en ambos casos

  @auto
  Escenario: Ningún jugador puede disparar por su cuenta
    Dado un jugador con el Cazador
    Entonces su interfaz **no** tiene botón de disparo
    Y solo puede pedirlo en voz alta

  @panel
  Escenario: Disparo fingido de un malvado
    Dado un malvado que finge ser el Cazador
    Cuando el narrador usa "Disparo fingido" eligiendo al malvado como tirador
    Entonces se anuncia el disparo y no muere nadie
    Y ese malvado no puede volver a fingir

  @auto
  Escenario: Cazador envenenado
    Dado el Cazador envenenado disparando al Demonio
    Entonces el Demonio no muere y el uso se gasta

  @panel
  Escenario: El Recluso recibe el disparo
    Dado el Recluso disparado por el Cazador
    Entonces el narrador decide si muere (registrando como Demonio) o no

## Feature: Soldado (Aldeano) — TB
  «Eres inmune a los ataques del Demonio.»

  @auto
  Escenario: El Demonio ataca al Soldado
    Entonces el Soldado no muere y el Demonio gasta su ataque

  @auto
  Escenario: El Soldado muere por otras vías
    Cuando es ejecutado o atacado por el Asesino
    Entonces muere normalmente

  @panel
  Escenario: Aviso al matarlo a mano
    Dado el narrador matando al Soldado desde el mini-panel
    Entonces la página avisa «Soldado: inmune a ataques del Demonio» antes de confirmar

## Feature: Alcalde (Aldeano) — TB
  «Si solo quedan 3 vivos y no hay ejecución, tu equipo gana. Si mueres de noche, otro puede morir en tu lugar.»
  Panel: botón "Victoria del Alcalde" + selector de sustituto.

  @panel
  Escenario: Redirigir el ataque nocturno
    Dado el Demonio atacando al Alcalde
    Entonces el narrador elige en el panel si muere el Alcalde u otro jugador
    Y la página aplica la muerte al elegido

  @panel
  Escenario: Victoria por 3 vivos sin ejecución
    Dado 3 jugadores vivos, el Alcalde entre ellos, y el día termina sin ejecución
    Entonces el botón "Victoria del Alcalde" está disponible
    Y al pulsarlo ganan los buenos

  @auto
  Escenario: Alcalde envenenado
    Dado el Alcalde envenenado
    Entonces ni redirige ataques ni gana por 3 vivos

## Feature: Mayordomo (Forastero) — TB
  «Cada noche elige un jugador: mañana solo puedes votar si ese jugador vota.»
  Panel: cada noche — 1 objetivo distinto de sí mismo.

  @auto
  Escenario: El Amo no vota
    Dado el Mayordomo con su Amo elegido
    Cuando el Amo no vota en una nominación
    Entonces el voto del Mayordomo se rechaza

  @auto
  Escenario: El Amo vota
    Cuando el Amo vota a favor
    Entonces el Mayordomo puede votar libremente

  @auto
  Escenario: Mayordomo envenenado
    Dado el Mayordomo envenenado
    Entonces puede votar sin restricción y la ficha se coloca igual

  @panel
  Escenario: El narrador ve quién es el Amo
    Entonces el mini-panel del Amo muestra la ficha «Es el Amo del Mayordomo»

## Feature: Borracho (Forastero) — TB
  «No sabes que eres el Borracho. Crees ser un Aldeano, pero tu habilidad no funciona.»

  @auto
  Escenario: Cree ser otro personaje
    Dado el Borracho en juego
    Entonces el jugador ve un Aldeano que no está realmente en juego
    Y nunca ve la palabra "Borracho"

  @auto
  Escenario: Su información siempre puede ser falsa
    Dado el Borracho que cree ser la Empática
    Entonces recibe números plausibles pero no fiables

  @panel
  Escenario: El narrador ve la verdad
    Entonces el mini-panel muestra «Real: Borracho · Cree ser: Empática»
    Y avisa de que su habilidad nunca funciona

## Feature: Recluso (Forastero) — TB
  «Puedes aparecer como malvado y como un personaje de Esbirro o Demonio.»
  Panel: interruptor "cómo registra" en el mini-panel del narrador.

  @panel
  Escenario: El narrador decide cómo registra
    Dado el Recluso en juego
    Entonces el narrador fija si aparece como bueno o como malvado
    Y puede cambiarlo en cualquier momento
    Y puede fijar además qué personaje malvado aparenta

  @auto
  Escenario: La información generada respeta la decisión
    Dado el Recluso marcado como "registra malvado"
    Cuando la Empática cuenta vecinos malvados
    Entonces el Recluso cuenta como malvado

  @auto
  Escenario: Ejecutar al Recluso no gana la partida
    Cuando el Recluso es ejecutado
    Entonces muere como un jugador bueno cualquiera

## Feature: Santo (Forastero) — TB
  «Si te ejecutan, tu equipo pierde.»

  @auto
  Escenario: Santo ejecutado
    Dado el Santo sano
    Cuando es ejecutado
    Entonces ganan los malvados de inmediato

  @auto
  Escenario: Santo envenenado ejecutado
    Dado el Santo envenenado
    Cuando es ejecutado
    Entonces muere sin que su equipo pierda

  @auto
  Escenario: Santo muerto de noche
    Cuando el Demonio mata al Santo
    Entonces no pasa nada especial

  @panel
  Escenario: Aviso antes de la ejecución
    Dado el Santo nominado
    Entonces el panel del narrador avisa «⚠ Es el Santo: si muere ejecutado, ganan los malos»

## Feature: Envenenador (Esbirro) — TB
  «Cada noche elige un jugador: queda envenenado esta noche y el día siguiente.»
  Panel: cada noche — 1 objetivo (puede ser él mismo).

  @auto
  Escenario: El veneno anula la habilidad
    Dado el Envenenador envenenando a la Empática
    Entonces la Empática recibe información falsa esta noche y el día siguiente

  @auto
  Escenario: El veneno se traslada cada noche
    Cuando el Envenenador envenena a otro
    Entonces el anterior deja de estar envenenado

  @auto
  Escenario: Actúa el primero
    Entonces la página lo pone al principio de la cola nocturna

  @auto
  Escenario: El Envenenador muere
    Cuando muere
    Entonces su veneno actual caduca al siguiente anochecer y no envenena más

## Feature: Espía (Esbirro) — TB
  «Cada noche ves el Grimorio. Puedes aparecer como bueno y como un personaje de Aldeano o Forastero.»
  Panel: interruptor "cómo registra" + acceso al grimorio.

  @auto
  Escenario: Ve el grimorio de noche
    Dado el Espía vivo y sano
    Cuando es de noche
    Entonces ve todos los personajes reales en su ruleta

  @panel
  Escenario: El narrador decide cómo registra
    Entonces puede fijar que aparezca como bueno y con qué personaje bueno

  @auto
  Escenario: Espía envenenado
    Dado el Espía envenenado
    Entonces la página le muestra un grimorio falso o nada, a criterio del narrador

## Feature: Dama Escarlata (Esbirro) — TB
  «Si hay 5 o más vivos y el Demonio muere, te conviertes en ese Demonio.»
  Ver la sección "Sucesión — Dama Escarlata".

  @auto
  Escenario: Hereda con 5 o más vivos
    Dado 5 vivos y la Dama sana
    Cuando el Demonio muere
    Entonces se convierte en ese mismo personaje de Demonio y la partida sigue

  @auto
  Escenario: No hereda con menos de 5 vivos
    Dado 4 vivos
    Cuando el Demonio muere
    Entonces la Dama sigue siendo Esbirro

  @panel
  Escenario: Aviso al narrador
    Cuando la Dama hereda
    Entonces el panel avisa «Nueva Demonio: <nombre> — despiértala esta noche»

## Feature: Barón (Esbirro) — TB
  «Hay 2 Forasteros extra en juego.»

  @auto
  Escenario: Ajuste de reparto
    Dado el Barón elegido en el montaje
    Entonces la página añade 2 Forasteros y quita 2 Aldeanos
    Y muestra el reparto corregido en el asistente de montaje

## Feature: Diablillo (Demonio) — TB
  «Cada noche* elige un jugador: muere. Si te eliges a ti, un Esbirro se convierte en Diablillo.»
  Panel: cada noche* — 1 objetivo, él mismo incluido.

  @auto
  Escenario: Ataque normal
    Cuando el Diablillo elige a un jugador sin protección
    Entonces ese jugador muere

  @panel
  Escenario: Salto de estrella
    Cuando el Diablillo se elige a sí mismo
    Entonces muere
    Y el narrador elige en el panel qué Esbirro vivo se convierte en Diablillo
    Y la partida **continúa**

  @auto
  Escenario: Ataque a un protegido
    Cuando ataca a alguien con ficha "A salvo" o al Soldado
    Entonces no muere nadie

  @auto
  Escenario: No actúa la primera noche
    Entonces no aparece en la cola de la primera noche

---
---

# CAMPAÑA: BAD MOON RISING

## Feature: Abuela (Aldeano) — BMR
  «Empiezas conociendo a un jugador bueno y su personaje. Si el Demonio lo mata, tú también mueres.»
  Panel: primera noche — selector del nieto; ficha permanente sobre él.

  @panel
  Escenario: El narrador marca al nieto
    Dado la primera noche con la Abuela sobria
    Entonces el panel propone un jugador bueno y su personaje, editables
    Y coloca una ficha permanente «Nieto de la Abuela» sobre él

  @auto
  Escenario: Muere el nieto de noche
    Cuando el Demonio mata al nieto
    Entonces la Abuela muere esa misma noche
    Y la página lo avisa al narrador

  @auto
  Escenario: El nieto muere ejecutado
    Cuando el nieto es ejecutado de día
    Entonces la Abuela **no** muere

  @auto
  Escenario: Abuela envenenada
    Dado la Abuela envenenada cuando muere su nieto
    Entonces no muere

## Feature: Marinero (Aldeano) — BMR
  «Cada noche elige un jugador: tú o él estáis borrachos hasta el anochecer. No puedes morir.»
  Panel: cada noche — 1 objetivo + selector de a quién emborracha.

  @panel
  Escenario: El narrador elige quién se emborracha
    Cuando el Marinero elige a un jugador
    Entonces el narrador decide en el panel si se emborracha el Marinero o el elegido

  @auto
  Escenario: El Marinero no puede morir
    Cuando el Demonio ataca al Marinero o es ejecutado
    Entonces no muere
    Y el panel avisa al narrador antes de una muerte manual

  @auto
  Escenario: Marinero envenenado
    Dado el Marinero envenenado
    Entonces puede morir normalmente y no emborracha a nadie

## Feature: Sirvienta (Aldeano) — BMR
  «Cada noche elige 2 jugadores: descubres cuántos despertaron esta noche por su habilidad.»
  Panel: cada noche — 2 objetivos + número calculado y editable.

  @auto
  Escenario: Cuenta despertares reales
    Dado la Sirvienta eligiendo a dos jugadores
    Entonces la página cuenta cuántos de ellos actuaron esta noche
    Y muestra el número al narrador ya calculado

  @auto
  Escenario: Envenenada
    Dado la Sirvienta envenenada
    Entonces recibe un número falso entre 0 y 2

  @panel
  Escenario: Casos ambiguos
    Dado un jugador que despertó pero sin usar habilidad (Lunático)
    Entonces el narrador ajusta el número a mano

## Feature: Exorcista (Aldeano) — BMR
  «Cada noche* elige un jugador distinto del anterior: si es el Demonio, no despierta esta noche.»
  Panel: cada noche* — 1 objetivo, excluyendo el de anoche.

  @auto
  Escenario: Acierta con el Demonio
    Cuando el Exorcista elige al Demonio
    Entonces el Demonio no despierta ni mata esta noche
    Y el Demonio ve la cara del Exorcista

  @auto
  Escenario: No puede repetir objetivo
    Entonces el selector excluye al jugador elegido la noche anterior

  @auto
  Escenario: Exorcista envenenado
    Dado el Exorcista envenenado eligiendo al Demonio
    Entonces el Demonio actúa con normalidad

## Feature: Posadero (Aldeano) — BMR
  «Cada noche* elige 2 jugadores: no pueden morir esta noche, pero uno está borracho.»
  Panel: cada noche* — 2 objetivos + selector de cuál queda borracho.

  @panel
  Escenario: Proteger a dos y emborrachar a uno
    Cuando el Posadero elige a dos jugadores
    Entonces ambos quedan a salvo esta noche
    Y el narrador elige en el panel cuál de los dos queda borracho

  @auto
  Escenario: El Demonio ataca a un protegido
    Entonces no muere nadie

  @auto
  Escenario: Posadero envenenado
    Entonces ni protege ni emborracha, aunque las fichas se coloquen

## Feature: Tahúr (Aldeano) — BMR
  «Cada noche* elige un jugador y adivina su personaje: si fallas, mueres.»
  Panel: cada noche* — 1 objetivo + selector de personaje adivinado.

  @auto
  Escenario: Acierta
    Cuando el Tahúr adivina bien
    Entonces no pasa nada

  @auto
  Escenario: Falla
    Cuando el Tahúr adivina mal
    Entonces muere esa noche

  @auto
  Escenario: Tahúr envenenado
    Dado el Tahúr envenenado que acierta
    Entonces muere igualmente, porque su habilidad no funciona

## Feature: Cotilla (Aldeano) — BMR
  «Cada día puedes hacer una afirmación pública: si es verdadera, alguien muere esa noche.»
  Panel: botón "La afirmación era verdadera / falsa" al anochecer.

  @panel
  Escenario: El narrador juzga la afirmación
    Dado el Cotilla que hizo una afirmación pública hoy
    Cuando llega la noche
    Entonces el panel pregunta si era verdadera
    Y si el narrador responde que sí, elige quién muere

  @auto
  Escenario: Cotilla envenenado
    Dado el Cotilla envenenado
    Entonces no muere nadie aunque la afirmación sea cierta

## Feature: Cortesano (Aldeano) — BMR
  «Una vez por partida, de noche, elige un personaje: está borracho 3 días y 3 noches.»
  Panel: una vez — selector de personaje (no de jugador).

  @panel
  Escenario: Emborrachar un personaje
    Cuando el Cortesano nombra un personaje
    Entonces si está en juego, ese jugador queda borracho 3 días y 3 noches
    Y la página lleva la cuenta y avisa al narrador cuando caduca

  @auto
  Escenario: El personaje no está en juego
    Entonces no pasa nada y el uso se gasta

  @auto
  Escenario: Cortesano envenenado
    Entonces no emborracha a nadie y el uso se gasta

## Feature: Profesor (Aldeano) — BMR
  «Una vez por partida, de noche*, elige un jugador muerto: si es Aldeano, revive.»
  Panel: una vez — selector de muertos.

  @panel
  Escenario: Revivir a un Aldeano
    Cuando el Profesor elige a un Aldeano muerto
    Entonces vuelve a estar vivo con su habilidad
    Y el uso queda gastado

  @auto
  Escenario: Elige a alguien que no es Aldeano
    Entonces no revive y el uso se gasta

  @auto
  Escenario: Profesor envenenado
    Entonces nadie revive y el uso se gasta

## Feature: Juglar (Aldeano) — BMR
  «Si un Esbirro muere ejecutado, todos menos los Viajeros están borrachos hasta el próximo anochecer.»

  @auto
  Escenario: Esbirro ejecutado
    Cuando un Esbirro muere por ejecución
    Entonces todos los demás quedan borrachos hasta el próximo anochecer
    Y la página coloca las fichas y avisa al narrador

  @auto
  Escenario: Juglar envenenado
    Entonces no pasa nada

## Feature: Dama del Té (Aldeano) — BMR
  «Si tus dos vecinos vivos son buenos, no pueden morir.»

  @auto
  Escenario: Ambos vecinos buenos
    Dado los dos vecinos vivos de la Dama del Té son buenos
    Entonces ninguno de los dos puede morir por ninguna causa
    Y la página los marca con ficha

  @auto
  Escenario: Un vecino malvado
    Entonces la protección no se aplica

  @auto
  Escenario: Dama del Té envenenada
    Entonces sus vecinos mueren normalmente

## Feature: Pacifista (Aldeano) — BMR
  «Los Aldeanos ejecutados pueden no morir.»
  Panel: al ejecutar a un Aldeano, botón "No muere".

  @panel
  Escenario: Salvar a un Aldeano ejecutado
    Dado el Pacifista vivo y sano
    Cuando se ejecuta a un Aldeano
    Entonces el panel ofrece «Pacifista: ¿no muere?»
    Y el narrador decide

  @auto
  Escenario: Pacifista envenenado
    Entonces la opción no aparece y el Aldeano muere

## Feature: Bufón / Fool (Aldeano) — BMR
  «La primera vez que fueras a morir, no mueres.»

  @auto
  Escenario: Primera muerte anulada
    Cuando el Bufón fuera a morir por cualquier causa
    Entonces no muere y el uso se gasta
    Y la página avisa al narrador

  @auto
  Escenario: Segunda muerte
    Entonces muere normalmente

  @auto
  Escenario: Bufón envenenado
    Dado el Bufón envenenado
    Entonces muere a la primera y el uso **no** se gasta

  @panel
  Escenario: Aviso al matarlo a mano
    Entonces el mini-panel avisa «Bufón: primera muerte anulada (se consumirá)»

## Feature: Matón / Goon (Forastero) — BMR
  «El primero que te elija cada noche queda borracho, y tú cambias a su alineación.»

  @auto
  Escenario: Un bueno lo elige
    Cuando un Aldeano elige al Matón
    Entonces ese Aldeano queda borracho
    Y el Matón pasa a ser bueno

  @auto
  Escenario: Un malvado lo elige
    Entonces ese malvado queda borracho y el Matón pasa a ser malvado

  @panel
  Escenario: El narrador ve el cambio de alineación
    Entonces el mini-panel del Matón muestra su alineación actual y quién la cambió

## Feature: Lunático (Forastero) — BMR
  «Crees ser el Demonio, pero no lo eres. El Demonio sabe quién eres y a quién elegiste.»

  @auto
  Escenario: Cree ser el Demonio
    Dado el Lunático en juego
    Entonces ve un personaje de Demonio y recibe faroles como si lo fuera
    Y sus ataques nocturnos **no** matan a nadie

  @panel
  Escenario: El narrador informa al Demonio real
    Entonces el panel muestra al Demonio quién es el Lunático y a quién eligió

  @panel
  Escenario: El narrador ve la verdad
    Entonces el mini-panel muestra «Real: Lunático · Cree ser: Diablillo»

## Feature: Manitas / Tinker (Forastero) — BMR
  «Puedes morir en cualquier momento.»
  Panel: botón "Matar al Manitas" siempre disponible.

  @panel
  Escenario: El narrador lo mata cuando quiere
    Dado el Manitas vivo
    Entonces el mini-panel ofrece matarlo en cualquier fase, de día o de noche
    Y la página recuerda esa opción al narrador de vez en cuando

## Feature: Hijo de la Luna (Forastero) — BMR
  «Cuando sepas que has muerto, elige en público un jugador vivo: si es bueno, muere esta noche.»
  Panel: al morir — selector público.

  @panel
  Escenario: Elige a un bueno
    Dado el Hijo de la Luna que acaba de saber que murió
    Cuando elige en público a un jugador bueno
    Entonces ese jugador muere esta noche
    Y el narrador lo registra en el panel

  @auto
  Escenario: Elige a un malvado
    Entonces no muere nadie

  @auto
  Escenario: Envenenado
    Entonces no muere nadie sea quien sea el elegido

## Feature: Padrino (Esbirro) — BMR
  «Empiezas sabiendo qué Forasteros hay. Si uno muere de día, elige un jugador esta noche: muere. [+1 o −1 Forastero]»
  Panel: primera noche info; cada noche tras muerte de Forastero — 1 objetivo.

  @auto
  Escenario: Información inicial
    Dado la primera noche
    Entonces el Padrino recibe la lista de Forasteros en juego

  @panel
  Escenario: Muere un Forastero de día
    Cuando un Forastero muere durante el día
    Entonces esa noche la página inserta al Padrino en la cola
    Y elige un jugador que muere

  @auto
  Escenario: Padrino envenenado
    Entonces su ataque no mata

## Feature: Abogado del Diablo (Esbirro) — BMR
  «Cada noche elige un jugador vivo distinto del anterior: si es ejecutado mañana, no muere.»
  Panel: cada noche — 1 objetivo, excluyendo el de anoche.

  @auto
  Escenario: El protegido es ejecutado
    Cuando el jugador elegido es ejecutado
    Entonces no muere y el día termina igualmente

  @auto
  Escenario: No repite objetivo
    Entonces el selector excluye al de la noche anterior

  @auto
  Escenario: Envenenado
    Entonces el ejecutado muere normalmente

## Feature: Asesino (Esbirro) — BMR
  «Una vez por partida, de noche*, elige un jugador: muere, aunque no debiera.»
  Panel: una vez — 1 objetivo, ignora protecciones.

  @auto
  Escenario: Mata pese a protecciones
    Cuando el Asesino elige a un Soldado o a alguien protegido
    Entonces muere igualmente

  @auto
  Escenario: Asesino envenenado
    Entonces nadie muere y el uso se gasta

  @panel
  Escenario: El panel avisa de que ignora protecciones
    Entonces muestra «Este ataque ignora Monje, Soldado y Posadero»

## Feature: Mente Maestra (Esbirro) — BMR
  «Si el Demonio muere por ejecución, la partida sigue un día más. Si ese día se ejecuta a alguien, su equipo pierde.»
  Ver la sección "Sucesión — Mente Maestra".

  @auto
  Escenario: Aplaza el final
    Cuando el Demonio muere sin otro sucesor
    Entonces la página no anuncia nada y abre el día extra

  @auto
  Escenario: Mente Maestra envenenada
    Dado la Mente Maestra envenenada cuando muere el Demonio
    Entonces la partida termina normalmente

## Feature: Zombuul (Demonio) — BMR
  «Cada noche*, si nadie murió hoy, elige un jugador: muere. La primera vez que mueras, sigues vivo pero pareces muerto.»
  Panel: cada noche* condicionada + control de las dos muertes.

  @auto
  Escenario: Solo ataca si nadie murió hoy
    Dado que hoy hubo una ejecución
    Entonces el Zombuul no despierta esta noche

  @auto
  Escenario: Primera muerte fingida
    Cuando el Zombuul muere por primera vez
    Entonces aparece muerto para todos
    Y la página sigue contándolo como Demonio vivo
    Y avisa al narrador de que hay que seguir despertándolo

  @panel
  Escenario: Segunda muerte real
    Cuando el narrador vuelve a matarlo
    Entonces muere de verdad y se aplica la cadena de sucesión

## Feature: Pukka (Demonio) — BMR
  «Cada noche elige un jugador: queda envenenado. El envenenado anterior muere.»
  Panel: cada noche — 1 objetivo; la página encadena veneno y muerte.

  @auto
  Escenario: Encadenado de veneno y muerte
    Dado el Pukka que envenenó a Ana anoche
    Cuando esta noche envenena a Bea
    Entonces Ana muere y Bea queda envenenada

  @auto
  Escenario: Primera noche
    Entonces solo envenena, sin muertes

  @auto
  Escenario: Pukka envenenado
    Entonces ni envenena ni mata

## Feature: Shabaloth (Demonio) — BMR
  «Cada noche* elige 2 jugadores: mueren. Un jugador que mataste ayer puede revivir.»
  Panel: cada noche* — 2 objetivos + selector de resurrección.

  @auto
  Escenario: Mata a dos
    Cuando elige a dos jugadores sin protección
    Entonces ambos mueren

  @panel
  Escenario: Revivir a una víctima de anoche
    Entonces el narrador puede elegir revivir a uno de los muertos de la noche anterior

## Feature: Po (Demonio) — BMR
  «Cada noche* elige un jugador: muere. O no elijas a nadie y la próxima noche mata a 3.»
  Panel: cada noche* — 1 objetivo o botón "No atacar".

  @panel
  Escenario: Carga el ataque
    Cuando el Po no elige a nadie
    Entonces la página marca «Po cargado» y avisa al narrador
    Y la noche siguiente el panel pide 3 objetivos

  @auto
  Escenario: Ataque triple
    Cuando el Po cargado elige a tres jugadores
    Entonces los tres mueren y la carga se gasta

---
---

# CAMPAÑA: SECTS & VIOLETS

## Feature: Relojero (Aldeano) — S&V
  «Empiezas sabiendo cuántos asientos hay entre el Demonio y su Esbirro más cercano.»

  @auto
  Escenario: Distancia calculada
    Dado la primera noche y el Relojero sobrio
    Entonces la página calcula la distancia mínima en asientos y la muestra ya resuelta al narrador

  @auto
  Escenario: Envenenado
    Entonces recibe un número falso pero posible

## Feature: Soñador (Aldeano) — S&V
  «Cada noche elige un jugador: recibes un personaje bueno y uno malvado, uno de ellos es el suyo.»
  Panel: cada noche — 1 objetivo + los dos personajes propuestos, editables.

  @auto
  Escenario: Par correcto
    Dado el Soñador sobrio eligiendo a un jugador bueno
    Entonces recibe su personaje real más un personaje malvado señuelo

  @auto
  Escenario: Envenenado
    Entonces ninguno de los dos personajes tiene por qué ser el suyo

## Feature: Encantador de Serpientes (Aldeano) — S&V
  «Cada noche elige un jugador: si es el Demonio, intercambiáis personaje y alineación, y él queda envenenado.»
  Panel: cada noche — 1 objetivo; la página avisa si acierta.

  @auto
  Escenario: Acierta con el Demonio
    Cuando elige al Demonio
    Entonces intercambian personaje y alineación
    Y el nuevo Aldeano queda envenenado
    Y la página avisa al narrador de quién es ahora el Demonio

  @auto
  Escenario: Falla
    Entonces no pasa nada

  @auto
  Escenario: Envenenado
    Entonces no hay intercambio aunque acierte

## Feature: Matemático (Aldeano) — S&V
  «Cada noche descubres cuántos jugadores tuvieron su habilidad alterada hoy.»

  @auto
  Escenario: Cuenta habilidades alteradas
    Entonces la página cuenta cuántos jugadores no funcionaron por veneno, borrachera o anulación
    Y muestra el número calculado al narrador

  @auto
  Escenario: Envenenado
    Entonces recibe un número falso

## Feature: Niña de las Flores (Aldeano) — S&V
  «Cada noche* descubres si el Demonio votó hoy.»

  @auto
  Escenario: El Demonio votó
    Cuando el Demonio votó en alguna nominación de hoy
    Entonces la Niña recibe "sí"

  @auto
  Escenario: Envenenada
    Entonces recibe una respuesta que puede ser falsa

## Feature: Pregonero (Aldeano) — S&V
  «Cada noche* descubres si un Esbirro nominó hoy.»

  @auto
  Escenario: Un Esbirro nominó
    Entonces el Pregonero recibe "sí"

  @auto
  Escenario: Envenenado
    Entonces la respuesta puede ser falsa

## Feature: Oráculo (Aldeano) — S&V
  «Cada noche* descubres cuántos jugadores muertos son malvados.»

  @auto
  Escenario: Cuenta muertos malvados
    Entonces la página calcula el número y lo muestra al narrador

  @auto
  Escenario: Envenenado
    Entonces recibe un número falso

## Feature: Erudito (Aldeano) — S&V
  «Cada día puedes visitar al Narrador: te da dos afirmaciones, una verdadera y otra falsa.»
  Panel: `@privado` — dos campos de texto libres.

  @panel @privado
  Escenario: El narrador redacta las dos afirmaciones
    Dado el Erudito que se acerca al narrador de día
    Cuando el narrador abre su pestaña "Habilidad"
    Entonces escribe dos frases y marca cuál es la verdadera
    Y la página se las envía en privado, sin decirle cuál es cuál

  @panel
  Escenario: Erudito envenenado
    Entonces el panel avisa al narrador de que puede escribir dos frases falsas

## Feature: Costurera (Aldeano) — S&V
  «Una vez por partida, de noche, elige 2 jugadores: descubres si son de la misma alineación.»
  Panel: una vez — 2 objetivos + respuesta sí/no forzable.

  @auto
  Escenario: Misma alineación
    Cuando elige a dos buenos o a dos malvados
    Entonces recibe "sí"

  @auto
  Escenario: Envenenada
    Entonces la respuesta puede ser falsa y el uso se gasta

## Feature: Filósofo (Aldeano) — S&V
  «Una vez por partida, de noche, nombra un personaje bueno: ganas su habilidad. Si está en juego, ese jugador queda borracho.»
  Panel: una vez — selector de personaje bueno.

  @panel
  Escenario: Roba una habilidad
    Cuando el Filósofo nombra un personaje bueno
    Entonces adquiere esa habilidad desde ahora
    Y si ese personaje está en juego, su portador queda borracho el resto de la partida
    Y el narrador ve en el panel ambas fichas colocadas

  @panel
  Escenario: El Filósofo entra en la cola con su nueva habilidad
    Dado el Filósofo que robó al Monje
    Entonces desde esa noche aparece en la cola en la posición del Monje

  @auto
  Escenario: Filósofo envenenado
    Entonces no gana ninguna habilidad y el uso se gasta

## Feature: Artista (Aldeano) — S&V
  «Una vez por partida, de día, pregunta en privado al Narrador cualquier cosa de sí o no.»
  Panel: `@privado` — campo de pregunta + botones SÍ / NO / NO LO SÉ.

  @panel @privado
  Escenario: El narrador responde en privado
    Dado el Artista que hace su pregunta
    Entonces el narrador la registra en el panel y responde sí, no, o "no lo sé"
    Y solo el Artista recibe la respuesta
    Y el uso queda gastado

  @panel
  Escenario: Artista envenenado
    Entonces el panel avisa de que la respuesta debería ser falsa

## Feature: Malabarista (Aldeano) — S&V
  «Tu primer día puedes decir en público hasta 5 conjeturas de jugador y personaje. Esa noche sabes cuántas acertaste.»
  Panel: registro de las conjeturas + número calculado.

  @panel
  Escenario: Registrar las conjeturas
    Dado el Malabarista haciendo sus conjeturas en público
    Entonces el narrador las anota en el panel como pares jugador–personaje

  @auto
  Escenario: Recuento nocturno
    Cuando llega la noche
    Entonces la página cuenta los aciertos y muestra el número al narrador

  @auto
  Escenario: Envenenado
    Entonces recibe un número falso

## Feature: Sabio (Aldeano) — S&V
  «Si el Demonio te mata, descubres 2 jugadores y uno de ellos es el Demonio.»
  Panel: al morir por el Demonio — 2 nombres, editables.

  @auto
  Escenario: Muere por el Demonio
    Cuando el Demonio mata al Sabio
    Entonces recibe dos nombres y uno es el Demonio real

  @auto
  Escenario: Muere por otra causa
    Entonces no recibe nada

  @auto
  Escenario: Envenenado
    Entonces los dos nombres pueden ser falsos

## Feature: Mutante (Forastero) — S&V
  «Si hablas de que eres un Forastero, puedes ser ejecutado.»
  Panel: botón "Ejecutar al Mutante" siempre disponible.

  @panel
  Escenario: El Mutante habla de más
    Dado el Mutante que ha dicho en público que es Forastero
    Entonces el narrador puede ejecutarlo desde el mini-panel en cualquier momento
    Y la página lo registra como ejecución del día

## Feature: Encanto / Sweetheart (Forastero) — S&V
  «Cuando mueres, un jugador queda borracho el resto de la partida.»
  Panel: al morir — selector de quién queda borracho.

  @panel
  Escenario: Elegir al borracho permanente
    Cuando el Encanto muere por cualquier causa
    Entonces el panel pide al narrador elegir un jugador
    Y ese jugador queda borracho de forma permanente

## Feature: Barbero (Forastero) — S&V
  «Si mueres hoy o esta noche, el Demonio puede intercambiar los personajes de 2 jugadores.»
  Panel: se activa en cuanto el Barbero muere; el paso se inserta en la cola nocturna.

  @auto
  Escenario: La muerte del Barbero abre el paso nocturno
    Cuando el Barbero muere de día o de noche
    Entonces la página coloca la ficha «Corte de pelo esta noche»
    Y inserta un paso del Demonio en la cola de esa noche
    Y avisa al narrador de que no cierre la noche sin resolverlo

  @panel
  Escenario: El Demonio intercambia dos personajes
    Dado el paso del Barbero abierto
    Cuando el narrador abre el panel y elige a dos jugadores
    Entonces esos dos intercambian personaje
    Y **cada uno conserva su alineación original**
    Y cada uno recibe el aviso «Tu personaje ha cambiado: ahora eres X»
    Y la ficha «Corte de pelo» desaparece

  @panel
  Escenario: El Demonio declina
    Cuando el narrador pulsa "El Demonio declina"
    Entonces no hay intercambio y la ficha desaparece

  @panel
  Escenario: El Demonio se intercambia a sí mismo
    Cuando el intercambio incluye al propio Demonio
    Entonces el otro jugador pasa a ser el Demonio y el antiguo Demonio pasa a su personaje
    Y la página aplica la cadena de sucesión sin terminar la partida
    Y avisa al narrador de quién es ahora el Demonio

  @panel
  Escenario: Intercambio con un jugador muerto
    Dado el Barbero muerto y un Encantador de Serpientes vivo
    Cuando el Demonio los intercambia
    Entonces queda un Barbero vivo y un Encantador de Serpientes muerto

  @panel
  Escenario: El Demonio está muerto cuando muere el Barbero
    Dado que ya no hay Demonio vivo que pueda elegir
    Entonces el panel sigue disponible **para el narrador**
    Y el narrador elige el intercambio en nombre del Demonio, o declina

  @auto
  Escenario: Se transformó en Barbero después de morir
    Dado un jugador que murió y **luego** pasó a ser el Barbero
    Entonces no hay intercambio esa noche

  @auto
  Escenario: Barbero envenenado al morir
    Entonces no se abre ningún paso de intercambio

## Feature: Torpe / Klutz (Forastero) — S&V
  «Cuando sepas que has muerto, elige en público un jugador vivo: si es malvado, tu equipo pierde.»
  Panel: al morir — selector público.

  @panel
  Escenario: El Torpe elige a un malvado
    Dado el Torpe que acaba de saber que murió
    Cuando elige en público a un jugador malvado
    Entonces **el equipo del Torpe pierde** la partida de inmediato

  @panel
  Escenario: El Torpe elige a un bueno
    Entonces no pasa nada y la partida continúa

  @auto
  Escenario: Torpe envenenado
    Dado el Torpe envenenado eligiendo a un malvado
    Entonces su equipo **no** pierde

  @panel
  Escenario: El narrador espera la elección
    Dado el Torpe muerto sin haber elegido
    Entonces el aviso sigue pendiente en el panel hasta que el narrador lo resuelva

## Feature: Gemela Malvada (Esbirro) — S&V
  «Tú y un jugador contrario sabéis quién es el otro. Si el bueno es ejecutado, ganan los malvados.»
  Panel: primera noche — emparejamiento.

  @auto
  Escenario: Se conocen la primera noche
    Entonces ambos gemelos reciben el nombre del otro y su personaje

  @auto
  Escenario: El gemelo bueno es ejecutado
    Cuando el gemelo bueno muere por ejecución
    Entonces ganan los malvados

  @panel
  Escenario: Aviso al nominar al gemelo bueno
    Entonces el panel avisa «⚠ Gemelo bueno: si lo ejecutan, ganan los malos»

## Feature: Bruja (Esbirro) — S&V
  «Cada noche elige un jugador: si nomina mañana, muere. Con 3 o menos vivos pierdes tu habilidad.»
  Panel: cada noche — 1 objetivo; ficha de maldición.

  @auto
  Escenario: El maldito nomina
    Cuando el jugador maldito nomina a alguien
    Entonces muere al instante y la maldición se gasta

  @auto
  Escenario: Con 3 o menos vivos
    Dado 3 jugadores vivos
    Entonces la maldición no mata a nadie

  @auto
  Escenario: Bruja envenenada
    Entonces el maldito nomina sin morir

## Feature: Descerebrado / Cerenovus (Esbirro) — S&V
  «Cada noche elige un jugador y un personaje: está loco de ser ese personaje mañana o puede ser ejecutado.»
  Panel: cada noche — 1 objetivo + selector de personaje.

  @panel
  Escenario: Volver loco a un jugador
    Cuando el Descerebrado elige jugador y personaje
    Entonces ese jugador recibe «Mañana debes afirmar que eres X»
    Y la página usa el modo "solo rol creído" para mostrárselo

  @panel
  Escenario: El loco no cumple
    Dado un jugador que no actuó como el personaje impuesto
    Entonces el narrador puede ejecutarlo desde el mini-panel

  @auto
  Escenario: Envenenado
    Entonces el jugador no recibe ninguna locura

## Feature: Brujo del Caldero / Pit-Hag (Esbirro) — S&V
  «Cada noche elige un jugador y un personaje: se convierte en ese personaje. Si creas un Demonio, esa noche muere alguien.»
  Panel: cada noche — 1 objetivo + selector de cualquier personaje.

  @panel
  Escenario: Cambiar el personaje de un jugador
    Cuando el Brujo elige jugador y personaje
    Entonces ese jugador pasa a ser ese personaje
    Y la página usa el cambio de rol en vivo, avisando al afectado

  @panel
  Escenario: Crear un Demonio
    Cuando el personaje elegido es un Demonio
    Entonces se crea ese Demonio
    Y la página elige al azar un jugador que muere esa noche
    Y avisa al narrador de que ahora hay más de un Demonio

  @auto
  Escenario: El personaje ya está en juego
    Entonces no pasa nada

  @auto
  Escenario: Envenenado
    Entonces nadie cambia de personaje

## Feature: Fang Gu (Demonio) — S&V
  «Cada noche* elige un jugador: muere. El primer Forastero elegido se convierte en Fang Gu y tú mueres. [+1 Forastero]»
  Panel: cada noche* — 1 objetivo + control de la conversión.

  @panel
  Escenario: Ataca al primer Forastero
    Cuando el Fang Gu ataca a un Forastero por primera vez
    Entonces ese Forastero se convierte en Fang Gu malvado
    Y el Fang Gu original muere
    Y **la partida continúa** con el nuevo Demonio

  @auto
  Escenario: Segundo Forastero atacado
    Entonces muere normalmente, sin conversión

  @auto
  Escenario: Fang Gu envenenado
    Entonces no hay conversión ni muerte

## Feature: No Dashii (Demonio) — S&V
  «Cada noche* elige un jugador: muere. Tus dos Aldeanos vecinos vivos están envenenados.»
  Panel: cada noche* — 1 objetivo; el veneno de vecinos se recalcula solo.

  @auto
  Escenario: Vecinos envenenados de forma continua
    Entonces los dos Aldeanos vivos más cercanos al No Dashii están siempre envenenados
    Y la página recoloca las fichas cuando alguien muere

  @auto
  Escenario: El veneno de vecinos se mueve
    Cuando muere un vecino envenenado
    Entonces el siguiente Aldeano vivo pasa a estar envenenado

## Feature: Vortox (Demonio) — S&V
  «Cada noche* elige un jugador: muere. Toda la información de los Aldeanos es falsa. Si nadie muere ejecutado, ganan los malvados.»

  @auto
  Escenario: Toda la información es falsa
    Dado el Vortox vivo y sano
    Entonces todos los Aldeanos reciben información falsa, aunque estén sanos
    Y el panel del narrador lo indica en cada paso

  @auto
  Escenario: Día sin ejecución
    Cuando termina un día sin que nadie muera ejecutado
    Entonces ganan los malvados

## Feature: Vigormortis (Demonio) — S&V
  «Cada noche* elige un jugador: muere. Los Esbirros que mates conservan su habilidad y envenenan a un Aldeano vecino. [−1 Forastero]»
  Panel: cada noche* — 1 objetivo + control de Esbirros conservados.

  @auto
  Escenario: Mata a un Esbirro
    Cuando el Vigormortis mata a un Esbirro
    Entonces ese Esbirro muerto conserva su habilidad
    Y la página lo mantiene en la cola nocturna
    Y envenena a un Aldeano vecino suyo

  @panel
  Escenario: El narrador ve qué muertos siguen activos
    Entonces el mini-panel de esos Esbirros muestra la ficha «Habilidad conservada por Vigormortis»

  @auto
  Escenario: Muere el Vigormortis
    Entonces se aplica la cadena de sucesión
    Y el narrador decide si los Esbirros conservados pierden su habilidad

---
---

# CAMPAÑA: THE CAROUSEL

## Feature: Acróbata (Aldeano) — Carousel
  «Cada noche* elige un jugador: si está o se vuelve borracho o envenenado esta noche, mueres.»
  Panel: cada noche* — 1 objetivo; la página comprueba el estado al cerrar la noche.

  @auto
  Escenario: El elegido está afectado
    Cuando el Acróbata elige a alguien borracho o envenenado
    Entonces el Acróbata muere esa noche

  @auto
  Escenario: El elegido se vuelve afectado después
    Cuando el elegido queda envenenado más tarde esa misma noche
    Entonces el Acróbata muere igualmente

  @auto
  Escenario: Acróbata envenenado
    Entonces no muere aunque acierte

## Feature: Alquimista (Aldeano) — Carousel
  «Tienes una habilidad de Esbirro. Cuando la uses, el Narrador puede pedirte que elijas diferente.»
  Panel: primera noche — el narrador asigna qué habilidad de Esbirro tiene; después, panel de esa habilidad.

  @panel
  Escenario: Asignar la habilidad de Esbirro
    Dado el Alquimista en el montaje
    Entonces el narrador elige qué habilidad de Esbirro recibe
    Y el jugador la ve como suya

  @panel
  Escenario: El narrador le obliga a elegir distinto
    Cuando el Alquimista usa su habilidad sobre un objetivo
    Entonces el narrador puede pulsar "Elige diferente"
    Y el jugador recibe el aviso y vuelve a elegir

  @auto
  Escenario: Sigue siendo bueno
    Entonces el Alquimista cuenta como bueno para toda la información

## Feature: Amnésico (Aldeano) — Carousel
  «No sabes cuál es tu habilidad. Cada día adivinas en privado cuál es y aprendes cuánto te acercas.»
  Panel: `@privado` — el narrador define la habilidad secreta y responde con "frío/tibio/caliente".

  @panel
  Escenario: El narrador define la habilidad secreta
    Dado el Amnésico en el montaje
    Entonces el narrador escribe en el panel qué habilidad tiene realmente

  @panel @privado
  Escenario: Adivinar cada día
    Cuando el Amnésico se acerca al narrador con su conjetura
    Entonces el narrador responde con un grado de acierto desde el panel
    Y solo el Amnésico lo recibe

  @panel
  Escenario: El narrador ejecuta la habilidad por él
    Dado que el Amnésico ha acertado su habilidad
    Entonces el narrador la aplica desde el panel cada noche

## Feature: Ateo (Aldeano) — Carousel
  «Todos los jugadores son buenos. Los buenos ganan si el Narrador es ejecutado.»

  @auto
  Escenario: La página nunca termina la partida sola
    Dado el Ateo en juego
    Entonces ninguna condición automática de victoria se dispara

  @panel
  Escenario: El narrador es ejecutado
    Cuando una nominación contra el narrador alcanza el umbral
    Entonces ganan los buenos y la página lo anuncia

  @panel
  Escenario: El narrador ejecutado sin Ateo
    Dado que no hay Ateo en juego
    Cuando el narrador es ejecutado
    Entonces no gana nadie y el día se da por gastado

## Feature: Aeronauta (Aldeano) — Carousel
  «Cada noche aprendes un jugador de un tipo distinto al de anoche.»
  Panel: cada noche — nombre propuesto + tipo, editables.

  @auto
  Escenario: Rotación de tipos
    Dado que anoche recibió un Aldeano
    Entonces esta noche recibe un Forastero, Esbirro o Demonio
    Y la página propone al narrador un nombre válido

  @auto
  Escenario: Envenenado
    Entonces el nombre y el tipo pueden ser falsos

## Feature: Banshee (Aldeano) — Carousel
  «Si el Demonio te mata, todos lo saben y a partir de entonces puedes nominar dos veces al día.»

  @auto
  Escenario: Muere por el Demonio
    Cuando el Demonio mata a la Banshee
    Entonces la página lo anuncia públicamente a todos
    Y la Banshee pasa a poder nominar dos veces por día

  @auto
  Escenario: Muere por otra causa
    Entonces no se anuncia nada

## Feature: Cazarrecompensas (Aldeano) — Carousel
  «Empiezas sabiendo 1 jugador malvado. Si muere, aprendes otro esa noche.»
  Panel: primera noche + cada muerte del marcado.

  @auto
  Escenario: Primer malvado conocido
    Entonces recibe el nombre de un jugador malvado

  @auto
  Escenario: Ese jugador muere
    Cuando el marcado muere
    Entonces esa noche recibe otro nombre malvado

  @panel
  Escenario: El narrador puede señalar a un bueno que registra como malvado
    Entonces el panel permite elegir al Recluso u otro señuelo

## Feature: Caníbal (Aldeano) — Carousel
  «Tienes la habilidad del último ejecutado. Si era malvado, quedas envenenado.»
  Panel: tras cada ejecución — la página asigna la habilidad heredada.

  @auto
  Escenario: Hereda de un bueno
    Cuando se ejecuta a un Aldeano
    Entonces el Caníbal adquiere su habilidad desde esa noche
    Y entra en la cola en la posición de ese personaje

  @auto
  Escenario: Hereda de un malvado
    Cuando se ejecuta a un malvado
    Entonces el Caníbal queda envenenado y su habilidad heredada no funciona

  @panel
  Escenario: El narrador ve la habilidad actual del Caníbal
    Entonces el mini-panel muestra «Habilidad actual: X (heredada de Y)»

## Feature: Niño Coro (Aldeano) — Carousel
  «Si el Demonio mata al Rey, aprendes quién es el Demonio.»

  @auto
  Escenario: Muere el Rey por el Demonio
    Entonces el Niño Coro recibe el nombre exacto del Demonio esa noche

  @auto
  Escenario: El Rey muere por otra causa
    Entonces no recibe nada

  @auto
  Escenario: Envenenado
    Entonces recibe un nombre falso

## Feature: Líder Cultista (Aldeano) — Carousel
  «Cada noche tomas la alineación de un vecino vivo. Si todos los buenos se unen a tu culto, tu equipo gana.»

  @auto
  Escenario: Cambio de alineación por vecindad
    Cuando llega la noche
    Entonces la página cambia la alineación del Líder a la de un vecino vivo
    Y avisa al narrador del cambio

  @panel
  Escenario: Victoria del culto
    Dado que todos los buenos vivos son del culto
    Entonces el panel ofrece declarar la victoria de su equipo

## Feature: Ingeniero (Aldeano) — Carousel
  «Una vez por partida, de noche, elige qué Esbirros o qué Demonio están en juego.»
  Panel: una vez — selector múltiple de Esbirros o selector de Demonio.

  @panel
  Escenario: Elegir los Esbirros
    Cuando el Ingeniero elige los Esbirros que quiere en juego
    Entonces el narrador aplica los cambios de rol correspondientes
    Y cada jugador afectado recibe su nuevo personaje

  @panel
  Escenario: Elegir el Demonio
    Cuando el Ingeniero elige qué Demonio quiere
    Entonces el narrador cambia el personaje del Demonio actual

  @auto
  Escenario: Ingeniero envenenado
    Entonces no cambia nada y el uso se gasta

## Feature: Granjero (Aldeano) — Carousel
  «Cuando mueres de noche, un jugador bueno vivo se convierte en Granjero.»
  Panel: al morir de noche — selector de sucesor.

  @panel
  Escenario: Sucesión del Granjero
    Cuando el Granjero muere de noche
    Entonces el narrador elige un jugador bueno vivo
    Y ese jugador pasa a ser Granjero y recibe el aviso

  @auto
  Escenario: Muere de día
    Entonces no hay sucesión

## Feature: Pescador (Aldeano) — Carousel
  «Una vez por partida, de día, visita al Narrador para recibir un consejo.»
  Panel: `@privado` — campo de texto libre para el consejo.

  @panel @privado
  Escenario: Dar el consejo
    Cuando el Pescador se acerca al narrador
    Entonces el narrador escribe el consejo en el panel y se lo envía en privado
    Y el uso queda gastado

  @panel
  Escenario: Pescador envenenado
    Entonces el panel avisa al narrador de que el consejo debería ser inútil o engañoso

## Feature: General (Aldeano) — Carousel
  «Cada noche aprendes qué alineación cree el Narrador que va ganando.»
  Panel: cada noche — tres botones: Bien / Mal / Empate.

  @panel
  Escenario: El narrador emite su juicio
    Cuando llega el turno del General
    Entonces el narrador pulsa Bien, Mal o Empate
    Y el General recibe esa respuesta

  @panel
  Escenario: General envenenado
    Entonces el panel sugiere al narrador responder lo contrario de lo que cree

## Feature: Sacerdotisa Mayor (Aldeano) — Carousel
  «Cada noche aprende qué jugador cree el Narrador que deberías conocer.»
  Panel: cada noche — selector libre de jugador.

  @panel
  Escenario: El narrador señala a un jugador
    Cuando llega su turno
    Entonces el narrador elige libremente a quién señalar
    Y la Sacerdotisa recibe ese nombre

## Feature: Cazador / Huntsman (Aldeano) — Carousel
  «Una vez por partida, de noche, elige un jugador: la Damisela se convierte en un Aldeano que no está en juego.»
  Panel: una vez — selector de jugador.

  @panel
  Escenario: Acierta con la Damisela
    Cuando el Cazador elige a la Damisela
    Entonces la Damisela pasa a ser un Aldeano que no estaba en juego
    Y recibe el aviso de su nuevo personaje

  @auto
  Escenario: Falla
    Entonces no pasa nada y el uso se gasta

## Feature: Rey (Aldeano) — Carousel
  «Cada noche, si los muertos igualan o superan a los vivos, aprendes un personaje vivo.»

  @auto
  Escenario: Se cumple la condición
    Dado que hay tantos muertos como vivos
    Entonces el Rey recibe el personaje de un jugador vivo

  @auto
  Escenario: No se cumple
    Entonces el Rey no despierta

  @auto
  Escenario: Relación con el Niño Coro
    Cuando el Demonio mata al Rey
    Entonces el Niño Coro aprende quién es el Demonio

## Feature: Caballero (Aldeano) — Carousel
  «Empiezas sabiendo 2 jugadores que no son el Demonio.»

  @auto
  Escenario: Dos nombres seguros
    Entonces recibe 2 nombres, ninguno de ellos el Demonio

  @auto
  Escenario: Envenenado
    Entonces uno de los dos puede ser el Demonio

## Feature: Licántropo (Aldeano) — Carousel
  «Cada noche* elige un jugador: si es bueno, muere y el Demonio no mata esta noche.»
  Panel: cada noche* — 1 objetivo.

  @auto
  Escenario: Ataca a un bueno
    Cuando el Licántropo elige a un jugador bueno
    Entonces ese jugador muere
    Y el Demonio no puede matar esta noche

  @auto
  Escenario: Ataca a un malvado
    Entonces no muere nadie y el Demonio mata normalmente

  @auto
  Escenario: Licántropo envenenado
    Entonces no muere nadie y el Demonio mata normalmente

## Feature: Mago (Aldeano) — Carousel
  «El Demonio cree que eres un Esbirro. Los Esbirros creen que eres un Demonio.»

  @auto
  Escenario: Confusión en la información del Mal
    Dado el Mago en juego la primera noche
    Entonces el Demonio ve al Mago listado entre sus Esbirros
    Y los Esbirros ven señalados como Demonio tanto al Demonio real como al Mago

  @panel
  Escenario: El narrador señala en orden aleatorio
    Entonces el panel recuerda no revelar cuál de los dos es el Mago

  @auto
  Escenario: Se repite si muere el Cultivador de Adormidera
    Dado que el Cultivador muere y el Mal se conoce a mitad de partida
    Entonces la confusión del Mago se aplica también esa noche

## Feature: Guardián Nocturno (Aldeano) — Carousel
  «Una vez por partida, de noche, elige un jugador: aprende que eres el Guardián Nocturno.»
  Panel: una vez — 1 objetivo.

  @auto
  Escenario: Se revela a un jugador
    Cuando el Guardián elige a Ana
    Entonces Ana recibe «X es el Guardián Nocturno»
    Y el uso queda gastado

  @auto
  Escenario: Envenenado
    Entonces Ana no recibe nada y el uso se gasta

## Feature: Noble (Aldeano) — Carousel
  «Empiezas conociendo 3 jugadores, exactamente 1 malvado.»

  @auto
  Escenario: Trío con un malvado
    Entonces recibe 3 nombres: exactamente 1 malvado y 2 buenos

  @auto
  Escenario: Envenenado
    Entonces el trío puede tener 0, 2 o 3 malvados

## Feature: Cultivador de Adormidera (Aldeano) — Carousel
  «Los Esbirros y el Demonio no se conocen. Si mueres, se conocen esa noche.»

  @auto
  Escenario: El Mal no se conoce
    Dado el Cultivador vivo la primera noche
    Entonces la página omite el paso de presentación del equipo malvado

  @auto
  Escenario: Muere el Cultivador
    Cuando el Cultivador muere
    Entonces esa noche los Esbirros y el Demonio se conocen
    Y la página inserta ese paso en la cola y avisa al narrador

  @auto
  Escenario: Con Mago en juego
    Entonces la presentación tardía aplica también la confusión del Mago

## Feature: Predicador (Aldeano) — Carousel
  «Cada noche elige un jugador: si es Esbirro, lo aprendes y pierde su habilidad.»
  Panel: cada noche — 1 objetivo.

  @auto
  Escenario: Acierta con un Esbirro
    Entonces el Predicador lo aprende
    Y ese Esbirro pierde su habilidad de forma permanente

  @auto
  Escenario: Falla
    Entonces no aprende nada

  @auto
  Escenario: Predicador envenenado
    Entonces el Esbirro conserva su habilidad y la información puede ser falsa

## Feature: Rata de Laboratorio / Boffin (Aldeano) — Carousel
  «El Demonio tiene la habilidad de un personaje bueno que no está en juego. Ambos lo saben desde la noche 1.»
  Panel: montaje — selector de qué habilidad buena recibe el Demonio.

  @panel
  Escenario: Asignar la habilidad al Demonio
    Dado el Boffin en el montaje
    Entonces el narrador elige un personaje bueno que no esté en juego
    Y el Demonio recibe esa habilidad además de la suya
    Y tanto el Boffin como el Demonio lo saben desde la noche 1

  @panel
  Escenario: Un nuevo Demonio hereda una habilidad de Boffin
    Cuando la Dama Escarlata o el Barbero crean un Demonio nuevo
    Entonces ese Demonio también tiene una habilidad de Boffin
    Y el narrador puede elegir una habilidad distinta a la anterior

## Feature: Shugenja (Aldeano) — Carousel
  «Empiezas sabiendo si el jugador malvado más cercano está a tu izquierda o a tu derecha.»

  @auto
  Escenario: Dirección calculada
    Entonces la página calcula la dirección y se la muestra ya resuelta al narrador

  @auto
  Escenario: Empate de distancias
    Entonces el narrador elige la dirección a mano

  @auto
  Escenario: Envenenado
    Entonces recibe la dirección contraria

## Feature: Administrador / Steward (Aldeano) — Carousel
  «Empiezas conociendo 1 jugador bueno.»

  @auto
  Escenario: Un nombre bueno
    Entonces recibe el nombre de un jugador realmente bueno

  @auto
  Escenario: Envenenado
    Entonces el nombre puede ser de un malvado

## Feature: Hechicero / Wizard (Aldeano) — Carousel
  «Una vez por partida pide en privado un deseo al Narrador: si se concede, tu deseo puede tener un precio y deja pistas de su naturaleza.»
  Panel: ver la sección completa "SISTEMA DE DESEOS".

  @privado
  Escenario: Pedir el deseo
    Dado el Hechicero vivo que aún no ha deseado
    Cuando pulsa "Pedir un deseo" y escribe el texto
    Entonces solo el narrador lo recibe

  @panel @privado
  Escenario: El narrador lo atiende en su habitación
    Cuando el narrador pulsa "Ir a su habitación"
    Entonces la página lo mueve al canal privado del Hechicero
    Y allí decide conceder o denegar

  @panel
  Escenario: Conceder con catálogo
    Cuando el narrador concede desde el catálogo
    Entonces la página aplica el efecto y propone precio y pista, ambos editables

  @panel
  Escenario: Conceder libre
    Cuando el narrador usa la pestaña "Libre"
    Entonces puede encadenar cualquier efecto del mini-panel sobre cualquier jugador

  @panel
  Escenario: El deseo nunca se hace público solo
    Entonces la página no anuncia nada salvo que el narrador lo ordene

  @auto
  Escenario: Un solo deseo
    Dado un deseo ya concedido o denegado en firme
    Entonces el botón de pedir deseo desaparece

## Feature: Damisela (Forastero) — Carousel
  «Todos los Esbirros saben que hay una Damisela en juego. Si un Esbirro adivina quién eres, tu equipo pierde.»
  Panel: botón "Un Esbirro adivina" con selector de Esbirro y de objetivo.

  @auto
  Escenario: Los Esbirros lo saben
    Entonces cada Esbirro recibe «Hay una Damisela en juego»

  @panel
  Escenario: Un Esbirro acierta
    Cuando el narrador registra que un Esbirro señaló a la Damisela correcta
    Entonces ganan los malvados

  @panel
  Escenario: Un Esbirro falla
    Entonces ese Esbirro no puede volver a intentarlo
    Y la página lo marca con ficha

  @auto
  Escenario: Damisela envenenada
    Entonces el acierto no hace perder a los buenos

## Feature: Gólem (Forastero) — Carousel
  «Solo puedes nominar una vez. Si el nominado no es el Demonio, muere.»

  @auto
  Escenario: Nomina a alguien que no es el Demonio
    Cuando el Gólem nomina
    Entonces ese jugador muere al instante
    Y el Gólem no puede volver a nominar

  @auto
  Escenario: Nomina al Demonio
    Entonces la nominación sigue su curso normal

  @auto
  Escenario: Gólem envenenado
    Entonces nadie muere y el uso se gasta

## Feature: Sombrerero (Forastero) — Carousel
  «Si mueres hoy o esta noche, los Esbirros y el Demonio pueden elegir personajes nuevos.»
  Panel: al morir — un selector de personaje por cada malvado vivo.

  @panel
  Escenario: El Mal se reparte de nuevo
    Cuando el Sombrerero muere
    Entonces esa noche el panel muestra un selector por cada malvado vivo
    Y el narrador aplica los personajes elegidos
    Y cada afectado recibe su nuevo personaje

  @panel
  Escenario: No puede haber dos Demonios iguales
    Entonces el panel avisa si el reparto deja personajes duplicados

  @auto
  Escenario: Sombrerero envenenado
    Entonces no se abre el reparto

## Feature: Hereje (Forastero) — Carousel
  «Quien gana, pierde. Quien pierde, gana, incluso si estás muerto.»

  @auto
  Escenario: Inversión del resultado
    Dado el Hereje en juego, vivo o muerto
    Cuando la partida termina
    Entonces la página invierte el ganador antes de anunciarlo
    Y el motivo de la victoria lo explica

  @auto
  Escenario: Hereje envenenado al terminar
    Entonces el resultado no se invierte

## Feature: Doctor de la Peste (Forastero) — Carousel
  «Cuando mueres, el Narrador gana una habilidad de Esbirro.»
  Panel: al morir — selector de qué habilidad de Esbirro toma el narrador.

  @panel
  Escenario: El narrador toma una habilidad
    Cuando el Doctor muere
    Entonces el panel pide elegir una habilidad de Esbirro
    Y el narrador puede usarla desde su propio panel cada noche

## Feature: Político (Forastero) — Carousel
  «Si fuiste el más responsable de que tu equipo pierda, cambias de alineación y ganas.»
  Panel: al terminar la partida — botón "El Político cambia de bando".

  @panel
  Escenario: El narrador decide que fue el responsable
    Cuando la partida termina y el equipo del Político pierde
    Entonces el panel pregunta si el Político fue el más responsable
    Y si el narrador dice que sí, el Político cambia de alineación y gana

## Feature: Maestro Acertijos / Puzzlemaster (Forastero) — Carousel
  «1 jugador está borracho. Si adivinas quién, aprendes al Demonio.»
  Panel: montaje (marcar al borracho) + día (registrar la conjetura).

  @panel
  Escenario: Marcar al borracho
    Dado el Maestro Acertijos en el montaje
    Entonces el narrador marca qué jugador está borracho por su culpa

  @panel @privado
  Escenario: Conjetura correcta
    Cuando el narrador registra que adivinó bien
    Entonces el Maestro Acertijos recibe el nombre del Demonio

  @panel
  Escenario: Conjetura incorrecta
    Entonces recibe un nombre falso y el intento se gasta

## Feature: Soplón / Snitch (Forastero) — Carousel
  «Cada Esbirro recibe 3 faroles.»

  @auto
  Escenario: Faroles para los Esbirros
    Dado el Soplón en juego
    Entonces cada Esbirro recibe 3 personajes que no están en juego, además del Demonio

  @panel
  Escenario: El narrador ajusta los faroles
    Entonces puede cambiar los tres personajes de cada Esbirro desde el panel

## Feature: Pólvora / Boomdandy (Esbirro) — Carousel
  «Si eres ejecutado, todos menos 3 mueren.»
  Panel: al ser ejecutado — selector de los 3 supervivientes.

  @panel
  Escenario: Explota al ser ejecutado
    Cuando la Pólvora es ejecutada
    Entonces el panel pide elegir a los 3 supervivientes
    Y todos los demás mueren

  @auto
  Escenario: Solo explota por ejecución
    Cuando la Pólvora muere por el Gólem, por el Psicópata o por el Demonio
    Entonces no explota

  @auto
  Escenario: Ejecutada pero no muere
    Dado la Pólvora ejecutada y salvada por el Abogado del Diablo
    Entonces explota igualmente

## Feature: Sembrador de Miedo / Fearmonger (Esbirro) — Carousel
  «Cada noche elige un jugador: si lo nominas y es ejecutado, tu equipo gana.»
  Panel: cada noche — 1 objetivo + aviso público del cambio.

  @auto
  Escenario: Todos saben que hay un objetivo nuevo
    Cuando el Sembrador cambia de objetivo
    Entonces la página anuncia públicamente que el objetivo ha cambiado, sin decir quién

  @panel
  Escenario: El Sembrador nomina a su objetivo y lo ejecutan
    Entonces ganan los malvados

  @auto
  Escenario: Envenenado
    Entonces no pasa nada aunque se cumpla la condición

## Feature: Goblin (Esbirro) — Carousel
  «Si al ser nominado reclamas en público ser el Goblin y te ejecutan, tu equipo gana.»
  Panel: al ser nominado — botón "Reclamó ser el Goblin".

  @panel
  Escenario: Reclama y lo ejecutan
    Dado el Goblin nominado que reclama en público
    Cuando el narrador marca la reclamación y el Goblin es ejecutado
    Entonces ganan los malvados

  @auto
  Escenario: Reclama pero no lo ejecutan
    Entonces no pasa nada

  @auto
  Escenario: Lo ejecutan sin haber reclamado
    Entonces muere normalmente

## Feature: Arpía (Esbirro) — Carousel
  «Cada noche elige 2 jugadores: mañana el primero cree que el segundo es malvado.»
  Panel: cada noche — 2 objetivos ordenados.

  @panel
  Escenario: Imponer la creencia
    Cuando la Arpía elige a Ana y luego a Bea
    Entonces Ana recibe «Bea es malvada» y debe actuar en consecuencia
    Y el narrador puede ejecutar a Ana si no lo hace

  @auto
  Escenario: Envenenada
    Entonces nadie recibe la creencia

## Feature: Marioneta (Esbirro) — Carousel
  «Crees que eres bueno, pero eres un Esbirro. El Demonio sabe quién eres.»

  @auto
  Escenario: Se cree buena
    Entonces la Marioneta ve un personaje bueno y nunca sabe que es Esbirro
    Y el Demonio recibe su nombre

  @auto
  Escenario: Cuenta como malvada para la información
    Cuando la Empática cuenta vecinos malvados
    Entonces la Marioneta cuenta como malvada

  @panel
  Escenario: El narrador ve la verdad
    Entonces el mini-panel muestra «Real: Marioneta · Cree ser: X»

## Feature: Mezefeles (Esbirro) — Carousel
  «Empiezas sabiendo una palabra secreta. El primer jugador bueno que la diga se vuelve malvado.»
  Panel: primera noche (fijar la palabra) + botón "Alguien la dijo".

  @panel
  Escenario: Fijar la palabra
    Dado la primera noche
    Entonces el narrador escribe la palabra secreta en el panel y se la envía al Mezefeles

  @panel
  Escenario: Un bueno dice la palabra
    Cuando el narrador registra quién la dijo
    Entonces ese jugador se vuelve malvado esa noche
    Y recibe el aviso de su cambio de alineación

  @auto
  Escenario: Solo el primero
    Entonces los siguientes que la digan no se ven afectados

## Feature: Organillero (Esbirro) — Carousel
  «Todos cierran los ojos al votar. Cada noche eliges si estás borracho.»
  Panel: cada noche — interruptor "borracho sí/no".

  @auto
  Escenario: Votación a ciegas
    Dado el Organillero vivo y sano
    Entonces durante las votaciones la página oculta a cada jugador quién más ha votado
    Y solo el narrador ve el recuento

  @panel
  Escenario: Elegir estar borracho
    Cuando el Organillero elige emborracharse esta noche
    Entonces su habilidad no funciona y la votación de mañana es normal

## Feature: Psicópata (Esbirro) — Carousel
  «Cada día, antes de las nominaciones, puedes elegir en público un jugador: muere.»
  «Si eres ejecutado, juegas piedra-papel-tijera contra quien te nominó: solo mueres si pierdes.»
  Panel: botón de asesinato diurno + panel de Roshambo tras la ejecución.

  @panel
  Escenario: Asesinato diurno
    Dado el Psicópata vivo, de día, antes de abrir nominaciones
    Cuando anuncia en público a su víctima y el narrador la registra
    Entonces esa víctima muere en público
    Y el Psicópata queda expuesto ante todos

  @auto
  Escenario: Solo una vez al día y solo antes de nominaciones
    Dado que el Psicópata ya mató hoy, o las nominaciones ya están abiertas
    Entonces el botón de asesinato está deshabilitado

  @auto
  Escenario: La víctima no muere
    Dado que la víctima es el Marinero, que no puede morir
    Entonces no muere
    Y el Psicópata **no** recupera el uso de hoy

  @panel
  Escenario: El Psicópata es ejecutado — se abre el Roshambo
    Dado el Psicópata nominado por Ana y ejecutado
    Entonces la página **no** lo mata todavía
    Y abre el panel de piedra-papel-tijera entre el Psicópata y Ana
    Y marca el día como ya gastado: no se puede nominar ni ejecutar a nadie más hoy

  @panel
  Escenario: Ambos eligen a ciegas
    Dado el Roshambo abierto
    Entonces cada uno elige piedra, papel o tijera desde su propia pantalla
    Y ninguno ve la elección del otro hasta que ambos han elegido
    Y el narrador ve las dos elecciones y el resultado

  @auto
  Escenario: El Psicópata pierde
    Cuando el nominador gana la tirada
    Entonces el Psicópata muere

  @auto
  Escenario: Empate
    Cuando ambos eligen lo mismo
    Entonces el Psicópata **vive** y el día termina igualmente

  @auto
  Escenario: El Psicópata gana
    Entonces vive y el día termina igualmente

  @panel
  Escenario: Autonominación
    Dado el Psicópata que se nominó a sí mismo y fue ejecutado
    Entonces el rival del Roshambo es el **narrador**
    Y el narrador tira desde su propio panel

  @panel
  Escenario: El nominador está desconectado
    Dado el nominador sin conexión cuando se abre el Roshambo
    Entonces el narrador puede tirar en su nombre

  @auto
  Escenario: Muerte por otra causa — sin Roshambo
    Cuando el Demonio mata al Psicópata, o el narrador lo mata a mano
    Entonces muere directamente, sin piedra-papel-tijera

  @auto
  Escenario: Varias ejecuciones a lo largo de la partida
    Dado el Psicópata que sobrevivió a un Roshambo
    Cuando lo vuelven a nominar y ejecutar otro día
    Entonces se juega un Roshambo nuevo contra el nominador de ese día

## Feature: Mente Maestra (Esbirro) — Carousel
  Igual que en Bad Moon Rising. Ver "Sucesión — Mente Maestra".

  @auto
  Escenario: Demonio ejecutado con Mente Maestra en Carousel
    Dado el Kazali ejecutado y la Mente Maestra viva y sobria
    Entonces la partida continúa 1 día más sin anuncio de victoria

## Feature: Invocador / Summoner (Esbirro) — Carousel
  «Recibes 3 faroles. En la noche 3 eliges un jugador: se convierte en un Demonio malvado.»
  Panel: noche 3 — 1 objetivo + selector de qué Demonio.

  @auto
  Escenario: La partida empieza sin Demonio
    Dado el Invocador en el montaje
    Entonces la página reparte los personajes sin ningún Demonio
    Y no comprueba la victoria del Bien por falta de Demonios hasta la noche 3

  @panel
  Escenario: Invocación en la noche 3
    Dado el Invocador vivo en la noche 3
    Cuando elige a un jugador
    Entonces el narrador elige en el panel en qué Demonio se convierte
    Y ese jugador recibe su nuevo personaje y su alineación malvada

  @panel
  Escenario: El Invocador muere antes de la noche 3
    Entonces la página avisa al narrador de que debe decidir si alguien invoca igualmente

## Feature: Visir (Esbirro) — Carousel
  «Todos saben que eres el Visir. No puedes morir durante el día. Si nominas, puedes ejecutar sin votación.»
  Panel: botón "Ejecutar sin votación".

  @auto
  Escenario: Todos lo saben
    Entonces la página anuncia públicamente quién es el Visir al empezar

  @auto
  Escenario: No muere de día
    Cuando el Visir es ejecutado o atacado de día
    Entonces no muere

  @panel
  Escenario: Ejecución directa
    Dado el Visir que nomina a alguien
    Cuando el narrador pulsa "Ejecutar sin votación"
    Entonces el nominado muere sin contar votos
    Y el día termina

## Feature: Viuda (Esbirro) — Carousel
  «En tu primera noche mira el Grimorio y elige un jugador: queda envenenado.»
  Panel: primera noche — acceso al grimorio + 1 objetivo + aviso público.

  @auto
  Escenario: Ve el grimorio y envenena
    Dado la primera noche
    Entonces la Viuda ve todos los personajes reales
    Y elige a un jugador que queda envenenado el resto de la partida

  @auto
  Escenario: Aviso a un jugador bueno
    Entonces un jugador bueno al azar recibe «Hay una Viuda en juego»

## Feature: Yaggababble (Esbirro) — Carousel
  «Empiezas sabiendo una frase secreta. Por cada vez que la dijiste hoy, muere un jugador.»
  Panel: al anochecer — contador de repeticiones + selector de víctimas.

  @panel
  Escenario: Fijar la frase
    Dado la primera noche
    Entonces el narrador escribe la frase secreta y se la envía

  @panel
  Escenario: Contar las repeticiones
    Cuando llega la noche
    Entonces el narrador indica cuántas veces la dijo hoy
    Y elige esa cantidad de jugadores que mueren

## Feature: Al-Hadikhia (Demonio) — Carousel
  «Cada noche* elige 3 jugadores: cada uno decide en silencio vivir o morir.»
  Panel: cada noche* — 3 objetivos + una decisión vivir/morir por cada uno.

  @panel
  Escenario: Los tres deciden
    Cuando el Al-Hadikhia elige a tres jugadores
    Entonces el narrador registra la decisión de cada uno
    Y si los tres eligen vivir, los tres mueren

  @panel
  Escenario: Alguno elige morir
    Entonces mueren solo los que eligieron morir

## Feature: Kazali (Demonio) — Carousel
  «Cada noche* elige un jugador: muere. Tú eliges qué jugadores son Esbirros.»
  Panel: montaje (elegir Esbirros) + cada noche* (1 objetivo).

  @panel
  Escenario: El Kazali reparte los Esbirros
    Dado el montaje con Kazali
    Entonces el narrador registra a qué jugadores convierte en Esbirros y en cuáles
    Y cada uno recibe su nuevo personaje

  @auto
  Escenario: Ataque nocturno
    Entonces funciona como un ataque normal de Demonio

  @auto
  Escenario: Muerte del Kazali
    Entonces se aplica la cadena de sucesión completa

## Feature: Legión (Demonio) — Carousel
  «Cada noche* puede morir un jugador. Las ejecuciones fallan si solo votaron malvados.»
  Panel: cada noche* — 1 objetivo o ninguno.

  @auto
  Escenario: Muchos jugadores son Legión
    Dado varios jugadores con el personaje Legión
    Entonces todos ellos son malvados y lo saben

  @auto
  Escenario: Muere un Legión
    Cuando uno de ellos es ejecutado
    Entonces la partida continúa mientras quede otro Legión vivo

  @auto
  Escenario: Ejecución solo con votos malvados
    Cuando todos los que votaron eran malvados
    Entonces la ejecución falla y nadie muere

## Feature: Leviatán (Demonio) — Carousel
  «Si se ejecuta a más de un jugador bueno, ganan los malvados. Después del día 5, ganan los malvados.»

  @auto
  Escenario: Segundo bueno ejecutado
    Cuando se ejecuta al segundo jugador bueno
    Entonces ganan los malvados

  @auto
  Escenario: Se acaba el día 5
    Cuando termina el día 5 sin que los buenos hayan ganado
    Entonces ganan los malvados

  @auto
  Escenario: El Leviatán no mata de noche
    Entonces no aparece en la cola nocturna

## Feature: Pequeña Monsta (Demonio) — Carousel
  «Cada noche los Esbirros eligen quién la cuida: ese jugador es el "Demonio".»
  Panel: cada noche — selector de portador + 1 objetivo de ataque.

  @panel
  Escenario: Elegir portador
    Cuando llega la noche
    Entonces el narrador registra qué Esbirro cuida la ficha
    Y ese Esbirro cuenta como Demonio para toda la información

  @auto
  Escenario: Muere el portador
    Cuando el portador muere
    Entonces la Pequeña Monsta pasa al siguiente Esbirro vivo
    Y solo si no queda ninguno se aplica la cadena de sucesión

## Feature: Sangijuela / Lleech (Demonio) — Carousel
  «Cada noche* elige un jugador: muere. Eliges un anfitrión: está envenenado y si muere, tú mueres.»
  Panel: primera noche (elegir anfitrión) + cada noche* (1 objetivo).

  @panel
  Escenario: Elegir anfitrión
    Dado la primera noche
    Entonces el narrador registra el anfitrión
    Y ese jugador queda envenenado de forma permanente

  @auto
  Escenario: Muere el anfitrión
    Cuando el anfitrión muere
    Entonces la Sangijuela muere también
    Y se aplica la cadena de sucesión

  @auto
  Escenario: La Sangijuela no puede morir mientras viva su anfitrión
    Cuando alguien intenta matarla
    Entonces no muere y el panel lo explica al narrador

## Feature: Ojo (Demonio) — Carousel
  «Cada noche* elige un personaje: ese jugador muere. Si no está en juego, elige el Narrador.»
  Panel: cada noche* — selector de personaje, no de jugador.

  @panel
  Escenario: El personaje está en juego
    Cuando el Ojo nombra un personaje presente
    Entonces ese jugador muere

  @panel
  Escenario: El personaje no está en juego
    Entonces el narrador elige libremente quién muere, o nadie

## Feature: Motín / Riot (Demonio) — Carousel
  «En el día 3 los Esbirros se convierten en Motín y los nominados mueren inmediatamente.»

  @auto
  Escenario: Llega el día 3
    Cuando empieza el día 3
    Entonces todos los Esbirros vivos pasan a ser Motín
    Y la página avisa a cada uno de su nuevo personaje

  @auto
  Escenario: Nominar mata
    Dado el día 3 en curso
    Cuando alguien es nominado
    Entonces muere de inmediato, sin votación
    Y el nominado, antes de morir, puede nominar a su vez

---
---

# VIAJEROS

Los Viajeros entran y salen a mitad de partida. La página siempre pide confirmación al narrador
y **nunca** los cuenta para el reparto de personajes.

## Feature: Entrada y salida de Viajeros (motor)

  @panel
  Escenario: Añadir un Viajero a mitad de partida
    Cuando el narrador añade un Viajero
    Entonces se sienta en la ruleta y elige su alineación desde el panel
    Y todos los jugadores ven públicamente que es un Viajero y qué personaje tiene

  @panel
  Escenario: Expulsar a un Viajero
    Dado una votación de expulsión contra un Viajero
    Cuando alcanza el umbral
    Entonces el Viajero sale de la partida
    Y la página lo retira de la ruleta

  @auto
  Escenario: Los Viajeros no cuentan para el reparto
    Entonces la distribución de Aldeanos, Forasteros, Esbirros y Demonio no cambia al añadirlos

## Feature: Aprendiz (Viajero)
  «En tu primera noche ganas la habilidad de un Aldeano o de un Esbirro.»

  @panel
  Escenario: El narrador le asigna una habilidad
    Dado la primera noche del Aprendiz
    Entonces el narrador elige qué habilidad recibe según su alineación
    Y desde entonces entra en la cola en la posición de ese personaje

## Feature: Barista (Viajero)
  «Cada noche, un jugador está sobrio y sano, o su habilidad funciona dos veces.»
  Panel: cada noche — 1 objetivo + selector del efecto.

  @panel
  Escenario: Elegir el efecto
    Cuando el narrador elige al jugador
    Entonces decide si queda sobrio y sano, o si su habilidad se aplica dos veces
    Y el efecto dura esa noche y el día siguiente

## Feature: Coleccionista de Huesos (Viajero)
  «Una vez por partida, de noche, elige un jugador muerto: recupera su habilidad esta noche.»

  @panel
  Escenario: Devolver una habilidad
    Cuando el Coleccionista elige a un muerto
    Entonces ese muerto actúa esta noche como si estuviera vivo
    Y el uso queda gastado

## Feature: Obispo (Viajero)
  «Solo el Narrador puede nominar, y debe nominar al menos a un jugador de cada alineación cada día.»

  @auto
  Escenario: Solo el narrador nomina
    Dado el Obispo en juego
    Entonces la página bloquea todas las nominaciones que no registre el narrador

  @panel
  Escenario: Aviso de cuota diaria
    Entonces el panel recuerda al narrador que debe nominar a un bueno y a un malvado cada día

## Feature: Carnicero (Viajero)
  «Cada día, después de la primera ejecución, se puede nominar otra vez.»

  @auto
  Escenario: Segunda ronda de nominaciones
    Cuando se resuelve la primera ejecución del día
    Entonces la página vuelve a abrir las nominaciones

## Feature: Desviado (Viajero)
  «Si eres el más divertido, no puedes ser expulsado.»
  Panel: interruptor "protegido de la expulsión".

  @panel
  Escenario: El narrador lo protege
    Cuando el narrador activa el interruptor
    Entonces las votaciones de expulsión contra el Desviado no prosperan

## Feature: Meretriz (Viajero)
  «Cada noche* elige un jugador vivo: aprendes su personaje, pero ambos podéis morir.»
  Panel: cada noche* — 1 objetivo + decisión de muerte.

  @panel
  Escenario: Visitar a un jugador
    Cuando la Meretriz elige a alguien
    Entonces recibe su personaje
    Y el narrador decide en el panel si ambos mueren

## Feature: Juez (Viajero)
  «Una vez por partida, puedes forzar que la nominación actual se resuelva a favor o en contra.»

  @panel
  Escenario: Forzar el resultado
    Dado una nominación en curso
    Cuando el narrador aplica la habilidad del Juez
    Entonces la ejecución se produce o se anula, según lo elegido
    Y el uso queda gastado

## Feature: Institutriz (Viajero)
  «Cada día, hasta 3 jugadores pueden hablar en privado.»
  Panel: selector de hasta 3 jugadores + mover a sala privada.

  @panel @privado
  Escenario: Habilitar una conversación privada
    Cuando el narrador elige hasta 3 jugadores
    Entonces la página los mueve a una sala privada
    Y los devuelve a la plaza cuando el narrador lo indique

## Feature: Voudon (Viajero)
  «Solo tú y los muertos podéis votar. Los muertos no necesitan voto fantasma y sus votos matan.»

  @auto
  Escenario: Solo votan los muertos y el Voudon
    Dado el Voudon en juego
    Entonces la página rechaza los votos de los vivos que no sean el Voudon

  @auto
  Escenario: Los muertos votan sin límite
    Entonces los muertos pueden votar en todas las nominaciones sin gastar voto fantasma

---
---

# ROLES EXTRA (fuera de las campañas base)

Estos 43 personajes de `Mecanicas Personajes.txt` **no pertenecen** a Trouble Brewing, Bad Moon Rising,
Sects & Violets ni The Carousel, pero **ya están implementados**: definidos en `server/campaigns/extras.js`
y `client/src/data/campaigns/extras.js`, registrados en `ALL_ROLES`, con orden de noche en
`campaignImport.js` y mini-panel en `client/src/data/abilityPanels.js`.

Un guion personalizado que los mencione los resuelve solo: ya no caen como "rol desconocido".
Sus habilidades no se automatizan — el narrador las ejecuta desde el mini-panel con las acciones
universales, guiado por el recordatorio de reglas de cada personaje.

## Feature: Alsaahir (Aldeano)
  @extra
  «Cada día, si adivinas públicamente qué jugadores son Esbirros y cuáles Demonios, ganan los buenos.»
  Panel: botón "Adivinó correctamente" que declara la victoria del Bien.

## Feature: Ángel (Fabricado)
  @extra
  «Algo malo puede pasarle a quien sea más responsable de matar a un jugador novato.»
  Panel: marca de "jugador novato" + acciones libres del narrador.

## Feature: Mendigo (Viajero)
  @extra
  «Debes usar una ficha de votación para votar. Si un muerto te da la suya, descubres su alineación. Estás sobrio y sano.»
  Panel: transferencia de voto fantasma entre jugadores.

## Feature: Mandamás / Big Wig (Viajero)
  @extra
  «Cada nominado elige 1 jugador: hasta la votación solo puede hablar el elegido, y está loco de que el nominado es bueno o puede morir.»
  Panel: silenciar a todos salvo uno durante una nominación.

## Feature: Contrabandista / Bootlegger (Fabricado)
  @extra
  «Este guion tiene personajes o reglas caseras.»
  Panel: campo de texto libre de reglas caseras visible para el narrador.

## Feature: Budista (Fabricado)
  @extra
  «En los primeros 2 minutos del día, los jugadores veteranos no pueden hablar.»
  Panel: marca de "veterano" por jugador + temporizador de silencio.

## Feature: Burócrata (Viajero)
  @extra
  «Cada noche elige 1 jugador (no a ti): su voto cuenta como 3 mañana.»
  Panel: multiplicador de voto por jugador.

## Feature: Risistencia / Cacklejack (Fabricado)
  @extra
  «Cada día elige 1 jugador: un jugador diferente cambia de personaje esta noche.»
  Panel: cambio de rol en vivo (ya existe).

## Feature: Deus Ex Fiasco (Fabricado)
  @extra
  «Al menos una vez por partida, el Narrador cometerá un error, lo corregirá y lo admitirá públicamente.»
  Panel: recordatorio persistente al narrador + anuncio público.

## Feature: Djinn (Fabricado)
  @extra
  «Utiliza una regla especial.»
  Panel: campo de texto libre con la regla, visible para todos.

## Feature: Agorero / Doomsayer (Viajero)
  @extra
  «Con 4 o más vivos, cada jugador vivo puede una vez por partida declarar en público que muera 1 jugador de su alineación.»
  Panel: un uso por jugador + selector restringido a su alineación.

## Feature: Duquesa (Viajero)
  @extra
  «Cada día 3 jugadores pueden visitar al Narrador. De noche* cada visitante sabe cuántos son malvados, pero 1 recibe información falsa.»
  Panel: registro de visitantes + un número por visitante, uno marcado como falso.

## Feature: Barquero / Ferryman (Fabricado)
  @extra
  «En el último día, todos los jugadores muertos recuperan su voto.»
  Panel: botón "Devolver voto fantasma a todos".

## Feature: Fibbin (Fabricado)
  @extra
  «Una vez por partida, 1 jugador bueno puede recibir información incorrecta.»
  Panel: interruptor "falsificar esta información" en cualquier paso nocturno.

## Feature: Violinista / Fiddler (Demonio)
  @extra
  «Una vez por partida, el Demonio elige en secreto 1 jugador del bando contrario: todos deciden cuál de los 2 gana.»
  Panel: votación especial de dos candidatos que decide la partida.

## Feature: Gánster (Viajero)
  @extra
  «Una vez por día puedes matar a uno de tus vecinos vivos si el otro vecino vivo lo acepta.»
  Panel: selector limitado a vecinos + confirmación del otro vecino.

## Feature: Jardinero (Fabricado)
  @extra
  «El Narrador puede asignar 1 o más personajes a jugadores concretos.»
  Panel: asignación manual en el montaje (ya existe en el asistente).

## Feature: Gnomo (Esbirro)
  @extra
  «Todos empiezan conociendo a un jugador de tu alineación. Puedes elegir matar a quien le nomine.»
  Panel: anuncio público inicial + botón de muerte al nominar.

## Feature: Dios de Ug (Fabricado)
  @extra
  «Un gorro Ug: quien lo lleva habla de un solo sonido pero vota doble; si falla, lo pierde.»
  Panel: ficha "gorro Ug" transferible + multiplicador de voto.

## Feature: Pistolero / Gunslinger (Viajero)
  @extra
  «Cada día, tras contar la primera votación, puedes elegir 1 jugador que votó: muere.»
  Panel: selector limitado a quienes votaron en esa nominación.

## Feature: Bibliotecario del Infierno (Fabricado)
  @extra
  «Algo malo puede pasarle a quien hable cuando el Narrador pida silencio.»
  Panel: botón "pedir silencio" + acciones libres del narrador.

## Feature: Ermitaño / Hermit (Forastero)
  @extra
  «Tienes todas las habilidades de Forastero. [−0 o −1 Forasteros]»
  Panel: lista de habilidades de Forastero acumuladas en un solo jugador.

## Feature: Hindú (Fabricado)
  @extra
  «Los primeros 4 jugadores que mueran se reencarnan en Viajeros de su misma alineación.»
  Panel: conversión automática a Viajero al morir, con selector de personaje.

## Feature: Truhanes / Knaves (Fabricado)
  @extra
  «Hay 2 Narradores: uno miente y otro dice la verdad. Una vez por partida, en el crepúsculo, pueden intercambiarse.»
  Panel: la app ya admite varios narradores; falta marcar cuál miente y el intercambio.

## Feature: Señor de Typhon (Demonio)
  @extra
  «Cada noche* elige 1 jugador: muere. [Los malvados están en línea, tú en el centro. +1 Esbirro]»
  Panel: validación del orden de asientos en el montaje.

## Feature: Ogro (Forastero)
  @extra
  «En tu primera noche elige 1 jugador (no a ti): tomas su alineación sin saber cuál, incluso borracho o envenenado.»
  Panel: cambio de alineación silencioso (sin avisar al jugador).

## Feature: Duendecillo / Pixie (Aldeano)
  @extra
  «Empiezas conociendo 1 Aldeano en juego. Si estás loco de ser ese personaje, ganas su habilidad cuando muera.»
  Panel: locura impuesta + traspaso de habilidad al morir el original.

## Feature: Papa / Pope (Fabricado)
  @extra
  «Hay personajes buenos duplicados en juego. Pueden ser faroles.»
  Panel: permitir personajes repetidos en el reparto.

## Feature: Princesa (Aldeano)
  @extra
  «En tu primer día, si nominas y ejecutan a ese jugador, el Demonio no mata esta noche.»
  Panel: bloqueo del ataque del Demonio esa noche.

## Feature: Revolucionario (Fabricado)
  @extra
  «2 jugadores vecinos son de la misma alineación. Una vez por partida uno aparecerá de la contraria.»
  Panel: marca de pareja + interruptor de falsificación puntual.

## Feature: Chivo Expiatorio / Scapegoat (Viajero)
  @extra
  «Si se ejecuta a un jugador de tu alineación, puedes morir tú en su lugar.»
  Panel: botón de sustitución en el momento de la ejecución.

## Feature: Centinela / Sentinel (Fabricado)
  @extra
  «Puede haber 1 Forastero más o menos.»
  Panel: modificador de reparto en el montaje.

## Feature: Espíritu de Marfil (Fabricado)
  @extra
  «No puede haber más de 1 jugador malvado extra.»
  Panel: aviso de validación en el montaje.

## Feature: Atrapa Tormentas / Storm Catcher (Aldeano)
  @extra
  «Nombra un personaje bueno: si está en juego solo puede morir por ejecución, pero los malvados saben quién es.»
  Panel: ficha de inmunidad + anuncio al equipo malvado.

## Feature: Ladrón / Thief (Viajero)
  @extra
  «Cada noche elige 1 jugador (no a ti): su voto cuenta en negativo mañana.»
  Panel: multiplicador de voto negativo.

## Feature: Tor (Fabricado)
  @extra
  «Los jugadores no saben su personaje ni su alineación. Lo descubren al morir.»
  Panel: ocultar el propio personaje hasta la muerte (invierte la revelación actual).

## Feature: Juguetero / Toymaker (Fabricado)
  @extra
  «El Demonio puede no atacar una noche y debe hacerlo al menos 1 vez por partida. Los malvados reciben su información normal.»
  Panel: botón "el Demonio no ataca" + contador de usos obligatorio.

## Feature: Ventrílocuo / Ventriloquist (Fabricado)
  @extra
  «Si un jugador está loco de ser un personaje nuevo durante su nominación, puede no morir si lo ejecutan hoy.»
  Panel: locura impuesta + anulación de la ejecución.

## Feature: Tonto del Pueblo / Village Idiot (Aldeano)
  @extra
  «Cada noche elige 1 jugador: descubres su alineación. [+0 a +2 Tontos, uno de ellos borracho]»
  Panel: permitir varios ejemplares del mismo personaje, uno marcado como borracho.

## Feature: Espectro / Wraith (Esbirro)
  @extra
  «Puedes abrir los ojos de noche. Despiertas cuando lo hagan los demás malvados.»
  Panel: marca de "despierta con el Mal" en la cola nocturna.

## Feature: Xaan (Demonio)
  @extra
  «En la noche X todos los Aldeanos están envenenados hasta el crepúsculo. [X Forasteros]»
  Panel: envenenamiento masivo programado para una noche concreta.

## Feature: Fanático / Zealot (Fabricado)
  @extra
  «Con 5 o más vivos, debes votar en todas las nominaciones.»
  Panel: voto obligatorio forzado en la votación por turnos.

## Feature: Zenomante / Zenomancer (Fabricado)
  @extra
  «Uno o más jugadores tienen una misión: al completarla reciben información verdadera.»
  Panel: campo de misión por jugador + botón "misión completada".

---
---

# INTERACCIONES CRÍTICAS (regresión)

Escenarios que deben pasar siempre, porque cruzan varios sistemas a la vez.

  @auto
  Escenario: Dama Escarlata y Mente Maestra simultáneas
    Dado 6 vivos, Dama Escarlata sana y Mente Maestra sobria
    Cuando el Demonio es ejecutado
    Entonces hereda la Dama Escarlata, la partida sigue y la Mente Maestra **no** se activa

  @auto
  Escenario: Dama Escarlata con 4 vivos y Mente Maestra
    Dado 4 vivos, Dama Escarlata sana y Mente Maestra sobria
    Cuando el Demonio muere
    Entonces la Dama no hereda
    Y se abre el día extra de la Mente Maestra sin anunciar nada

  @auto
  Escenario: La Dama Escarlata hereda un Demonio que no es el Diablillo
    Dado el Vigormortis en juego y la Dama Escarlata sana con 7 vivos
    Cuando el Vigormortis muere
    Entonces la Dama se convierte en **Vigormortis**, no en Diablillo

  @panel
  Escenario: Barbero y Vigormortis
    Dado el Barbero muerto y el Vigormortis vivo
    Cuando el Demonio se intercambia con una Adorable muerta
    Entonces el antiguo Vigormortis pasa a ser una Adorable malvada
    Y la nueva Vigormortis está viva y la partida continúa

  @panel
  Escenario: Rata de Laboratorio con sucesión de Demonio
    Dado el Boffin en juego y la Dama Escarlata heredando
    Entonces el nuevo Demonio también tiene una habilidad de Boffin
    Y el narrador puede darle una habilidad distinta de la anterior

  @panel
  Escenario: El Hechicero desea ser el Demonio
    Dado el Hechicero pidiendo convertirse en Demonio
    Cuando el narrador concede el deseo desde el catálogo
    Entonces el Demonio anterior muere y el Hechicero ocupa su lugar
    Y la página **no** declara victoria del Bien, porque hay Demonio vivo
    Y sugiere la pista pública correspondiente

  @auto
  Escenario: Psicópata y Pólvora
    Dado la Pólvora muerta a manos del Psicópata en su asesinato diurno
    Entonces la Pólvora **no** explota, porque no fue una ejecución

  @panel
  Escenario: Psicópata ejecutado dos veces en la partida
    Dado el Psicópata que empató su primer Roshambo y vivió
    Cuando otro jugador lo nomina y ejecuta días después
    Entonces se abre un Roshambo nuevo contra ese nuevo nominador

  @auto
  Escenario: Ateo bloquea todos los finales automáticos
    Dado el Ateo en juego
    Cuando el Santo es ejecutado, o muere el "Demonio", o quedan 2 vivos
    Entonces la página no declara ningún ganador

  @panel
  Escenario: Cambio de rol en vivo sobre una Marioneta
    Dado una Marioneta que se cree Lavandera
    Cuando el narrador cambia solo su rol creído a "Monje"
    Entonces sigue siendo Marioneta y malvada
    Y el jugador pasa a creer que es el Monje

  @panel
  Escenario: Cambio de rol en vivo que crea un segundo Demonio
    Dado un Demonio vivo
    Cuando el narrador convierte a otro jugador en Demonio
    Entonces la página avisa de que habrá dos Demonios
    Y no declara victoria del Bien hasta que mueran los dos

  @auto
  Escenario: Ruleta congelada con muerte y voto fantasma
    Dado un jugador que muere de noche y otro que gastó su voto fantasma ayer
    Cuando es de noche
    Entonces la ruleta de los jugadores muestra al primero vivo y al segundo con su voto tal como estaba al anochecer
    Cuando amanece
    Entonces ambos estados se actualizan de golpe

  @auto
  Escenario: Desconexión durante la cola nocturna
    Dado un jugador desconectado cuando le toca actuar de noche
    Entonces el narrador lo ve marcado ○ desconectado en la cola
    Y puede resolver su acción desde el panel o saltarlo

  @auto
  Escenario: El Espía ve el grimorio pero no la conexión
    Dado el Espía mirando el grimorio de noche
    Entonces ve todos los personajes
    Y **no** ve el estado de conexión de nadie

  @panel
  Escenario: Filósofo que roba una habilidad y luego cambia de rol
    Dado el Filósofo con la habilidad del Monje robada
    Cuando el narrador le cambia el personaje a "Soldado"
    Entonces pierde la habilidad robada
    Y la página avisa al narrador de que el borracho del Filósofo sigue borracho

  @auto
  Escenario: Vortox hace falsa toda la información aunque el rol esté sano
    Dado el Vortox vivo y una Empática sana
    Entonces la Empática recibe un número falso
    Y el panel del narrador lo indica en su paso
