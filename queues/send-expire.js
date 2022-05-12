const { setTimeoutv2 } = require("../src/setTimeout");

async function send(content, channel_id, guild_id, expire_at) {
    console.log(channel_id, guild_id);
    const guild = await app.client.guilds.cache.get(guild_id);

    if (guild) {
        const channel = await guild.channels.fetch(channel_id);

        if (channel) {
            const message = await channel.send({
                content
            });

            await setTimeoutv2('expire.js', expire_at, message.id, channel.id, guild.id);
        }
    }
}

module.exports = send;