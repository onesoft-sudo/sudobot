import { SerializableToJSON } from "../types/SerializableToJSON";

class FluentSet<T> extends Set<T> implements SerializableToJSON<T[]> {
    public override add(...values: T[]) {
        for (const value of values) {
            super.add(value);
        }

        return this;
    }

    public override delete(...values: T[]) {
        let ret = true;

        for (const value of values) {
            ret &&= super.delete(value);
        }

        return ret;
    }

    public remove(...values: T[]) {
        this.delete(...values);
        return this;
    }

    public toArray() {
        return Array.from(this);
    }

    public toJSON() {
        return this.toArray();
    }

    public hasAll(...values: T[]) {
        for (const value of values) {
            if (!this.has(value)) {
                return false;
            }
        }

        return true;
    }

    public combine(...sets: FluentSet<T>[]) {
        for (const set of sets) {
            for (const value of set) {
                this.add(value);
            }
        }

        return this;
    }
}

export default FluentSet;
