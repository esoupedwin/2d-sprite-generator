import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS_FILE   = path.resolve('./character-defaults.json');
const CHARACTERS_FILE = path.resolve('./characters.json');

// ── Small HTTP helpers shared by the endpoints below ──
const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});
function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

// GET → the JSON file's contents (or null); POST → overwrite it with the body.
function fileEndpoint(filePath) {
  return async (req, res) => {
    try {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : 'null');
      } else if (req.method === 'POST') {
        await fs.promises.writeFile(filePath, await readBody(req));
        sendJson(res, 200, { ok: true });
      } else {
        res.statusCode = 405; res.end();
      }
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
  };
}

// Sprite-sheet folder export. GET → { defaultDir } (the machine's Downloads
// folder). POST writes ONE PNG: raw `image/png` body, with the absolute output
// folder and the file's relative path in `X-Export-Root` / `X-Export-Path`
// (URI-encoded). Folders are created as needed; `relPath` may not climb out of
// the root. One file per request keeps request bodies small.
//
// This endpoint can write anywhere on the machine, and plugin middlewares run
// BEFORE Vite's cors / host-check middlewares, so any web page open while the
// dev server runs could reach it. Hence the guards: only browser origins on
// this machine, only PNG bodies (a non-simple content type, so a cross-origin
// page would need a preflight we never answer), only `.png` targets, and the
// bytes must actually be a PNG.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LOCAL_HOSTS   = new Set(['localhost', '127.0.0.1', '[::1]']);
function isLocalBrowserOrigin(origin) {
  if (!origin) return true; // non-browser client (curl, scripts) — no CSRF surface
  try { return LOCAL_HOSTS.has(new URL(origin).hostname); } catch { return false; }
}
async function exportSpritesEndpoint(req, res) {
  if (req.method === 'GET') { sendJson(res, 200, { defaultDir: path.join(os.homedir(), 'Downloads') }); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
  if (!isLocalBrowserOrigin(req.headers.origin)) { sendJson(res, 403, { error: 'cross-origin request refused' }); return; }
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('image/png')) {
    sendJson(res, 415, { error: 'expected an image/png body' });
    return;
  }
  try {
    const root    = decodeURIComponent(String(req.headers['x-export-root'] ?? ''));
    const relPath = decodeURIComponent(String(req.headers['x-export-path'] ?? ''));
    if (!root || !path.isAbsolute(root)) throw new Error('output folder must be an absolute path');
    if (!relPath) throw new Error('missing file path');
    const rootAbs = path.resolve(root);
    const target  = path.resolve(rootAbs, relPath);
    if (target !== rootAbs && !target.startsWith(rootAbs + path.sep)) throw new Error('file path escapes the output folder');
    if (path.extname(target).toLowerCase() !== '.png') throw new Error('only .png files can be written');
    const bytes = await readBody(req);
    if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) throw new Error('data is not a PNG image');
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, bytes);
    sendJson(res, 200, { ok: true, path: target });
  } catch (e) {
    sendJson(res, 400, { error: e.message });
  }
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
