import type { ZodType } from "zod";
import { ZodArray, ZodEffects, ZodNullable, ZodObject, ZodOptional } from "zod";

export const getZodPropertyPaths = (schema: ZodType): string[] => {
    if (schema instanceof ZodEffects) {
        return getZodPropertyPaths(schema._def?.schema ?? schema);
    }

    if (schema instanceof ZodNullable || schema instanceof ZodOptional) {
        return getZodPropertyPaths(schema.unwrap());
    }

    if (schema instanceof ZodArray) {
        return getZodPropertyPaths(schema.element);
    }

    if (schema instanceof ZodObject) {
        const entries = Object.entries<ZodType>(schema.shape);

        return entries.flatMap(([key, value]) => {
            const nested = getZodPropertyPaths(value).map(subKey => `${key}.${subKey}`);
            return nested.length ? nested : key;
        });
    }

    return [];
};
