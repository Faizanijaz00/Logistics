# Logistics Backend Server

Node.js/Express backend for the Logistics fleet management and GPS tracking system.

## Quick Start

### First Time Setup

```bash
cd server
npm install
# This automatically runs setup.js and generates your .env file with secure JWT secret
```

### Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

### Run Production Server

```bash
npm start
```

## What Happened During Setup?

When you ran `npm install`, the `setup.js` script automatically:
- ✅ Generated a secure JWT secret using Node.js crypto
- ✅ Created your `.env` file with all configuration
- ✅ Pre-filled Traccar credentials
- ✅ Set up Supabase connection

**No more manual OpenSSL commands needed!** 🎉

## Environment Variables

All environment variables are in `server/.env` (created automatically).

### Required for Production
- `JWT_SECRET` - Auto-generated, copy this to Railway
- `TRACCAR_URL` - GPS tracking server
- `TRACCAR_USERNAME` - Traccar login
- `TRACCAR_PASSWORD` - Traccar password

### Optional
- `DVLA_API_KEY` - UK vehicle registration lookup
- `MOT_CLIENT_ID` - MOT history API
- `MOT_CLIENT_SECRET` - MOT history API
- `CORS_ORIGIN` - Frontend URL (for production)

## API Endpoints

### Health Check
```bash
GET /api/health
```

### Authentication
```bash
POST /api/auth/login
GET /api/auth/me
POST /api/auth/select-vehicle
GET /api/auth/users
POST /api/auth/register
```

### Vehicles
```bash
GET /api/vehicles
POST /api/vehicles
PATCH /api/vehicles/:id
DELETE /api/vehicles/:id
```

### Journeys
```bash
GET /api/journeys
POST /api/journeys
PATCH /api/journeys/:id
DELETE /api/journeys/:id
```

### GPS Tracking
```bash
GET /api/devices
GET /api/positions
WS /ws  # WebSocket for real-time updates
```

### Vehicle Lookup
```bash
POST /api/vehicle-lookup  # DVLA
GET /api/mot-lookup?registration=ABC123  # MOT History
```

### File Uploads
```bash
POST /api/upload-image  # With background removal
POST /api/upload-photo  # Without background removal
POST /api/upload-doc    # Document upload
```

## Project Structure

```
server/
├── index.js              # Main server entry point
├── config.js             # Configuration loader
├── auth.js               # Authentication routes & middleware
├── journeys.js           # Journey management
├── vehicles.js           # Vehicle management
├── trips.js              # Trip records
├── passengers.js         # Passenger directory
├── misc.js               # Activities, tickets, etc.
├── traccarService.js     # GPS tracking integration
├── tracking.js           # GPS tracking management
├── setup.js              # Auto-setup script
├── package.json          # Dependencies
├── .env                  # Environment variables (auto-generated)
├── .env.example          # Template
├── railway.json          # Railway deployment config
└── data/                 # Local JSON fallback storage
    ├── users.json
    ├── passengers.json
    └── trips.json
```

## Railway Deployment

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add backend server"
git push origin main
```

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `Faizanijaz00/Logistics`

### Step 3: Set Environment Variables

Copy your JWT_SECRET from the setup output:
```bash
# Your JWT secret is in server/.env
cat server/.env | grep JWT_SECRET
```

In Railway dashboard, add these variables:
```bash
NODE_ENV=production
JWT_SECRET=<paste-your-jwt-secret-here>
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=faizan11ijaz@gmail.com
TRACCAR_PASSWORD=n491YgzD4Q
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

### Step 4: Configure Root Directory

In Railway Settings:
- Set **Root Directory** to: `server`

Or use the existing `railway.json` config (already set up).

### Step 5: Deploy!

Railway auto-deploys. Your API will be at:
```
https://logistics-production-xyz.up.railway.app
```

## Testing the Deployment

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/api/health

# Should return:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 120,
  "traccarConnected": true,
  "deviceCount": 2,
  "environment": "production",
  "version": "1.0.0"
}
```

## Troubleshooting

### "Missing environment variables" error
- Make sure you set all required variables in Railway
- Check logs: `railway logs`

### CORS errors
- Add your frontend URL to `CORS_ORIGIN` in Railway variables

### WebSocket connection fails
- Use `wss://` (not `ws://`) in production
- Railway supports WebSockets by default

### Setup script not running
```bash
# Manually run setup
npm run setup
```

## Development Tips

### Watch mode (auto-restart on changes)
```bash
npm run dev
```

### Check current JWT secret
```bash
cat .env | grep JWT_SECRET
```

### Regenerate JWT secret
```bash
rm .env
npm run setup
```

## Security Notes

- ✅ JWT secret is auto-generated and secure
- ✅ `.env` is git-ignored (secrets stay local)
- ✅ Hardcoded credentials removed from code
- ⚠️ TODO: Add rate limiting
- ⚠️ TODO: Add request validation

## Next Steps

See `../RAILWAY_DEPLOYMENT.md` for detailed deployment guide.

## Support

- Issues: https://github.com/Faizanijaz00/Logistics/issues
- Railway Docs: https://docs.railway.app
