require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'trippilot-dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── WEB UI ROUTES ─────────────────────────────────

// Login / Admin portal page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TripPilot Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:Inter,sans-serif;background:#0a0f0e;color:#fff;}</style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
      </div>
      <h1 class="text-2xl font-bold">TripPilot Admin</h1>
      <p class="text-gray-400 text-sm mt-1">Sign in to manage your travel platform</p>
    </div>

    <div id="login-panel" class="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div class="flex bg-white/5 rounded-full p-1">
        <button onclick="switchTab('signin')" id="tab-signin" class="flex-1 py-2 rounded-full text-sm font-medium transition bg-emerald-500 text-black">Sign In</button>
        <button onclick="switchTab('signup')" id="tab-signup" class="flex-1 py-2 rounded-full text-sm font-medium transition text-gray-400 hover:text-white">Create Account</button>
      </div>

      <form id="form-signin" class="space-y-4" onsubmit="handleSignIn(event)">
        <div>
          <label class="text-sm text-gray-400 mb-1 block">Email</label>
          <input type="email" required class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 transition" placeholder="admin@trippilot.com">
        </div>
        <div>
          <label class="text-sm text-gray-400 mb-1 block">Password</label>
          <input type="password" required class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 transition" placeholder="••••••••">
        </div>
        <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-xl transition">Sign In</button>
      </form>

      <form id="form-signup" class="space-y-4 hidden" onsubmit="handleSignUp(event)">
        <div>
          <label class="text-sm text-gray-400 mb-1 block">Full Name</label>
          <input type="text" required class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 transition" placeholder="John Doe">
        </div>
        <div>
          <label class="text-sm text-gray-400 mb-1 block">Email</label>
          <input type="email" required class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 transition" placeholder="admin@trippilot.com">
        </div>
        <div>
          <label class="text-sm text-gray-400 mb-1 block">Password</label>
          <input type="password" required minlength="8" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 transition" placeholder="Min 8 characters">
        </div>
        <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-xl transition">Create Account</button>
      </form>
    </div>

    <div id="dashboard-panel" class="hidden space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Dashboard</h2>
        <button onclick="logout()" class="text-sm text-red-400 hover:text-red-300">Sign Out</button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white/5 border border-white/10 rounded-xl p-4">
          <p class="text-sm text-gray-400">Total Users</p>
          <p id="stat-users" class="text-3xl font-bold text-emerald-400">-</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-xl p-4">
          <p class="text-sm text-gray-400">Total Trips</p>
          <p id="stat-trips" class="text-3xl font-bold text-emerald-400">-</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-xl p-4">
          <p class="text-sm text-gray-400">Activities</p>
          <p id="stat-activities" class="text-3xl font-bold text-emerald-400">-</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-xl p-4">
          <p class="text-sm text-gray-400">Cities</p>
          <p id="stat-cities" class="text-3xl font-bold text-emerald-400">-</p>
        </div>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 class="font-semibold mb-3">API Status</h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between"><span>Auth Service</span><span class="text-emerald-400">Online</span></div>
          <div class="flex items-center justify-between"><span>Trip Service</span><span class="text-emerald-400">Online</span></div>
          <div class="flex items-center justify-between"><span>Weather Service</span><span class="text-emerald-400">Online</span></div>
          <div class="flex items-center justify-between"><span>Activities Service</span><span class="text-emerald-400">Online</span></div>
        </div>
      </div>
      <div class="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 class="font-semibold mb-3">Your Account</h3>
        <div id="user-info" class="space-y-2 text-sm text-gray-300"></div>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = window.location.origin;
    let currentToken = localStorage.getItem('tp_admin_token');

    if (currentToken) { showDashboard(); loadStats(); loadUser(); }

    function switchTab(tab) {
      document.getElementById('form-signin').classList.toggle('hidden', tab !== 'signin');
      document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
      document.getElementById('tab-signin').className = tab === 'signin' ? 'flex-1 py-2 rounded-full text-sm font-medium transition bg-emerald-500 text-black' : 'flex-1 py-2 rounded-full text-sm font-medium transition text-gray-400 hover:text-white';
      document.getElementById('tab-signup').className = tab === 'signup' ? 'flex-1 py-2 rounded-full text-sm font-medium transition bg-emerald-500 text-black' : 'flex-1 py-2 rounded-full text-sm font-medium transition text-gray-400 hover:text-white';
    }

    async function handleSignIn(e) {
      e.preventDefault();
      const inputs = e.target.querySelectorAll('input');
      const email = inputs[0].value, password = inputs[1].value;
      const res = await fetch(\`/api/auth/login\`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Login failed'); return; }
      localStorage.setItem('tp_admin_token', data.token);
      currentToken = data.token;
      showDashboard(); loadStats(); loadUser();
    }

    async function handleSignUp(e) {
      e.preventDefault();
      const inputs = e.target.querySelectorAll('input');
      const name = inputs[0].value, email = inputs[1].value, password = inputs[2].value;
      const res = await fetch(\`/api/auth/register\`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Sign up failed'); return; }
      localStorage.setItem('tp_admin_token', data.token);
      currentToken = data.token;
      showDashboard(); loadStats(); loadUser();
    }

    function showDashboard() {
      document.getElementById('login-panel').classList.add('hidden');
      document.getElementById('dashboard-panel').classList.remove('hidden');
    }

    function logout() {
      localStorage.removeItem('tp_admin_token');
      currentToken = null;
      document.getElementById('dashboard-panel').classList.add('hidden');
      document.getElementById('login-panel').classList.remove('hidden');
    }

    async function loadStats() {
      const res = await fetch(\`/api/health\`, { headers: { 'Authorization': \`Bearer \${currentToken}\` } });
      if (res.status === 401) { logout(); return; }
      const health = await res.json();

      const [usersRes, tripsRes, activitiesRes, citiesRes] = await Promise.all([
        fetch(\`/api/health/stats/users\`, { headers: { 'Authorization': \`Bearer \${currentToken}\` } }),
        fetch(\`/api/health/stats/trips\`, { headers: { 'Authorization': \`Bearer \${currentToken}\` } }),
        fetch(\`/api/health/stats/activities\`, { headers: { 'Authorization': \`Bearer \${currentToken}\` } }),
        fetch(\`/api/cities\`, { headers: { 'Authorization': \`Bearer \${currentToken}\` } })
      ]);

      if (usersRes.ok) document.getElementById('stat-users').textContent = (await usersRes.json()).count;
      if (tripsRes.ok) document.getElementById('stat-trips').textContent = (await tripsRes.json()).count;
      if (activitiesRes.ok) document.getElementById('stat-activities').textContent = (await activitiesRes.json()).count;
      if (citiesRes.ok) document.getElementById('stat-cities').textContent = (await citiesRes.json()).length;
    }

    async function loadUser() {
      const res = await fetch(\`/api/auth/me\`, { headers: { 'Authorization': \`Bearer \${currentToken}\` } });
      if (res.ok) {
        const user = await res.json();
        document.getElementById('user-info').innerHTML = \`
          <p><span class="text-gray-400">Name:</span> \${user.name}</p>
          <p><span class="text-gray-400">Email:</span> \${user.email}</p>
          <p><span class="text-gray-400">ID:</span> \${user.id}</p>
          <p><span class="text-gray-400">Joined:</span> \${new Date(user.created_at).toLocaleDateString()}</p>
        \`;
      }
    }
  </script>
</body>
</html>`);
});

