import path from "path";

export type ClassLoadOptions<T, R> = {
    loader?: (exported: T) => R;
    attrs?: ImportAttributes;
};

class ClassLoader {
    private static readonly SRC_ROOT_DIR = path.resolve(__dirname, "../../..");

    public async loadClass<T, R = T>(file: string, options?: ClassLoadOptions<T, R>): Promise<R> {
        if (file[0] !== "/") {
            file = path.join(ClassLoader.SRC_ROOT_DIR, file);
        }

        const module = await import(file, { with: options?.attrs });
        return (options?.loader ? options.loader(module) : module) as R;
    }
}

export default ClassLoader;
