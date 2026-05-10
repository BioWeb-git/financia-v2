const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR   = path.join(__dirname, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'scenarios.json');
const BIENS_FILE = path.join(DATA_DIR, 'biens.json');
const ANALYSE_FILE = path.join(DATA_DIR, 'analyse.json');

// Crée le dossier data/ s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Scénarios (existant) ──────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/data') {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'No data found' }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        fs.writeFileSync(DATA_FILE, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to save file' }));
      }
    });
    return;
  }

  // ── Biens immobiliers ─────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/biens') {
    if (fs.existsSync(BIENS_FILE)) {
      const data = fs.readFileSync(BIENS_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ biens: [], customColumns: [] }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/biens/save') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        // Validation JSON minimale
        JSON.parse(body);
        fs.writeFileSync(BIENS_FILE, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to save biens' }));
      }
    });
    return;
  }

  // ── Simulations Analyse ───────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/analyse') {
    if (fs.existsSync(ANALYSE_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(ANALYSE_FILE, 'utf8'));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ simulations: [] }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/analyse/save') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        JSON.parse(body);
        fs.writeFileSync(ANALYSE_FILE, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to save analyse' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Backend de sauvegarde actif sur http://localhost:${PORT}`);
});
