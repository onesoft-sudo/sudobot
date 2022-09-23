import { FileOptions, TextChannel } from "discord.js";
import path from "path";
import DiscordClient from "../client/Client";

export default async (client: DiscordClient, command: string, msg_id: string, channel_id: string, guild_id: string) => {
    try {
        const guild = await client.guilds.cache.get(guild_id);

        if (guild) {
            const channel = await guild.channels.fetch(channel_id);

            if (channel) {
                const msg = await (channel as TextChannel).messages.fetch(msg_id);

                if (msg) {
                    const realMessage = await client.msg;
                    client.msg = await msg;

                    const argv = command.split(/ +/g);
                    const args = [...argv];
                    const cmdName = args.shift();
                    const cmdObj = await client.commands.get(cmdName!);

                    console.log(command);                    
                    
                    if (cmdObj && cmdObj.supportsLegacy) {
                        await cmdObj.run(client, msg, {
                            argv,
                            args,
                            normalArgs: args.filter(a => a[0] !== '-'),
                            options: args.filter(a => a[0] === '-'),
                            isInteraction: false,
                            cmdName: cmdName!
                        });

                        client.msg = realMessage;

                        return;
                    }
                    
                    const snippet = await client.snippetManager.get(msg.guild!.id, cmdName!);

                    if (snippet) {
                        await msg.channel.send({
                            content: snippet.content,
                            files: snippet.files.map(name => {
                                return {
                                    name,
                                    attachment: path.resolve(__dirname, '../../storage', name)
                                } as FileOptions
                            }),
                        });

                        client.msg = realMessage;

                        return;
                    }
                }
            }
        }
    }
    catch (e) {
        console.log(e);
    }
};