const { readFile, writeFile } = require('fs');

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

    find(name) {
        return this.snippets.find(s => s.name === name);
    }

    update() {
        writeFile("config/snippets.json", JSON.stringify(this.snippets), () => {});
    }

    create(name, content) {
        if (this.find(name) !== undefined)
            return false;

        this.snippets.push({name, content});
        this.update();

        return true;
    }

    delete(name) {
        for (let i in this.snippets) {
            if (this.snippets[i].name === name) {
                this.snippets.splice(i, 1);
                this.update();
                return true;
            }
        }

        return false;
    }
}

module.exports = SnippetManager;