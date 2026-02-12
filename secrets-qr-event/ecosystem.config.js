// PM2 Ecosystem File for Production
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'event-backend',
      script: 'tsx',
      args: 'src/main.ts',
      cwd: path.join(__dirname, 'server'),
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
  ],
};
