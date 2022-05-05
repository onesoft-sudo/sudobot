async function getGuild() {
    const guild_id = app.config.props.global.id;

    try {
        return await app.client.guilds.fetch(guild_id);
    }
    catch(e) {
        return null;
    }
}

async function find(cb) {
    const guild = await getGuild();
    return await guild.emojis.cache.find(cb);
}

async function emoji(name) {
    return await find(e => e.name === name);
}

module.exports = {
    getGuild,
    find,
    emoji
};