const CommandManager = require("../src/CommandManager");

module.exports = async (command, msg_id, channel_id, guild_id) => {
    try {
        const guild = await app.client.guilds.cache.get(guild_id);

        if (guild) {
            const channel = await guild.channels.fetch(channel_id);

            if (channel) {
                const msg = await channel.messages.fetch(msg_id);

                if (msg) {
                    const realMessage = await app.msg;
                    app.msg = await msg;

                    const cm = await new CommandManager(null, false, false);

                    cm.snippetManager = app.commandManager.snippetManager;
                    cm.commands = app.commandManager.commands;
                    cm.commandNames = app.commandManager.commandNames;

                    await cm.setMessage(msg);

                    cm.argv = command.split(' ');
                    cm.args = [...cm.argv];
                    cm.args.shift();

                    cm.commandName = cm.argv[0];

                    const valid = await cm.valid();
                    const has = await cm.has();
                    const snippet = await cm.snippet();
                    const allowed = await cm.verify();
                    
                    if (valid && has && allowed) {
                        await cm.exec();
                    }
                    else if (valid && snippet !== undefined) {
                        await message.channel.send({
                            content: snippet.content,
                            files: snippet.files.map(f => {
                                return {
                                    attachment: path.resolve(__dirname, '..', 'storage', f)
                                }
                            })
                        });
                    }
                    else if (valid && !has) {
                        await cm.notFound();
                    }
                    else if (valid && has && !allowed) {
                        await cm.notAllowed();
                    }

                    app.msg = await realMessage;
                }
            }
        }
    }
    catch (e) {
        console.log(e);
    }
};