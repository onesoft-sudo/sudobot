module.exports = {
    apps: [
        {
            script: 'build/index.js',
            env_production: {
                NODE_ENV: "production"
            },
            env_development: {
                NODE_ENV: "development"
            },
            max_memory_restart: "850M"
        }
    ],
};
