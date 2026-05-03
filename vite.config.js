import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

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

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'character-api',
      configureServer(server) {
        server.middlewares.use('/api/defaults',    fileEndpoint(DEFAULTS_FILE));
        server.middlewares.use('/api/characters',  fileEndpoint(CHARACTERS_FILE));
      },
    },
  ],
  server: { port: 4001 },
});
