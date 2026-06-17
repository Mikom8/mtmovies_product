# Telebirr Proxy Server

A lightweight proxy server to fetch Telebirr payment receipts from regions where `transactioninfo.ethiotelecom.et` is blocked or restricted.

## Features

✅ **Docker Support** - Production-ready containerized deployment  
✅ **Auto Keep-Alive** - Railway backend automatically pings to prevent sleep  
✅ **Health Checks** - Built-in monitoring and auto-restart  
✅ **Lightweight** - ~60MB Docker image (Alpine Linux)  
✅ **Free Tier** - Works perfectly on Render free plan  
✅ **CORS Enabled** - Ready for Railway backend integration  

---

## Purpose

Railway and most Western cloud providers cannot directly access Ethio Telecom's transaction info service due to geo-restrictions. This proxy server should be deployed in a region with access (like Render) to act as a bridge.

---

## 🚀 Quick Deploy (5 Minutes)

### Option 1: Docker (Recommended)

1. Push to GitHub:
   ```bash
   cd telebirr-proxy
   git init
   git add .
   git commit -m "Telebirr proxy with Docker"
   git push
   ```

2. Deploy on Render:
   - New Web Service
   - Connect repo
   - **Render auto-detects Dockerfile** ✅
   - Deploy!

3. Get URL: `https://telebirr-proxy.onrender.com`

### Option 2: Node.js (Simple)

1. Change `render.yaml`:
   ```yaml
   env: node
   buildCommand: npm install
   startCommand: npm start
   ```

2. Deploy on Render (same as above)

---

## 📦 What's Included

```
telebirr-proxy/
├── server.js              ✅ Main proxy server
├── Dockerfile             ✅ NEW - Docker containerization
├── .dockerignore          ✅ NEW - Optimize Docker builds
├── keep-alive.js          ✅ NEW - Optional keep-alive script
├── package.json           ✅ Dependencies
├── render.yaml            ✅ Auto-deploy config (Docker)
├── deploy.sh / .bat       ✅ Deployment helpers
├── README.md              ✅ This file
├── QUICK_START.md         ✅ 5-minute setup
├── KEEP_ALIVE_GUIDE.md    ✅ NEW - Prevent sleep guide
└── DOCKER_DEPLOYMENT.md   ✅ NEW - Docker details
```

---

## 🔄 Keep-Alive (No Cold Starts!)

Your Railway backend **automatically pings** this proxy every 10 minutes to keep it awake on Render's free tier.

### How It Works:

```
Railway → (every 10 min) → Render Proxy /ping → Stays Awake ✅
```

### What You Get:

✅ No cold starts (always warm)  
✅ Fast payment verification (2-4 seconds)  
✅ Free ($0/month)  
✅ Automatic (no manual setup)  

**See `KEEP_ALIVE_GUIDE.md` for details**

---

## 🐳 Docker Benefits

✅ **60MB image** (Alpine Linux)  
✅ **Health checks** - Auto-restart if unhealthy  
✅ **Consistent** - Same behavior everywhere  
✅ **Production-ready** - Best practices built-in  

**See `DOCKER_DEPLOYMENT.md` for details**

---

## 📡 API Endpoints

### `GET /`
Health check and service info

**Response**:
```json
{
  "status": "online",
  "service": "Telebirr Proxy Server",
  "uptime": 12345,
  "timestamp": "2026-06-17T..."
}
```

### `GET /health`
Health check for monitoring

**Response**:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2026-06-17T..."
}
```

### `GET /ping`
Keep-alive endpoint (Railway pings this)

**Response**: `pong`

### `GET /fetch/:transactionId`
Fetch Telebirr receipt HTML

**Parameters**:
- `transactionId` - Telebirr transaction ID (e.g., DFG60WWREQ)

**Success Response**: HTML content
**Error Response** (502):
```json
{
  "error": "Failed to fetch receipt from Telebirr",
  "details": "Request timed out",
  "transactionId": "DFG60WWREQ"
}
```

---

## ⚙️ Configuration

### Railway Backend Setup:

After deploying, add to Railway environment:

```bash
TELEBIRR_PROXY_URL=https://telebirr-proxy.onrender.com
```

Railway backend will:
1. Use this proxy for payment verification
2. Auto-ping every 10 minutes to keep it awake

**That's it!** No other configuration needed.

---

## 🧪 Testing

### Test Locally:

```bash
# Install
npm install

# Run
npm start

# Test health
curl http://localhost:10000/health

# Test ping
curl http://localhost:10000/ping

# Test fetch (with real transaction ID)
curl http://localhost:10000/fetch/DFG60WWREQ
```

### Test with Docker:

```bash
# Build
docker build -t telebirr-proxy .

# Run
docker run -p 10000:10000 telebirr-proxy

# Test
curl http://localhost:10000/health
```

### Test After Deployment:

```bash
# Health check
curl https://telebirr-proxy.onrender.com/health

# Ping
curl https://telebirr-proxy.onrender.com/ping

# Fetch (with real transaction ID)
curl https://telebirr-proxy.onrender.com/fetch/DFG60WWREQ
```

---

## 🆘 Troubleshooting

### Render still can't access Telebirr?

Try deploying to different region:
- Render Settings → Change region
- Try: Frankfurt, Singapore, Oregon

Or use different platform:
- DigitalOcean (Bangalore datacenter)
- Fly.io (Multiple regions)
- AWS EC2 (Middle East region)

### Proxy returning 502 errors?

- Check Render logs
- Verify Telebirr service is online
- Test direct access: `curl https://transactioninfo.ethiotelecom.et`

### First request slow (30s)?

- Normal! Render free tier cold start
- **Solution**: Automatic keep-alive (already implemented) ✅
- Or upgrade to Render Starter ($7/mo)

### Keep-alive not working?

Check Railway logs for:
```
✅ [KeepAlive] Render proxy is awake
```

If not showing:
- Verify `TELEBIRR_PROXY_URL` is set in Railway
- Check Railway backend is running
- Use external cron as backup (UptimeRobot)

**See `KEEP_ALIVE_GUIDE.md` for solutions**

---

## 💰 Cost

### Free Tier (Recommended):
- Render: 750 hours/month ✅
- Keep-alive: Built into Railway ✅
- **Total: $0/month**

### Starter Tier (Zero Cold Starts):
- Render Starter: $7/month
- Always on, no cold starts
- **Total: $7/month**

---

## 📚 Documentation

- **README.md** (this file) - Overview
- **QUICK_START.md** - 5-minute deployment
- **KEEP_ALIVE_GUIDE.md** - Prevent sleep, stay awake 24/7
- **DOCKER_DEPLOYMENT.md** - Docker containerization details

---

## 🎯 Summary

✅ **Lightweight** - 60MB Docker image  
✅ **Fast** - 2-4 second response time  
✅ **Reliable** - Auto keep-alive prevents cold starts  
✅ **Free** - Render free tier sufficient  
✅ **Secure** - CORS protected, health monitored  
✅ **Production-ready** - Docker, health checks, logging  

**Deploy once, works forever!** 🚀

### Proxy returning 502 errors?

- Check Render logs
- Verify Telebirr service is online
- Test direct access: `curl https://transactioninfo.ethiotelecom.et`

### First request slow?

- Render free tier spins down after inactivity
- Use Render paid tier ($7/mo) for always-on
- Or implement keep-alive pings from Railway
