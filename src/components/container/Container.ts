import { Awaitable } from "discord.js";

type Binding<T = unknown> = {
    value?: T;
    key: string;
    singleton: boolean;
    factory?: () => Awaitable<T>;
};

type BindOptions<T> = {
    value?: T;
    singleton?: boolean;
    factory?: () => Awaitable<T>;
    callImmediately?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor<A extends any[] = any[]> = new (...args: A) => unknown;

/**
 * A simple dependency injection container. It allows you to bind classes to a key and resolve them later.
 *
 * @since 9.0.0
 */
class Container {
    private readonly bindings = new WeakMap<object, Binding>();

    public async bind<R extends AnyConstructor>(
        key: string,
        ref: R,
        options?: BindOptions<InstanceType<R>>
    ): Promise<void> {
        this.bindings.set(ref, {
            key,
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

    private createInstanceDefault<R extends AnyConstructor>(ref: R): InstanceType<R> {
        return new (ref as new () => InstanceType<R>)();
    }

    public async resolve<R extends AnyConstructor>(ref: R): Promise<InstanceType<R>> {
        const binding = this.bindings.get(ref);

        if (!binding) {
            return this.createInstanceDefault(ref);
        }

        if (!binding.singleton || !binding.value) {
            const value = (
                binding.factory ? await binding.factory() : new ref()
            ) as InstanceType<R>;

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
