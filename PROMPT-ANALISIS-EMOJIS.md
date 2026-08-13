# Prompt para análisis de imágenes y reemplazo de emojis genéricos

Copia y pega este prompt en un modelo con visión (GPT-4V, Claude Vision, Gemini Pro Vision, etc.).

---

## CONTEXTO

Soy desarrollador de una app web para el juego **Blood on the Clocktower** (juego de deducción social estilo Mafia/Werewolf). Estoy reemplazando emojis Unicode usados como iconos en la interfaz por imágenes reales de los personajes del juego.

Ya tengo 156 imágenes PNG de personajes en `/assets/rolesnotoken/` (arte sin token, de villacuervos.es/wiki). Cada imagen es el retrato de un personaje específico del juego.

## TAREA

Necesito que analices **todas las imágenes PNG** de `/assets/rolesnotoken/` y me digas cuál es la **mejor imagen** para representar cada uno de los siguientes **emojis genéricos/simbólicos** que uso en la interfaz:

### Emojis a reemplazar (con contexto de uso):

| Emoji | Significado en la app | Dónde se usa |
|-------|----------------------|--------------|
| ☠ | Muerte / ejecución / jugador muerto | Indicador de estado "Muerto", mensajes de noche, contadores |
| ⚠ | Advertencia / peligro | Warnings de protección, notas de peligro |
| ♥ | Vida / corazón / "bueno" | Indicador de estado "Vivo", contadores de vida |
| 🚪 | Habitación / sala | Botón "Ir a la habitación de X" |
| 🎬 | Escena / inicio de partida | "Montar partida" |
| 🎭 | Personaje / identidad | "Enseñar personaje" |
| ⚖ | Balance / empate / votación | "Empate", "Votación" |
| 🗳 | Voto / votación | "Abrir votación" |
| 🗣 | Habla / argumento | "Habla X", "Argumentos de X" |
| 👁 | Ojo / ver / sospecha | "Sospechas de los jugadores" |
| 🤖 | Automático / sin narrador | "Partida sin narrador" |
| 💀 | Muerte directa | "PO atacó", "Muere ahora" |
| 🧪 | Veneno / envenenado | "Envenenado", "no funciona" |
| 🛡 | Protección / escudo | "Protegido esta noche" |
| ⚔ | Ataque / conflicto | "Soldado inmune", "A favor/en contra" |
| 🍺 | Borracho | "Borracho", "Emborrachar" |
| ✕ | Cerrar / cancelar / incorrecto | Botones de cerrar, "Adivinó incorrecto" |
| ✓ | Confirmar / correcto / hecho | "Confirmado", "Hecho" |
| ● | Vivo / punto activo | "Vivo" en estado |
| ◆ | Activo / destacado | "Activo" en canales |
| ✦ | Decorativo / éxito | Separadores, "Gana el Bien" |
| 🔌 | Desconectar | "Desconectar" jugador |
| 🔄 | Reemplazar / reciclar | "Reemplazar jugador", "Recargar" |
| ✏ | Editar | "Editar campaña" |
| 🔒 | Cerrado / secreto | "Sin acceder" |
| 📋 | Lista / registro | "Registro", "Rankings" |
| 🏆 | Ranking / logro | "Rankings" |
| 🎙 | Narrador | "Narrador" |
| 🎵 | (decorativo) | (poco usado) |
| 🌙 | Noche / luna | Fase nocturna |
| ☀ | Día / sol | Fase diurna |
| ⏱ | Ausente / tiempo | "Ausente" en conexión |
| 📝 | Nota / escribir | (poco usado) |

## IMÁGENES DISPONIBLES

Las imágenes están en la carpeta `/assets/rolesnotoken/` y son los retratos de estos personajes:

**Towntfolk (Aldeanos):** washerwoman, librarian, investigator, cook, empath, undertaker, monk, fortune_teller, soldier, ravenkeeper, slayer, virgin, mayor, drunk, village_idiot, chef, recluse, saint, grandmother, butler, poet

**Outsiders (Forasteros):** drunk, mutant, baron, klutz, beggar, lunatic, moonchild, tinker, sweetheart, sage, barber, grandchild

