import Container from "../container/Container";
import { KernelInterface } from "../core/KernelInterface";

class Application {
    public readonly container: Container;

    public constructor() {
        this.container = Container.getGlobalContainer();
    }

    public async run(kernel: KernelInterface) {
        await kernel.boot();
        return this;
    }

    public static setupGlobals() {
        global.bootDate = Date.now();

        if (!Symbol.metadata) {
            (Symbol as unknown as Record<string, symbol>).metadata ??= Symbol("metadata");
        }
    }
}

export default Application;
