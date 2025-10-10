import type { APIErrorCode } from "../APIErrorCode";
import type { Guild } from "../models/Guild";
import type { User } from "../models/User";

export type AuthResponse =
    | {
          code: Omit<APIErrorCode, APIErrorCode.Success>;
          message: string;
          success: false;
      }
    | {
          code: APIErrorCode.Success;
          success: true;
          user: User;
          token: string;
          expires: number;
          guilds: Guild[];
      };
