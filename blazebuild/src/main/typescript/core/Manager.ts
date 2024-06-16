import type { Awaitable } from "../types/utils";
import type Blaze from "./Blaze";

abstract class Manager {
    public constructor(protected readonly blaze: Blaze) {}
    public boot?(): Awaitable<void>;
}

export default Manager;
