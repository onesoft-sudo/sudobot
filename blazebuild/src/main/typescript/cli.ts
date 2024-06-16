import "reflect-metadata";

import Blaze from "./core/Blaze";

async function main() {
    const blaze = Blaze.getInstance();
    await blaze.boot();
    await blaze.run();
    await blaze.cacheManager.saveCache();
}

await main();
