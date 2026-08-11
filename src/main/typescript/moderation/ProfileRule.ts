import type { GuildMember } from "discord.js";
import Rule from "./Rule.js";
import type { RuleType } from "@schemas/all.js";

abstract class ProfileRule<T extends RuleType> extends Rule<T, GuildMember> {

}

export default ProfileRule;
