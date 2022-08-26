import { CommandHelpData } from "../types/CommandHelpData";

export default <CommandHelpData[]> [
    {
        name: 'about',
        shortBrief: "Show information about the bot.",
        description: null,
        structure: "",
        example: "`%%about`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'addqueue',
        shortBrief: "Add a queue job.",
        description: 'Adds a queued command to the bot\'s memory and after the given amount of time it gets executed.',
        structure: "<time> <command>",
        example: "`%%addqueue 15m echo Hello world`\n`%%addqueue 12h kick 875275828247255`",
        notes: null,
        slashCommand: false,
        legacyCommand: true
    },
    {
        name: 'addsnippet',
        shortBrief: "Adds a snippet.",
        description: null,
        structure: "<Name> <Content>",
        example: "`%%addsnippet roles There are 2 roles`\n`%%addsnippet roles There are 2 roles\nAdmin - Administrator\nMod - Moderator`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'afk',
        shortBrief: "Keeps track of your mentions and tells other users that you're AFK.",
        description: null,
        structure: "[Reason]",
        example: "`%%afk`\n`%%afk Having dinner`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'announce',
        shortBrief: "Announce something in the given channel.",
        description: "Announce something in the given channel. The channel should be set in the configuration.",
        structure: "<Content>",
        example: "`%%announce Hello there!\nWe've just finished our job!\n@everyone`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'antijoin',
        shortBrief: "Enable the AntiJoin shield.",
        description: "Enables the AntiJoin shield.\nWhile AntiJoin is active, users will not be able to join the server (they will be kicked). This is useful when handling a raid.",
        structure: "",
        example: "`%%antijoin",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'appeal',
        shortBrief: "Send a message to staff members about a punishment appeal.",
        description: null,
        structure: "",
        example: "`%%appeal`",
        notes: null,
        slashCommand: true,
        legacyCommand: false
    },
    {
        name: 'avatar',
        shortBrief: "Show someone's avatar.",
        description: null,
        structure: "[UserID|UserTag|Mention=CURRENT_USER]",
        example: "`%%avatar 385753607325075320`\n`%%avatar`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
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
        },
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'ballot',
        shortBrief: "Create/view a ballot (poll) message.",
        description: null,
        subcommands: {
            "create": "Create a ballot message. Argument 1 should be the ballot message content.",
            "view": "View a ballot message stats. Argument 1 should be the ballot ID."
        },
        structure: "<subcommand> <subcommand-arguments>",
        example: "`%%ballot create What do you think guys?`\n`%%ballot view 15`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'cat',
        shortBrief: "Get a random kitty picture.",
        description: "Fetches a random cat picture from `thecatapi.com` API.",
        structure: "",
        example: "`%%cat`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'clear',
        shortBrief: "Clear all messages from a user.",
        description: "Clear all messages from a user, in the current channel. This might take a while.",
        structure: "<UserID|UserTag|UserMention>",
        example: "`%%clear 83474924191884727`\n`%%clear @Someone`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'config',
        shortBrief: "View or change the config options.",
        description: "Configure the bot settings. This command is for advanced users.\nIf the user only gives one argument (setting key), then the value of the setting key will be shown. Otherwise the setting key will be modified with the given parameters.",
        structure: "<key> [value]",
        example: "`%%config spam_filter.enabled false`\n`%%config prefix -`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'delqueue',
        shortBrief: "Delete a queue job.",
        description: "Delete a queued command by its ID.",
        structure: "<QueueID>",
        example: "`%%delqueue 80`",
        notes: null,
        slashCommand: false,
        legacyCommand: true
    },
    {
        name: 'delsnippet',
        shortBrief: "Deletes a snippet.",
        description: null,
        structure: "<Name>",
        example: "`%%delsnippet roles`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'dog',
        shortBrief: "Get a random doggy picture.",
        description: "Fetches a random cat picture from `thedogapi.com` API.",
        structure: "",
        example: "`%%dog`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'echo',
        shortBrief: "Echo (re-send) a message.",
        description: "Re-send a message from the bot.",
        structure: "<content> [channelMention]",
        example: "`%%echo Something\nVery Cool`\n`%%echo Something\nVery Cool #general`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'embed',
        shortBrief: "Build, send and make schemas of embeds!",
        description: "Build, send and make schemas of embeds. Schemas are special kind of text which can be used in various commands to represent an embed.\n\n**Subcommands**:\n\n`send` - Build and send an embed from the given input.\n`schema` - Builds an embed and returns back the JSON schema of the embed so that you can use it in other places!\n`build` - Builds an embed from a JSON schema.",
        structure: "<subcommand> <...args>",
        example: "`/embed send title:Hello world description:This is an embed, awesome!`\n`/embed schema title:Hello world description:This is an embed, awesome!`\n`/embed build json_schema:embed:{\"title\": \"Hello world\", \"description\": \"This is an embed, awesome!\", \"fields\": []}`",
        notes: null,
        slashCommand: true,
        legacyCommand: false
    },
    {
        name: 'emoji',
        shortBrief: "Get info about an emoji. Must be guild (server) specific emoji.",
        description: null,
        structure: "<GuildEmoji|GuildEmojiName>",
        example: "`%%emoji check`\n`%%emoji error`",
        notes: null,
        slashCommand: false,
        legacyCommand: true
    },
    {
        name: 'eval',
        shortBrief: "Execute raw Javascript code.\n*This command is owner-only*.",
        description: null,
        structure: "<code>",
        example: "`%%eval console.log(\"Hello world!\")`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'expire',
        shortBrief: "Echo (re-send) a message and delete it after the given time.",
        description: "Re-send a message from the bot and delete it automatically after the given time interval.",
        structure: "<timeInterval> <content> [channelMention]",
        example: "`%%echo 25m Something\nVery Cool`\n`%%echo 1h Something\nVery Cool #general`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'expiresc',
        shortBrief: "Schedule a message and delete it after the given time.",
        description: "Schedule a message from the bot and delete it automatically after the given time interval.",
        structure: "<scheduleTimeInterval> <expireTimeInterval> <content> [channelMention]",
        example: "`%%echo 25m 5h Something\nVery Cool`\n`%%echo 1h 7d Something\nVery Cool #general`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'hash',
        shortBrief: "Generate a hash of the given text input.",
        description: null,
        structure: "<algorithm> <input>",
        example: "`%%hash sha1 abc`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'help',
        shortBrief: "Show this help and exit.",
        description: null,
        structure: "[command]",
        example: "`%%help`\n`%%help mute`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'history',
        shortBrief: "Show moderation history for a user.",
        description: null,
        structure: "<UserMention|UserID>",
        example: "`%%history 27372628277272625`\n`%%history @Someone`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'httpcat',
        shortBrief: "Get some funny cat memes related to HTTP.",
        description: "Get some funny cat memes related to HTTP status codes, using http.cat API.",
        structure: "<status>",
        example: "`%%httpcat 403`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'httpdog',
        shortBrief: "Get some funny dog memes related to HTTP.",
        description: "Get some funny dog memes related to HTTP status codes, using http.dog API.",
        structure: "<status>",
        example: "`%%httpdog 403`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'joke',
        shortBrief: "Fetch a random joke from The Joke API.",
        description: null,
        structure: "",
        example: "`%%joke`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'kick',
        shortBrief: "Kick someone from this server.",
        description: null,
        structure: "<UserID|UserTag|Mention> [Reason]",
        example: "`%%kick 385753607325075320`\n`%%kick @Someone You are spamming a lot`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'lock',
        shortBrief: "Lock a specific channel.",
        description: "Makes the given channel read-only for the general members. If no channel is present, the current channel will be locked.",
        structure: "[ChannelID|ChannelMention]",
        example: "`%%lock 385753607325075320`\n`%%lock #general`\n`%%lock`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'lockall',
        shortBrief: "Lock all given channels, in-bulk.",
        description: "Makes the given channels read-only for the general members.",
        structure: "<...ChannelMention|ChannelIDs> [--raid]",
        example: "`%%lockall 2572562578247841786\n`%%lockall 2572562578247841786 2572562578247841782 2572562578247841783`\n`%%lockall 2572562578247841786 2572562578247841785`",
        notes: null,
        options: {
            "--raid": "Lock all raid protected channels",
        },
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'massban',
        shortBrief: 'Mass ban (multiple) users',
        description: null,
        structure: '<...UserIDs|UserMentions> [Reason]',
        example: '`%%massban 8247282727258725258 @someone Mass Banning`',
        notes: null,
        slashCommand: true,
        legacyCommand: true
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
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'mvsnippet',
        shortBrief: "Rename a snippet.",
        description: null,
        structure: "<oldName> <newName>",
        example: "`%%mvsnippet abc bca`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'note',
        shortBrief: "Take a note about an user.",
        description: null,
        structure: "<UserID|UserTag|UserMention> <note>",
        example: "`%%note @Someone Simple note.`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'notedel',
        shortBrief: "Delete a note.",
        description: null,
        structure: "<NoteID>",
        example: "`%%notedel 922`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'noteget',
        shortBrief: "Get a note.",
        description: null,
        structure: "<NoteID>",
        example: "`%%noteget 922`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'notes',
        shortBrief: "Get all notes for a specific user.",
        description: null,
        structure: "<UserID|UserTag|UserMention>",
        example: "`%%notes @Someone`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'pixabay',
        shortBrief: "Fetch images from Pixabay.",
        description: "Search & fetch images from Pixabay API.\n\nAvailable Subcommands:\n\tphoto - Fetch photos only.\n\tvector - Fetch vectors only.\n\tillustration - Fetch illustrations only\n\timage - Fetch any image.",
        structure: "<subcommand> [query]",
        example: "`%%pixabay image`\n`%%pixabay photo birds`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'profile',
        shortBrief: 'Show the server profile.',
        description: null,
        structure: '[UserID|UserTag|UserMention]',
        example: '`%%profile`\n`%%profile @Someone`',
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'queues',
        shortBrief: "Show a list of all queue jobs.",
        description: null,
        structure: "",
        example: "`%%queues`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'rolelist',
        shortBrief: 'List all roles in the server',
        description: null,
        structure: "[Page] [Role]",
        example: "`%%rolelist`",
        notes: null,
        slashCommand: true,
        legacyCommand: false
    },
    {
        name: 'schedule',
        shortBrief: "Echo (re-send) a message after the given time.",
        description: "Re-send a message from the bot automatically after the given time interval.",
        structure: "<timeInterval> <content> [channelMention]",
        example: "`%%echo 25m Something\nVery Cool`\n`%%echo 1h Something\nVery Cool #general`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'send',
        shortBrief: "Send a DM to a user.",
        description: null,
        structure: "<UserID|UserTag|Mention> <content>",
        example: "`%%send 278358918549759428 Hello world`\n`%%send @Someone Hello world`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'setchperms',
        shortBrief: "Set channel permissions in bulk.",
        description: null,
        structure: "<...ChannelIDs|ChannelMentions> <Role> <PermissionKey> <null|true|false>",
        example: "`%%setchperms 827483719415287387 24872512882472142 #general @everyone SEND_MESSAGES false`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'shot',
        shortBrief: "Give a shot to a user.",
        description: "Give a shot to a user. This command actually doesn't do anything.",
        structure: "<UserID|UserTag|Mention> [Reason]",
        example: "`%%shot 385753607325075320`\n`%%shot @Someone You are spamming a lot`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'softban',
        shortBrief: "Softban a user.",
        description: "A softban means banning and unbanning a user immediately so that their messages gets deleted.",
        structure: "<UserID|UserTag|UserMention> [-d=DAYS] [Reason]",
        example: "`%%softban @Someone`\n`%%softban 44347362235774742 Hello world`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'stats',
        shortBrief: "Show the server stats.",
        description: null,
        structure: "",
        example: "`%%stats",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'system',
        shortBrief: "Show the system status.",
        description: null,
        structure: "",
        example: "`%%system",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'tempban',
        shortBrief: "Temporarily ban a user.",
        description: null,
        structure: "<UserID|UserTag|UserMention> <Time> [-d=DAYS] [Reason]",
        example: "`%%softban @Someone 20m`\n`%%softban 44347362235774742 50m Hello world`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'unban',
        shortBrief: "Unban a user from this server.",
        description: null,
        structure: "<UserID>",
        example: "`%%unban 2946255269594753792`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'unlock',
        shortBrief: "Unlock a specific channel.",
        description: "Makes the given channel writable for the general members. If no channel is present, the current channel is unlocked.",
        structure: "[ChannelID|ChannelMention]",
        example: "`%%unlock 385753607325075320`\n`%%unlock #general`\n`%%unlock`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'unlockall',
        shortBrief: "Unlock all given channels, in bulk.",
        description: "<...ChannelMention|ChannelIDs> [--raid]",
        structure: "[...options]",
        example: "`%%unlockall --raid\n`%%unlockall 348764381911364631 634894637314679163795`",
        notes: null,
        options: {
            "--raid": "Unlock all Raid-protected channels"
        },
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'unmute',
        shortBrief: "Unmute someone in this server.",
        description: null,
        structure: "<UserID|UserTag|Mention>",
        example: "`%%unmute 385753607325075320`\n`%%unmute @Someone You are spamming a lot`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'warn',
        shortBrief: "Warn someone in this server.",
        description: null,
        structure: "<UserID|UserTag|Mention> [Reason]",
        example: "`%%warn 385753607325075320`\n`%%warn @Someone You are spamming a lot`",
        notes: null,
        slashCommand: true,
        legacyCommand: true
    },
    {
        name: 'warning',
        shortBrief: "Operations with warnings.",
        description: null,
        structure: "<ID>",
        example: "`%%warning list @Someone`\n`%%warning clear @Someone`\n`%%warning remove 24`\n`%%warning view 35`",
        notes: null,
        slashCommand: true,
        legacyCommand: true,
        subcommands: {
            "list": "List all warnings for a user",
            "clear": "Clear all warnings for a user",
            "remove": "Remove a warning by ID",
            "view": "View information about a warning by ID"
        }
    },
    {
        name: 'welcomer',
        shortBrief: "Configure the welcomer.",
        description: "Change the settings of the welcomer.",
        structure: "<option(s)> [...args]",
        example: "`%%welcomer --enable`",
        notes: null,
        slashCommand: true,
        legacyCommand: true,
        options: {
            "--enable": "Enables the welcomer",
            "--disable": "Disables the welcomer",
            "--toggle": "Toggles the welcomer",
            "--msg, --message, --custom": "Set custom welcome message. The welcome message as an argument is required.",
            "--rm-msg, --remove-message": "Remove the custom welcome message.",
            "--rand, --randomize": "Toggle random welcome messages.",
            "--preview": "Preview the welcome message embed.",
        }
    },
]