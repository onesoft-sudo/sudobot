import { User } from "discord.js";
import Client from "../../core/Client";
import { safeUserFetch } from "../../utils/fetch";
import EntityArgument from "./EntityArgument";
import { ErrorType } from "./InvalidArgumentError";

class UserArgument extends EntityArgument<User | null> {
    protected readonly mentionStart: string[] = ["<@!", "<@"];

    protected override transform(): Promise<User | null> {
        return safeUserFetch(Client.instance, this.toSnowflake());
    }

    public override postTransformValidation() {
        if (!this.transformedValue) {
            return this.error("User not found", ErrorType.EntityNotFound);
        }

        return true;
    }
}

export default UserArgument;
