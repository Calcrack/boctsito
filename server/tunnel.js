const localtunnel = require('localtunnel');

const PORT = process.env.PORT || 3001;

async function start() {
  console.log(`\nAbriendo túnel para puerto ${PORT}...`);
  try {
    const tunnel = await localtunnel({ port: Number(PORT) });

    const sep = '='.repeat(52);
    console.log('\n' + sep);
    console.log('  URL PUBLICA PARA JUGADORES:');
    console.log(`  ${tunnel.url}`);
    console.log(sep);
    console.log('\n  Comparte esa URL con tus amigos.');
    console.log('  Presiona Ctrl+C para cerrar el tunel.\n');

    tunnel.on('close', () => {
      console.log('\nTunel cerrado.');
      process.exit(0);
    });

    tunnel.on('error', (err) => {
      console.error('\nError en el tunel:', err.message);
    });

  } catch (err) {
    console.error('\nNo se pudo crear el tunel:', err.message);
    console.error('Asegurate de que el servidor este corriendo primero.');
    process.exit(1);
  }
}

start();
