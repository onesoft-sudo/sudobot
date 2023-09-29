import { z } from "zod";

export const zSnowflake = z.custom<string>(data => {
    return typeof data === "string" && /^\d{16,22}$/.test(data);
});
