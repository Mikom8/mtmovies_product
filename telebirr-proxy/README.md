# Telebirr Proxy Server

A lightweight proxy server to fetch Telebirr payment receipts from regions where `transactioninfo.ethiotelecom.et` is blocked or restricted.

## Purpose

Railway and most Western cloud providers cannot directly access Ethio Telecom's transaction info service due to geo-restrictions. This proxy server should be deployed in a region with access (like Render) to act as a bridge.

## Deployment on Render

### Step 1: Push to GitHub

```bash
cd telebirr-proxy
git init
git add .
git commit -m "Initial commit: Telebirr proxy server"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/telebirr-proxy.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `telebirr-proxy`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (sufficient for this service)
5. Click **"Create Web Service"**

### Step 3: Get Your Proxy URL

After deployment, Render will give you a URL like:
```
https://telebirr-proxy.onrender.com
```

Copy this URL!

### Step 4: Configure Railway Backend

In your Railway backend, set environment variable:

```
TELEBIRR_PROXY_URL=https://telebirr-proxy.onrender.com
```

## How It Works

1. Railway backend makes request to: `https://telebirr-proxy.onrender.com/fetch/DFG60WWREQ`
2. Render proxy server fetches from: `https://transactioninfo.ethiotelecom.et/receipt/DFG60WWREQ`
3. Render returns HTML to Railway
4. Railway parses and validates the receipt

## API Endpoints

### GET /
Health check endpoint

**Response**:
```json
{
  "status": "online",
  "service": "Telebirr Proxy Server",
  "message": "This proxy fetches Telebirr receipts for regions with restricted access"
}
```

### GET /fetch/:transactionId
Fetch Telebirr receipt HTML

**Parameters**:
- `transactionId` - Telebirr transaction ID (e.g., DFG60WWREQ)

**Success Response**:
```html
<!DOCTYPE html>
<html>
  <!-- Telebirr receipt HTML -->
</html>
```

**Error Response** (502):
```json
{
  "error": "Failed to fetch receipt from Telebirr",
  "details": "Request timed out",
  "transactionId": "DFG60WWREQ"
}
```

## Testing Locally

```bash
npm install
npm start
```

Test endpoint:
```bash
curl http://localhost:10000/fetch/DFG60WWREQ
```

## Security

- CORS restricted to your Railway backend URL
- No authentication needed (public proxy)
- Rate limiting recommended for production (add express-rate-limit)

## Cost

**Render Free Tier**:
- ✅ 750 hours/month
- ✅ Spins down after 15 min inactivity
- ✅ First request after spin-down takes ~30s
- ✅ Perfect for low-medium traffic

**Note**: If Render also cannot access Telebirr, you'll need to deploy on an Ethiopian VPS or use a different cloud provider with Ethiopian region support.

## Troubleshooting

### Render still can't access Telebirr?

Try these alternatives:
1. **DigitalOcean** (Bangalore/Singapore datacenter)
2. **AWS EC2** (Middle East region)
3. **Google Cloud** (Middle East/Asia region)
4. **Ethiopian hosting** (Ethio Telecom Cloud, etc.)

### Proxy returning 502 errors?

- Check Render logs
- Verify Telebirr service is online
- Test direct access: `curl https://transactioninfo.ethiotelecom.et`

### First request slow?

- Render free tier spins down after inactivity
- Use Render paid tier ($7/mo) for always-on
- Or implement keep-alive pings from Railway
