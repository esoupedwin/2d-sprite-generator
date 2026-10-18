import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS_FILE   = path.resolve('./character-defaults.json');
const CHARACTERS_FILE = path.resolve('./characters.json');

function fileEndpoint(filePath) {
  return (req, res) => {
    if (req.method === 'GET') {
      try {
        const data = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : 'null';
        res.setHeader('Content-Type', 'application/json');
        res.end(data);
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          fs.writeFileSync(filePath, body, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      res.statusCode = 405;
      res.end();
    }
  };
}

// Sprite-sheet folder export. GET → { defaultDir } (the machine's Downloads
// folder). POST { root, relPath, dataUrl } writes ONE PNG to <root>/<relPath>,
// creating folders as needed. `root` must be absolute; `relPath` may not climb
// out of it. One file per request keeps request bodies small.
function exportSpritesEndpoint(req, res) {
  const json = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
  if (req.method === 'GET') {
    json(200, { defaultDir: path.join(os.homedir(), 'Downloads') });
    return;
  }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    try {
      const { root, relPath, dataUrl } = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('output folder must be an absolute path');
      if (typeof relPath !== 'string' || !relPath) throw new Error('missing file path');
      const rootAbs = path.resolve(root);
      const target  = path.resolve(rootAbs, relPath);
      if (target !== rootAbs && !target.startsWith(rootAbs + path.sep)) throw new Error('file path escapes the output folder');
      const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '');
      if (!m) throw new Error('expected a PNG data URL');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, Buffer.from(m[1], 'base64'));
      json(200, { ok: true, path: target });
    } catch (e) {
      json(400, { error: e.message });
    }
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'character-api',
      configureServer(server) {
        server.middlewares.use('/api/defaults',    fileEndpoint(DEFAULTS_FILE));
        server.middlewares.use('/api/characters',  fileEndpoint(CHARACTERS_FILE));
        server.middlewares.use('/api/export-sprites', exportSpritesEndpoint);
      },
    },
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 4000 },
});