// ─── AUTH ──────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
  if (db.data.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email exists' });

  const hash = bcrypt.hashSync(password, 10);
  const user = { id: uuidv4(), email, password: hash, name, created_at: new Date().toISOString() };
  db.data.users.push(user);
  db.write();

  const token = jwt.sign({ id: user.id, email, name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email, name } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.data.users.find(u => u.id === req.user.id);
  res.json({ id: user.id, email: user.email, name: user.name, created_at: user.created_at });
});

// ─── TRIPS ─────────────────────────────────────────

app.post('/api/trips', auth, (req, res) => {
  const trip = {
    id: uuidv4(),
    user_id: req.user.id,
    ...req.body,
    status: 'planning',
    created_at: new Date().toISOString()
  };
  db.data.trips.push(trip);
  db.write();
  res.status(201).json(trip);
});

app.get('/api/trips', auth, (req, res) => {
  const trips = db.data.trips.filter(t => t.user_id === req.user.id);
  res.json(trips);
});

app.get('/api/trips/:id', auth, (req, res) => {
  const trip = db.data.trips.find(t => t.id === req.params.id && t.user_id === req.user.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  const items = db.data.itinerary.filter(i => i.trip_id === req.params.id);
  res.json({ ...trip, itinerary: items });
});

app.delete('/api/trips/:id', auth, (req, res) => {
  db.data.trips = db.data.trips.filter(t => !(t.id === req.params.id && t.user_id === req.user.id));
  db.data.itinerary = db.data.itinerary.filter(i => i.trip_id !== req.params.id);
  db.write();
  res.json({ message: 'Deleted' });
});

// ─── ITINERARY ─────────────────────────────────────

app.post('/api/trips/:tripId/itinerary', auth, (req, res) => {
  const item = { id: uuidv4(), trip_id: req.params.tripId, completed: false, ...req.body };
  db.data.itinerary.push(item);
  db.write();
  res.status(201).json(item);
});

app.patch('/api/itinerary/:id', auth, (req, res) => {
  const item = db.data.itinerary.find(i => i.id === req.params.id);
  if (item) { item.completed = req.body.completed; db.write(); }
  res.json(item);
});

// ─── ACTIVITIES ────────────────────────────────────

app.get('/api/activities', (req, res) => {
  let results = db.data.activities;
  if (req.query.city) results = results.filter(a => a.city === req.query.city);
  if (req.query.tags) results = results.filter(a => a.tags?.includes(req.query.tags));
  res.json(results);
});

app.get('/api/activities/:id', (req, res) => {
  const a = db.data.activities.find(a => a.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

// ─── WEATHER ───────────────────────────────────────

app.get('/api/weather/:city', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let w = db.data.weather.find(x => x.city === req.params.city && x.date === today);

  if (!w) {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain'];
    const cond = conditions[Math.floor(Math.random() * conditions.length)];
    w = {
      id: uuidv4(), city: req.params.city, date: today,
      temperature: 8 + Math.floor(Math.random() * 15),
      feels_like: 6 + Math.floor(Math.random() * 15),
      precipitation: cond === 'Light Rain' ? 60 : Math.floor(Math.random() * 20),
      wind_speed: 5 + Math.floor(Math.random() * 20),
      humidity: 40 + Math.floor(Math.random() * 40),
      visibility: 8 + Math.floor(Math.random() * 10),
      condition: cond,
      forecast: [
        { day: 'Tomorrow', temp: 12, condition: 'Partly Cloudy', rain: 10 },
        { day: '+2 days', temp: 10, condition: 'Light Rain', rain: 70 },
        { day: '+3 days', temp: 14, condition: 'Clear', rain: 5 }
      ]
    };
    db.data.weather.push(w);
    db.write();
  }
  res.json(w);
});

// ─── CITIES ────────────────────────────────────────

app.get('/api/cities', (req, res) => {
  const cities = [...new Set(db.data.activities.map(a => a.city))];
  res.json(cities);
});

// ─── RECOMMENDATIONS ENGINE ────────────────────────

app.post('/api/recommendations', (req, res) => {
  const { city, interests, weather_ok } = req.body;
  let results = db.data.activities.filter(a => a.city === city);
  if (interests) {
    const tags = interests.split(',');
    results = results.filter(a => tags.some(t => a.tags?.includes(t)));
  }
  const scored = results.map(a => {
    let score = 70;
    if (a.family && req.body.group_size > 2) score += 10;
    if (a.weather_sensitivity === 'Low' || weather_ok) score += 10;
    score += (a.photo || 5) * 2;
    return { ...a, match_score: Math.min(score, 99) };
  });
  scored.sort((a, b) => b.match_score - a.match_score);
  res.json(scored.slice(0, 10));
});

// ─── HEALTH & STATS ────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', uptime: process.uptime() });
});

app.get('/api/health/stats/users', auth, (req, res) => {
  res.json({ count: db.data.users.length });
});

app.get('/api/health/stats/trips', auth, (req, res) => {
  res.json({ count: db.data.trips.length });
});

app.get('/api/health/stats/activities', auth, (req, res) => {
  res.json({ count: db.data.activities.length });
});

// ─── 404 ───────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`TripPilot API on port ${PORT}`);
});
