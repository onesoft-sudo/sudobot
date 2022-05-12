async function send(content, channel_id, guild_id) {
    console.log(channel_id, guild_id);
    const guild = await app.client.guilds.cache.get(guild_id);

    if (guild) {
        const channel = await guild.channels.fetch(channel_id);

        if (channel) {
            await channel.send({
                content
            });
        }
    }
}

module.exports = send;