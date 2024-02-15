import Service from "@sudobot/core/Service";
import FileSystem from "@sudobot/polyfills/FileSystem";
import { logDebug } from "@sudobot/utils/logger";
import { sudoPrefix } from "@sudobot/utils/utils";

export default class URLFishService extends Service {
    async boot() {
        sudoPrefix("tmp/urlfish", true);

        const dataFile = sudoPrefix("tmp/urlfish/data.json", false);

        if (await FileSystem.existsSync(dataFile)) {
            const data = await FileSystem.readFileContents(dataFile, { json: true });
            logDebug("URLFishService", "Loaded data from file", data[0]);
        }
    }
}
