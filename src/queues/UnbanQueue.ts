import Queue from "../utils/structures/Queue";

export default class UnbanQueue extends Queue {
    cancel(): Promise<void> {
        console.log("Canceling unban");
        return super.cancel();
    }

    async execute({ userID, guildID }: { [key: string]: string }): Promise<any> {     
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        try {
            const user = await this.client.users.fetch(userID);

            if (user) {
                await guild.bans.remove(user, 'Removed temporary ban');
            }
            else {
                throw new Error();
            }
        }
        catch (e) {
            console.log(e);   
        }
    }
}