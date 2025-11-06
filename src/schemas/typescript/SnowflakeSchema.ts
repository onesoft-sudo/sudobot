import Type from "typebox";

export const SnowflakeSchema = Type.String({ pattern: /^\d{17,22}$/, minLength: 1 });
