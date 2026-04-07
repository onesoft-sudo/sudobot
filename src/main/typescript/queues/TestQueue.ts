import AbstractQueuedJob from "@framework/queues/AbstractQueuedJob";
import JobState from "@framework/queues/JobState";
import { assertNotNull } from "@framework/utils/utils";

type TestQueuePayload = {
    message: string;
};

class TestQueue extends AbstractQueuedJob<TestQueuePayload> {
    public override async execute(
        data: TestQueuePayload | null
    ): Promise<JobState> {
        assertNotNull(data);
        await Promise.resolve(1);
        console.log("Message:", data.message);
        return JobState.Success;
    }
}

export default TestQueue;
