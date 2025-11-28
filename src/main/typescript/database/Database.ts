import AbstractDatabase from "@framework/database/AbstractDatabase";
import * as InfractionModels from "@main/models/Infraction";
import * as PermissionLevelModels from "@main/models/PermissionLevel";

const models = {
    ...InfractionModels,
    ...PermissionLevelModels,
} as const;

type ModelRecordType = typeof models;

class Database extends AbstractDatabase<ModelRecordType> {
    protected override createSchema(): ModelRecordType {
        return models;
    }
}

export default Database;
