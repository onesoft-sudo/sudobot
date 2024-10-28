const { existsSync } = require("fs");
const { resolve } = require("path");

const logDirectoryExists = existsSync(resolve(__dirname, "logs"));

/**
 * @type {import("@onesoftnet/pm2-config").PM2Config}
 */
const config = {
    apps: [
        {
            name: "sudobot",
            script: "build/out/main/typescript/main.js",
            env_production: {
                NODE_ENV: "production"
            },
            autorestart: true,
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            log_file: logDirectoryExists ? "logs/debug.log" : null,
            error: logDirectoryExists ? "logs/error.log" : null
        }
    ]
};

module.exports = config;
