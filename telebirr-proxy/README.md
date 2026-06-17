# Telebirr Receipt Proxy Server

This is a simple proxy server that fetches Telebirr receipts and returns them to your main backend.

## Why is this needed?

Railway's servers cannot access `transactioninfo.ethiotelecom.et` due to network/geo restrictions. This proxy needs to be deployed on a service that CAN access Telebirr.

## Deployment Options

### Option 1: Render.com (Free Tier)
1. Go to https://render.com
2. Sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repo (push this folder)
5. Set:
   - **Name**: telebirr-proxy
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. Deploy!

### Option 2: Heroku
```bash
cd telebirr-proxy
heroku create telebirr-proxy-YOUR-NAME
git init
git add .
git commit -m "Telebirr proxy"
heroku git:remote -a telebirr-proxy-YOUR-NAME
git push heroku master
```

### Option 3: VPS in Ethiopia
If you have a VPS in Ethiopia:
```bash
cd telebirr-proxy
npm install
npm start
```

## Testing

Once deployed, test with:
```bash
curl https://your-proxy-url.onrender.com/fetch/DFG60WWREQ
```

You should get HTML back.

## Environment Variables

None required! Just deploy and use.

## Usage in Your Main Backend

Update your backend to use the proxy URL:
```javascript
const TELEBIRR_PROXY = process.env.TELEBIRR_PROXY_URL || 'https://your-proxy.onrender.com';
```
