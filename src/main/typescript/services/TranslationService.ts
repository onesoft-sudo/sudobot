import { Service } from "@framework/services/Service";
import { Name } from "@framework/services/Name";
import { getAxiosClient } from "@main/utils/axios";

@Name("translationService")
class TranslationService extends Service {
    protected readonly requestURL = "https://translate.google.com/translate_a/single?client=at&dt=t&dt=rm&dj=1";

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