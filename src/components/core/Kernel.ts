import { Awaitable } from "discord.js";
import { Logger } from "../log/Logger";
import { KernelInterface } from "./KernelInterface";

export default abstract class Kernel implements KernelInterface {
    protected readonly logger = new Logger("kernel", true);
    abstract boot(): Awaitable<void>;
}
