# PM2 Process Management

This document describes how the Chinese Simplifier application is managed with PM2.

## Current Setup

Both the frontend and backend are managed by PM2:

- **chinese-backend**: Node.js server (server.js) running on port 3001
- **chinese-frontend**: Vite dev server running on port 9876 with network exposure

## Common Commands

### View all processes
```bash
pm2 list
```

### View detailed information
```bash
pm2 show chinese-frontend
pm2 show chinese-backend
```

### View logs
```bash
# All logs
pm2 logs

# Specific process
pm2 logs chinese-frontend
pm2 logs chinese-backend

# Last N lines (no streaming)
pm2 logs chinese-frontend --lines 50 --nostream
```

### Restart processes
```bash
# Restart all from ecosystem config
pm2 restart ecosystem.config.cjs

# Restart individual process
pm2 restart chinese-frontend
pm2 restart chinese-backend

# Restart all processes
pm2 restart all
```

### Stop processes
```bash
pm2 stop chinese-frontend
pm2 stop chinese-backend
pm2 stop all
```

### Start processes
```bash
# Start from ecosystem config
pm2 start ecosystem.config.cjs

# Start individual process
pm2 start chinese-frontend
pm2 start chinese-backend
```

### Reload (zero-downtime restart)
```bash
pm2 reload chinese-backend
```

### Save current process list
```bash
pm2 save
```

### Monitor processes
```bash
pm2 monit
```

## Ecosystem Configuration

The configuration is stored in `ecosystem.config.cjs` with the following setup:

### Backend
- Script: `server.js`
- Interpreter: Node.js
- Auto-restart: Yes
- Max memory: 1GB
- Logs: `~/.pm2/logs/chinese-backend-*.log`

### Frontend
- Script: `npm run dev -- --host --port 9876`
- Interpreter: Bash
- Auto-restart: Yes
- Logs: `~/.pm2/logs/chinese-frontend-*.log`

## Access URLs

- **Frontend (Local)**: http://localhost:9876
- **Frontend (Network)**: http://137.184.55.135:9876
- **Backend API**: http://localhost:3001

## Startup on Boot

To ensure PM2 starts on system boot:

```bash
pm2 startup
pm2 save
```

## Troubleshooting

### Check if processes are running
```bash
pm2 list
```

### View error logs
```bash
pm2 logs chinese-frontend --err
pm2 logs chinese-backend --err
```

### Flush logs
```bash
pm2 flush
```

### Delete all processes and start fresh
```bash
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```
