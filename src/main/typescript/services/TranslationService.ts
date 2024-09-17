/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Service } from "@framework/services/Service";
import { Name } from "@framework/services/Name";
import { getAxiosClient } from "@main/utils/axios";

@Name("translationService")
class TranslationService extends Service {
    protected readonly requestURL =
        "https://translate.google.com/translate_a/single?client=at&dt=t&dt=rm&dj=1";

    public async translate(text: string, from: string = "auto", to: string = "en") {
        try {
            const response = await getAxiosClient().post(
                this.requestURL,
                new URLSearchParams({
                    sl: from,
                    tl: to,
                    q: text
                }).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
                    }
                }
            );

            if (!response.data.sentences) {
                throw new Error("Invalid response received");
            }

            const translation = response.data.sentences
                .filter((s: Record<string, string>) => !!s.trans)
                .map((s: Record<string, string>) => s.trans.trim())
                .join(" ");

            return { translation, response };
        } catch (error) {
            return {
                error
            };
        }
    }
}

export default TranslationService;