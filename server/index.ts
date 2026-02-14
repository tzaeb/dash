import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const distDir = path.join(__dirname, '..', 'dist');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- Data helpers ---

const ALLOWED_FILES = ['timetracker.json', 'todos.json', 'notes.json'] as const;

function readJson(file: string) {
  if (!ALLOWED_FILES.includes(file as typeof ALLOWED_FILES[number])) return [];
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(file: string, data: unknown) {
  if (!ALLOWED_FILES.includes(file as typeof ALLOWED_FILES[number])) return;
  if (!Array.isArray(data)) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
}

// --- API routes ---

// Time entries
app.get('/api/time-entries', (_req, res) => {
  res.json(readJson('timetracker.json'));
});

app.post('/api/time-entries', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array' });
  writeJson('timetracker.json', req.body);
  res.json({ ok: true });
});

// Todos
app.get('/api/todos', (_req, res) => {
  res.json(readJson('todos.json'));
});

app.post('/api/todos', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array' });
  writeJson('todos.json', req.body);
  res.json({ ok: true });
});

// Notes
app.get('/api/notes', (_req, res) => {
  res.json(readJson('notes.json'));
});

app.post('/api/notes', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array' });
  writeJson('notes.json', req.body);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- Production: serve built frontend ---
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`API server running on http://${HOST}:${PORT}`);
});
