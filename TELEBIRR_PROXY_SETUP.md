# Automatic Telebirr Payment Verification Setup

## Problem
Your Railway backend cannot access Telebirr API due to network restrictions.

## Solution
Deploy a separate proxy server that CAN access Telebirr, then your backend calls that proxy.

---

## Step 1: Deploy the Proxy Server

### Quick Deploy to Render.com (FREE):

1. **Push the `telebirr-proxy` folder to GitHub**
   ```bash
   cd telebirr-proxy
   git init
   git add .
   git commit -m "Telebirr proxy server"
   git branch -M main
   # Create a new repo on GitHub, then:
   git remote add origin https://github.com/YOUR-USERNAME/telebirr-proxy.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to https://render.com
   - Sign up/Login
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select the `telebirr-proxy` repository
   - Settings:
     - **Name**: `telebirr-proxy`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: `Free`
   - Click "Create Web Service"
   
3. **Copy Your Proxy URL**:
   - After deployment, you'll get a URL like: `https://telebirr-proxy.onrender.com`
   - Copy this URL!

---

## Step 2: Configure Your Railway Backend

1. **Go to Railway Dashboard**:
   - https://railway.app/project/YOUR-PROJECT-ID

2. **Add Environment Variable**:
   - Click on your backend service
   - Go to "Variables" tab
   - Add new variable:
     - **Key**: `TELEBIRR_PROXY_URL`
     - **Value**: `https://telebirr-proxy.onrender.com` (your proxy URL from Step 1)
   - Click "Add"

3. **Redeploy**:
   - Railway will automatically redeploy with the new variable

---

## Step 3: Update Frontend

The frontend is already configured to call your Railway backend at `/api/payments/submit-pending`.

Just **rebuild and redeploy** your Netlify frontend:
```bash
cd dashboard
npm run build
# Deploy the dist folder to Netlify
```

---

## How It Works Now:

```
User → Frontend (Netlify)
  ↓
  Submits Transaction ID
  ↓
Railway Backend
  ↓
  Calls → Render Proxy Server
          ↓
          Fetches from Telebirr API
          ↓
          Returns HTML
  ↓
Parses & Validates
  ↓
Activates Plan ✅
```

---

## Testing:

1. **Test Proxy** (should return HTML):
   ```bash
   curl https://your-proxy.onrender.com/fetch/DFG60WWREQ
   ```

2. **Test Full Flow**:
   - Go to your website
   - Choose a plan
   - Enter transaction ID
   - Should activate automatically!

---

## Alternative: VPS in Ethiopia

If Render doesn't work, deploy the proxy on a VPS **inside Ethiopia**:

```bash
# On your VPS
cd /var/www
git clone https://github.com/YOUR-USERNAME/telebirr-proxy.git
cd telebirr-proxy
npm install
npm start

# Keep it running with PM2
npm install -g pm2
pm2 start index.js --name telebirr-proxy
pm2 startup
pm2 save
```

Then use your VPS IP: `http://YOUR-VPS-IP:3001`

---

## Cost:
- **Render Free Tier**: FREE (spins down after inactivity, but works)
- **Railway**: Your existing plan
- **Netlify**: Your existing plan

**Total Extra Cost: $0** 🎉
