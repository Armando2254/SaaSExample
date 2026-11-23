const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const SECRET = process.env.SESSION_SECRET || 'cardsaas-demo-secret';
const USERNAME_RE = /^[a-z0-9][a-z0-9_]{2,19}$/;

// Paleta: 2 colores básicos (Gratis) + 6 premium (Pro)
const COLORS = [
  { id: 'emerald', name: 'Esmeralda', hex: '#10b981', premium: false },
  { id: 'slate', name: 'Pizarra', hex: '#94a3b8', premium: false },
  { id: 'violet', name: 'Violeta', hex: '#8b5cf6', premium: true },
  { id: 'rose', name: 'Rosa', hex: '#f43f5e', premium: true },
  { id: 'amber', name: 'Ámbar', hex: '#f59e0b', premium: true },
  { id: 'sky', name: 'Cielo', hex: '#0ea5e9', premium: true },
  { id: 'fuchsia', name: 'Fucsia', hex: '#d946ef', premium: true },
  { id: 'orange', name: 'Naranja', hex: '#f97316', premium: true },
];

// ---------- "Base de datos": data.json en memoria + persistencia con fs ----------
let db = { users: {} };

function loadDb() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!db.users || typeof db.users !== 'object') db.users = {};
  } catch (err) {
    console.error('No se pudo leer data.json, se inicia vacío:', err.message);
    db = { users: {} };
  }
}

function saveDb() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE); // escritura atómica
}

const getUser = (name) =>
  Object.prototype.hasOwnProperty.call(db.users, name) ? db.users[name] : null;

// ---------- Sesión sin contraseña (demo): token firmado con HMAC ----------
const sign = (username) => crypto.createHmac('sha256', SECRET).update(username).digest('hex');
const makeToken = (username) => `${username}.${sign(username)}`;

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const i = token.lastIndexOf('.');
  if (i < 1) return res.status(401).json({ error: 'Sesión inválida' });
  const username = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(username));
  const valid = sig.length === expected.length && crypto.timingSafeEqual(sig, expected);
  const user = valid ? getUser(username) : null;
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });
  req.user = user;
  next();
}

// ---------- Validación y vistas ----------
const cleanText = (v, max) => String(v ?? '').trim().slice(0, max);

function cleanUrl(v) {
  v = String(v ?? '').trim().slice(0, 200);
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

// Devuelve {label,url} o null si la URL es inválida
function cleanLink(l) {
  l = l || {};
  const url = cleanUrl(l.url);
  if (url === null) return null;
  const label = cleanText(l.label, 24) || (url ? new URL(url).hostname.replace(/^www\./, '') : '');
  return { label: url ? label : '', url };
}

function effectiveColor(u) {
  const pro = u.plan === 'pro';
  return COLORS.find((c) => c.id === u.color && (pro || !c.premium)) || COLORS[0];
}

function publicView(u) {
  const pro = u.plan === 'pro';
  return {
    username: u.username,
    name: u.name || u.username,
    bio: u.bio || '',
    link1: u.link1 && u.link1.url ? u.link1 : null,
    link2: pro && u.link2 && u.link2.url ? u.link2 : null,
    color: effectiveColor(u).hex,
    plan: u.plan,
    watermark: !pro,
  };
}

function privateView(u) {
  return {
    username: u.username,
    name: u.name || '',
    bio: u.bio || '',
    link1: u.link1 || { label: '', url: '' },
    link2: u.link2 || { label: '', url: '' },
    color: effectiveColor(u).id,
    plan: u.plan,
  };
}

// ---------- Middlewares ----------
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API: acceso y registro ----------
app.post('/api/login', (req, res) => {
  const username = cleanText(req.body && req.body.username, 40).toLowerCase();
  if (!getUser(username)) {
    return res.status(404).json({ error: 'Ese usuario no existe. ¡Créalo en un segundo!' });
  }
  res.json({ token: makeToken(username) });
});

app.post('/api/register', (req, res) => {
  const username = cleanText(req.body && req.body.username, 40).toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: 'Usa de 3 a 20 caracteres: letras minúsculas, números o guion bajo.',
    });
  }
  if (getUser(username)) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
  }
  db.users[username] = {
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    bio: 'Edita tu perfil desde el panel de control.',
    link1: { label: '', url: '' },
    link2: { label: '', url: '' },
    color: 'emerald',
    plan: 'free',
    createdAt: new Date().toISOString(),
  };
  saveDb();
  res.status(201).json({ token: makeToken(username) });
});

// ---------- API: panel privado (cada usuario solo ve y edita lo suyo) ----------
app.get('/api/me', auth, (req, res) => {
  res.json({ user: privateView(req.user), colors: COLORS });
});

app.put('/api/me', auth, (req, res) => {
  const u = req.user;
  const pro = u.plan === 'pro';
  const b = req.body || {};

  const name = cleanText(b.name, 60);
  if (!name) return res.status(400).json({ error: 'El nombre completo es obligatorio.' });
  const bio = cleanText(b.bio, 140);

  const link1 = cleanLink(b.link1);
  if (!link1) return res.status(400).json({ error: 'El enlace principal no es válido.' });

  const color = COLORS.find((c) => c.id === b.color);
  if (!color) return res.status(400).json({ error: 'Color no válido.' });
  if (color.premium && !pro) {
    return res.status(403).json({ error: 'Ese color es exclusivo del Plan Pro.', code: 'PRO_REQUIRED' });
  }

  let link2 = u.link2 || { label: '', url: '' };
  if (b.link2 !== undefined && b.link2 !== null) {
    const l2 = cleanLink(b.link2);
    if (!l2) return res.status(400).json({ error: 'El segundo enlace no es válido.' });
    if (l2.url && !pro) {
      return res.status(403).json({ error: 'El segundo enlace es exclusivo del Plan Pro.', code: 'PRO_REQUIRED' });
    }
    if (pro) link2 = l2;
  }

  Object.assign(u, { name, bio, link1, link2, color: color.id });
  saveDb();
  res.json({ user: privateView(u) });
});

// Simula la suscripción / cancelación (no hay cobros reales)
app.post('/api/me/plan', auth, (req, res) => {
  const plan = req.body && req.body.plan;
  if (!['free', 'pro'].includes(plan)) return res.status(400).json({ error: 'Plan no válido.' });
  const u = req.user;
  u.plan = plan;
  if (plan === 'free') {
    const current = COLORS.find((c) => c.id === u.color);
    if (current && current.premium) u.color = 'emerald'; // el segundo enlace se conserva guardado
  }
  saveDb();
  res.json({ user: privateView(u), colors: COLORS });
});

// ---------- API pública + vista pública ----------
app.get('/api/public/:username', (req, res) => {
  const u = getUser(String(req.params.username).toLowerCase());
  res.set('Cache-Control', 'no-store');
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publicView(u));
});

app.get('/u/:username', (req, res) => {
  const exists = !!getUser(String(req.params.username).toLowerCase());
  res.status(exists ? 200 : 404).sendFile(path.join(__dirname, 'public', 'card.html'));
});

loadDb();
app.listen(PORT, () => {
  console.log(`CardSaaS escuchando en http://localhost:${PORT}`);
});