**Minions (Esbirros):** poisoner, spy, scarlet_woman, baron

**Demons (Demonios):** imp, zombuul, pukka, po, shabaloth, fang_gu, no_dashii, vortox, vigormortis, lleech, kazali, legion, ojo, al_hadikhia, lord_of_typhon, lil_monsta, yaggababble

**Travelers (Viajeros):** gunslinger, assassin, berserker, deviant, matron, judge, bishop, hatter, harlot,robat

**Fabled (Fabulosos):** toymaker, banshee, doomsayer, fiddler, matron, hermit, hells_librarian, bone_collector, chaos

**Homebrew/Custom:** amnesiac, fisherman, artist, savant, politician, damsel, snitch, noble, general, high_priestess, king, balloonist, huntsman, nightwatchman, bounty_hunter, cult_leader, preacher, boffin, summoner, poppy_grower, magician, engineer, preacher, philosopher, barista, bureaucrat, thief, sailor, courtier, innkeeper, gambler, gossip, professor, minstrel, tea_lady, pacifist, fool, ravenkeeper, chambermaid, dreamer, snake_charmer, mathematician, flowergirl, town_crier, oracle, seamstress, juggler, philosopher, witch, cerenovus, pit_hag, evil_twin, acrobat, alchemist, pixie, leviathan, riot, widow, mezepheles, fearmonger, harpy, organ_grinder, summoner, xaan, wraith, zealot, heretic, goblin, golem, gangster, gnome, bishop, mayor, saint, recluse, virgin, tinker, sweetheart, sage, barber, grandmother, bounty_hunter, nightwatchman, preacher, professor, innkeeper, courtier, sailor, barista, gambler, gossip, minstrel, tea_lady, pacifist, fool, moonchild, dreamer, seamstress, mathematician, flowergirl, town_crier, oracle, juggler, philosopher, witch, cerenovus, pit_hag, evil_twin, acrobat, alchemist, pixie, leviathan, riot, widow, mezepheles, fearmonger, harpy, organ_grinder, summoner, xaan, wraith, zealot, heretic, goblin, golem, gangster, gn

## INSTRUCCIONES

1. **Analiza visualmente** cada imagen PNG de `/assets/rolesnotoken/`.
2. Para cada emoji genérico de la tabla, **selecciona la imagen que mejor represente** ese concepto visualmente.
3. Si ninguna imagen es adecuada para un emoji, indica "NO ADECUADA" y explica por qué.
4. Ten en cuenta que las imágenes se usarán a **tamaño pequeño** (14-20px), así que deben ser reconocibles a ese tamaño.
5. Prioriza imágenes con **colores contrastantes** y **formas simples** que se distingan bien en miniatura.

## FORMATO DE RESPUESTA

Para cada emoji, dame:

```
### Emoji: [emoji]
- **Concepto:** [qué representa]
- **Mejor imagen:** [nombre del archivo PNG] o "NO ADECUADA"
- **Razón:** [por qué esta imagen encaja]
- **Alternativa:** [otra opción si la primera no es perfecta]
```

Al final, dame un **resumen en tabla**:

```
| Emoji | Imagen PNG | Razón breve |
|-------|-----------|-------------|
| ☠     | xxx.png   | ...         |
```

## NOTAS IMPORTANTES

- Si un emoji tiene **múltiples significados** en diferentes contextos (ej: ☠ puede ser "muerte" o "ejecución"), prioriza el uso más frecuente.
- Si hay emojis que son puramente **decorativos** y no necesitan imagen real, indica "MANTENER EMOJI".
- Algunos emojis como ✓/✕ son **estándar de UI** y podrían no necesitar reemplazo.
- Las imágenes de `/assets/estados/` ya están mapeadas:
  - `estado - muerto hoy.png` → ☠
  - `estado - envenenado.png` → 🧪
  - `estado - a salvo.png` → 🛡
  - `estado - amo.png` → (sin emoji asociado)
  - `estado - cortina de humo.png` → (sin emoji asociado)

---

*Prompt generado automáticamente para el proyecto boctsito (Blood on the Clocktower companion app)*
