# Railway Deployment Configuration

This project deploys the **backend server** located in the `server/` directory.

## Build Configuration

- **Root Directory**: Repository root (monorepo setup)
- **Server Code**: `server/` subdirectory
- **Start Command**: `cd server && node index.js`

## Important Files

- `railway.json` - Railway service configuration
- `nixpacks.toml` - Nixpacks build configuration
- `.railwayignore` - Files to ignore during deployment
- `Procfile` - Process definitions

## Environment Variables Required

```
NODE_ENV=production
JWT_SECRET=<your-jwt-secret>
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=<your-username>
TRACCAR_PASSWORD=<your-password>
TRACCAR_POLL_INTERVAL=30000
```

## What Gets Deployed

Only the `server/` directory is deployed to Railway. The frontend (`src/`) and mobile app (`mobile/`) are excluded via `.railwayignore`.
