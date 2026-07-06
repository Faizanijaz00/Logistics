# ⚡ Quick Fix for "failed to read eas.json" Error

## What Happened
Railway is trying to build the Expo mobile app instead of the Node.js backend server.

## ✅ The Fix (30 seconds)

### In Railway Dashboard:

1. **Go to your project settings**

2. **Find "Service Settings" section**

3. **Set Root Directory to**: `server`

4. **Click "Redeploy"**

That's it! Railway will now build from the `server/` directory.

---

## Alternative: Manual Override

If Root Directory setting doesn't work:

### Settings > Build:
```
Build Command: cd server && npm install
```

### Settings > Deploy:
```
Start Command: cd server && node index.js
```

Click **Save** and **Redeploy**.

---

## Why This Error Happened

Your repo has 3 projects:
- `server/` - Backend (Node.js) ← **This is what we want**
- `mobile/` - Mobile app (Expo)
- `src/` - Web frontend (Vite)

Railway auto-detected the Expo app by mistake.

The new configuration files prevent this:
- ✅ `.railwayignore` - Excludes mobile/frontend
- ✅ `railway.json` - Specifies server/ directory
- ✅ `nixpacks.toml` - Custom build instructions
- ✅ `Procfile` - Explicit start command

---

## Verify It Worked

After redeploying, check the build logs for:

✅ **Good signs:**
```
Installing server dependencies...
npm install in /app/server
Server started on port 3001
```

❌ **Bad signs:**
```
failed to read eas.json
Cannot find module 'expo'
```

---

## Test Your Deployment

```bash
curl https://your-railway-url.up.railway.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "traccarConnected": true,
  "environment": "production"
}
```

---

## Still Not Working?

See **RAILWAY_TROUBLESHOOTING.md** for detailed solutions.

Or try the nuclear option:
1. Delete the Railway service
2. Create new service from GitHub
3. **Immediately** set Root Directory to `server`
4. Add environment variables
5. Deploy

---

**Your changes have been pushed to GitHub. Redeploy in Railway now!**
