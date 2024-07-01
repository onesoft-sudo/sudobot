import type { StringLike } from "@framework/types/StringLike";

export type ShellCommandContext = {
    elevatedPrivileges: boolean;
    args: string[];
    print(...args: StringLike[]): void;
    println(...args: StringLike[]): void;
};
