export function isSnowflake(input: string) {
    return /^\d{16,22}$/.test(input);
}