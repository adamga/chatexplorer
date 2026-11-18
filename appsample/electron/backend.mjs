// Electron utility process: runs the local server away from the window process,
// so a failure while reading very large histories cannot take the desktop app down.
import { startServer } from '../src/server.js';

const options = JSON.parse(process.argv[2] || '{}');
const send = (message) => process.parentPort.postMessage(message);

startServer({ port: options.port ?? 0, dataDir: options.dataDir, loadSamples: options.loadSamples, paths: options.paths || [] })
  .then((backend) => {
    process.parentPort.on('message', async ({ data }) => {
      if (data?.type !== 'import') return;
      try { await backend.importPath(data.path); send({ type: 'imported', id: data.id }); }
      catch (error) { send({ type: 'imported', id: data.id, error: error.message }); }
    });
    send({ type: 'ready', url: backend.url, port: backend.port });
  })
  .catch((error) => send({ type: 'failed', error: error.stack || error.message }));
