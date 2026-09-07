# TripPilot Backend

API-only backend for TripPilot travel planning app.

## Architecture

- **Backend** (this folder): Node.js/Express API at `https://travel-r5tx.onrender.com`
- **Frontend**: Static HTML files (`index.html`, `dashboard.html`) served separately

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user (requires Bearer token)

### Trips
- `GET /api/trips` - List user's trips
- `POST /api/trips` - Create trip
- `GET /api/trips/:id` - Get trip with itinerary
- `DELETE /api/trips/:id` - Delete trip

### Itinerary
- `POST /api/trips/:tripId/itinerary` - Add item
- `PATCH /api/itinerary/:id` - Toggle completed

### Activities
- `GET /api/activities?city=&tags=` - Browse activities
- `GET /api/activities/:id` - Activity details

### Weather & Recommendations
- `GET /api/weather/:city` - Current weather + forecast
- `POST /api/recommendations` - AI-style activity scoring

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-frontend-url.com
PORT=3000
```

## Deploy to Render

1. Create a new **Web Service** on Render
2. Connect this GitHub repo
3. Set root directory to `backend/`
4. Add environment variables in Render dashboard:
   - `JWT_SECRET` = generate a random string
   - `FRONTEND_URL` = your frontend URL (e.g., GitHub Pages)
5. Deploy

The service will auto-start with `node server.js`.
