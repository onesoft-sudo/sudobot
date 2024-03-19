import { Awaitable, ChatInputCommandInteraction, User } from "discord.js";
import Client from "../../core/Client";
import { safeUserFetch } from "../../utils/fetch";
import { If } from "../types/Utils";
import EntityArgument from "./EntityArgument";
import { ErrorType } from "./InvalidArgumentError";

class UserArgument<E extends boolean = false> extends EntityArgument<If<E, User, User | null>> {
    public static readonly defaultErrors = {
        [ErrorType.Required]: "You must specify a user to perform this action!",
        [ErrorType.InvalidType]: "You must specify a valid user to perform this action.",
        [ErrorType.EntityNotFound]: "The user you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<@!", "<@"];

    protected override transform(): Promise<If<E, User, User | null>> {
        return safeUserFetch(Client.instance, this.toSnowflake()) as Promise<
            If<E, User, User | null>
        >;
    }

    public override postTransformValidation() {
        if (!this.transformedValue) {
            return this.error("User not found", ErrorType.EntityNotFound);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<User> {
        const value = interaction.options.getUser(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default UserArgument;
