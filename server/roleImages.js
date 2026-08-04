// ── Arte de los personajes, visto desde el servidor ───────────────────
// El catálogo de arte vive en el cliente (`img:` en client/src/data/campaigns).
// La hoja de campaña la genera el servidor, así que necesita ese mapa; en vez
// de duplicar 126 rutas se lee el catálogo del cliente una sola vez y se
// cachea. Si no estuviera disponible, la hoja pinta la inicial del personaje.
const fs = require('fs');
const path = require('path');

const CLIENT_CAMPAIGNS = path.join(__dirname, '..', 'client', 'src', 'data', 'campaigns');

let cache = null;

function roleImages() {
  if (cache) return cache;
  cache = {};
  let files = [];
  try {
    files = fs.readdirSync(CLIENT_CAMPAIGNS).filter(f => f.endsWith('.js'));
  } catch { return cache; }
  for (const f of files) {
    let body = '';
    try { body = fs.readFileSync(path.join(CLIENT_CAMPAIGNS, f), 'utf8'); } catch { continue; }
    // { id: 'WASHERWOMAN', name: '…', …, img: '/assets/roles/lavandera.png', …}
    // El bloque `(?:(?!id:)[\s\S])*?` impide saltar al `img:` del SIGUIENTE
    // personaje cuando este tiene `img: null` (si no, todo el fichero se
    // desplaza un rol y las imágenes salen cambiadas).
    for (const m of body.matchAll(/id:\s*'([A-Z_0-9]+)'((?:(?!id:)[\s\S])*?)img:\s*(?:'([^']+)'|null)/g)) {
      if (m[3] && !cache[m[1]]) cache[m[1]] = m[3];
    }
  }
  return cache;
}

// `image` es la clave que traen los roles homebrew de un guion importado.
function imageFor(role) {
  if (!role) return null;
  return role.image || roleImages()[role.id] || null;
}

module.exports = { roleImages, imageFor };
