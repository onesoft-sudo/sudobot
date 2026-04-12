import type { GuildMember } from "discord.js";
import Rule from "./Rule";
import type { RuleType } from "@schemas/all";

abstract class ProfileRule<T extends RuleType> extends Rule<T, GuildMember> {

}

export default ProfileRule;
