import { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from "discord.js";
import { TODO } from "../../types/Utils";

export class Command {}

export type CommandMessage = Message | ChatInputCommandInteraction | ContextMenuCommandInteraction;
export type CommandContext = TODO;
