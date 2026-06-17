# Quick Start: Deploy Telebirr Proxy to Render

## 🚀 5-Minute Deployment

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   cd telebirr-proxy
   git init
   git add .
   git commit -m "Telebirr proxy server"
   git branch -M main
   
   # Create repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/telebirr-proxy.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Render auto-detects settings from `render.yaml`
   - Click "Create Web Service"
   - Done! 🎉

3. **Copy Your URL**:
   ```
   https://telebirr-proxy.onrender.com
   ```

4. **Add to Railway**:
   - Railway → Variables → Add:
   ```
   TELEBIRR_PROXY_URL=https://telebirr-proxy.onrender.com
   ```

### Option 2: Deploy without GitHub

1. **Create ZIP**:
   - Zip the `telebirr-proxy` folder

2. **Manual Deploy**:
   - Render → "New +" → "Web Service"
   - Choose "Deploy without Git"
   - Upload ZIP file
   - Configure:
     - Name: `telebirr-proxy`
     - Build: `npm install`
     - Start: `npm start`
   - Deploy!

---

## ✅ Test Your Proxy

```bash
# Health check
curl https://YOUR-PROXY.onrender.com/

# Test with transaction ID
curl https://YOUR-PROXY.onrender.com/fetch/DFG60WWREQ
```

Should return HTML or error message.

---

## 🔧 Troubleshooting

### Deployment failed?
- Check Node version (needs 18+)
- Verify `package.json` exists
- Check Render logs

### Proxy returns 502?
- Render may not access Telebirr from chosen region
- Try different region: Settings → Change region
- Or use different platform (DigitalOcean, Fly.io)

### First request slow?
- Normal! Free tier sleeps after 15min
- Wait 30s for cold start
- Upgrade to Starter ($7/mo) for always-on

---

## 📞 Support

Check `DUAL_BACKEND_DEPLOYMENT_GUIDE.md` for full details.
