export type ProjectProperties = {
    name: string;
    version: string;
    description: string;
    structure: ProjectStructureProperties;
};

export type ProjectStructureProperties = {
    sourcesRootDirectory: string;
    sourceModules?: string[];
    resourcesDirectory?: string;
    buildOutputDirectory: string;
    testsDirectory: string;
    testResourcesDirectory: string;
};
