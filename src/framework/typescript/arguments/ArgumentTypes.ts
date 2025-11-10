import type Command from "@framework/commands/Command";
import type Argument from "./Argument";

export type ArgumentTypes<D extends readonly { name: string; type: object }[]> = {
    [K in D[number] as K["name"]]: K["type"] extends typeof Argument<infer T> ? T : never;
};

export type ArgumentsOf<T extends Command> = NonNullable<T["argumentSchema"]>["overloads"][number] extends {
    definitions: infer D;
}
    ? D extends readonly { name: string; type: object }[]
        ? ArgumentTypes<D>
        : never
    : never;
