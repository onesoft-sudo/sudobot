import Service from "@sudobot/core/Service";
import FileSystem from "@sudobot/polyfills/FileSystem";
import { logDebug } from "@sudobot/utils/logger";
import { sudoPrefix } from "@sudobot/utils/utils";
import { downloadFile } from "@sudobot/utils/download";
import { Message } from "discord.js";

export const name = "urlfish";

export default class URLFishService extends Service {
    private readonly domainListURL = "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt";
    private _list: string[] = [];

    async boot() {
        const urlfishDir = sudoPrefix("tmp/urlfish", true);
        const dataFile = sudoPrefix("tmp/urlfish/LIST", false);

        if (await FileSystem.exists(dataFile)) {
            logDebug("URLFishService", "Phishing domain list already exists", dataFile);
        } else {
            logDebug("URLFishService", "Phishing domain list not found", dataFile);
            logDebug("URLFishService", "Downloading list", dataFile);

            const url = this.domainListURL;
            await downloadFile({
                url,
                name: "LIST",
                path: urlfishDir
            });
        }

        const data = (await FileSystem.readFileContents<string>(dataFile)).split("\n");
        logDebug("URLFishService", `Loaded ${data.length} entries from file`);
        this._list = data;
    }

    get list() {
        return this._list;
    }

    scanMessage(message: Message) {
        const urls = message.content.toLowerCase().split(" ");
        const phishingURLs: string[] = [];

        for (const url of urls) {
            const domain = url.startsWith("http") ? url.replace(/https?:\/?\/?/i, '') : url;

            if (this.list.includes(domain)) {
                phishingURLs.push(url);
            }
        }

        return phishingURLs;
    }
}
