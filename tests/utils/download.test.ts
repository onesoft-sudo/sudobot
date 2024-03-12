import { join } from "path";
import stream from "stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "../../src/utils/download";

const axiosMocks = vi.hoisted(() => {
    return {
        request: vi.fn(() => {
            return {
                status: 200,
                data: {
                    pipe: vi.fn()
                }
            };
        })
    };
});

vi.mock("fs", () => {
    return {
        createWriteStream: vi.fn(() => {
            return {
                write: vi.fn(),
                close: vi.fn(callback => callback(null)),
                closed: false
            };
        })
    };
});

vi.mock("stream", () => {
    return {
        default: {
            finished: vi.fn((stream, callback) => callback(null))
        }
    };
});

vi.mock("axios", () => {
    return {
        default: {
            request: axiosMocks.request
        }
    };
});

describe("downloadFile", () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it("should download a file", async () => {
        const url = "https://example.com/file.txt";
        const destinationDirectory = "path/to/dir";
        const name = "file.txt";
        const axiosOptions = { headers: { Authorization: "Bearer token" } };

        const result = await downloadFile({ url, path: destinationDirectory, name, axiosOptions });

        expect(result).toEqual({
            filePath: join(destinationDirectory, name),
            storagePath: destinationDirectory
        });

        expect(stream.finished).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if the request fails", async () => {
        const url = "https://example.com/file.txt";
        const destinationDirectory = "path/to/dir";
        const name = "file.txt";
        const axiosOptions = { headers: { Authorization: "Bearer token" } };

        axiosMocks.request.mockReturnValue({
            status: 500,
            data: {
                pipe: vi.fn()
            }
        });

        expect(
            downloadFile({ url, path: destinationDirectory, name, axiosOptions })
        ).rejects.toThrow("HTTP error: Non 2xx response received: code 500");
        expect(stream.finished).toHaveBeenCalledTimes(0);
    });
});
