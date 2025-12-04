module.exports = {
  apps: [
    {
      name: 'chinese-backend',
      script: 'server.js',
      cwd: '/home/vincent/kunlun/chinese-simplifier',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      error_log: '/home/vincent/.pm2/logs/chinese-backend-error.log',
      out_log: '/home/vincent/.pm2/logs/chinese-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'chinese-frontend',
      script: '/usr/bin/bash',
      args: '-c "npm run dev -- --host --port 9876"',
      cwd: '/home/vincent/kunlun/chinese-simplifier',
      interpreter: 'none',
      error_log: '/home/vincent/.pm2/logs/chinese-frontend-error.log',
      out_log: '/home/vincent/.pm2/logs/chinese-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
};
