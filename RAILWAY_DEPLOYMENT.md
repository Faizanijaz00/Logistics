# Railway Deployment Guide

This guide will walk you through deploying the Logistics Backend to Railway.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository connected to Railway
- All required API keys (DVLA, MOT, Traccar credentials)

## Step 1: Create New Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose the `Faizanijaz00/Logistics` repository
5. Railway will automatically detect the `railway.json` configuration

## Step 2: Configure Environment Variables

In your Railway project dashboard, go to the **Variables** tab and add the following:

### Required Variables (Must Set)

```bash
NODE_ENV=production
PORT=3001

# JWT Secret - Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-here

# Traccar GPS Server
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=your-traccar-username
TRACCAR_PASSWORD=your-traccar-password
TRACCAR_POLL_INTERVAL=30000
```

### Optional but Recommended

```bash
# CORS Origins (add your frontend URL when deployed)
CORS_ORIGIN=https://your-frontend-domain.com
CORS_ORIGIN_2=https://your-other-domain.com

# DVLA Vehicle Enquiry Service
DVLA_API_KEY=your_dvla_api_key

# DVSA MOT History API
MOT_CLIENT_ID=your_mot_client_id
MOT_CLIENT_SECRET=your_mot_client_secret
MOT_TOKEN_URL=https://api.mot.gov.uk/oauth/token
MOT_SCOPE=mot-history
MOT_API_KEY=your_mot_api_key
```

## Step 3: Railway Configuration

The repository is configured to automatically deploy the `server/` subdirectory:

✅ **Already configured:**
- `railway.json` - Tells Railway to build/run from server directory
- `nixpacks.toml` - Nixpacks build configuration
- `.railwayignore` - Ignores mobile/frontend directories

**No manual configuration needed!** Railway will automatically:
1. Install dependencies in `server/` directory
2. Run the setup script (generates JWT if needed)
3. Start the server with `node index.js`

## Step 4: Deploy

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Configure Railway deployment"
   git push origin main
   ```

2. Railway will automatically deploy on every push to your `main` branch
3. Monitor the build logs in the **Deployments** tab
4. Once deployed, Railway will provide a public URL (e.g., `https://logistics-production.up.railway.app`)

## Step 5: Verify Deployment

Test your deployment by visiting:

```bash
https://your-railway-url.up.railway.app/api/health
```

You should see a response like:
```json
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

## Step 6: Update Frontend

Update your frontend to use the Railway API URL:

```env
# In your frontend .env file
VITE_API_URL=https://your-railway-url.up.railway.app
```

## Common Issues & Troubleshooting

### Issue: Build fails with "Missing environment variables"

**Solution:** Make sure you've set all required environment variables in Railway:
- `JWT_SECRET`
- `TRACCAR_URL`
- `TRACCAR_USERNAME`
- `TRACCAR_PASSWORD`

### Issue: Health check fails

**Solution:**
1. Check Railway logs for errors
2. Verify the server is starting on the correct PORT
3. Ensure `NODE_ENV=production` is set

### Issue: CORS errors from frontend

**Solution:** Add your frontend domain to `CORS_ORIGIN`:
```bash
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Issue: WebSocket connections fail

**Solution:** Railway supports WebSockets by default. Make sure your frontend WebSocket URL uses:
- `wss://` (not `ws://`) for production
- Example: `wss://your-railway-url.up.railway.app/ws`

### Issue: File uploads not persisting

**Solution:** Railway uses ephemeral file systems. For persistent file storage:
1. Use Railway's persistent volumes (paid feature)
2. Or migrate to cloud storage (S3, Cloudinary) - recommended

## Monitoring & Logs

### View Logs
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# View logs
railway logs
```

### Enable Railway Observability
1. Go to your project **Observability** tab
2. Enable metrics tracking
3. Set up uptime monitoring

## Scaling & Performance

### Enable Auto-scaling
1. Go to **Settings** > **Resources**
2. Adjust memory/CPU allocation based on traffic
3. Railway automatically handles horizontal scaling

### Database Connection Pooling
Consider adding a connection pooler if you experience database connection issues at scale.

## Security Checklist

- ✅ All secrets moved to Railway environment variables
- ✅ No hardcoded credentials in code
- ✅ Strong JWT secret generated
- ✅ CORS properly configured for production domains
- ✅ HTTPS enabled (Railway provides this automatically)
- ⚠️ TODO: Add rate limiting middleware
- ⚠️ TODO: Add request validation
- ⚠️ TODO: Implement proper logging (Sentry/DataDog)

## Next Steps After Deployment

1. **Add Rate Limiting** - Protect against brute force attacks
2. **Implement Caching** - Use Redis for MOT/DVLA lookups
3. **Add Monitoring** - Set up Sentry for error tracking
4. **Setup CI/CD** - Add tests that run before deployment
5. **Database Backups** - Ensure Supabase backups are enabled
6. **Add Documentation** - Generate OpenAPI/Swagger docs

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: https://github.com/Faizanijaz00/Logistics/issues

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- Estimate: $5-15/month for small-medium traffic

Monitor usage in the **Usage** tab of your Railway dashboard.
