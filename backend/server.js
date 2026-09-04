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

app.use(cors({ origin: '*' }));
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

// ─── HEALTH ────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`TripPilot API on port ${PORT}`);
});
