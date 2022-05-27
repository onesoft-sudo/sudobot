import { CommandInteractionOptionResolver } from "discord.js";

export default interface InteractionOptions {
    options: CommandInteractionOptionResolver;
    cmdName: string;
    isInteraction: true;
};