import axios from "axios";
import Service from "../utils/structures/Service";

export default class Translator extends Service {
    requestURL = "https://translate.google.com/translate_a/single?client=at&dt=t&dt=rm&dj=1";

    public async translate(text: string, from: string = 'auto', to: string = 'en') {
        try {
            const response = await axios.post(this.requestURL, new URLSearchParams({
                sl: from,
                tl: to,
                q: text
            }).toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
                }
            });

            console.log(response.data);

            if (!response.data.sentences) {
                throw new Error("Invalid response received");
            }

            const translation = response.data.sentences.filter((s: any) => !!s.trans).map((s: any) => s.trans.trim()).join(' ');

            return { translation, response };
        }
        catch (e) {
            console.log(e);

            return {
                error: e,
            };
        }
    }
}