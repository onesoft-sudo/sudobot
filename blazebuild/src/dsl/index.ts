import { PackageManager } from "../core/PackageManager";
import type { ProjectManager } from "../core/ProjectManager";

const record = global as Record<string, unknown>;

export const cli = global._cli;
export const tasks = cli.taskManager;
export const project = record.project as Required<ProjectManager["metadata"]>;
export const packageManager = record.packageManager as (manager: PackageManager) => void;
export const plugins = record.plugins as (callback: (manager: unknown) => void) => void;
export const dependencies = record.dependencies as (callback: (manager: unknown) => void) => void;
export const nodeModule = record.nodeModule as (...args: string[]) => void;
export const devNodeModule = record.devNodeModule as (...args: string[]) => void;
export const peerNodeModule = record.peerNodeModule as (...args: string[]) => void;
export const optionalNodeModule = record.optionalNodeModule as (...args: string[]) => void;
export const println = record.println as (message: string) => void;
export const x = record.x as (command: string) => Promise<void>;
