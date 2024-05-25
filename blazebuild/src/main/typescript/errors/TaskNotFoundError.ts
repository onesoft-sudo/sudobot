class TaskNotFoundError extends Error {
    private taskName?: string;

    public setTaskName(name: string) {
        this.taskName = name;
        return this;
    }

    public getTaskName() {
        return this.taskName;
    }
}

export default TaskNotFoundError;
