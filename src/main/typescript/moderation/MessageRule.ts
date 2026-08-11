import type { Message } from "discord.js";
import Rule from "./Rule.js";
import type { RuleType } from "@schemas/all.js";

abstract class MessageRule<T extends RuleType> extends Rule<T, Message<boolean>> {

}

export default MessageRule;
