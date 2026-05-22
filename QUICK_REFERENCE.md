# ⚡ Quick Reference Card

## 🚀 One-Line Commands

### Local Development
```bash
# Backend
cd server && npm install && npm run dev

# Frontend
npm install && npm run dev

# Mobile
cd mobile && npm start
```

### Deploy Backend to Railway
```bash
git push origin main
# Then set env vars in Railway dashboard
```

### Build Mobile APK
```bash
eas login && cd mobile && eas build --platform android --profile preview
```

---

## 🔑 Your Credentials

### JWT Secret (for Railway)
```
VQ+TbSR8TBUqo1bpTAZ0hMlqIYSR4PxSHAszR4La0kE=
```

### Traccar GPS
```
URL: https://tracking.vigitech.uk
Username: faizan11ijaz@gmail.com
Password: n491YgzD4Q
```

### EAS Project
```
Project ID: a3aede58-5e9b-4d26-9fe1-00e4eeea9021
Owner: faizanijaz
```

---

## 🌐 Important URLs

### Local Development
- Backend API: http://localhost:3001
- Frontend: http://localhost:5173
- Health Check: http://localhost:3001/api/health

### Production (Railway)
- Backend API: https://your-app.up.railway.app
- Health Check: https://your-app.up.railway.app/api/health

### Dashboards
- Railway: https://railway.app
- Expo: https://expo.dev/accounts/faizanijaz/projects/logistics
- GitHub: https://github.com/Faizanijaz00/Logistics

---

## 📋 Railway Environment Variables

Copy-paste these into Railway:

```bash
NODE_ENV=production
JWT_SECRET=VQ+TbSR8TBUqo1bpTAZ0hMlqIYSR4PxSHAszR4La0kE=
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=faizan11ijaz@gmail.com
TRACCAR_PASSWORD=n491YgzD4Q
TRACCAR_POLL_INTERVAL=30000
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

---

## 🧪 Test Login Credentials

| Username | Password  | Role   |
|----------|-----------|--------|
| admin    | admin123  | Admin  |
| faizan   | driver123 | Driver |

---

## 📱 Mobile App Commands

```bash
# Development
cd mobile
npm start
# Press 'a' for Android, 'i' for iOS

# Build APK (preview/testing)
eas build --platform android --profile preview

# Build for Production
eas build --platform android --profile production

# Push OTA update
eas update --branch preview --message "Bug fix"
```

---

## 🛠️ Common Tasks

### Regenerate JWT Secret
```bash
rm server/.env
cd server && npm run setup
```

### View Logs
```bash
# Railway logs
railway logs

# Local backend logs
cd server && npm run dev
```

### Check Health
```bash
curl http://localhost:3001/api/health
curl https://your-app.up.railway.app/api/health
```

---

## 📚 Documentation Links

- [Deployment Summary](DEPLOYMENT_SUMMARY.md)
- [Railway Guide](RAILWAY_DEPLOYMENT.md)
- [Server Docs](server/README.md)
- [Mobile APK Guide](mobile/BUILD_APK.md)

---

## 🆘 Emergency Fixes

### Backend won't start
```bash
rm server/.env && cd server && npm run setup
```

### Mobile build fails
```bash
cd mobile && eas build --clear-cache --platform android --profile preview
```

### Frontend CORS error
Add your Railway URL to `CORS_ORIGIN` in Railway dashboard.

---

**Save this file for quick access!**
