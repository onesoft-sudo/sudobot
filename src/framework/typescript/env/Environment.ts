import type { ZodSchema, z } from "zod";

class Environment {
    public static isProduction(): boolean {
        return process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod";
    }

    public static isDevelopment(): boolean {
        return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";
    }

    public static isTest(): boolean {
        return process.env.NODE_ENV === "test";
    }

    public static isBun(): boolean {
        return !!process.isBun;
    }

    public static variables(): NodeJS.ProcessEnv {
        return process.env;
    }

    /**
     * Parse environment variables using a Zod schema.
     *
     * @param schema The Zod schema to use.
     * @returns The parsed environment variables.
     * @throws {z.ZodError} If the environment variables do not match the schema.
     */
    public static parseVariables<T extends ZodSchema>(schema: T): z.infer<T> {
        return schema.parse(this.variables());
    }
}

export default Environment;
