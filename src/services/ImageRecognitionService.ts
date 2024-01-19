/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import Tesseract, { createWorker } from "tesseract.js";
import Service from "../core/Service";
import { log } from "../utils/logger";

export const name = "imageRecognitionService";

export default class ImageRecognitionService extends Service {
    protected worker: Tesseract.Worker | null = null;
    protected timeout: NodeJS.Timeout | null = null;

    protected async createWorkerIfNeeded() {
        if (!this.worker && !this.timeout) {
            log("Spawning new tesseract worker for image recognition");
            this.worker = await createWorker("eng");
            this.setTimeout();
        } else if (this.worker && this.timeout) {
            log("Using existing tesseract worker for image recognition");
            clearTimeout(this.timeout);
            this.setTimeout();
        }
    }

    protected setTimeout() {
        this.timeout = setTimeout(() => {
            log("Terminating existing tesseract worker due to inactivity");
            this.worker?.terminate();
            this.timeout = null;
        }, 60_000);
    }

    async recognize(image: Tesseract.ImageLike) {
        await this.createWorkerIfNeeded();
        return this.worker!.recognize(image);
    }
}
