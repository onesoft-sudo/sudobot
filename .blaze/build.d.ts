import type { PackageManager, PackageManagerName } from "blazebuild/src/core/PackageManager";
import type { PluginManager } from "blazebuild/src/core/PluginManager";
import type { ProjectManager } from "blazebuild/src/core/ProjectManager";
import type { TaskManager } from "blazebuild/src/core/TaskManager";
import type { SpawnOptions } from "child_process";

type Builder<T> = (this: T, manager: T) => void;
type FinalPluginManager = PluginManager;

declare global {
    const project: Required<ProjectManager["metadata"]>;
    const tasks: Pick<TaskManager, "register" | "execute">;

    function packageManager(manager: PackageManagerName): void;
    function plugins(builder: Builder<FinalPluginManager>): void;
    function dependencies(builder: Builder<PackageManager>): void;

    function requiredModule(expression: string): void;
    function requiredModule(nameExpression: string, version: string): void;
    function requiredModule(namespace: string, name: string, version: string): void;

    function devModule(expression: string): void;
    function devModule(nameExpression: string, version: string): void;
    function devModule(namespace: string, name: string, version: string): void;

    function peerModule(expression: string): void;
    function peerModule(nameExpression: string, version: string): void;
    function peerModule(namespace: string, name: string, version: string): void;

    function optionalModule(expression: string): void;
    function optionalModule(nameExpression: string, version: string): void;
    function optionalModule(namespace: string, name: string, version: string): void;

    function println(message: string): void;
    function x(command: string, options?: SpawnOptions): Promise<void>;

    function repositories(builder: Builder<RepositoryManager>): void;
    function npm(name: string, url: string): void;
    function npm(url: string): void;
    function npmMain(): void;
}
