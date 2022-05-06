const { MessageActionRow, MessageButton } = require("discord.js");
const MessageEmbed = require("../src/MessageEmbed");
const { escapeRegex } = require("../src/util");

module.exports = {
    version: "1.6.1",
    commands: [
        {
            name: 'addsnippet',
            shortBrief: "Adds a snippet.",
            description: null,
            structure: "<Name> <Content>",
            example: "`%%addsnippet roles There are 2 roles`\n`%%addsnippet roles There are 2 roles\nAdmin - Administrator\nMod - Moderator`",
            notes: null
        },
        {
            name: 'afk',
            shortBrief: "Keeps track of your mentions and tells other users that you're AFK.",
            description: null,
            structure: "[Reason]",
            example: "`%%afk`\n`%%afk Having dinner`",
            notes: null
        },
        {
            name: 'announce',
            shortBrief: "Announce something in the given channel.",
            description: "Announce something in the given channel. The channel should be set in the configuration.",
            structure: "<Content>",
            example: "`%%announce Hello there!\nWe've just finished our job!\n@everyone`",
            notes: null
        },
        {
            name: 'ban',
            shortBrief: "Ban someone in this server.",
            description: null,
            structure: "<UserID|Mention> [Reason]",
            example: "`%%ban 385753607325075320`\n`%%ban @Someone You are spamming a lot`",
            notes: null
        },
        {
            name: 'bean',
            shortBrief: "Bean someone in this server.",
            description: "Bean someone. It doesn't do anything except pretending.",
            structure: "<UserID|Mention> [Reason]",
            example: "`%%bean 385753607325075320`\n`%%bean @Someone You are spamming a lot`",
            notes: null
        },
        {
            name: 'cat',
            shortBrief: "Get a random kitty picture.",
            description: "Fetches a random cat picture from `thecatapi.com` API.",
            structure: "",
            example: "`%%cat`",
            notes: null
        },
        {
            name: 'clear',
            shortBrief: "Clear all messages from a user.",
            description: "Clear all messages from a user, in the current channel. This might take a while.",
            structure: "<UserID|UserMention>",
            example: "`%%clear 83474924191884727`\n`%%clear @Someone`",
            notes: null
        },
        {
            name: 'delsnippet',
            shortBrief: "Deletes a snippet.",
            description: null,
            structure: "<Name>",
            example: "`%%delsnippet roles`",
            notes: null
        },
        {
            name: 'dog',
            shortBrief: "Get a random doggy picture.",
            description: "Fetches a random cat picture from `thedogapi.com` API.",
            structure: "",
            example: "`%%dog`",
            notes: null
        },
        {
            name: 'echo',
            shortBrief: "Echo (re-send) a message.",
            description: "Re-send a message from the bot.",
            structure: "<content> [channelMention]",
            example: "`%%echo Something\nVery Cool`\n`%%echo Something\nVery Cool #general`",
            notes: null
        },
        {
            name: 'general-role',
            shortBrief: "Set the general role.",
            description: null,
            structure: "<RoleID|RoleMention>",
            example: "`%%general-role 937923625698638`\n`%%general-role @General`",
            notes: null
        },
        {
            name: 'help',
            shortBrief: "Show this help and exit.",
            description: null,
            structure: "[command]",
            example: "`%%help`\n`%%help mute`",
            notes: null
        },
        {
            name: 'history',
            shortBrief: "Show moderation history for a user.",
            description: null,
            structure: "<UserMention|UserID>",
            example: "`%%history 27372628277272625`\n`%%history @Someone`",
            notes: null
        },
        {
            name: 'httpcat',
            shortBrief: "Get some funny cat memes related to HTTP.",
            description: "Get some funny cat memes related to HTTP status codes, using http.cat API.",
            structure: "<status>",
            example: "`%%httpcat 403`",
            notes: null
        },
        {
            name: 'httpdog',
            shortBrief: "Get some funny dog memes related to HTTP.",
            description: "Get some funny dog memes related to HTTP status codes, using http.dog API.",
            structure: "<status>",
            example: "`%%httpdog 403`",
            notes: null
        },
        {
            name: 'kick',
            shortBrief: "Kick someone from this server.",
            description: null,
            structure: "<UserID|Mention> [Reason]",
            example: "`%%kick 385753607325075320`\n`%%kick @Someone You are spamming a lot`",
            notes: null
        },
        {
            name: 'lock',
            shortBrief: "Lock a specific channel.",
            description: "Makes the given channel read-only for the general members. If no channel is present, the current channel will be locked.",
            structure: "[ChannelID|ChannelMention] [...options]",
            example: "`%%lock 385753607325075320`\n`%%lock #general`\n`%%lock`",
            notes: null,
            options: {
                "--no-send": "Do not send a confirmation message to the locked channel",
                "--everyone": "Lock the channels for @everyone rather than the general role",
            }
        },
        {
            name: 'lockall',
            shortBrief: "Lock all the channels given in the configuration.",
            description: "Makes the given channels read-only for the general members.",
            structure: "[...options]",
            example: "`%%lockall --no-send\n`%%lockall`\n`%%lockall --everyone`",
            notes: null,
            options: {
                "--no-send": "Do not send a confirmation message to the locked channel",
                "--everyone": "Lock the channels for @everyone rather than the general role",
            }
        },
        {
            name: 'mod-role',
            shortBrief: "Set the moderator role.",
            description: null,
            structure: "<RoleID|RoleMention>",
            example: "`%%mod-role 937923625698638`\n`%%mod-role @Moderator`",
            notes: null
        },
        {
            name: 'mute',
            shortBrief: "Mute someone in this server.",
            description: null,
            structure: "<UserID|Mention> [-t=DURATION] [Reason]",
            example: "`%%mute 385753607325075320`\n`%%mute @Someone You are spamming a lot`\n`%%mute @Someone -t 10m You are spamming a lot`",
            options: {
                "-t": "Set the mute duration"
            },
            notes: null
        },
        {
            name: 'muted-role',
            shortBrief: "Set the muted role.",
            description: null,
            structure: "<RoleID|RoleMention>",
            example: "`%%muted-role 937923625698638`\n`%%muted-role @Muted`",
            notes: null
        },
        {
            name: 'mvsnippet',
            shortBrief: "Rename a snippet.",
            description: null,
            structure: "<oldName> <newName>",
            example: "`%%mvsnippet abc bca`",
            notes: null
        },
        {
            name: 'note',
            shortBrief: "Take a note about an user.",
            description: null,
            structure: "<UserID|UserMention> <note>",
            example: "`%%note @Someone Simple note.`",
            notes: null
        },
        {
            name: 'notedel',
            shortBrief: "Delete a note.",
            description: null,
            structure: "<NoteID>",
            example: "`%%notedel 922`",
            notes: null
        },
        {
            name: 'noteget',
            shortBrief: "Get a note.",
            description: null,
            structure: "<NoteID>",
            example: "`%%noteget 922`",
            notes: null
        },
        {
            name: 'notes',
            shortBrief: "Get all notes for a specific user.",
            description: null,
            structure: "<UserID|UserMention>",
            example: "`%%notes @Someone`",
            notes: null
        },
        {
            name: 'pixabay',
            shortBrief: "Fetch images from Pixabay.",
            description: "Search & fetch images from Pixabay API.\n\nAvailable Subcommands:\n\tphoto - Fetch photos only.\n\tvector - Fetch vectors only.\n\tillustration - Fetch illustrations only\n\timage - Fetch any image.",
            structure: "<subcommand> [query]",
            example: "`%%pixabay image`\n`%%pixabay photo birds`",
            notes: null
        },
        {
            name: 'prefix',
            shortBrief: "Change the bot prefix.",
            description: null,
            structure: "<NewPrefix>",
            example: "`%%prefix -`",
            notes: null
        },
        {
            name: 'setconfig',
            shortBrief: "Change the bot configuration keys.",
            description: null,
            structure: "<key> <value>",
            example: "`%%setconfig debug true`",
            notes: null
        },
        {
            name: 'send',
            shortBrief: "Send a DM to a user.",
            description: null,
            structure: "<UserID|Mention> <content>",
            example: "`%%send 278358918549759428 Hello world`\n`%%send @Someone Hello world`",
            notes: null
        },
        {
            name: 'spamfilter',
            shortBrief: "Change the spam filter configuration keys.",
            description: null,
            structure: "<key> <value>",
            example: "`%%spamfilter include #general`",
            notes: null
        },
        {
            name: 'stats',
            shortBrief: "Show the server stats.",
            description: null,
            structure: "",
            example: "`%%stats",
            notes: null
        },
        {
            name: 'unban',
            shortBrief: "Unban a user from this server.",
            description: null,
            structure: "<UserID>",
            example: "`%%unban 2946255269594753792`",
            notes: null
        },
        {
            name: 'unlock',
            shortBrief: "Unlock a specific channel.",
            description: "Makes the given channel writable for the general members. If no channel is present, the current channel is unlocked.",
            structure: "[ChannelID|ChannelMention] [...options]",
            example: "`%%unlock 385753607325075320`\n`%%unlock #general`\n`%%unlock`",
            notes: null,
            options: {
                "--no-send": "Do not send a confirmation message to the locked channel",
                "--everyone": "Unlock the channels for @everyone rather than the general role",
            }
        },
        {
            name: 'unlockall',
            shortBrief: "Unlock all the channels given in the configuration.",
            description: "Makes the given channels writable for the general members.",
            structure: "[...options]",
            example: "`%%unlockall --no-send\n`%%unlockall`\n`%%unlockall --everyone`",
            notes: null,
            options: {
                "--no-send": "Do not send a confirmation message to the locked channel",
                "--everyone": "Lock the channels for @everyone rather than the general role",
                "--raid": "Unlock all Raid-locked channels"
            }
        },
        {
            name: 'unmute',
            shortBrief: "Unmute someone in this server.",
            description: null,
            structure: "<UserID|Mention>",
            example: "`%%unmute 385753607325075320`\n`%%unmute @Someone You are spamming a lot`",
            notes: null
        },
        {
            name: 'warn',
            shortBrief: "Warn someone in this server.",
            description: null,
            structure: "<UserID|Mention> [Reason]",
            example: "`%%warn 385753607325075320`\n`%%warn @Someone You are spamming a lot`",
            notes: null
        },
        {
            name: 'warndel',
            shortBrief: "Delete a warning.",
            description: null,
            structure: "<ID>",
            example: "`%%warndel 39`",
            notes: null
        },
        {
            name: 'warning',
            shortBrief: "Show a warning.",
            description: null,
            structure: "<ID>",
            example: "`%%warning 39`",
            notes: null
        },
        {
            name: 'warnings',
            shortBrief: "Show all warnings.",
            description: "Show all warnings in this server. Passing an user will only show their warnings.",
            structure: "[UserId|Mention]",
            example: "`%%warnings`\n`%%warnings 948489127957979253978538`",
            notes: null
        },
    ],
    async render() {
        let string = '';

        for (let cmd of this.commands) {
            string += `\n\n**${cmd.name}**\n${cmd.shortBrief}`;
        }

        return string;
    },
    async handle(msg, cm) {
        if (typeof cm.args[0] === 'undefined') {
            // await msg.reply({
            //     embeds: [
            //         new MessageEmbed()
            //         .setColor('#f14a60')
            //         .setDescription(`This command requires at least one argument.`)
            //     ]
            // });

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription("The command list. Run `" + app.config.get('prefix') + "help <commandName>` for more information about a specific command.\n" + await this.render())
                    .setTitle('Help')
                ],
            });

            return;
        }

        const cmd = this.commands.find(c => c.name === cm.args[0]);

        if (!cmd) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid command \`${cm.args[0]}\`.`)
                ]
            });

            return;
        }

        let fields = [
            {
                name: "Usage",
                value: `\`${app.config.get('prefix')}${cmd.name}\`` + (cmd.structure.trim() !== '' ? ` \`${cmd.structure}\`` : '')
            },
            {
                name: 'Examples',
                value: cmd.example.replace(/\%\%/g, app.config.get('prefix'))
            }
        ];

        if (cmd.options !== undefined) {
            let str = '';

            for (let opt in cmd.options)
                str += `\`${opt}\` - ${cmd.options[opt]}\n`;

            str = str.substring(0, str.length - 1);

            fields.push({
                name: 'Options',
                value: str
            });
        }

        if (cmd.notes !== null) {
            fields.push({
                name: "Notes",
                value: cmd.notes
            });
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setTitle(`${app.config.get('prefix')}${cmd.name}`)
                .setDescription(cmd.description !== null ? cmd.description : cmd.shortBrief)
                .addFields(fields)
            ]
        });
    }
};