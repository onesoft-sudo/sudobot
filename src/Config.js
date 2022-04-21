const path = require("path");
const fs = require("fs");

class Config {
    constructor() {
        this.props = {};
        this.load();
    }

    load() {
        fs.readFile(path.resolve(__dirname, app.rootdir, "config", "config.json"), (err, data) => {
            if (err) {
                console.log(err);
            }

            this.props = JSON.parse(data);
        });
    }

    write() {
        fs.writeFile(path.resolve(__dirname, app.rootdir, "config", "config.json"), JSON.stringify(this.props), (err) => {
            console.log(err);
        });
    }

    get(key) {
        return typeof this.props[app.msg.guild.id] === 'object' ? this.props[app.msg.guild.id][key] : null;
    }

    set(key, value) {
        this.props[app.msg.guild.id][key] = value;
    }
}

module.exports = Config;