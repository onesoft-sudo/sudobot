interface JobDescriptor {
    id: number;
    name: string;
    runsAtTimestamp: number;
    createdAtTimestamp: number;
    guildId: string | null;
    userId: string | null;
    channelId: string | null;
    messageId: string | null;
    data: object | null;
}

export default JobDescriptor;
