import { readFile } from "fs/promises";

class Properties {
    private readonly properties: { [key: string]: string };

    public constructor(properties?: { [key: string]: string }) {
        this.properties = properties || {};
    }

    public set(key: string, value: string): void {
        this.properties[key] = value;
    }

    public get(key: string): string | undefined;
    public get(key: string, defaultValue: string): string;

    public get(key: string, defaultValue?: string): string {
        return this.properties[key] ?? defaultValue;
    }

    public getAll(): { [key: string]: string } {
        return this.properties;
    }

    public static async fromFile(filePath: string) {
        try {
            const contents = await readFile(filePath, {
                encoding: "utf8"
            });

            const rawProps = contents.split("\n").reduce(
                (acc, line) => {
                    if (!line?.trim() || line.startsWith("#")) {
                        return acc;
                    }

                    const [key, value] = line.split("=");
                    acc[key.trim()] = value.trim();
                    return acc;
                },
                {} as Record<string, string>
            );

            return new Properties(rawProps);
        } catch (error) {
            throw new Error(
                `Unable to read and parse properties file. Are you sure this is a BlazeBuild project?`,
                {
                    cause: error
                }
            );
        }
    }
}

export default Properties;
