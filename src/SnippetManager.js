const { default: axios } = require('axios');
const { readFile, writeFile } = require('fs');
const path = require('path');
const fs = require('fs');
const { download } = require('../commands/cat');

class SnippetManager {
    constructor() {
        this.snippets = [];
        this.load();
    }

    load() {
        readFile("config/snippets.json", (err, data) => {
            if (err) {
                console.log(err);
            }

            this.snippets = JSON.parse(data);
        });
    }

    find(guild, name) {
        return this.snippets[guild].find(s => s.name === name);
    }

    update() {
        writeFile("config/snippets.json", JSON.stringify(this.snippets), () => {});
    }

    async create(guild, name, content, files) {
        if (this.find(guild, name) !== undefined)
            return false;

        const fileList = [];

        for (const i in files) {
            fileList[i] = Math.round((Math.random() * 10000000)) + "_" + files[i].name;
            await download(files[i].proxyURL, path.join(__dirname, '..', 'storage', fileList[i]));
        }

        await this.snippets[guild].push({name, content, files: fileList});
        await this.update();

        return true;
    }

    delete(guild, name) {
        for (let i in this.snippets[guild]) {
            if (this.snippets[guild][i].name === name) {

                this.snippets[guild][i].files?.forEach(f => {
                    fs.rmSync(path.resolve(__dirname, '..', 'storage', f));
                });

                this.snippets[guild].splice(i, 1);
                this.update();
                return true;
            }
        }

        return false;
    }
}

module.exports = SnippetManager;