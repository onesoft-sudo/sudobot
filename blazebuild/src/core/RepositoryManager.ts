import { Manager } from "./Manager";

class RepositoryManager extends Manager {
    private _repositories: Record<string, string> = {};

    public createGlobalFunctions(global: Record<string, unknown>) {
        global.repositories = (callback: (this: this, manager: this) => void) => {
            this._repositories = {};
            callback.call(this, this);
        };

        const npm = (nameOrUrl: string, url?: string) => {
            this._repositories[nameOrUrl ?? url] = url ?? nameOrUrl;
        };

        global.npm = npm;
        global.npmMain = () => npm("main", "https://registry.npmjs.org");
    }

    public getRepository() {
        for (const key in this._repositories) {
            return this._repositories[key];
        }

        return "https://registry.npmjs.org";
    }
}

export default RepositoryManager;
