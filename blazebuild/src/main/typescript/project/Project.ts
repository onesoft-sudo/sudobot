import type { ProjectManager } from "./ProjectManager.js";
import type { Version } from "./Version.js";

export type Project = {
    name: string;
    version: Version;
    author: ProjectAuthor;
    structure: ProjectStructure;
    manager: ProjectManager;
    build: ProjectBuildConfiguration;
};

export type ProjectAuthor = {
    name: string;
    email?: string;
    url?: string;
};

export type ProjectStructure = {
    sourceDirectory: string;
    buildDirectory: string;
    buildSourceDirectory?: string;
    typescriptConfigurationFile: string;
};

export type ProjectBuildConfiguration = {
    defaultTask?: string;
};
