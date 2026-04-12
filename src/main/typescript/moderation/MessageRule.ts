import type { Message } from "discord.js";
import Rule from "./Rule";
import type { RuleType } from "@schemas/all";

abstract class MessageRule<T extends RuleType> extends Rule<T, Message<boolean>> {

}

export default MessageRule;
