/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2023 OSN Developers.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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
