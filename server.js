/**
 * Flashcard server — no npm install needed, uses only Node.js built-ins.
 * Run:  node server.js
 * Open: http://localhost:3000
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = 3000;
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPzLzjhM4w4SaXPEAzRcFEXUgirKWsT8XNY4ju33WPqZg-vuZoi1Kpj2TCCSDdqoA6oTPkknLvjKle/pub?gid=271629694&single=true&output=csv';

/* Follow redirects and return the final response body */
function fetchCSV(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return resolve(fetchCSV(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end',  () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  /* CORS headers so browser fetch() works fine */
  res.setHeader('Access-Control-Allow-Origin', '*');

  /* Serve the flashcard HTML */
  if (req.url === '/' || req.url === '/index.html') {
    const file = path.join(__dirname, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404); res.end('index.html not found next to server.js'); return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
    return;
  }

  /* Proxy endpoint — browser calls /cards, server fetches Google Sheets */
  if (req.url === '/cards') {
    try {
      const csv = await fetchCSV(CSV_URL);
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
      res.end(csv);
    } catch (err) {
      console.error('Sheet fetch error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Could not fetch sheet: ' + err.message);
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✓ Flashcard server running');
  console.log(`  → Open http://localhost:${PORT} in your browser`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
