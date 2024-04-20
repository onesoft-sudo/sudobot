class FluentIterator {
    public static slice<T>(data: Iterable<T>, offset: number, limit?: number): Array<T>;
    public static slice<T>(data: Iterable<T>, limit: number): Array<T>;

    public static slice<T>(data: Iterable<T>, offsetOrLimit: number, _limit?: number): Array<T> {
        const array = [];
        const limit = _limit ?? offsetOrLimit;
        let offset = _limit ? offsetOrLimit : 0;

        for (const item of data) {
            if (offset > 0) {
                offset--;
                continue;
            }

            if (array.length >= limit) {
                break;
            }

            array.push(item);
        }

        return array;
    }
}

export default FluentIterator;
