module.exports = class NameProcessor {
    map = {
        "Coke#0666": "coke0666",
        "rakinar2#7578": "rakinar2_7578",
    };

    constructor(client) {
        /** 
         * In case if you need the client.
         * 
         * @type {Client}
         */
        this.client = client;
    }

    /** @param {User} user */
    buildEmbed(user) {
        const embedBuilder = this.map[user.tag];

        if (!embedBuilder) {
            return null;
        }

        return embedBuilder(user);
    }

    /** @param {User} user */
    coke0666(user) {
        return new MessageEmbed({
            author: user.tag,
            iconURL: user.displayAvatarURL(),
            description: "ABC"
            // ... other stuff
        });
    }

    /** @param {User} user */
    rakinar2_7578(user) {
        return new MessageEmbed({
            author: user.tag,
            iconURL: user.displayAvatarURL(),
            description: "XYZ"
            // ... other stuff
        });
    }
}