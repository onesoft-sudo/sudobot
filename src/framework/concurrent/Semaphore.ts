type SemaphoreOptions = {
    ignoreExtraneousReleases?: boolean;
    max?: number;
};

class Semaphore {
    private readonly max: number;
    private count = 0;
    private readonly resolvers: Array<() => void> = [];
    private readonly ignoreExtraneousReleases: boolean;

    public constructor({ max = 1, ignoreExtraneousReleases = false }: SemaphoreOptions) {
        this.max = max;
        this.ignoreExtraneousReleases = ignoreExtraneousReleases;
    }

    public async acquire() {
        if (this.count >= this.max) {
            const { promise, resolve } = Promise.withResolvers<void>();
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
            throw new Error(
                'Semaphore count cannot be negative without the "ignoreExtraneousReleases" option set.\nThis is probably a bug in your code. Did you release too many times or too early before acquiring?'
            );
        }

        if (this.count < 0) {
            this.count = 0;
        }
    }
}

export default Semaphore;
