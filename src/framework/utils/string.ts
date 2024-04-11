export function normalize(str: string, skip = false) {
    if (skip) {
        return str;
    }

    return str.replace(/[\u0300-\u036f]/g, "");
}
