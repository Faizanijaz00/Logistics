# 📱 Building APK for Android

This guide shows how to build and distribute your Logistics mobile app as an APK using Expo Application Services (EAS).

## Prerequisites

- Expo account (sign up at [expo.dev](https://expo.dev))
- EAS CLI installed globally
- Android device or emulator for testing

## Already Configured ✅

Your app is already set up with:
- **EAS Project ID**: `a3aede58-5e9b-4d26-9fe1-00e4eeea9021`
- **Bundle ID (Android)**: `com.logistics.app`
- **Bundle ID (iOS)**: `com.logistics.app`
- **Owner**: `faizanijaz`

---

## Quick Start - Build APK

### 1. Install EAS CLI (if not already installed)

```bash
npm install --global eas-cli
```

### 2. Login to Expo

```bash
eas login
```

Use your Expo account credentials.

### 3. Build APK for Testing (Preview Build)

```bash
cd mobile
eas build --platform android --profile preview
```

This creates an **APK** (not AAB) that you can:
- Install directly on Android devices
- Share with testers
- Distribute outside Google Play Store

**Build time**: ~10-15 minutes

### 4. Download APK

Once the build completes, EAS will provide a download link:
```
✔ Build complete!
https://expo.dev/artifacts/eas/[build-id].apk
```

**Share this link** with anyone to install the app!

---

## Build Types Explained

### Development Build
```bash
eas build --platform android --profile development
```
- For active development
- Includes dev tools
- Larger file size
- Not for distribution

### Preview Build (Recommended for Testing)
```bash
eas build --platform android --profile preview
```
- ✅ **Creates APK** (easy to install)
- Internal testing
- Smaller than development
- Can be shared directly

### Production Build
```bash
eas build --platform android --profile production
```
- Creates **AAB** (for Google Play Store)
- Optimized and signed
- Requires Google Play Console setup
- Auto-increments version

---

## Installation Methods

### Method 1: Direct Link (Easiest)
1. Share the EAS build URL with users
2. They open it on Android device
3. Click "Download" and install
4. May need to enable "Install from Unknown Sources"

### Method 2: QR Code
```bash
eas build --platform android --profile preview
```
Scan the QR code displayed in terminal with Android device.

### Method 3: Manual Download
1. Download APK from EAS dashboard: [expo.dev](https://expo.dev/accounts/faizanijaz/projects/logistics/builds)
2. Transfer to Android device via USB/email/cloud
3. Open APK file and install

---

## Connecting to Railway Backend

### Update API URL

Before building, update the API URL to point to your Railway backend:

**Option 1: Environment Variables (Recommended)**

Create `mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app
EXPO_PUBLIC_WS_URL=wss://your-railway-url.up.railway.app/ws
```

**Option 2: App Config**

Update `mobile/app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-railway-url.up.railway.app",
      "wsUrl": "wss://your-railway-url.up.railway.app/ws"
    }
  }
}
```

Then in your code:
```javascript
import Constants from 'expo-constants';
const API_URL = Constants.expoConfig.extra.apiUrl;
```

---

## Build Configuration (eas.json)

Your current build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"  // 👈 Creates APK, not AAB
      }
    },
    "production": {
      "autoIncrement": true  // 👈 Auto-increments version
    }
  }
}
```

---

## Advanced: Custom Build Configuration

### Add Environment Variables to Build

Update `eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-railway-url.up.railway.app"
      }
    }
  }
}
```

### Change App Version

Update `mobile/app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1  // Increment for each release
    }
  }
}
```

### Add App Signing (for Production)

```bash
eas credentials
```

Follow prompts to generate/manage signing keys.

---

## Publishing to Google Play Store

### 1. Build Production AAB
```bash
eas build --platform android --profile production
```

### 2. Download AAB
From [expo.dev/accounts/faizanijaz/projects/logistics/builds](https://expo.dev/accounts/faizanijaz/projects/logistics/builds)

### 3. Upload to Google Play Console
1. Go to [play.google.com/console](https://play.google.com/console)
2. Create app listing
3. Upload AAB to Internal Testing → Closed Testing → Production
4. Fill out store listing (screenshots, description, etc.)
5. Submit for review

**Timeline**: 1-7 days for review

---

## iOS Build (Bonus)

### Build iOS App
```bash
eas build --platform ios --profile preview
```

**Requirements**:
- Apple Developer account ($99/year)
- Signing certificates (managed by EAS)

**Distribution**:
- TestFlight (beta testing)
- App Store (production)

---

## Monitoring Builds

### View All Builds
```bash
eas build:list
```

### View Build Details
```bash
eas build:view [build-id]
```

### Dashboard
[expo.dev/accounts/faizanijaz/projects/logistics/builds](https://expo.dev/accounts/faizanijaz/projects/logistics/builds)

---

## Troubleshooting

### Issue: "Build failed"
**Solution:**
```bash
# Check build logs
eas build:view [build-id]

