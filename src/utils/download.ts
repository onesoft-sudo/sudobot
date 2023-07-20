import axios from "axios";
import { createWriteStream } from "fs";
import { basename, join } from "path";
import stream from "stream";
import { promisify } from "util";
import { logInfo } from "./logger";
import { sudoPrefix } from "./utils";

export async function downloadFile({ url, path, name }: DownloadFileOptions) {
    logInfo("Attempting to download file: " + url);

    const finished = promisify(stream.finished);
    const storagePath = path ?? sudoPrefix("storage");
    const filePath = join(storagePath, name ?? basename(url));
    const writer = createWriteStream(filePath);
    const response = await axios.get(url, {
        responseType: "stream"
    });

    if (response.status < 200 || response.status >= 300) {
        throw new Error("HTTP error: Non 2xx response received: code " + response.status);
    }

    response.data.pipe(writer);

    await finished(writer);

    if (!writer.closed) await promisify(writer.close.bind(writer))();

    logInfo("Saved downloaded file to: " + filePath);

    return {
        filePath,
        storagePath
    };
}

interface DownloadFileOptions {
    url: string;
    path?: string;
    name?: string;
}
