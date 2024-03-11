import axios from "axios";
import { WriteStream } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "../../src/utils/download";

const mockUrl = "https://example.com/file.txt";
const mockPath = "/mock/path";
const mockName = "file.txt";
const mockAxiosOptions = { headers: { Authorization: "Bearer token" } };

const pipe = vi.fn(stream => void (stream.closed = true));
const writerClose = vi.fn();

vi.mock("axios", () => {
    type Options = Parameters<typeof axios.request>[0];

    const request = vi.fn((options: Options) => {
        if (options.url === mockUrl) {
            return {
                status: 200,
                data: {
                    pipe
                }
            };
        }

        return { status: 404 };
    });

    const module = {
        request,
        get: vi.fn((url: string, options: Options) => request({ ...options, url, method: "GET" }))
    };

    return { ...module, default: module, __esModule: true };
});

vi.mock("fs", () => {
    const createWriteStream = vi.fn(() => {
        const writer = {
            closed: false,
            close: writerClose
        };

        return writer as unknown as WriteStream;
    });

    const module = {
        createWriteStream
    };

    return { ...module, default: module, __esModule: true };
});

vi.mock("stream", () => {
    const finished = vi.fn((stream, callback) => {
        callback(null);
    });

    const module = {
        finished
    };

    return { ...module, default: module, __esModule: true };
});

describe("downloadFile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should download a file and return the file path and storage path", async () => {
        const mockAxiosRequest = vi.spyOn(axios, "request");
        const mockLogInfo = vi.spyOn(console, "info");

        const result = await downloadFile({
            url: mockUrl,
            path: mockPath,
            name: mockName,
            axiosOptions: mockAxiosOptions
        });

        expect(result).toEqual({
            filePath: join(mockPath, mockName),
            storagePath: mockPath
        });
        expect(mockAxiosRequest).toHaveBeenCalledWith({
            method: "GET",
            url: mockUrl,
            responseType: "stream",
            ...mockAxiosOptions
        });
        expect(mockLogInfo.mock.lastCall?.at(1)).toBe(
            "Saved downloaded file to: " + join(mockPath, mockName)
        );
        expect(pipe).toHaveBeenCalledOnce();
    });

    it("should throw an error if the HTTP response status is not in the 2xx range", async () => {
        const mockResponse = {
            status: 404
        };
        const mockAxiosRequest = vi.spyOn(axios, "request").mockResolvedValue(mockResponse);

        await expect(
            downloadFile({
                url: mockUrl,
                path: mockPath,
                name: mockName,
                axiosOptions: mockAxiosOptions
            })
        ).rejects.toThrow("HTTP error: Non 2xx response received: code " + mockResponse.status);

        expect(mockAxiosRequest).toHaveBeenCalledWith({
            method: "GET",
            url: mockUrl,
            responseType: "stream",
            ...mockAxiosOptions
        });
    });
});
