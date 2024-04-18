import { promiseWithResolvers } from "../polyfills/Promise";

type SemaphoreOptions = {
    ignoreExtraneousReleases?: boolean;
    maxPermits?: number;
};

class Semaphore {
    public static readonly EXTRANEOUS_RELEASE_ERROR_MESSAGE: string =
        'Semaphore count cannot be negative without the "ignoreExtraneousReleases" option set.\nThis is probably a bug in your code. Did you release too many times or too early before acquiring?';
    private readonly maxPermits: number;
    private count = 0;
    private readonly resolvers: Array<() => void> = [];
    private readonly ignoreExtraneousReleases: boolean;

    public constructor(options?: SemaphoreOptions);
    public constructor(maxPermits?: number);

    public constructor(optionsOrPermits: SemaphoreOptions | number = 1) {
        this.maxPermits =
            typeof optionsOrPermits === "number"
                ? optionsOrPermits
                : optionsOrPermits.maxPermits ?? 1;
        this.ignoreExtraneousReleases =
            typeof optionsOrPermits === "number"
                ? false
                : optionsOrPermits.ignoreExtraneousReleases ?? false;
    }

    public get availablePermits() {
        return this.maxPermits - this.count;
    }

    public async acquire() {
        if (this.count >= this.maxPermits) {
            const { promise, resolve } = promiseWithResolvers<void>();
            this.resolvers.push(resolve);
            this.count++;
            return promise;
        }

        this.count++;
        return Promise.resolve();
    }

    public release() {
        const resolver = this.resolvers.shift();

        if (resolver) {
            resolver();
        }

        this.count--;

        if (this.count < 0 && !this.ignoreExtraneousReleases) {
            throw new Error(Semaphore.EXTRANEOUS_RELEASE_ERROR_MESSAGE);
        }

        if (this.count < 0) {
            this.count = 0;
        }
    }
}

export default Semaphore;
