const MessageEmbed = require("./MessageEmbed");

class SpamFilter {
    constructor() {
        this.users = new Map();
        this.usersMute = new Map();
        this.LIMIT = 8;    
        this.DIFF = 2000;
        this.timeout = null;
        this.charDiffs = 5;
    }

    almostSameChars(str) {
        return /(.)\1{10,}/.test(str.trim());
    } 

    filter(msg) {
        if (this.almostSameChars(msg.content)) {
            return false;
        }

        return true;
    }

    async start(msg) {
        if(msg.author.bot) 
            return;

        if (!this.filter(msg)) {
            await msg.delete();
            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                    .setDescription("Deleted a message (Spam filter)")
                ]
            });
            
            return;
        }

        let user;
        
        if (!this.users.has(msg.author.id)) {
            user = {
                count: 1,
                delAt: new Date((new Date().getTime() + this.DIFF))
            };

            this.users.set(msg.author.id, user);
            console.log('Key added');

            this.timeout = setTimeout(() => {
                this.users.forEach((value, key) => {
                    if (value.delAt.getTime() <= (new Date()).getTime()) {
                        this.users.delete(key);
                        console.log('Key deleted');
                    }
                });
            }, this.DIFF);
        }
        else {
            user = this.users.get(msg.author.id);
            user.count++;

            if (user.count >= this.LIMIT) {
                msg.channel.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Whoa man! Spamming is not allowed here.')
                    ]
                });

                user.count = 1;
                this.users.set(msg.author.id, user);

                const messages = await msg.channel.messages.fetch({
                    limit: this.LIMIT
                });

                const botMessages = [];

                messages.filter(m => m.author.id === msg.author.id).forEach(msg1 => botMessages.push(msg1));

                msg.channel.bulkDelete(botMessages).then(() => {
                    msg.channel.send({
                        embeds: [
                            new MessageEmbed()
                            .setDescription('Deleted ' + botMessages.length + ' messages (Spam filter)')
                        ]
                    });
                    // .then(msg => msg.delete({
                    //     timeout: 3000
                    // }))
                });
            }

            clearTimeout(this.timeout);

            this.timeout = setTimeout(() => {
                this.users.forEach((value, key) => {
                    if (value.delAt.getTime() <= (new Date()).getTime()) {
                        this.users.delete(key);
                        console.log('Key deleted');
                    }
                });
            }, this.DIFF);

            this.users.set(msg.author.id, user);
            console.log('Key modified');
        }
    }
}

module.exports = SpamFilter;