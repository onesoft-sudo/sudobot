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

import type { Tensor3D } from "@tensorflow/tfjs-node";
import type { NSFWJS } from "nsfwjs";
import Tesseract, { createWorker } from "tesseract.js";
import Service from "../core/Service";
import { log, logInfo } from "../utils/Logger";
import { developmentMode } from "../utils/utils";

export const name = "imageRecognitionService";

export default class ImageRecognitionService extends Service {
    protected worker: Tesseract.Worker | null = null;
    protected nsfwJsModel: NSFWJS | null = null;
    protected timeout: Timer | null = null;
    protected tensorFlow: typeof import("@tensorflow/tfjs-node") | null = null;
    protected nsfwJs: typeof import("nsfwjs") | null = null;

    async boot() {
        for (const guild in this.client.configManager.config) {
            if (
                this.client.configManager.config[guild]?.message_rules?.rules.some(
                    rule => rule.type === "EXPERIMENTAL_nsfw_filter"
                )
            ) {
                logInfo("Loading NSFWJS model for NSFW image recognition");

                this.tensorFlow = await import("@tensorflow/tfjs-node");

                if (!developmentMode()) {
                    this.tensorFlow.enableProdMode();
                }

                this.nsfwJs = await import("nsfwjs");
                this.nsfwJsModel = await this.nsfwJs.load(
                    process.env.NSFWJS_MODEL_URL || undefined,
                    process.env.NSFWJS_MODEL_IMAGE_SIZE
                        ? {
                              size: parseInt(process.env.NSFWJS_MODEL_IMAGE_SIZE)
                          }
                        : undefined
                );

                break;
            }
        }
    }

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

    async detectNSFW(image: Uint8Array | Buffer) {
        if (!this.tensorFlow) {
            throw new Error("Tensorflow is not loaded");
        }

        const tensor = this.tensorFlow.node.decodeImage(image, 3, undefined, false);
        const predictions = await this.nsfwJsModel!.classify(tensor as Tensor3D);
        const result: Record<string, number> = {};

        for (const prediction of predictions) {
            result[prediction.className.toLowerCase()] = prediction.probability;
        }

        tensor.dispose();
        return result;
    }
}
