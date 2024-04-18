export class Objects {
    public static keys<T extends object>(obj: T): Array<keyof T> {
        const keys = Object.keys(obj) as Array<keyof T>;
        const proto = Object.getPrototypeOf(obj);

        if (proto !== null) {
            keys.push(...(Objects.keys(proto) as Array<keyof T>));
        }

        return keys;
    }
}
