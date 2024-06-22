import { promiseWithResolvers } from "@framework/polyfills/Promise";

class Condition {
    private readonly resolvers: Array<() => void> = [];

    public async wait() {
        const { promise, resolve } = promiseWithResolvers<void>();
        this.resolvers.push(resolve);
        return promise;
    }

    public signal() {
        const resolver = this.resolvers.shift();

        if (resolver) {
            resolver();
        }
    }
}

export default Condition;
