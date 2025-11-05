import type { AnyFunction } from "@framework/types/types";
import DependencyResolveError from "./DependencyResolveError";
import {
    INJECT_SYMBOL_CONSTRUCT,
    INJECT_SYMBOL_FIELD,
    INJECT_SYMBOL_LIST,
    INJECT_SYMBOL_METHOD,
    type InjectionData
} from "./Inject";

type ConstructorOf<T> = new (...args: never[]) => T;

type ContainerObjectFactoryOptions<T> = {
    singleton?: boolean;
    id?: string;
    type: ConstructorOf<T>;
    factory?: ObjectFactory<NoInfer<T>>;
};

type ObjectFactory<T> = (container: Container) => T;

type ContainerOptions = {
    strict?: boolean;
};

type GetObjectOptions = {
    constructorArgs?: unknown[];
};

class Container {
    private readonly options: ContainerOptions;

    public constructor(options?: ContainerOptions) {
        this.options = {
            strict: false,
            ...options
        };
    }

    private readonly factories = new Map<
        string | ConstructorOf<object>,
        ContainerObjectFactoryOptions<object> & {
            singletonValue?: object;
        }
    >();

    public register<T extends object>(options: ContainerObjectFactoryOptions<T>): void {
        this.factories.set(options.type, options);

        if (options.id) {
            this.factories.set(options.id, options);
        }
    }

    private getInstance<T extends object>(idOrType: string | ConstructorOf<T>, constructorArgs: unknown[]): T {
        const options = this.factories.get(idOrType);

        if (!options) {
            if (this.options.strict || typeof idOrType === "string") {
                throw new DependencyResolveError(
                    `No strategy could be determined to resolve '${typeof idOrType === "string" ? idOrType : idOrType.name}'`
                );
            }

            return this.resolveObject(this.createInstance(idOrType, constructorArgs));
        }

        if (options.singleton) {
            if (!options.singletonValue) {
                options.singletonValue = this.resolveObject(
                    options.factory ? options.factory(this) : this.createInstance(options.type, constructorArgs)
                );
            }

            return options.singletonValue as T;
        }

        return this.resolveObject(
            options.factory ? options.factory(this) : this.createInstance(options.type, constructorArgs)
        ) as T;
    }

    private createInstance<T>(constructorFn: ConstructorOf<T>, args: unknown[]): T {
        const propertiesToResolve = Reflect.getMetadata(INJECT_SYMBOL_LIST, constructorFn) as Set<string> | undefined;

        if (propertiesToResolve?.has("constructor")) {
            const methodInjectData: Map<number, InjectionData> = Reflect.getMetadata(
                INJECT_SYMBOL_CONSTRUCT,
                constructorFn
            );

            if (methodInjectData) {
                const finalArgs = [...args];

                for (const [index, details] of methodInjectData) {
                    finalArgs[index] = this.get(details.type as ConstructorOf<object>);
                }

                return new constructorFn(...(finalArgs as never[]));
            }
        }

        return new constructorFn(...(args as never[]));
    }

    public get<T extends object>(id: string, options?: GetObjectOptions): T;
    public get<T extends object>(type: ConstructorOf<T>, options?: GetObjectOptions): T;
    public get<T extends object>(idOrType: string | ConstructorOf<T>, options?: GetObjectOptions): T {
        return this.getInstance(idOrType, options?.constructorArgs ?? []);
    }

    public resolveObject<T extends object>(object: T): T {
        const propertiesToResolve = Reflect.getMetadata(INJECT_SYMBOL_LIST, object) ?? [];

        for (const property of propertiesToResolve) {
            const details: InjectionData | undefined = Reflect.getMetadata(INJECT_SYMBOL_FIELD, object, property);

            if (!details) {
                throw new DependencyResolveError(
                    "Incomplete dependency metadata: Cannot resolve property '" +
                        property +
                        "' of object of type: " +
                        object.constructor.name
                );
            }

            const targetObject = this.get(details.type as ConstructorOf<object>);

            Object.defineProperty(object, property, {
                value: targetObject
            });
        }

        return object;
    }

    public callMethod<
        T extends object,
        M extends {
            [K in keyof T]: T[K] extends AnyFunction ? K : never;
        }[keyof T],
        _I = Parameters<T[NoInfer<M>] extends AnyFunction ? T[NoInfer<M>] : never>,
        P = {
            [K in keyof _I]?: _I[K] | undefined;
        },
        R = ReturnType<T[NoInfer<M>] extends AnyFunction ? T[NoInfer<M>] : never>
    >(object: T, method: M, args?: P): R {
        const details: Map<number, InjectionData> | undefined = Reflect.getMetadata(
            INJECT_SYMBOL_METHOD,
            object,
            typeof method === "number" ? method.toString() : method
        );

        if (!details) {
            if (this.options.strict) {
                throw new DependencyResolveError(
                    "Incomplete dependency metadata: Cannot resolve parameters of method of type: " +
                        object.constructor.name +
                        "::" +
                        method?.toString()
                );
            }

            return (object[method] as AnyFunction).call(object, ...((args ?? []) as [])) as R;
        }

        const finalArgs = [...((args ?? []) as [])] as object[];

        for (const [index, { type }] of details) {
            finalArgs[index] = this.get(type as ConstructorOf<object>);
        }

        return (object[method] as AnyFunction).call(object, ...(finalArgs as [])) as R;
    }
}

export default Container;
