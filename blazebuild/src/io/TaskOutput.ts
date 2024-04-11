import { Override } from "../decorators/Override";
import { File, FileResolvable } from "./File";
import { TaskIOData } from "./TaskIOData";

export class TaskOutput implements TaskIOData<File> {
    private readonly data: File;

    public constructor(data: FileResolvable) {
        this.data = File.of(data);
    }

    @Override
    public getData(): File {
        return this.data;
    }

    public static from(data: FileResolvable): TaskOutput;
    public static from(data: FileResolvable[]): TaskOutput[];

    public static from(data: FileResolvable | FileResolvable[]) {
        if (!Array.isArray(data)) {
            return new TaskOutput(data);
        }

        return data.map(d => new TaskOutput(d));
    }
}
