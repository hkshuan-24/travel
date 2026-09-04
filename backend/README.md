# TripPilot Backend

Node.js + Express + SQLite API for TripPilot.

## Quick Start

```bash
cd backend
npm install
npm start
```

API runs on `http://localhost:3000`

## Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET /api/auth/me` — Current user (requires Bearer token)

### Trips
- `POST /api/trips` — Create trip
- `GET /api/trips` — List my trips
- `GET /api/trips/:id` — Get trip + itinerary
- `DELETE /api/trips/:id` — Delete trip

### Itinerary
- `POST /api/trips/:tripId/itinerary` — Add item
- `PATCH /api/itinerary/:id` — Mark complete

### Activities
- `GET /api/activities?city=Chengdu&tags=food` — Browse activities
- `GET /api/activities/:id` — Activity detail

### Weather
- `GET /api/weather/:city` — Current + forecast

### Recommendations
- `POST /api/recommendations` — AI scoring engine

### Misc
- `GET /api/cities` — List available cities
- `GET /api/health` — Health check
