import "reflect-metadata";

export const INJECT_SYMBOL_METHOD = Symbol("INJECT_METHOD");
export const INJECT_SYMBOL_CONSTRUCT = Symbol("INJECT_CONSTRUCT");
export const INJECT_SYMBOL_FIELD = Symbol("INJECT_FIELD");
export const INJECT_SYMBOL_LIST = Symbol("INJECT_SYMBOLS");

export type InjectionData =
    | {
          type: object;
          id: undefined;
      }
    | {
          type: undefined;
          id: string;
      };

function Inject(id?: string) {
    return (target: object, key: PropertyKey | undefined, extra?: number | ClassFieldDecoratorContext) => {
        const safeKey = (typeof key === "number" ? key.toString() : key) as string;
        const injectProperties: Set<PropertyKey> = Reflect.getMetadata(INJECT_SYMBOL_LIST, target) ?? new Set();

        if (typeof extra === "number") {
            const isConstructor = key === undefined;
            const paramTypes: object[] = Reflect.getMetadata("design:paramtypes", target, safeKey) ?? [];
            const methodInjectData: Map<number, InjectionData> =
                Reflect.getMetadata(isConstructor ? INJECT_SYMBOL_CONSTRUCT : INJECT_SYMBOL_METHOD, target, safeKey) ??
                new Map();

            if (!paramTypes[extra] && !id) {
                throw new TypeError("Dependency injection metadata could not determined automatically");
            }

            methodInjectData.set(extra, {
                type: paramTypes[extra],
                id
            } as InjectionData);

            Reflect.defineMetadata(
                isConstructor ? INJECT_SYMBOL_CONSTRUCT : INJECT_SYMBOL_METHOD,
                methodInjectData,
                target,
                safeKey
            );

            if (!key) {
                injectProperties.add("constructor");
            }
        } else if (key) {
            const propertyType = Reflect.getMetadata("design:type", target, safeKey);

            if (!propertyType && !id) {
                throw new TypeError("Dependency injection metadata could not determined automatically");
            }

            Reflect.defineMetadata(
                INJECT_SYMBOL_FIELD,
                { type: propertyType, id } satisfies InjectionData,
                target,
                safeKey
            );
            injectProperties.add(key);
        } else {
            throw new TypeError("Inject() used in an invalid context");
        }

        Reflect.defineMetadata(INJECT_SYMBOL_LIST, injectProperties, target);
    };
}

export { Inject };
