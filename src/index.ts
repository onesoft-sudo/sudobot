import { GatewayIntentBits, Partials } from "discord.js";
import 'dotenv/config';
import Client from "./core/Client";

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
];

const partials = [
    Partials.Channel
];

const client = new Client({
    intents,
    partials
});

(async () => {
    await client.boot();
    await client.loadEvents();
    await client.loadCommands();
    await client.login(process.env.TOKEN);
})();