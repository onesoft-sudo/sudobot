import { CommandHelpData } from "../types/CommandHelpData";

export default {
    version: "2.0.0-beta1",
    commands: <CommandHelpData[]> [
        {
            name: 'about',
            shortBrief: "Show information about the bot.",
            description: null,
            structure: "",
            example: "`%%about`",
            notes: null
        },
        {
            name: 'addqueue',
            shortBrief: "Add a queue job.",
            description: 'Adds a queued command to the bot\'s memory and after the given amount of time it gets executed.',
            structure: "<time> <command>",
            example: "`%%addqueue 15m echo Hello world`\n`%%addqueue 12h kick 875275828247255`",
            notes: null
        },
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
            description: "Ban a user in this server.",
            structure: "<UserID|UserTag|Mention> [-d=DAYS] [Reason]",
            example: "`%%ban 385753607325075320`\n`%%ban @Someone You are spamming a lot`\n`%%ban @Someone -d 5`\n`%%ban 385753607325075320 -d 5 You are spamming a lot`",
            notes: null,
            options: {
                "-d": "The number of days old messages to delete. It must be in range 0-7. An argument is required.",
            }
        },
        {
            name: 'bean',
            shortBrief: "Bean someone in this server.",
            description: "Bean someone. It doesn't do anything except pretending.",
            structure: "<UserID|UserTag|Mention> [Reason]",
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
            structure: "<UserID|UserTag|UserMention>",
            example: "`%%clear 83474924191884727`\n`%%clear @Someone`",
            notes: null
        },
        {
            name: 'delqueue',
            shortBrief: "Delete a queue job.",
            description: "Delete a queued command by its ID.",
            structure: "<QueueID>",
            example: "`%%delqueue 80`",
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
            name: 'expire',
            shortBrief: "Echo (re-send) a message and delete it after the given time.",
            description: "Re-send a message from the bot and delete it automatically after the given time interval.",
            structure: "<timeInterval> <content> [channelMention]",
            example: "`%%echo 25m Something\nVery Cool`\n`%%echo 1h Something\nVery Cool #general`",
            notes: null
        },
        {
            name: 'expiresc',
            shortBrief: "Schedule a message and delete it after the given time.",
            description: "Schedule a message from the bot and delete it automatically after the given time interval.",
            structure: "<scheduleTimeInterval> <expireTimeInterval> <content> [channelMention]",
            example: "`%%echo 25m 5h Something\nVery Cool`\n`%%echo 1h 7d Something\nVery Cool #general`",
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
            name: 'joke',
            shortBrief: "Fetch a random joke from The Joke API.",
            description: null,
            structure: "",
            example: "`%%joke`",
            notes: null
        },
        {
            name: 'kick',
            shortBrief: "Kick someone from this server.",
            description: null,
            structure: "<UserID|UserTag|Mention> [Reason]",
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
            structure: "<UserID|UserTag|Mention> [-t=DURATION] [Reason]",
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
            structure: "<UserID|UserTag|UserMention> <note>",
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
            structure: "<UserID|UserTag|UserMention>",
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
            name: 'queues',
            shortBrief: "Show a list of all queue jobs.",
            description: null,
            structure: "",
            example: "`%%queues`",
            notes: null
        },
        {
            name: 'schedule',
            shortBrief: "Echo (re-send) a message after the given time.",
            description: "Re-send a message from the bot automatically after the given time interval.",
            structure: "<timeInterval> <content> [channelMention]",
            example: "`%%echo 25m Something\nVery Cool`\n`%%echo 1h Something\nVery Cool #general`",
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
            structure: "<UserID|UserTag|Mention> <content>",
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
                "--raid": "Unlock all Raid-locked channels"
            }
        },
        {
            name: 'unmute',
            shortBrief: "Unmute someone in this server.",
            description: null,
            structure: "<UserID|UserTag|Mention>",
            example: "`%%unmute 385753607325075320`\n`%%unmute @Someone You are spamming a lot`",
            notes: null
        },
        {
            name: 'warn',
            shortBrief: "Warn someone in this server.",
            description: null,
            structure: "<UserID|UserTag|Mention> [Reason]",
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
            structure: "[UserId|UserTag|Mention]",
            example: "`%%warnings`\n`%%warnings 948489127957979253978538`",
            notes: null
        },
    ]
}