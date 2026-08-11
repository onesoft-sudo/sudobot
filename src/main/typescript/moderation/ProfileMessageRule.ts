import type { GuildMember, Message } from "discord.js";
import Rule from "./Rule.js";
import type { RuleType } from "@schemas/all.js";

abstract class ProfileMessageRule<T extends RuleType> extends Rule<T, ProfileMessageRulePayload> {

}

export type ProfileMessageRulePayload = {
    message?: undefined;
    member: GuildMember;
} | {
    message: Message<boolean>;
    member?: undefined;
};

export default ProfileMessageRule;
