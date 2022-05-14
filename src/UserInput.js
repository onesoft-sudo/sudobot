const { Collection } = require('discord.js');

async function getUser(input, { guild, mentions = { members: new Collection() } }, member = true) {
    if (await mentions[member ? "members" : 'users'].first()) {
        return await mentions[member ? "members" : 'users'].first();
    }

    if (input.indexOf('#') !== -1) {
        return await guild[member ? "members" : 'users'].cache.find(m => m.user.tag === input);
    }

    return await guild[member ? "members" : 'users'].fetch(input);
}

module.exports = { getUser };