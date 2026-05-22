# Railway Deployment Troubleshooting

## Common Issue: "failed to read eas.json"

### Problem
Railway is trying to build the Expo mobile app instead of the backend server.

### Why This Happens
Railway auto-detects project types. In a monorepo with multiple projects, it might detect the wrong one:
- ❌ It found `mobile/eas.json` (Expo app)
- ✅ It should build `server/` (Node.js backend)

### Solution

The repository is now configured with multiple safeguards to ensure Railway builds the server:

#### 1. **.railwayignore** (Exclude mobile/frontend)
```
# Ignore everything except server directory
*
!server/
!server/**
!Procfile
!railway.json
!nixpacks.toml
```

#### 2. **railway.json** (Explicit configuration)
```json
{
  "build": {
    "watchPatterns": ["server/**"]
  },
  "deploy": {
    "startCommand": "cd server && node index.js"
  }
}
```

#### 3. **nixpacks.toml** (Build instructions)
```toml
[phases.install]
cmds = ['cd server && npm install']

[start]
cmd = 'cd server && node index.js'
```

#### 4. **Procfile** (Process definition)
```
web: cd server && npm start
```

---

## Manual Fix in Railway Dashboard

If Railway still tries to build the wrong directory:

### Option 1: Set Root Directory (Recommended)

1. Go to your Railway project
2. Click **Settings**
3. Scroll to **Service Settings**
4. Set **Root Directory** to: `server`
5. Click **Save**
6. Redeploy

This tells Railway to treat `server/` as the project root.

### Option 2: Override Build Command

1. Go to **Settings** > **Build**
2. Set **Build Command** to:
   ```bash
   cd server && npm install
   ```
3. Set **Start Command** to:
   ```bash
   cd server && node index.js
   ```
4. Click **Save**
5. Redeploy

### Option 3: Use Custom Dockerfile

If neither works, create a `Dockerfile` at the root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy only server directory
COPY server/package*.json ./
RUN npm install

COPY server/ ./

EXPOSE 3001

CMD ["node", "index.js"]
```

Then in Railway Settings:
- Set **Builder** to: `Dockerfile`

---

## Verification Steps

After pushing your configuration:

### 1. Check Railway Build Logs

Look for these indicators in the build logs:

✅ **Good signs:**
```
Installing server dependencies...
Running server setup...
Server started on port 3001
```

❌ **Bad signs:**
```
failed to read eas.json
Cannot find package 'expo'
React Native build failed
```

### 2. Check Deployment

If deployment succeeds:
```bash
curl https://your-railway-url.up.railway.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "environment": "production"
}
```

---

## Other Common Issues

### Issue: "Cannot find module 'dotenv'"

**Symptom:** Server crashes with missing dependency error

**Solution:**
- Railway didn't install dependencies correctly
- Check that `server/package.json` exists
- Try setting Root Directory to `server` in Railway settings

### Issue: "Missing environment variables"

**Symptom:** Server logs show "Missing required environment variables"

**Solution:** Add in Railway dashboard under **Variables** tab:
```bash
NODE_ENV=production
JWT_SECRET=VQ+TbSR8TBUqo1bpTAZ0hMlqIYSR4PxSHAszR4La0kE=
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=your-username
TRACCAR_PASSWORD=your-password
```

### Issue: Port Binding Error

**Symptom:** `Error: listen EADDRINUSE :::3001`

**Solution:**
- Railway automatically sets the `PORT` environment variable
- Your code already handles this in `config.js`
- Don't manually set PORT in Railway env vars

### Issue: Health Check Failing

**Symptom:** Railway shows "Unhealthy" status

**Solution:**
1. Check if `/api/health` endpoint is accessible
2. Verify server is actually starting (check logs)
3. Ensure `healthcheckPath` in `railway.json` is correct
4. Try increasing `healthcheckTimeout` to 300

### Issue: Build Timeout

**Symptom:** Build fails after 10 minutes

**Solution:**
- Normal build should take 2-5 minutes
- If timing out, dependencies might be too large
- Try: Delete `node_modules` from git if accidentally committed
- Check if `npm install` is hanging on a package

---

## Debug Commands

### View Railway Logs
```bash
npm install -g @railway/cli
railway login
railway logs
```

### Test Locally First
```bash
cd server
npm install
NODE_ENV=production npm start
```

If it works locally, it should work on Railway with proper environment variables.

### Check Railway Environment
```bash
railway variables
```

---

## Nuclear Option: Fresh Deploy

If nothing works:

1. **Delete the Railway service**
   - Go to your project
   - Settings > Danger Zone > Delete Service

2. **Create new service with explicit configuration**
   - New Service > Deploy from GitHub
   - After creation, immediately go to Settings
   - Set Root Directory: `server`
   - Add all environment variables
   - Deploy

---

## Monorepo Best Practices for Railway

For future projects with monorepos:

1. ✅ Always use `.railwayignore` to exclude other apps
2. ✅ Set Root Directory in Railway settings
3. ✅ Use `railway.json` with `watchPatterns`
4. ✅ Add explicit build/start commands
5. ✅ Create a dedicated `railway` branch if needed

---

## Still Having Issues?

1. **Check Railway Status**: https://status.railway.app/
2. **Railway Discord**: https://discord.gg/railway
3. **GitHub Issues**: https://github.com/Faizanijaz00/Logistics/issues
4. **Railway Docs**: https://docs.railway.app

---

## Quick Checklist

Before deploying, verify:

- [ ] `railway.json` exists at project root
- [ ] `nixpacks.toml` exists at project root
- [ ] `.railwayignore` excludes mobile/ and src/
- [ ] `server/package.json` has all dependencies
- [ ] Environment variables set in Railway dashboard
- [ ] Root Directory set to `server` (optional but recommended)
- [ ] Build command: `cd server && npm install`
- [ ] Start command: `cd server && node index.js`

---

**After following these steps, Railway should correctly build your server!**
