module.exports = {
  apps: [
    {
      name: 'sales-backup',
      cwd: '/var/www/sales-backup',
      script: 'npm',
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      error_file: '/var/log/sales-backup/error.log',
      out_file: '/var/log/sales-backup/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
