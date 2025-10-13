import type { ZodError } from "zod";
import type { APIErrorCode } from "../APIErrorCode";

export type SetGuildConfigurationResponse =
    | {
          code: APIErrorCode.Success;
      }
    | {
          code: Omit<APIErrorCode, APIErrorCode.Success>;
          message: string;
          errors?: Pick<ZodError, "message" | "issues">;
      };
