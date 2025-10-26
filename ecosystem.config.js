module.exports = {
  apps: [
    {
      name: 'hashoptech',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Tự động restart nếu app crash
      exp_backoff_restart_delay: 100,
      // Số lần restart tối đa trong 1 phút
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};

