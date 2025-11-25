import { decode, encode, ExtensionCodec } from "@msgpack/msgpack";

class MessagePackEncoder {
    public static readonly extensionCodec = new ExtensionCodec();
    public static readonly messagePackOptions = { extensionCodec: this.extensionCodec, useBigInt64: true };

    static {
        const MAP_EXT_TYPE = 0;

        this.extensionCodec.register({
            type: MAP_EXT_TYPE,
            encode: (object: unknown): Uint8Array | null => {
                if (object instanceof Map) {
                    return encode([...object], this.messagePackOptions);
                }
                else {
                    return null;
                }
            },
            decode: (data: Uint8Array) => {
                const array = decode(data, this.messagePackOptions) as Array<[unknown, unknown]>;
                return new Map(array);
            }
        });
    }

    public encode(data: unknown) {
        return encode(data, MessagePackEncoder.messagePackOptions);
    }

    public decode<T = unknown>(data: ArrayLike<number> | ArrayBufferView | ArrayBufferLike) {
        return decode(data, MessagePackEncoder.messagePackOptions) as T;
    }
}

export default MessagePackEncoder;
