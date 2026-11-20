import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { addLeaderboardEntry, readLeaderboard, DEFAULT_LEADERBOARD_PATH } from '../core/leaderboard.js';

const args = process.argv.slice(2);
const exportIdx = args.indexOf('--export-leaderboard');
if (exportIdx !== -1) {
  const outPath = args[exportIdx + 1] || 'out.json';
  const data = readLeaderboard(DEFAULT_LEADERBOARD_PATH);
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.exit(0);
}

const distDir = path.resolve(process.cwd(), 'dist');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const port = Number(process.env.PORT || 4173);
const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/api/leaderboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readLeaderboard(DEFAULT_LEADERBOARD_PATH)));
    return;
  }

  if (urlPath === '/api/leaderboard' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        const entries = addLeaderboardEntry(entry, DEFAULT_LEADERBOARD_PATH);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ entries }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(distDir, rel);
  if (!filePath.startsWith(distDir) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`Đảo Đèn Lồng đang chạy tại http://localhost:${port}\n`);
});
