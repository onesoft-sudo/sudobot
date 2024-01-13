export default function usePlatform() {
    return navigator.userAgent.includes("Macintosh")
        ? "darwin"
        : navigator.userAgent.includes("Windows")
        ? "windows"
        : "linux";
}
