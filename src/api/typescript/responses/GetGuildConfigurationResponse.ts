import type { APIErrorCode } from "../APIErrorCode";

export type GetGuildConfigurationResponse<T> =
    | {
          code: APIErrorCode.Success;
          configuration: T;
      }
    | {
          code: Omit<APIErrorCode, APIErrorCode.Success>;
          message: string;
      };
