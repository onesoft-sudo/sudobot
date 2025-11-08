import type Command from "@framework/commands/Command";
import type Guard from "./Guard";
import type Application from "@framework/app/Application";

export type GuardResolvable<T extends Command = Command> = Guard<T> | (new (application: Application) => Guard<T>);
