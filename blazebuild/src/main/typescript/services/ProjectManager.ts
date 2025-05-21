import Service from "../core/Service";

export type ProjectAuthor = { name: string; email?: string; url?: string };
export type Project = {
    name: string;
    description: string | null;
    version: string | null;
    author: ProjectAuthor | ProjectAuthor[] | null;
    license: string | null;
    homepage: string | null;
    repository: string | null;
    keywords: string[] | null;
    private: boolean | null;
};

class ProjectManager extends Service {
    public readonly project: Project = {
        name: "unnamed",
        description: null,
        version: null,
        author: null,
        homepage: null,
        keywords: null,
        license: null,
        private: null,
        repository: null
    };
}

export default ProjectManager;
