import Pagination from "@framework/widgets/Pagination";
import { describe, expect, it, vi } from "vitest";
import { createApplication } from "../../mocks/application.mock";

describe("Pagination", () => {
    createApplication();

    const emojiResolver = (_name: string) => {
        return undefined;
    };

    it("should initialize with default values", () => {
        const pagination = new Pagination(undefined, emojiResolver);

        expect(pagination.state).toEqual({ page: 1 });
        expect(pagination.limit).toBe(10);
    });

    it("should set fetcher correctly", () => {
        const fetcher = vi.fn();
        const pagination = new Pagination(undefined, emojiResolver).setFetcher(fetcher);

        expect(pagination["_fetcher"]).toBe(fetcher);
    });

    it("should set count getter correctly", () => {
        const getCount = vi.fn();
        const pagination = new Pagination(undefined, emojiResolver).setCountGetter(getCount);

        expect(pagination["_getCount"]).toBe(getCount);
    });

    it("should set initial message correctly", () => {
        const message = {} as any;
        const pagination = new Pagination(undefined, emojiResolver).setInitialMessage(message);

        expect(pagination["_initialMessage"]).toBe(message);
    });

    it("should set data correctly", () => {
        const data = [1, 2, 3];
        const pagination = new Pagination(undefined, emojiResolver).setData(data);

        expect(pagination["_cachedData"]).toBe(data);
    });

    it("should set limit correctly", () => {
        const limit = 20;
        const pagination = new Pagination(undefined, emojiResolver).setLimit(limit);

        expect(pagination["_limit"]).toBe(limit);
    });

    it("should set message options builder correctly", () => {
        const builder = vi.fn();
        const pagination = new Pagination(undefined, emojiResolver).setMessageOptionsBuilder(
            builder
        );

        expect(pagination["_builder"]).toBe(builder);
    });

    it("should set action row builder correctly", () => {
        const builder = vi.fn();
        const pagination = new Pagination(undefined, emojiResolver).setActionRowBuilder(builder);

        expect(pagination["_actionRowBuilder"]).toBe(builder);
    });

    it("should calculate offset correctly", () => {
        const pagination = new Pagination(undefined, emojiResolver).setLimit(10);

        expect(pagination["calculateOffset"].call(pagination, 1)).toBe(0);
        expect(pagination["calculateOffset"].call(pagination, 2)).toBe(10);
        expect(pagination["calculateOffset"].call(pagination, 3)).toBe(20);
    });

    it("should get slice correctly", async () => {
        const data = [1, 2, 3, 4, 5];
        const pagination = new Pagination(undefined, emojiResolver).setData(data).setLimit(2);

        expect(await pagination["getSlice"].call(pagination, 1)).toEqual([1, 2]);
        expect(await pagination["getSlice"].call(pagination, 2)).toEqual([3, 4]);
        expect(await pagination["getSlice"].call(pagination, 3)).toEqual([5]);
    });

    it("should get message options correctly", async () => {
        const data = [1, 2, 3];
        const builder = vi.fn().mockResolvedValue({});
        const pagination = new Pagination(undefined, emojiResolver)
            .setData(data)
            .setMessageOptionsBuilder(builder);

        await pagination["getMessageOptions"].call(pagination);

        expect(builder).toHaveBeenCalledWith({
            data,
            pagination,
            state: pagination.state,
            maxPages: await pagination["calculateMaxPages"].call(pagination),
            page: pagination.state.page
        });
    });

    it("should destroy pagination correctly", async () => {
        const message = {
            edit: vi.fn()
        } as any;
        const pagination = new Pagination(undefined, emojiResolver).setInitialMessage(message);
        pagination["getMessageOptions"] = vi.fn().mockResolvedValue({});

        await pagination.destroy();

        expect(pagination["_destroyed"]).toBe(true);
        expect(pagination["_timeout"]).toBeUndefined();
        expect(pagination["_initialMessage"]?.edit).toHaveBeenCalledWith({});
    });

    it("should calculate max pages correctly", async () => {
        const getCount = vi.fn().mockResolvedValue(15);
        const pagination = new Pagination(undefined, emojiResolver)
            .setCountGetter(getCount)
            .setLimit(5);

        expect(await pagination["calculateMaxPages"].call(pagination)).toBe(3);
    });

    it("should get action row correctly", async () => {
        const pagination = new Pagination(undefined, emojiResolver).setLimit(10);
        pagination["calculateMaxPages"] = vi.fn().mockResolvedValue(3);

        const actionRow = await pagination["getActionRow"].call(pagination);

        expect(actionRow).toBeDefined();
        expect(actionRow.components.length).toBe(4);
    });

    it("should create pagination with fetcher", () => {
        const fetcher = vi.fn();
        const pagination = Pagination.withFetcher(fetcher);

        expect(pagination["_fetcher"]).toBe(fetcher);
    });

    it("should create pagination with data", () => {
        const data = [1, 2, 3];
        const pagination = Pagination.withData(data);

        expect(pagination["_cachedData"]).toBe(data);
    });

    it("should create pagination with data using 'of' method", () => {
        const data = [1, 2, 3];
        const pagination = Pagination.of(data);

        expect(pagination["_cachedData"]).toBe(data);
    });
});
