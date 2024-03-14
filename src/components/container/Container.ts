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
type AnyConstructor<A extends any[] = any[]> = new (...args: A) => unknown;

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
        console.log(this.globalContainerResolver);
        if (this.globalContainerResolver === undefined) {
            throw new Error("Global container has not been set yet");
        }

        return this.globalContainerResolver();
    }

    public async bind<R extends AnyConstructor>(
        ref: R,
        options?: BindOptions<InstanceType<R>>
    ): Promise<void> {
        this.bindings.set(ref, {
            key: options?.key,
            value:
                options?.factory && options.callImmediately
                    ? await options.factory()
                    : options?.value,
            singleton: options?.singleton ?? false,
            factory: options?.factory
        });
    }

    public resolveExisting<R extends AnyConstructor>(ref: R): InstanceType<R> {
        const value = this.bindings.get(ref)?.value;

        if (!value) {
            throw new Error(`Failed to resolve binding for "${ref.name ? ref.name : ref}"`);
        }

        return value as InstanceType<R>;
    }

    private async createInstance<R extends AnyConstructor>(ref: R): Promise<InstanceType<R>> {
        const paramTypes = Reflect.getMetadata("design:paramtypes", ref);
        const params: [] = [];

        for (const paramType of paramTypes ?? []) {
            (params as unknown[]).push(await this.resolve(paramType));
        }

        return new (ref as new () => InstanceType<R>)(...params);
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
