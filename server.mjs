import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.txt':'text/plain', '.png':'image/png', '.svg':'image/svg+xml', '.glb':'model/gltf-binary' };
http.createServer(async (req, res) => {
  try { const url = new URL(req.url, 'http://localhost'); const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' }); res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(8080, '127.0.0.1', () => console.log('Midnight Parcel Service: http://localhost:8080'));
