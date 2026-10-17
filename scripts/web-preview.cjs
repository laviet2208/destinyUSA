const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

function createPreviewServer({ directory = path.resolve(__dirname, '../dist-web'), target = 'http://127.0.0.1:4100' } = {}) {
  const upstream = new URL(target);
  if (!['http:', 'https:'].includes(upstream.protocol) || upstream.pathname !== '/' || upstream.username || upstream.password || upstream.search || upstream.hash) throw new Error('API_PROXY_TARGET phải là origin HTTP/HTTPS, không kèm đường dẫn hoặc mật khẩu.');
  const transport = upstream.protocol === 'https:' ? https : http;
  const isApi = pathname => pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/socket.io/');
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    if (pathname.includes('\0')) { response.writeHead(400).end(); return; }
    if (isApi(pathname)) {
      const proxy = transport.request(upstream, { method: request.method, path: request.url, headers: { ...request.headers, host: upstream.host } }, result => {
        response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response);
      });
      proxy.on('error', () => { if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ message: 'API local chưa chạy. Hãy chạy npm run dev:api ở thư mục hệ thống.' })); });
      request.on('aborted', () => proxy.destroy());
      proxy.setTimeout(60000, () => proxy.destroy());
      request.pipe(proxy); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const file = pathname === '/' ? path.join(directory, 'index.html') : pathname === '/app' || pathname.startsWith('/app/') ? path.join(directory, 'app/index.html') : path.resolve(directory, `.${pathname}`);
    const relative = path.relative(directory, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) { response.writeHead(404).end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { response.writeHead(404).end('Chưa có bản build. Chạy npm run web:build trong apps/mobile.'); return; }
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': pathname.includes('/_expo/') ? 'public, max-age=31536000, immutable' : 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(file).pipe(response);
    });
  });
  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/socket.io/')) { socket.destroy(); return; }
    const proxy = transport.request(upstream, { path: request.url, headers: { ...request.headers, host: upstream.host } });
    proxy.on('upgrade', (result, remote, remoteHead) => {
      remote.setTimeout(0); socket.setTimeout(0);
      socket.write(`HTTP/1.1 ${result.statusCode} ${result.statusMessage}\r\n${Object.entries(result.headers).map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\r\n')}\r\n\r\n`);
      if (remoteHead.length) socket.write(remoteHead);
      if (head.length) remote.write(head);
      socket.pipe(remote).pipe(socket);
      socket.on('error', () => remote.destroy()); remote.on('error', () => socket.destroy());
      socket.on('close', () => remote.destroy()); remote.on('close', () => socket.destroy());
    });
    proxy.on('response', result => { result.resume(); socket.destroy(); });
    proxy.on('error', () => socket.destroy());
    proxy.setTimeout(60000, () => proxy.destroy());
    proxy.end();
  });
  return server;
}

module.exports = { createPreviewServer };
if (require.main === module) {
  if (!fs.existsSync(path.resolve(__dirname, '../dist-web/index.html'))) { console.error('Chạy npm run web:build trước.'); process.exit(1); }
  const port = Number(process.env.MOBILE_WEB_PORT ?? 5174);
  const host = process.env.MOBILE_WEB_HOST ?? '127.0.0.1';
  const server = createPreviewServer({ target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4100' });
  server.on('error', error => { console.error(error.message); process.exit(1); });
  server.listen(port, host, () => console.log(`Customer mobile web: http://${host}:${port}/\nSame React Native screens; local API proxy enabled. Push/Viber still require device checks.`));
}
