import { z } from "zod";
import { isSnowflake } from "../utils/utils";

export const zSnowflake = z.custom<string>(data => {
    return typeof data === "string" && isSnowflake(data);
});
