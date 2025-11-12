import { Collection, type ReadonlyCollection } from "discord.js";
import type { PolicyModuleType } from "./PolicyModuleSchema";
import PolicyModuleError from "./PolicyModuleError";
import { Logger } from "@framework/log/Logger";
import { performance } from "perf_hooks";

class PolicyManagerAVC {
    protected readonly modules = new Collection<string, PolicyModuleType>();
    protected mapTypeIds = new Map<string, number>();
    protected mapTypes: string[] = [];
    protected allowTypes: bigint[] = [];
    protected denyTypes: bigint[] = [];
    protected allowTypesOnTargets = new Map<bigint, bigint>();
    protected denyTypesOnTargets = new Map<bigint, bigint>();

    protected readonly logger = Logger.getLogger(PolicyManagerAVC);

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
            denyTypes: this.denyTypes,
            allowTypesOnTargets: this.allowTypesOnTargets,
            denyTypesOnTargets: this.denyTypesOnTargets
        };
    }

    public compileAll() {
        const start = performance.now();

        const mapTypes: string[] = [];
        const allowTypes: bigint[] = [];
        const denyTypes: bigint[] = [];

        this.mapTypeIds.clear();
        this.allowTypesOnTargets.clear();
        this.denyTypesOnTargets.clear();

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
                    ~(denyTypes[typeId] ?? 0n);

                for (const targetTypeId in module.deny_types_on_targets[typeId]) {
                    const value = module.deny_types_on_targets[typeId][targetTypeId];
                    const key = (BigInt(typeId) << 32n) | BigInt(targetTypeId);
                    const existingValue = this.denyTypesOnTargets.get(key);
                    this.denyTypesOnTargets.set(
                        key,
                        (existingValue ?? 0n) |
                            denyTypes[typeId] |
                            (typeof value === "bigint" ? value : value ? BigInt(value) : 0n)
                    );
                }

                for (const targetTypeId in module.allow_types_on_targets[typeId]) {
                    const value = module.allow_types_on_targets[typeId][targetTypeId];
                    const key = (BigInt(typeId) << 32n) | BigInt(targetTypeId);
                    const existingValue = this.allowTypesOnTargets.get(key);
                    const existingDenyValue = this.denyTypesOnTargets.get(key);
                    this.allowTypesOnTargets.set(
                        key,
                        ((existingValue ?? 0n) |
                            ((allowTypes[typeId] ?? 0n) & ~(denyTypes[typeId] ?? 0n)) |
                            (typeof value === "bigint" ? value : value ? BigInt(value) : 0n)) &
                            ~((existingDenyValue ?? 0n))
                    );
                }
            }
        }

        this.mapTypes = mapTypes;
        this.allowTypes = allowTypes;
        this.denyTypes = denyTypes;

        const end = performance.now();
        const time = (end - start) / 1000;

        this.logger.debug(`AVC policy store compiled in ${time.toFixed(2)} seconds`);
    }

    public getPermissionsOf(type: string | number): bigint {
        const typeId = typeof type === "string" ? this.mapTypeIds.get(type) : type;

        if (typeId === undefined) {
            return 0n;
        }

        return this.allowTypes[typeId] ?? 0n;
    }

    public getPermissionsOfWithTarget(type: string | number, targetType: string | number): bigint {
        const typeId = typeof type === "string" ? this.mapTypeIds.get(type) : type;

        if (typeId === undefined) {
            return 0n;
        }

        const targetTypeId = typeof targetType === "string" ? this.mapTypeIds.get(targetType) : targetType;

        if (targetTypeId === undefined) {
            return 0n;
        }

        return this.allowTypesOnTargets.get((BigInt(typeId) << 32n) | BigInt(targetTypeId)) ?? 0n;
    }
}

export default PolicyManagerAVC;
