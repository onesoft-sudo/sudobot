import { Message } from "discord.js";
import Service from "../utils/structures/Service";

export default class Utilities extends Service {
    typingInterval: NodeJS.Timer | null = null;
    typingTimeOut: NodeJS.Timeout | null = null;
    lastDeletedMessage?: Message;
}