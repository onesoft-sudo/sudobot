import { Collection } from "discord.js";
import { requireNonNull } from "../utils/utils";
import { Inject } from "./Inject";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyConstructor<A extends any[] = any[]> = new (...args: A) => unknown;

export type Binding<T extends AnyConstructor = AnyConstructor> = {
    key: string;
    value: T;
    instance?: InstanceType<T>;
    factory?: () => InstanceType<T>;
    singleton?: boolean;
};

export type ContainerBindOptions<T extends AnyConstructor = AnyConstructor> = {
    key?: string;
    singleton?: boolean;
    factory?: () => InstanceType<T>;
};

export type Resolved<T extends AnyConstructor> = InstanceType<T>;

/**
 * A simple dependency injection container. It allows you to bind classes to a key and resolve them later.
 *
 * @since 9.0.0
 */
class Container {
    public static readonly Inject = Inject;
    private static instance?: Container;
    public readonly bindingsByConstructor = new Collection<AnyConstructor, Binding>();
    public readonly bindingsByName = new Collection<string, Binding>();

    private constructor() {}

    /**
     * Get the global container instance.
     *
     * @since 9.0.0
     */
    public static getGlobalContainer() {
        if (!Container.instance) {
            Container.instance = new Container();
        }

        return Container.instance;
    }

    /**
     * Destroy the global container instance.
     *
     * @since 9.0.0
     */
    public static destroyGlobalContainer() {
        Container.instance = undefined;
    }

    /**
     * Bind a class to a key.
     *
     * @param key The key to bind the class to.
     * @param value The class to bind.
     * @since 9.0.0
     */
    public bind<T extends AnyConstructor>(value: T, options?: ContainerBindOptions<T>) {
        const key = options?.key ?? value.name;
        const binding = {
            key,
            value,
            instance: undefined,
            factory: options?.factory,
            singleton: options?.singleton ?? false
        };
        this.bindingsByName.set(key as string, binding as Binding<T>);
        this.bindingsByConstructor.set(value, binding as Binding<T>);
    }

    /**
     * Resolve a class by its key.
     *
     * @param key The key to resolve.
     * @since 9.0.0
     */
    public resolve<T extends AnyConstructor>(key: string): Resolved<T> {
        const binding = this.bindingsByName.get(key as string);

        if (!binding) {
            throw new Error(`No binding found for key: ${key}`);
        }

        return this.resolveBinding(binding) as Resolved<T>;
    }

    public resolveByClass<T extends AnyConstructor>(value: T): InstanceType<T> {
        const binding = this.bindingsByConstructor.get(value);

        if (!binding) {
            return this.autoCreateInstance(value);
        }

        return this.resolveBinding(binding) as InstanceType<T>;
    }

    protected resolveBinding<T extends AnyConstructor>(binding: Binding<T>): Resolved<T> {
        if (binding.instance) {
            return binding.instance;
        }

        let instance;

        if (binding.factory) {
            instance = binding.factory();
        } else {
            instance = this.autoCreateInstance(binding.value as AnyConstructor);
        }

        if (binding.singleton) {
            binding.instance = instance as Resolved<T>;
        }

        if (binding.factory) {
            this.resolveProperties(binding.value as AnyConstructor, instance);
        }

        return instance as Resolved<T>;
    }

    protected autoCreateInstance<T extends AnyConstructor>(value: T): InstanceType<T> {
        requireNonNull(value);

        const constructorParamTypes = Reflect.getMetadata("design:paramtypes", value) as
            | AnyConstructor[]
            | undefined;
        const bindAs = Reflect.getMetadata("di:bind_as", value);
        let instance: InstanceType<T>;

        if (!constructorParamTypes) {
            instance = new value() as InstanceType<T>;
        } else {
            const resolvedParams = constructorParamTypes.map(paramType =>
                this.resolveByClass(paramType)
            );

            instance = new value(...resolvedParams) as InstanceType<T>;
        }

        if (bindAs) {
            this.createBindingFromInstance(value, instance, bindAs);
        }

        this.resolveProperties(value, instance);
        return instance;
    }

    private createBindingFromInstance<T extends AnyConstructor>(
        ref: T,
        instance: InstanceType<T>,
        key: string
    ) {
        const binding = {
            key,
            value: ref,
            instance,
            singleton: true
        };

        this.bindingsByName.set(key, binding as Binding<T>);
        this.bindingsByConstructor.set(ref, binding as Binding<T>);
    }

    public resolveProperties<T extends AnyConstructor>(
        value: T,
        instance?: InstanceType<T>
    ): InstanceType<T> {
        const finalInstance = instance ?? this.resolveByClass(value);
        const injections = Reflect.getMetadata("di:inject", value.prototype) || [];

        for (const injection of injections) {
            if ((finalInstance as Record<string, unknown>)[injection.key]) {
                continue;
            }

            const resolved =
                typeof injection.name === "string"
                    ? this.resolve(injection.name)
                    : this.resolveByClass(
                          requireNonNull(
                              injection.ref ??
                                  Reflect.getMetadata(
                                      "design:type",
                                      value.prototype,
                                      injection.key
                                  ),
                              "Cannot determine the type of property to inject"
                          )
                      );

            (finalInstance as Record<string, unknown>)[injection.key] = resolved;
        }

        return finalInstance;
    }
}

export default Container;
