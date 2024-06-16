const k = 1024;
const dm = 2;
const sizes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

export const formatSize = (bytes: number): string => {
    if (bytes === 0) {
        return "0 bytes";
    }

    if (bytes === 1) {
        return "1 byte";
    }

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
