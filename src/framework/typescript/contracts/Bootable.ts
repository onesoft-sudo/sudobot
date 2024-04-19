import type { Awaitable } from "discord.js";

export interface Bootable {
    boot(): Awaitable<void>;
}
