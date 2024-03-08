import crypto from "node:crypto";

class TOTP {
    public static T0 = 0;
    public static STEP = 30;
    public static LENGTH = 6;
    public static ALGORITHM = "sha1";

    public static generate(secret: string, time: number = Date.now() / 1000): string {
        const secretBuffer = Buffer.from(secret, "ascii");
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(Math.floor(time / TOTP.STEP)), 0);
        const hmac = crypto.createHmac(TOTP.ALGORITHM, secretBuffer);
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0xf;
        const binary = (hash.readUInt32BE(offset) & 0x7fffffff) % Math.pow(10, TOTP.LENGTH);
        return binary.toString().padStart(TOTP.LENGTH, "0");
    }

    public static verify(secret: string, token: string, time: number = Date.now() / 1000): boolean {
        return TOTP.generate(secret, time) === token;
    }

    public static generateSecret(length: number = 16): string {
        return crypto
            .randomBytes(length)
            .toString("ascii")
            .replace(/[^a-zA-Z0-9]/g, "");
    }
}

export default TOTP;
