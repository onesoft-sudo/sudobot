const { lockAll } = require('../commands/lockall');

module.exports = class AntiRaid {
    constructor() {
        this.joins = 0;
    }

    load(guild) {
        this.maxJoins = app.config.props[guild.id].raid.max_joins;
        this.included = app.config.props[guild.id].raid.included;
        this.time = app.config.props[guild.id].raid.time;
    }

    async start(member) {
        await this.load(member.guild);

        console.log('Joined');

        setTimeout(() => {
            this.joins = 0;
            console.log('RAID reset');
        }, this.time);

        this.joins++;

        if (this.joins >= this.maxJoins) {
            let role = member.guild.roles.cache.find(r => r.id === app.config.props[member.guild.id].gen_role);
            let channels = member.guild.channels.cache.filter(channel => this.included.indexOf(channel.id) !== -1);

            await lockAll(role, channels, true);
        }
    }
};