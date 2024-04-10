import { EventEmitter } from "events";

type MutexOptions = {
    ignoreExtraneousReleases?: boolean;
};

enum MutexState {
    Locked,
    Unlocked
}

class Mutex<T extends MutexState = MutexState> extends EventEmitter {
    private _state: T = MutexState.Unlocked as T;
    private readonly ignoreExtraneousReleases: boolean;

    public constructor({ ignoreExtraneousReleases = false }: MutexOptions) {
        super();
        this.ignoreExtraneousReleases = ignoreExtraneousReleases;
    }

    public async lock() {
        if (this.isLocked()) {
            const { promise, resolve } = Promise.withResolvers<void>();
            this.once("release", resolve);
            return promise;
        }

        this.setState(MutexState.Locked);
        return Promise.resolve();
    }

    public unlock() {
        if (!this.isLocked() && !this.ignoreExtraneousReleases) {
            throw new Error("This mutex is not locked yet.");
        }

        this.setState(MutexState.Unlocked);
        this.emit("release");
    }

    public isLocked(): this is Mutex<MutexState.Locked> {
        return this._state === MutexState.Locked;
    }

    public isUnlocked(): this is Mutex<MutexState.Unlocked> {
        return this._state === MutexState.Unlocked;
    }

    private setState<T extends MutexState>(state: T): Mutex<T> {
        this._state = state as unknown as typeof this._state;
        return this as unknown as Mutex<T>;
    }

    public get state(): T {
        return this._state;
    }
}

export default Mutex;
