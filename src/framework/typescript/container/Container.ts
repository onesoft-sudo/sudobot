/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { Collection } from "discord.js";
import { requireNonNull } from "../utils/utils";
import { Inject } from "./Inject";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyConstructor<A extends any[] = any[]> = abstract new (...args: A) => unknown;

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


class Container {
    public static readonly Inject = Inject;
    private static instance?: Container;
    public readonly bindingsByConstructor = new Collection<AnyConstructor, Binding>();
    public readonly bindingsByName = new Collection<string, Binding>();

    private constructor() {}

    
    public static getInstance() {
        if (!Container.instance) {
            Container.instance = new Container();
        }

        return Container.instance;
    }

    
    public static destroyGlobalContainer() {
        Container.instance = undefined;
    }

    
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

    
    public resolve<T extends AnyConstructor>(key: string): Resolved<T> {
        const binding = this.bindingsByName.get(key as string);

        if (!binding) {
            throw new Error(`No binding found for key: ${key}`);
        }

        return this.resolveBinding(binding) as Resolved<T>;
    }

    
    public resolveByClass<T extends AnyConstructor>(
        value: T,
        args?: ConstructorParameters<T>,
        singleton = true
    ): InstanceType<T> {
        const binding = this.bindingsByConstructor.get(value);

        if (!binding) {
            return this.autoCreateInstance(value, args, singleton);
        }

        return this.resolveBinding(binding, args) as InstanceType<T>;
    }

    /**
     * Resolve a class by its constructor.
     *
     * @param value The constructor to resolve.
     * @since 9.0.0
     */
    protected resolveBinding<T extends AnyConstructor>(
        binding: Binding<T>,
        args?: ConstructorParameters<T>
    ): Resolved<T> {
        if (binding.instance) {
            return binding.instance;
        }

        let instance;

        if (binding.factory) {
            instance = binding.factory();
        } else {
            instance = this.autoCreateInstance(binding.value as AnyConstructor, args);
        }

        if (binding.singleton) {
            binding.instance = instance as Resolved<T>;
        }

        if (binding.factory) {
            this.resolveProperties(binding.value as AnyConstructor, instance);
        }

        return instance as Resolved<T>;
    }

    /**
     * Automatically create an instance of a class.
     *
     * @param value The constructor to create an instance of.
     * @since 9.0.0
     */
    protected autoCreateInstance<T extends AnyConstructor>(
        value: T,
        args?: ConstructorParameters<T>,
        singleton = true
    ): InstanceType<T> {
        requireNonNull(value);

        const constructorParamTypes = Reflect.getMetadata("design:paramtypes", value) as
            | AnyConstructor[]
            | undefined;
        const bindAs = Reflect.getMetadata("di:bind_as", value);
        let instance: InstanceType<T>;

        if (!constructorParamTypes || args) {
            instance = new (value as unknown as new (...args: unknown[]) => InstanceType<T>)(
                ...(args ?? [])
            ) as InstanceType<T>;
        } else {
            const resolvedParams = constructorParamTypes.map(paramType =>
                this.resolveByClass(paramType)
            );

            instance = new (value as unknown as new (...args: unknown[]) => InstanceType<T>)(
                ...resolvedParams
            ) as InstanceType<T>;
        }

        if (bindAs) {
            this.createBindingFromInstance(value, instance, bindAs, singleton);
        }

        this.resolveProperties(value, instance);
        return instance;
    }

    /**
     * Create a binding from an instance.
     *
     * @param ref The constructor to bind.
     * @param instance The instance to bind.
     * @param key The key to bind the instance to.
     */
    private createBindingFromInstance<T extends AnyConstructor>(
        ref: T,
        instance: InstanceType<T>,
        key: string,
        singleton = true
    ) {
        const binding = {
            key,
            value: ref,
            instance,
            singleton
        };

        this.bindingsByName.set(key, binding as Binding<T>);
        this.bindingsByConstructor.set(ref, binding as Binding<T>);
    }

    /**
     * Resolve the properties of a class.
     *
     * @param value The constructor to resolve the properties of.
     * @param instance The instance to resolve the properties of.
     */
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

export const container = Container.getInstance();
export default Container;
