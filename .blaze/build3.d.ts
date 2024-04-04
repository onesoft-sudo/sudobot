import type { PackageManager, PackageManagerName } from "blazebuild/src/core/PackageManager";
import type { PluginManager } from "blazebuild/src/core/PluginManager";
import type { ProjectManager } from "blazebuild/src/core/ProjectManager";
import type { TaskManager } from "blazebuild/src/core/TaskManager";

type Callback<T> = (this: T, manager: T) => void;
type FinalPluginManager = PluginManager;

declare global {
    const project: Required<ProjectManager["metadata"]>;
    const tasks: Pick<TaskManager, "register" | "execute">;

    function packageManager(manager: PackageManagerName): void;
    function plugins(callback: Callback<FinalPluginManager>): void;
    function dependencies(callback: Callback<PackageManager>): void;

    function nodeModule(expression: string): void;
    function nodeModule(nameExpression: string, version: string): void;
    function nodeModule(namespace: string, name: string, version: string): void;

    function devNodeModule(expression: string): void;
    function devNodeModule(nameExpression: string, version: string): void;
    function devNodeModule(namespace: string, name: string, version: string): void;

    function peerNodeModule(expression: string): void;
    function peerNodeModule(nameExpression: string, version: string): void;
    function peerNodeModule(namespace: string, name: string, version: string): void;

    function optionalNodeModule(expression: string): void;
    function optionalNodeModule(nameExpression: string, version: string): void;
    function optionalNodeModule(namespace: string, name: string, version: string): void;

    function println(message: string): void;
    function x(command: string): Promise<void>;
}
