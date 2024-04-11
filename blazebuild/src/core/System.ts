abstract class System {
    private readonly properties = new Map<string, string>();

    public getProperty(key: string): string | undefined {
        return this.properties.get(key);
    }

    public setProperty(key: string, value: string): void {
        this.properties.set(key, value);
    }
}

export default System;
