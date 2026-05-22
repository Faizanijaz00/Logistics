#!/usr/bin/env node

import { randomBytes } from 'crypto';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, '.env');

console.log('🚀 Logistics Backend Setup\n');

// Generate a secure JWT secret
function generateJwtSecret() {
  return randomBytes(32).toString('base64');
}

// Check if .env already exists
if (existsSync(ENV_FILE)) {
  console.log('⚠️  .env file already exists.');
  console.log('   If you want to regenerate, delete .env and run this script again.\n');

  const envContent = readFileSync(ENV_FILE, 'utf8');
  if (envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=your-super-secret')) {
    console.log('✅ JWT_SECRET is already configured!\n');
    process.exit(0);
  }
}

// Create .env file with generated JWT secret
const jwtSecret = generateJwtSecret();

const envTemplate = `# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Origins (comma-separated for multiple origins)
CORS_ORIGIN=http://localhost:5173
CORS_ORIGIN_2=

# JWT Secret (auto-generated - DO NOT SHARE)
JWT_SECRET=${jwtSecret}

# Traccar GPS Server
TRACCAR_URL=https://tracking.vigitech.uk
TRACCAR_USERNAME=faizan11ijaz@gmail.com
TRACCAR_PASSWORD=n491YgzD4Q
TRACCAR_POLL_INTERVAL=30000

# DVLA Vehicle Enquiry Service API Key
DVLA_API_KEY=

# DVSA MOT History API (OAuth2)
MOT_CLIENT_ID=
MOT_CLIENT_SECRET=
MOT_TOKEN_URL=https://api.mot.gov.uk/oauth/token
MOT_SCOPE=mot-history
MOT_API_KEY=

# Supabase (optional - uses embedded keys if not set)
SUPABASE_URL=https://bwwfrdwpcxzlvprswzne.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo
`;

writeFileSync(ENV_FILE, envTemplate);

console.log('✅ .env file created successfully!');
console.log('✅ JWT_SECRET generated securely\n');
console.log('📝 Your JWT Secret (save this for Railway):');
console.log('━'.repeat(60));
console.log(jwtSecret);
console.log('━'.repeat(60));
console.log('\n🎯 Next Steps:\n');
console.log('1. Local Development:');
console.log('   npm run dev\n');
console.log('2. Railway Deployment:');
console.log('   - Copy the JWT_SECRET above');
console.log('   - Add it to Railway environment variables');
console.log('   - Deploy your app\n');
console.log('✨ Setup complete!\n');
