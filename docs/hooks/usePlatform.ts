"use client";

export default function usePlatform() {
    if (typeof navigator === "undefined") {
        return "darwin";
    }

    return navigator.userAgent.includes("Macintosh")
        ? "darwin"
        : navigator.userAgent.includes("Windows")
        ? "windows"
        : "linux";
}
