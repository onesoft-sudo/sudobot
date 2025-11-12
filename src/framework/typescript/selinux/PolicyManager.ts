import { Collection, type ReadonlyCollection } from "discord.js";
import type { PolicyModuleType } from "./PolicyModuleSchema";
import PolicyModuleError from "./PolicyModuleError";

class PolicyManager {
    protected readonly modules = new Collection<string, PolicyModuleType>();
    protected mapTypeIds = new Map<string, number>();
    protected mapTypes: string[] = [];
    protected allowTypes: bigint[] = [];
    protected denyTypes: bigint[] = [];

    public loadModule(module: PolicyModuleType) {
        this.modules.set(module.policy_module.name, module);
    }

    public getLoadedModules(): ReadonlyCollection<string, PolicyModuleType> {
        return this.modules;
    }

    public getCurrentAVCStore() {
        return {
            mapTypes: this.mapTypes,
            allowTypes: this.allowTypes,
            denyTypes: this.denyTypes
        };
    }

    public compileAll() {
        const mapTypes: string[] = [];
        const allowTypes: bigint[] = [];
        const denyTypes: bigint[] = [];

        this.mapTypeIds.clear();

        for (const module of this.modules.values()) {
            for (const typeId in module.map_types) {
                if (
                    mapTypes[typeId] &&
                    (module.map_types[typeId] !== mapTypes[typeId] ||
                        this.mapTypeIds.get(module.map_types[typeId]) !== +typeId)
                ) {
                    throw new PolicyModuleError(
                        `Conflicting type definitions in policy module: ${module.policy_module.name}: Existing '${mapTypes[typeId]}', new '${module.map_types[typeId]}' [@${typeId}]`
                    );
                }

                this.mapTypeIds.set(module.map_types[typeId], +typeId);
                mapTypes[typeId] = module.map_types[typeId];
                denyTypes[typeId] =
                    (denyTypes[typeId] ?? 0n) |
                    (typeof module.deny_types[typeId] === "bigint"
                        ? module.deny_types[typeId]
                        : module.deny_types[typeId]
                          ? BigInt(module.deny_types[typeId])
                          : 0n);
                allowTypes[typeId] =
                    ((allowTypes[typeId] ?? 0n) |
                        (typeof module.allow_types[typeId] === "bigint"
                            ? module.allow_types[typeId]
                            : module.allow_types[typeId]
                              ? BigInt(module.allow_types[typeId])
                              : 0n)) &
                    ~denyTypes[typeId];
            }
        }

        this.mapTypes = mapTypes;
        this.allowTypes = allowTypes;
        this.denyTypes = denyTypes;
    }

    public getPermissionsOf(type: string | number) {
        const typeId = typeof type === "string" ? this.mapTypeIds.get(type) : type;

        if (typeId === undefined) {
            return 0n;
        }

        return this.allowTypes[typeId] ?? 0n;
    }
}

export default PolicyManager;
