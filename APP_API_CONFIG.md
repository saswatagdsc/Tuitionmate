# TutorMate App Configuration Guide

## API Connection Setup for Mobile App

### For Android App

The Android app needs to connect to your backend server. There are two scenarios:

#### Scenario 1: Using Android Emulator
The Android emulator has a special alias `10.0.2.2` that refers to your host machine's localhost.

**Configuration (Already Set):**
- API URL: `http://10.0.2.2:4000/api`
- This will automatically be used when running in Capacitor

#### Scenario 2: Using Physical Android Device
For a physical device on the same network as your development machine:

**Steps:**
1. Find your machine's local IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
   Look for IPv4 address like `192.168.x.x`

2. Set environment variable:
   ```bash
   VITE_API_URL=http://YOUR_MACHINE_IP:4000/api
   ```

3. Make sure firewall allows port 4000:
   - Windows: Add exception in Windows Defender Firewall
   - Mac: System Preferences → Security & Privacy → Firewall

4. Restart both servers:
   ```bash
   npm run server
   npm run dev -- --host
   ```

### For iOS App
Same as physical Android device - use your machine's local IP address.

### Testing API Connection

#### From App Console:
```javascript
// Open app console and test
fetch('http://10.0.2.2:4000/api/batches')
  .then(r => r.json())
  .then(d => console.log('Batches:', d))
  .catch(e => console.error('Error:', e))
```

#### Check Server Logs:
When making requests from the app, you should see logs like:
```
Fetched batches from DB: 2 batches
Attempting to delete batch with ID: xyz123
Successfully deleted batch: xyz123
```

### Troubleshooting

#### Issue: "Network Error" or "Failed to Fetch"
**Cause:** App can't reach the server

**Solutions:**
1. Verify backend is running: `npm run server`
2. Check firewall isn't blocking port 4000
3. If using physical device, verify it's on same network as computer
4. Check machine IP address is correct (not localhost)

#### Issue: CORS Errors
**Cause:** Server blocking requests from the app

**Solution:** Already configured - server accepts all origins from mobile apps

#### Issue: Timeouts
**Cause:** Server is slow or MongoDB not connected

**Solutions:**
1. Check MongoDB connection: "Connected to MongoDB via Mongoose" in server logs
2. Ensure .env has valid MONGODB_URI
3. Check server logs for errors

### Current API Configuration

**Auto-Detection Logic in store.tsx:**
```
if (Capacitor app detected) {
  API_BASE = 'http://10.0.2.2:4000/api'  // Android emulator
} else if (VITE_API_URL env set) {
  API_BASE = process.env.VITE_API_URL
} else {
  API_BASE = '/api'  // Web dev server proxy
}
```

### Server CORS Configuration

The backend now accepts requests from:
- localhost (port 3000, 5173)
- Mobile apps (Capacitor, Ionic)
- Any origin (for compatibility)

All HTTP methods supported: GET, POST, PUT, PATCH, DELETE

### Quick Start for Testing Delete on App

1. **Terminal 1 - Start Backend:**
   ```bash
   npm run server
   ```
   Expected: "API server running on http://localhost:4000"

2. **Terminal 2 - Start Frontend:**
   ```bash
   npm run dev -- --host
   ```
   Expected: "Local: http://localhost:3000"

3. **Build and Deploy to App:**
   ```bash
   npm run build
   # Then deploy to Android/iOS using Capacitor
   ```

4. **Test Delete in App:**
   - Create a batch on web
   - Open app
   - Navigate to Batches
   - Click Delete
   - Should work instantly now!

### Environment Variables

Add to `.env` if using physical device:
```
VITE_API_URL=http://192.168.1.X:4000/api
```

Replace `192.168.1.X` with your actual machine IP

### Logs to Watch

**App Console (when API_BASE is set):**
```
API_BASE configured as: http://10.0.2.2:4000/api
Delete button clicked for batch ID: ...
Attempting DELETE request to: http://10.0.2.2:4000/api/batches/...
```

**Server Console:**
```
Attempting to delete batch with ID: ...
Successfully deleted batch: ...
CORS request from: capacitor://localhost
```

Both should be visible for successful delete!
