import { Awaitable } from "discord.js";

interface KernelInterface {
    boot(): Awaitable<void>;
}

export { KernelInterface };
