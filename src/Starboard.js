const MessageEmbed = require("../src/MessageEmbed");

module.exports = class Starboard {
    async handle(reaction, user) {
        if (app.config.get('starboard').enabled) {
            let emoji;

            if (typeof reaction._emoji !== 'undefined')
                emoji = reaction._emoji.name;
            else
                emoji = reaction.anme;
            
            console.log(reaction, emoji);

            if (emoji === '⭐' && reaction.message.channel.id !== app.config.get('starboard').channel && reaction.count === app.config.get('starboard').messages) {
                try {
                    const channel = await reaction.message.guild.channels.fetch(app.config.get('starboard').channel);

                    let props = {
                        embeds: reaction.message.embeds || []
                    }
    
                    const msg = await channel.send({
                        embeds: [
                            ...props.embeds,
                            new MessageEmbed()
                            .setAuthor({
                                name: reaction.message.author.tag,
                                iconURL: reaction.message.author.displayAvatarURL(),
                            })
                            .setDescription(reaction.message.content)
                            .addField('URL', `[Click here](${reaction.message.url})`)
                            .setTimestamp()
                            .setFooter({
                                text: reaction.message.id + ''
                            })
                        ],
                        files: reaction.message.attachments.map(a => {
                            return {
                                name: a.name,
                                attachment: a.proxyURL
                            }
                        })
                    });
    
                    await msg.react('⭐');
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
    }
};