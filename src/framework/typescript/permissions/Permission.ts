import type Application from "@framework/app/Application";
import type { ConstructorOf } from "@framework/container/Container";
import Singleton from "@framework/objects/Singleton";
import type { Awaitable, GuildMember, User } from "discord.js";

abstract class Permission extends Singleton {
    public abstract readonly name: string;

    public constructor(protected readonly application: Application) {
        super();
    }

    public static getInstance<T extends typeof Permission>(this: T, application: Application): InstanceType<T> {
        if (!this.instance) {
            this.instance = application.container.get(this as unknown as ConstructorOf<T>);
        }

        return this.instance as InstanceType<T>;
    }

    public hasMember(member: GuildMember): Awaitable<boolean> {
        return this.hasUser(member.user);
    }

    public abstract hasUser(user: User): Awaitable<boolean>;
}

export default Permission;
