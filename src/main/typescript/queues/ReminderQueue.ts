import Queue from "@framework/queues/Queue";
import { fetchUser } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { formatDistanceToNowStrict } from "date-fns";
import type { Snowflake } from "discord.js";

type ReminderQueuePayload = {
    message: string;
    userId: Snowflake;
    createdAt: string;
};

class ReminderQueue extends Queue<ReminderQueuePayload> {
    public static override readonly uniqueName = "reminder";

    public async execute({ message, userId, createdAt }: ReminderQueuePayload) {
        const user = await fetchUser(this.application.client, userId);

        if (!user) {
            return;
        }

        await user
            .send({
                embeds: [
                    {
                        title: "Reminder Notification",
                        description: message,
                        color: Colors.Primary,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: `You set this reminder ${formatDistanceToNowStrict(new Date(createdAt), { addSuffix: true })}`
                        }
                    }
                ]
            })
            .catch(this.application.logger.error);
    }
}

export default ReminderQueue;
