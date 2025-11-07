class Singleton {
    protected static instance: Singleton;

    public constructor() {
        if ((this.constructor as typeof Singleton).instance) {
            return (this.constructor as typeof Singleton).instance;
        }

        (this.constructor as typeof Singleton).instance = this;
    }
}

export default Singleton;
