import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { env } from "@main/env/env";
import { getAxiosClient } from "@main/utils/axios";
import type { AxiosError } from "axios";

class CatCommand extends Command {
    public override readonly name = "cat";
    public override readonly description: string = "Fetch a random cat image.";
    public override readonly usage = [""];
    public override readonly systemPermissions = [];

    public override async execute(context: Context): Promise<void> {
        const token = env.CAT_API_TOKEN;

        if (!token) {
            return void (await context.error("No cat API token found."));
        }

        await context.defer();

        try {
            const response = await getAxiosClient().get(
                "https://api.thecatapi.com/v1/images/search",
                {
                    headers: {
                        "x-api-key": token
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error("Invalid response status code.");
            }

            await context.reply({
                files: [
                    {
                        attachment: response.data?.[0]?.url
                    }
                ]
            });
        } catch (error) {
            await context.error(
                (error as AxiosError).response?.status === 429
                    ? "Too many requests at the same time, please try again later"
                    : "Failed to fetch cat image: the API returned an invalid response."
            );
        }
    }
}

export default CatCommand;
