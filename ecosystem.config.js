/**
 * Feliactyl v2.2.0 — PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js                        # Start (development)
 *   pm2 start ecosystem.config.js --env production       # Start (production)
 *   pm2 reload ecosystem.config.js --env production      # Zero-downtime reload
 *   pm2 scale feliactyl-web 4                            # Scale web instances
 *   pm2 scale feliactyl-worker 3                         # Scale workers
 *   pm2 monit                                            # Live monitoring
 */

module.exports = {
    apps: [
        {
            name: 'feliactyl-web',
            script: './start.js',
            instances: process.env.WEB_INSTANCES,        // Run 2 instances (load balanced)
            exec_mode: 'cluster',                             // Enable cluster mode
            max_memory_restart: '512M',                         // Restart if memory > 512MB
            restart_delay: 3000,                              // Wait 3s before restart
            max_restarts: 10,                                 // Max 10 restarts in 10 min
            min_uptime: '10s',                                // Must stay up 10s to be "started"

            // Environment variables
            env: {
                NODE_ENV: 'development',
                WEB_INSTANCES: 2
            },
            env_production: {
                NODE_ENV: 'production',
                WEB_INSTANCES: 4
            },

            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Monitoring
            monitoring: true,

            kill_timeout: 5000,
            listen_timeout: 10000,
            shutdown_with_message: true,
            wait_ready: true,

            watch: false,
            ignore_watch: ['node_modules', 'logs', 'database.sqlite'],
        },

        // Optional: Separate worker process (if not using internal worker manager)
        {
            name: 'feliactyl-worker',
            script: './workers/economyWorker.js',
            instances: process.env.WORKER_INSTANCES,
            exec_mode: 'fork',            // Workers run independently
            max_memory_restart: '256M',
            restart_delay: 5000,
            max_restarts: 10,
            min_uptime: '10s',

            env: {
                NODE_ENV: 'development',
                WORKER_INSTANCES: 2
            },
            env_production: {
                NODE_ENV: 'production',
                WORKER_INSTANCES: 3
            },

            log_file: './logs/worker-combined.log',
            out_file: './logs/worker-out.log',
            error_file: './logs/worker-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            kill_timeout: 30000,      // Workers need more time for graceful shutdown
            wait_ready: true,
        }
    ],

    // Deployment configuration
    deploy: {
        production: {
            user: 'feliactyl',
            host: ['your-server.com'],
            ref: 'origin/v2-features',
            repo: 'https://github.com/notcaliper/Feliactyl.git',
            path: '/var/www/feliactyl',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production'
            }
        }
    }
};
