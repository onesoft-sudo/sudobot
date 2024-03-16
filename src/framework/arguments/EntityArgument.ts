import { GuildMember, Role, Snowflake, TextChannel, User } from "discord.js";
import { isSnowflake } from "../../utils/utils";
import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

abstract class EntityArgument<
    E extends User | GuildMember | TextChannel | Role | null
> extends Argument<E> {
    protected readonly mentionStart: string[] = [];

    public override toString(): string {
        return this.stringValue!.toString();
    }

    public toSnowflake(): Snowflake {
        let snowflake = this.stringValue;

        for (const start of this.mentionStart) {
            if (snowflake.startsWith(start)) {
                snowflake = snowflake.slice(start.length, -1);
                break;
            }
        }

        return snowflake as Snowflake;
    }

    public override validate(): boolean {
        if (!isSnowflake(this.toSnowflake())) {
            return this.error("Entity must be a valid snowflake", ErrorType.InvalidType);
        }

        return true;
    }
}

export default EntityArgument;
