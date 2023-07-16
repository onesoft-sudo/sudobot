import { InfractionType, Prisma } from "@prisma/client";
import { GetResult } from "@prisma/client/runtime";

export type Infraction =
    | GetResult<
          {
              id: number;
              type: InfractionType;
              userId: string;
              guildId: string;
              reason: string | null;
              moderatorId: string;
              expiresAt: Date | null;
              metadata: Prisma.JsonValue;
              createdAt: Date;
              updatedAt: Date;
              queueId: number | null;
          },
          any
      > & {};
