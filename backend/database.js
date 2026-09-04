const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new Database(path.join(__dirname, 'trippilot.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Trips table
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    cities TEXT,
    start_date TEXT,
    end_date TEXT,
    adults INTEGER DEFAULT 1,
    teenagers INTEGER DEFAULT 0,
    children INTEGER DEFAULT 0,
    pace TEXT DEFAULT 'relaxed',
    budget TEXT DEFAULT 'moderate',
    style TEXT DEFAULT 'balanced',
    interests TEXT,
    status TEXT DEFAULT 'planning',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Itinerary items
db.exec(`
  CREATE TABLE IF NOT EXISTS itinerary_items (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    time TEXT,
    activity TEXT NOT NULL,
    location TEXT,
    duration TEXT,
    category TEXT,
    score INTEGER,
    notes TEXT,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (trip_id) REFERENCES trips(id)
  )
`);

// Activities database
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_local TEXT,
    city TEXT NOT NULL,
    category TEXT,
    description TEXT,
    duration TEXT,
    price TEXT,
    best_time TEXT,
    best_season TEXT,
    crowd_profile TEXT,
    weather_sensitivity TEXT,
    physical_difficulty TEXT,
    family_suitable INTEGER,
    teenager_suitable INTEGER,
    photography_rating INTEGER,
    coordinates TEXT,
    image_url TEXT,
    tags TEXT
  )
`);

// Weather cache
db.exec(`
  CREATE TABLE IF NOT EXISTS weather_cache (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    date TEXT NOT NULL,
    temperature REAL,
    feels_like REAL,
    precipitation REAL,
    wind_speed REAL,
    humidity REAL,
    visibility REAL,
    condition TEXT,
    forecast TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city, date)
  )
`);

// Seed sample activities
const activities = [
  { id: uuidv4(), name: "Chengdu Panda Base", name_local: "成都大熊猫繁育研究基地", city: "Chengdu", category: "Wildlife", description: "See giant pandas up close in their natural habitat", duration: "3 hours", price: "$10", best_time: "8:00am", best_season: "All year", crowd_profile: "High mornings", weather_sensitivity: "Low", physical_difficulty: "Easy", family_suitable: 1, teenager_suitable: 1, photography_rating: 9, coordinates: "30.7345,104.1477", tags: "wildlife,family,photography,unique" },
  { id: uuidv4(), name: "Jinli Ancient Street", name_local: "锦里古街", city: "Chengdu", category: "Culture", description: "Traditional Sichuan architecture, street food, and crafts", duration: "2 hours", price: "Free", best_time: "Evening", best_season: "All year", crowd_profile: "High evenings", weather_sensitivity: "Low", physical_difficulty: "Easy", family_suitable: 1, teenager_suitable: 1, photography_rating: 7, coordinates: "30.6456,104.0445", tags: "culture,food,shopping,history" },
  { id: uuidv4(), name: "People's Park", name_local: "人民公园", city: "Chengdu", category: "Nature", description: "Tea houses, ear cleaning, and local life", duration: "2 hours", price: "Free", best_time: "Morning", best_season: "All year", crowd_profile: "Moderate", weather_sensitivity: "Medium", physical_difficulty: "Easy", family_suitable: 1, teenager_suitable: 1, photography_rating: 6, coordinates: "30.6623,104.0555", tags: "nature,tea,local,relaxing" },
  { id: uuidv4(), name: "Mount Qingcheng", name_local: "青城山", city: "Chengdu", category: "Nature", description: "Taoist mountain with temples and hiking trails", duration: "6 hours", price: "$15", best_time: "8:00am", best_season: "Spring/Autumn", crowd_profile: "Low weekdays", weather_sensitivity: "High", physical_difficulty: "Moderate", family_suitable: 0, teenager_suitable: 1, photography_rating: 8, coordinates: "30.9075,103.5634", tags: "nature,hiking,temples,scenic" },
  { id: uuidv4(), name: "Taikoo Li + IFS", name_local: "太古里", city: "Chengdu", category: "Shopping", description: "Luxury shopping and modern architecture", duration: "3 hours", price: "Free", best_time: "Afternoon", best_season: "All year", crowd_profile: "High weekends", weather_sensitivity: "Low", physical_difficulty: "Easy", family_suitable: 1, teenager_suitable: 1, photography_rating: 7, coordinates: "30.6574,104.0815", tags: "shopping,modern,food,architecture" },
  { id: uuidv4(), name: "Forbidden City", name_local: "故宫", city: "Beijing", category: "History", description: "Imperial palace complex from Ming and Qing dynasties", duration: "4 hours", price: "$8", best_time: "8:30am", best_season: "Spring/Autumn", crowd_profile: "Very high", weather_sensitivity: "Low", physical_difficulty: "Easy", family_suitable: 1, teenager_suitable: 1, photography_rating: 9, coordinates: "39.9163,116.3972", tags: "history,architecture,culture,unesco" },
  { id: uuidv4(), name: "Great Wall (Mutianyu)", name_local: "慕田峪长城", city: "Beijing", category: "History", description: "Less crowded section of the Great Wall with cable car", duration: "5 hours", price: "$12", best_time: "8:00am", best_season: "Autumn", crowd_profile: "Moderate", weather_sensitivity: "High", physical_difficulty: "Moderate", family_suitable: 1, teenager_suitable: 1, photography_rating: 10, coordinates: "40.4319,116.5704", tags: "history,scenic,hiking,unesco" },
  { id: uuidv4(), name: "The Bund", name_local: "外滩", city: "Shanghai", category: "Landmark", description: "Historic waterfront with colonial architecture views", duration: "2 hours", price: "Free", best_time: "Sunset", best_season: "All year", crowd_profile: "High evenings", weather_sensitivity: "Medium", physical_difficulty: "Easy", family_suitable: 1, teenager_suitable: 1, photography_rating: 9, coordinates: "31.2397,121.4998", tags: "landmark,views,architecture,nightlife" },
];

const insertActivity = db.prepare(`
  INSERT OR IGNORE INTO activities (id, name, name_local, city, category, description, duration, price, best_time, best_season, crowd_profile, weather_sensitivity, physical_difficulty, family_suitable, teenager_suitable, photography_rating, coordinates, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const a of activities) {
  insertActivity.run(a.id, a.name, a.name_local, a.city, a.category, a.description, a.duration, a.price, a.best_time, a.best_season, a.crowd_profile, a.weather_sensitivity, a.physical_difficulty, a.family_suitable, a.teenager_suitable, a.photography_rating, a.coordinates, a.tags);
}

console.log('Database initialized with', activities.length, 'activities');

module.exports = db;
