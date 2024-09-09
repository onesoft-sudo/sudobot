const CallableSymbol = Symbol("Callable");

abstract class Callable extends Function {
    public readonly [CallableSymbol]: this;

    public constructor() {
        super("...args", "return this._invoke(...args)");
        this[CallableSymbol] = this.bind(this);
        return this[CallableSymbol];
    }

    protected abstract invoke(...args: unknown[]): unknown;

    private _invoke(...args: unknown[]) {
        return this.invoke(...args);
    }

    public [Symbol.toStringTag]() {
        return this.toString();
    }

    public override toString() {
        return this.constructor.name;
    }
}

export default Callable;