# Common fixes:
# 1. Clear cache
eas build --platform android --profile preview --clear-cache

# 2. Update dependencies
npm install

# 3. Check eas.json syntax
```

### Issue: "APK won't install"
**Solution:**
- Enable "Install from Unknown Sources" in Android settings
- Check Android version (requires Android 5.0+)
- Verify APK wasn't corrupted during download

### Issue: "App crashes on startup"
**Solution:**
- Check API_URL is correct
- Verify Railway backend is running
- Check app logs: `adb logcat | grep Logistics`

### Issue: Build stuck/taking too long
**Solution:**
- Normal build time: 10-15 minutes
- If >30 minutes, cancel and rebuild:
  ```bash
  eas build:cancel [build-id]
  eas build --platform android --profile preview
  ```

---

## Development Workflow

### 1. Develop Locally
```bash
cd mobile
npm start
# Press 'a' for Android emulator
```

### 2. Test on Device
```bash
npx expo start --tunnel
# Scan QR code with Expo Go app
```

### 3. Build Preview APK
```bash
eas build --platform android --profile preview
```

### 4. Distribute to Testers
Share the APK download link from EAS.

### 5. Collect Feedback
Use EAS Updates for over-the-air fixes (without rebuilding).

---

## EAS Updates (Over-The-Air)

Push updates without rebuilding APK:

```bash
# Make code changes, then:
eas update --branch preview --message "Fixed login bug"
```

Users get updates automatically next time they open the app!

**Note**: Can't update native code (only JS/assets).

---

## Useful Commands

```bash
# Check EAS status
eas whoami

# List all projects
eas project:list

# Configure project
eas build:configure

# View credentials
eas credentials

# Submit to stores
eas submit --platform android

# Create update
eas update

# View update history
eas update:list
```

---

## Cost

**EAS Build Pricing** (as of 2024):
- **Free Tier**: 30 builds/month
- **Production Tier**: $29/month (unlimited builds)

**Google Play Store**:
- One-time fee: $25

**Apple App Store**:
- Annual fee: $99/year

---

## Summary

### To Build and Share APK:

```bash
# 1. Login
eas login

# 2. Build
cd mobile
eas build --platform android --profile preview

# 3. Wait 10-15 minutes

# 4. Share the download link from terminal/email

# 5. Users install APK directly on Android
```

**That's it!** No Google Play Store needed for testing.

---

## Next Steps

1. ✅ Build preview APK
2. ✅ Test on Android device
3. ✅ Share with team/testers
4. ⚠️ Update API URL to Railway backend
5. ⚠️ Set up Google Play Console (for production)
6. ⚠️ Add app icon and splash screen
7. ⚠️ Enable EAS Updates for OTA updates

---

## Resources

- EAS Docs: https://docs.expo.dev/eas/
- EAS Dashboard: https://expo.dev/accounts/faizanijaz/projects/logistics
- Expo Forum: https://forums.expo.dev/
- React Native Docs: https://reactnative.dev/

---

## Support

- Issues: https://github.com/Faizanijaz00/Logistics/issues
- Expo Discord: https://chat.expo.dev/
