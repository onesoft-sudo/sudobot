import { setEnv } from "@main/env/env.js";
import axios from "axios";
import crypto from "crypto";
import { parse } from "dotenv";
import { createMlKem768 } from "mlkem";

class TwoFactorAuthenticator {
    private async decrypt(
        encryptedData: Buffer,
        privateKey: Uint8Array<ArrayBufferLike>
    ) {
        /* The encrypted data is in the following format:
                   - First 4 bytes: The size of the IV (ivSize)
                   - Next 4 bytes: The size of the auth tag (authTagSize)
                   - Next 4 bytes: The size of the cipher text (cipherTextSize)
                   - Next (ivSize) bytes: The IV used for encryption
                   - Next (authTagSize) bytes: The auth tag
                   - Next (cipherTextSize) bytes: The encrypted data
                   - Remaining bytes: Encrypted data */

        if (
            encryptedData.length < 16 ||
            encryptedData.readUInt32BE(0) !== 0x7c83
        ) {
            throw new Error("Invalid encrypted data received");
        }

        const ivSize = encryptedData.readUInt32BE(4);
        const authTagSize = encryptedData.readUInt32BE(8);
        const cipherTextSize = encryptedData.readUInt32BE(12);
        const iv = Uint8Array.prototype.slice.call(
            encryptedData,
            16,
            16 + ivSize
        );
        const authTag = Uint8Array.prototype.slice.call(
            encryptedData,
            16 + ivSize,
            16 + ivSize + authTagSize
        );
        const cipherText = Uint8Array.prototype.slice.call(
            encryptedData,
            16 + ivSize + authTagSize,
            16 + ivSize + authTagSize + cipherTextSize
        );
        const encryptedEnv = Uint8Array.prototype.slice.call(
            encryptedData,
            16 + ivSize + authTagSize + cipherTextSize
        );

        const mlkem = await createMlKem768();
        const decryptedSharedSecret = mlkem.decap(cipherText, privateKey);
        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            decryptedSharedSecret,
            iv
        );
        decipher.setAuthTag(authTag);
        const decryptedTextData =
            decipher.update(encryptedEnv, undefined, "utf8") +
            decipher.final("utf8");

        return decryptedTextData;
    }

    public async fetchCredentials(
        encryptedData: Buffer,
        url: string,
        key: string
    ) {
        if (
            !url.startsWith("https://") &&
            !url.startsWith("http://localhost:")
        ) {
            throw new Error(`${url} is not secure (HTTPS)`);
        }

        const is2FACode = key.length === 6 && !isNaN(Number(key));

        try {
            const response = await axios.post(
                url,
                {
                    code: is2FACode ? key : undefined
                },
                {
                    headers: {
                        Authorization: is2FACode ? undefined : `Bearer ${key}`
                    }
                }
            );

            if (
                response.data?.privateKey &&
                typeof response.data?.privateKey === "string"
            ) {
                /* The response contains all data in hex format.
                   Therefore first decode it to a buffer. */
                const privateKey = new Uint8Array(
                    Buffer.from(response.data.privateKey, "hex")
                );

                const decryptedTextData = await this.decrypt(
                    encryptedData,
                    privateKey
                );

                try {
                    const data = parse(decryptedTextData);

                    setEnv({
                        ...process.env,
                        ...data
                    });

                    for (const key in data) {
                        process.env[key] = data[key];
                    }

                    return data;
                } catch (error) {
                    throw new Error(
                        "Failed to parse decrypted data: " +
                            (error instanceof Error
                                ? error.message
                                : `${error}`),
                        { cause: error }
                    );
                }
            } else {
                throw new Error("Invalid response received");
            }
        } catch (error) {
            throw new Error("Cannot fetch credentials", { cause: error });
        }
    }
}

export default TwoFactorAuthenticator;
