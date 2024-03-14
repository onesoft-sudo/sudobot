import { Awaitable } from "discord.js";

type Binding<T = unknown> = {
    value?: T;
    key?: string;
    singleton: boolean;
    factory?: () => Awaitable<T>;
};

export type BindOptions<T> = {
    key?: string;
    value?: T;
    singleton?: boolean;
    factory?: () => Awaitable<T>;
    callImmediately?: boolean;
};

export type ContainerOptions = {
    /**
     * Whether to use implicit resolution for classes that are not explicitly bound.
     */
    implicitResolution?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyConstructor<A extends any[] = any[]> = new (...args: A) => unknown;

/**
 * A simple dependency injection container. It allows you to bind classes to a key and resolve them later.
 *
 * @since 9.0.0
 */
class Container {
    private static globalContainerResolver?: () => Container;
    private static canSetGlobalContainer = false;
    private readonly bindings = new WeakMap<object, Binding>();

    public constructor(private readonly options: ContainerOptions = {}) {
        if (Container.canSetGlobalContainer) {
            Container.globalContainerResolver = () => this;
        }
    }

    public static getGlobalContainerResolver(resolver: () => Container) {
        this.globalContainerResolver = resolver;
    }

    public static setFirstContainerAsGlobal(canSetGlobalContainer: boolean = true) {
        this.canSetGlobalContainer = canSetGlobalContainer;
    }

    public static destroyGlobalContainer() {
        this.globalContainerResolver = undefined;
    }

    public static getGlobalContainer(): Container {
        if (this.globalContainerResolver === undefined) {
            throw new Error("Global container has not been set yet");
        }

        return this.globalContainerResolver();
    }

    public async bind<R extends AnyConstructor>(
        ref: R,
        options?: BindOptions<InstanceType<R>>
    ): Promise<void> {
        await this.resolveStaticProps(ref);

        const value =
            options?.factory && options.callImmediately ? await options.factory() : options?.value;

        const binding = {
            key: options?.key,
            value,
            singleton: options?.singleton ?? false,
            factory: options?.factory
        };

        this.bindings.set(ref, binding);

        if (value) {
            await this.resolveProps(ref, value);
        }
    }

    public async resolveStaticProps<R extends AnyConstructor>(ref: R) {
        const metadata = Reflect.getMetadata("di:inject", ref);

        if (!metadata) {
            return;
        }

        for (const { key, ref: propRef } of metadata) {
            const type = Reflect.getMetadata("design:type", ref, key);

            if (!propRef && !type) {
                throw new Error(
                    `Failed to resolve property "${key}" on object of class "${ref.name}"`
                );
            }

            const propTypeRef = propRef ?? type;
            ref[key as keyof typeof ref] = await this.resolve(propTypeRef);
        }
    }

    public resolveExisting<R extends AnyConstructor>(ref: R): InstanceType<R> {
        const value = this.bindings.get(ref)?.value;

        if (!value) {
            throw new Error(`Failed to resolve binding for "${ref.name ? ref.name : ref}"`);
        }

        return value as InstanceType<R>;
    }

    private async resolveProps<R extends AnyConstructor>(ref: R, instance: InstanceType<R>) {
        const metadata = Reflect.getMetadata("di:inject", ref.prototype);

        if (!metadata) {
            return;
        }

        for (const { key, ref: propRef } of metadata) {
            const type = Reflect.getMetadata("design:type", ref.prototype, key);

            if (!propRef && !type) {
                throw new Error(
                    `Failed to resolve property "${key}" on object of class "${ref.name}"`
                );
            }

            const propTypeRef = propRef ?? type;
            (instance as Record<string, unknown>)[key] = await this.resolve(propTypeRef);
        }
    }

    private async createInstance<R extends AnyConstructor>(ref: R): Promise<InstanceType<R>> {
        const paramTypes = Reflect.getMetadata("design:paramtypes", ref);
        const params: [] = [];

        for (const paramType of paramTypes ?? []) {
            (params as unknown[]).push(await this.resolve(paramType));
        }

        const instance = new (ref as new () => InstanceType<R>)(...params);
        await this.resolveProps(ref, instance);

        const bindTo = Reflect.getMetadata("di:bind", ref) as
            | undefined
            | (Omit<BindOptions<R>, "value" | "factory"> & { ref: R });

        if (bindTo) {
            await this.bind(bindTo.ref, {
                ...bindTo,
                factory: () => this.createInstance(bindTo.ref)
            });
        }

        return instance;
    }

    public async resolve<R extends AnyConstructor>(ref: R): Promise<InstanceType<R>> {
        const binding = this.bindings.get(ref);

        if (!binding) {
            if (this.options.implicitResolution) {
                return this.createInstance(ref);
            }

            throw new Error(`Failed to resolve binding for "${ref.name ? ref.name : ref}"`);
        }

        if (!binding.singleton || !binding.value) {
            const value = (await (binding.factory
                ? binding.factory()
                : this.createInstance(ref))) as InstanceType<R>;

            if (!binding.singleton) {
                return value;
            }

            binding.value = value;
            return value;
        }

        return binding.value as InstanceType<R>;
    }
}

export default Container;
