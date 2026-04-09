/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

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
