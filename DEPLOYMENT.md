# Deployment Guide - Chinese Simplifier

## DigitalOcean App Platform (Recommended)

### Prerequisites
- DigitalOcean account
- GitHub repository set up (already done: `YangVincent/kunlun`)
- Anthropic API key

### Setup Steps

1. **Go to DigitalOcean App Platform**
   - Visit https://cloud.digitalocean.com/apps
   - Click "Create App"

2. **Connect GitHub Repository**
   - Select "GitHub"
   - Authorize DigitalOcean to access your repos
   - Choose repository: `YangVincent/kunlun`
   - Choose branch: `main` (or your preferred branch)
   - Source directory: `/chinese-simplifier`

3. **Configure App**
   - DigitalOcean should auto-detect the Node.js app
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm run start`
   - **HTTP Port**: `3001`

4. **Add Environment Variables**
   - Click "Edit" next to environment variables
   - Add:
     - Key: `VITE_ANTHROPIC_API_KEY`
     - Value: [Your Anthropic API key]
     - Scope: Build & Run Time
     - Type: Secret (encrypted)

   - Add:
     - Key: `NODE_ENV`
     - Value: `production`
     - Type: Plain text

5. **Choose Region & Plan**
   - Region: Choose closest to your users (e.g., NYC, SFO)
   - Plan: Basic ($5/month) is sufficient to start

6. **Deploy**
   - Click "Create Resources"
   - Wait 5-10 minutes for initial deployment
   - You'll get a URL like: `https://kunlun-chinese-simplifier-xxxxx.ondigitalocean.app`

### Auto-Deploy on Git Push

✅ **Already configured!** The `.do/app.yaml` file enables auto-deploy.

Every time you push to the `main` branch:
1. DigitalOcean detects the push
2. Automatically runs build
3. Deploys new version
4. Zero downtime deployment

### Alternative: Using the App Spec File

You can also deploy using the `.do/app.yaml` spec file:

```bash
# Install doctl CLI
brew install doctl  # macOS
# or download from https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init

# Create app from spec file
doctl apps create --spec .do/app.yaml
```

## Manual Server Setup (Alternative)

If you prefer setting up on a regular Droplet/VPS:

### 1. SSH into your server

```bash
ssh root@your-server-ip
```

### 2. Clone the repository

```bash
git clone https://github.com/YangVincent/kunlun.git
cd kunlun/chinese-simplifier
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up environment variables

```bash
cp .env.example .env
nano .env
# Add your VITE_ANTHROPIC_API_KEY
```

### 5. Build the frontend

```bash
npm run build
```

### 6. Install PM2 (process manager)

```bash
npm install -g pm2
```

### 7. Start the server

```bash
pm2 start server.js --name chinese-simplifier
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

### 8. Set up Nginx reverse proxy (recommended)

```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/chinese-simplifier
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/chinese-simplifier /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Set up auto-deploy with webhooks (optional)

Create a deployment script:

```bash
nano ~/deploy.sh
```

Add:
```bash
#!/bin/bash
cd /root/kunlun/chinese-simplifier
git pull origin main
npm install
npm run build
pm2 restart chinese-simplifier
```

```bash
chmod +x ~/deploy.sh
```

Set up webhook listener or use GitHub Actions.

## Verifying Deployment

1. Visit your app URL
2. Check the frontend loads (should see "简化文本 - Text Simplifier")
3. Test the "Load sample text" button
4. Try simplifying text to verify API key works

## Troubleshooting

### Build fails
- Check that `VITE_ANTHROPIC_API_KEY` is set in environment variables
- Verify Node.js version is 18+ (`node --version`)

### App doesn't start
- Check logs in DigitalOcean dashboard (Runtime Logs)
- Verify `NODE_ENV=production` is set
- Check that port 3001 is correctly configured

### API calls fail
- Verify `VITE_ANTHROPIC_API_KEY` is correctly set
- Check API key is valid at https://console.anthropic.com/
- Look at Runtime Logs for error messages

## Cost Estimate

**DigitalOcean App Platform:**
- Basic plan: $5/month
- Includes 512MB RAM, sufficient for this app
- Scales automatically with traffic

**DigitalOcean Droplet (manual setup):**
- Basic Droplet: $4-6/month
- More setup but more control
