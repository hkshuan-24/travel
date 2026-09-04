require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'trippilot-dev-secret-change-in-production';

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Auth middleware
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
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)')
    .run(id, email, hash, name);

  const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, email, name } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ─── TRIPS ─────────────────────────────────────────

app.post('/api/trips', auth, (req, res) => {
  const id = uuidv4();
  const {
    name, destination, cities, start_date, end_date,
    adults, teenagers, children, pace, budget, style, interests
  } = req.body;

  db.prepare(`
    INSERT INTO trips (id, user_id, name, destination, cities, start_date, end_date, adults, teenagers, children, pace, budget, style, interests)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, destination, cities, start_date, end_date,
    adults || 1, teenagers || 0, children || 0, pace || 'relaxed', budget || 'moderate', style || 'balanced', interests || '');

  res.status(201).json({ id, message: 'Trip created' });
});

app.get('/api/trips', auth, (req, res) => {
  const trips = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(trips);
});

app.get('/api/trips/:id', auth, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const items = db.prepare('SELECT * FROM itinerary_items WHERE trip_id = ? ORDER BY day, time').all(req.params.id);
  res.json({ ...trip, itinerary: items });
});

app.delete('/api/trips/:id', auth, (req, res) => {
  db.prepare('DELETE FROM itinerary_items WHERE trip_id = ?').run(req.params.id);
  db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Trip deleted' });
});

// ─── ITINERARY ─────────────────────────────────────

app.post('/api/trips/:tripId/itinerary', auth, (req, res) => {
  const id = uuidv4();
  const { day, time, activity, location, duration, category, score, notes } = req.body;
  db.prepare(`
    INSERT INTO itinerary_items (id, trip_id, day, time, activity, location, duration, category, score, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.tripId, day, time, activity, location, duration, category, score, notes);
  res.status(201).json({ id });
});

app.patch('/api/itinerary/:id', auth, (req, res) => {
  const { completed } = req.body;
  db.prepare('UPDATE itinerary_items SET completed = ? WHERE id = ?').run(completed ? 1 : 0, req.params.id);
  res.json({ message: 'Updated' });
});

// ─── ACTIVITIES ────────────────────────────────────

app.get('/api/activities', (req, res) => {
  const { city, category, tags } = req.query;
  let sql = 'SELECT * FROM activities WHERE 1=1';
  const params = [];
  if (city) { sql += ' AND city = ?'; params.push(city); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (tags) { sql += ' AND tags LIKE ?'; params.push(`%${tags}%`); }
  sql += ' ORDER BY photography_rating DESC';
  const activities = db.prepare(sql).all(...params);
  res.json(activities);
});

app.get('/api/activities/:id', (req, res) => {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Not found' });
  res.json(activity);
});

// ─── WEATHER ───────────────────────────────────────

app.get('/api/weather/:city', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let weather = db.prepare('SELECT * FROM weather_cache WHERE city = ? AND date = ?').get(req.params.city, today);

  if (!weather) {
    // Generate mock weather data
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Overcast'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    weather = {
      id: uuidv4(),
      city: req.params.city,
      date: today,
      temperature: 8 + Math.floor(Math.random() * 15),
      feels_like: 6 + Math.floor(Math.random() * 15),
      precipitation: condition === 'Light Rain' ? 60 : Math.floor(Math.random() * 20),
      wind_speed: 5 + Math.floor(Math.random() * 20),
      humidity: 40 + Math.floor(Math.random() * 40),
      visibility: 8 + Math.floor(Math.random() * 10),
      condition,
      forecast: JSON.stringify({
        tomorrow: { temp: 12, condition: 'Partly Cloudy', rain: 10 },
        day3: { temp: 10, condition: 'Light Rain', rain: 70 },
        day4: { temp: 14, condition: 'Clear', rain: 5 }
      })
    };
    db.prepare(`
      INSERT OR REPLACE INTO weather_cache (id, city, date, temperature, feels_like, precipitation, wind_speed, humidity, visibility, condition, forecast)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(weather.id, weather.city, weather.date, weather.temperature, weather.feels_like,
      weather.precipitation, weather.wind_speed, weather.humidity, weather.visibility,
      weather.condition, weather.forecast);
  }

  res.json(weather);
});

// ─── CITIES ────────────────────────────────────────

app.get('/api/cities', (req, res) => {
  const cities = db.prepare('SELECT DISTINCT city FROM activities').all();
  res.json(cities.map(c => c.city));
});

// ─── RECOMMENDATIONS ENGINE ────────────────────────

app.post('/api/recommendations', (req, res) => {
  const { city, date, group_size, interests, pace, weather_ok } = req.body;

  let sql = 'SELECT * FROM activities WHERE city = ?';
  const params = [city];

  if (interests) {
    const tags = interests.split(',');
    sql += ' AND (' + tags.map(() => 'tags LIKE ?').join(' OR ') + ')';
    params.push(...tags.map(t => `%${t}%`));
  }

  const activities = db.prepare(sql).all(...params);

  // Score each activity
  const scored = activities.map(a => {
    let score = 70;
    if (a.family_suitable && group_size > 2) score += 10;
    if (a.weather_sensitivity === 'Low' || weather_ok) score += 10;
    if (a.crowd_profile?.includes('Low')) score += 5;
    score += (a.photography_rating || 5) * 2;
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
  console.log(`TripPilot API running on port ${PORT}`);
});
