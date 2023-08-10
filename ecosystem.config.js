module.exports = {
    apps: [
        {
            name: "sudobot",
            script: "build/index.js",
            env_production: {
                NODE_ENV: "production"
            },
            autorestart: true
        }
    ]
};
