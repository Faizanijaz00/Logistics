# 🚚 Logistics - Fleet Management & GPS Tracking System

A comprehensive fleet management system with real-time GPS tracking, vehicle management, and driver coordination.

## 📋 Project Overview

This is a full-stack logistics management platform with:
- **Backend API** - Node.js/Express with WebSocket support
- **Web Frontend** - React/Vite with real-time updates
- **Mobile App** - React Native/Expo for iOS and Android
- **GPS Tracking** - Traccar/Vigitech integration
- **Vehicle Data** - DVLA & MOT API integration

---

## 🚀 Quick Start

### Backend Server

```bash
cd server
npm install      # Auto-generates .env with JWT secret
npm run dev      # Start development server on port 3001
```

**First time?** See [`server/README.md`](server/README.md)

### Web Frontend

```bash
npm install
npm run dev      # Start on http://localhost:5173
```

### Mobile App

```bash
cd mobile
npm install
npm start        # Start Expo dev server
# Press 'a' for Android or 'i' for iOS
```

---

## 🔐 Login Credentials (Development)

| Username | Password    | Role   | Access                                   |
|----------|-------------|--------|------------------------------------------|
| admin    | admin123    | Admin  | Full access — add/edit/delete vehicles, manage images, all settings |
| faizan   | driver123   | Driver | View map & fleet, select a car to drive  |
| ali      | driver123   | Driver | View map & fleet, select a car to drive  |
| adam     | driver123   | Driver | View map & fleet, select a car to drive  |
| fivos    | driver123   | Driver | View map & fleet, select a car to drive  |
| aris     | driver123   | Driver | View map & fleet, select a car to drive  |
| panos    | driver123   | Driver | View map & fleet, select a car to drive  |
| ar       | driver123   | Driver | View map & fleet, select a car to drive  |

---

## 🎯 Features

### Fleet Management
- ✅ Real-time vehicle tracking
- ✅ Vehicle inventory management
- ✅ Driver assignment
- ✅ Journey planning
- ✅ Trip records

### GPS Tracking
- ✅ Live position updates via WebSocket
- ✅ Vehicle location history
- ✅ Speed and heading data
- ✅ Traccar/Vigitech integration

### Vehicle Data
- ✅ DVLA vehicle registration lookup
- ✅ MOT history and expiry tracking
- ✅ Insurance, tax, maintenance records
- ✅ Document storage

### User Management
- ✅ Role-based access (Admin/Driver)
- ✅ JWT authentication
- ✅ Per-user tab permissions
- ✅ Vehicle assignment

---

## 🌐 Deployment

### Backend → Railway

```bash
# 1. Push to GitHub
git push origin main

# 2. Deploy to Railway
# See DEPLOYMENT_SUMMARY.md for full guide

# 3. Set environment variables in Railway dashboard
NODE_ENV=production
JWT_SECRET=<your-generated-secret>
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=<your-username>
TRACCAR_PASSWORD=<your-password>
```

📖 **Full Guide**: [`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md)

### Mobile App → APK

```bash
# 1. Login to Expo
eas login

# 2. Build APK
cd mobile
eas build --platform android --profile preview

# 3. Share download link!
```

📖 **Full Guide**: [`mobile/BUILD_APK.md`](mobile/BUILD_APK.md)

---

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **WebSocket**: ws library
- **Auth**: JWT (jsonwebtoken)
- **Database**: Supabase PostgreSQL
- **GPS**: Traccar/Vigitech API

### Web Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router
- **Maps**: Mapbox GL
- **State**: Zustand
- **UI**: Tailwind CSS

### Mobile App
- **Framework**: React Native (Expo 55)
- **Navigation**: Expo Router
- **Maps**: react-native-maps
- **State**: Zustand
- **Platform**: iOS & Android

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`DEPLOYMENT_SUMMARY.md`](DEPLOYMENT_SUMMARY.md) | Complete deployment overview |
| [`RAILWAY_DEPLOYMENT.md`](RAILWAY_DEPLOYMENT.md) | Railway deployment guide |
| [`server/README.md`](server/README.md) | Backend API documentation |
| [`mobile/BUILD_APK.md`](mobile/BUILD_APK.md) | Mobile app build guide |

---

## 🏗️ Project Structure

```
Logistics/
├── server/              # Backend API (Node.js/Express)
│   ├── index.js         # Main server
│   ├── auth.js          # Authentication
│   ├── vehicles.js      # Vehicle management
│   ├── journeys.js      # Journey planning
│   ├── setup.js         # Auto-setup script
│   └── traccarService.js # GPS tracking
│
├── mobile/              # Mobile app (Expo/React Native)
│   ├── app/             # App screens (Expo Router)
│   ├── src/             # Shared components
│   └── app.json         # Expo configuration
│
├── src/                 # Web frontend (React/Vite)
│   ├── components/      # UI components
│   ├── pages/           # Page components
│   └── lib/             # Utilities
│
└── public/              # Static assets
    ├── cars/            # Vehicle images
    └── docs/            # Documents
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check environment variables
cat server/.env

# Regenerate .env
rm server/.env && cd server && npm run setup
```

### Mobile app won't build
```bash
# Clear cache
cd mobile
eas build --platform android --profile preview --clear-cache
```

### WebSocket connection fails
- Use `wss://` (not `ws://`) in production
- Check CORS settings in Railway
- Verify Railway backend is running

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/Faizanijaz00/Logistics/issues)
- **Railway**: [Railway Docs](https://docs.railway.app)
- **Expo**: [Expo Forum](https://forums.expo.dev)

---

## 👥 Team

- **Owner**: Faizan Ijaz (@faizanijaz)
- **Developer**: Ivoine Inestrachan

---

**Built with ❤️ for efficient fleet management**
