import axios from "axios";
import Service from "../utils/structures/Service";

export default class AIChat extends Service {
    enabled = false;

    async generateReply(input: string): Promise<string | null> {
        if (!process.env.BRAIN_API_URL) {
            return null;
        }

        if (input.toLowerCase().startsWith('say ')) {
            return input.substring('say '.length - 1);
        }

        try {
            const response = await axios.get(`${process.env.BRAIN_API_URL}&${new URLSearchParams({
                msg: input
            }).toString()}`);

            console.log(response);

            if (!response.data.cnt) {
                throw Error();
            }

            return response.data.cnt.replace(/<(\/?)tips>/gi, '');
        }
        catch (e) {
            console.log(e);
            return null;
        }
    }
}