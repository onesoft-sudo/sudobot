import AbstractDatabase from "@framework/database/AbstractDatabase";
import * as InfractionModels from "@main/models/Infraction";
import * as MuteRecordModels from "@main/models/MuteRecord";
import * as PermissionLevelModels from "@main/models/PermissionLevel";
import * as PermissionProfileModels from "@main/models/PermissionProfile";
import * as QueuedJobModels from "@main/models/QueuedJob";

const models = {
    ...InfractionModels,
    ...PermissionLevelModels,
    ...PermissionProfileModels,
    ...QueuedJobModels,
    ...MuteRecordModels
} as const;

type ModelRecordType = typeof models;

class Database extends AbstractDatabase<ModelRecordType> {
    protected override createSchema(): ModelRecordType {
        return models;
    }
}

export default Database;
