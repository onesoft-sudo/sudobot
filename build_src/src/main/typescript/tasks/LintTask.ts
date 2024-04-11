import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";

class LintTask extends AbstractTask {
    public override readonly name = "lint";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    public override async execute() {
        await x("eslint --ext .ts src  --max-warnings=0");
    }
}

export default LintTask;
