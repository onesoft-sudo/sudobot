import Stream from "@framework/streams/Stream";
import { beforeEach, describe, expect, it } from "vitest";

describe("Stream", () => {
    let stream: Stream<number>;

    beforeEach(() => {
        stream = new Stream([1, 2, 3, 4, 5]);
    });

    it("should create a new Stream instance", () => {
        expect(stream).toBeInstanceOf(Stream);
    });

    it("should filter items correctly", () => {
        const filteredStream = stream.filter(item => item > 2);
        expect(Array.from(filteredStream)).toEqual([3, 4, 5]);
    });

    it("should map items correctly", () => {
        const mappedStream = stream.map(item => item * 2);
        expect(Array.from(mappedStream)).toEqual([2, 4, 6, 8, 10]);
    });

    it("should return correct item at index", () => {
        expect(stream.at(2)).toEqual(3);
    });

    it("should concatenate streams correctly", () => {
        const additionalStream = new Stream([6, 7, 8]);
        const concatenatedStream = stream.concat(additionalStream);
        expect(Array.from(concatenatedStream)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should slice streams correctly", () => {
        const slicedStream = stream.slice(1, 3);
        expect(Array.from(slicedStream)).toEqual([2, 3]);
    });

    it("should reduce streams correctly", () => {
        const reducedStream = stream.reduce((acc, item) => acc + item, 0);
        expect(reducedStream.get()).toEqual(15);
    });

    it("should convert to array correctly", () => {
        expect(stream.toArray()).toEqual([1, 2, 3, 4, 5]);
    });
});
