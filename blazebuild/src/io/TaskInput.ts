import { Override } from "../decorators/Override";
import { File, FileResolvable } from "./File";
import { TaskIOData } from "./TaskIOData";

export class TaskInput implements TaskIOData<File> {
    private readonly data: File;

    public constructor(data: FileResolvable) {
        this.data = File.of(data);
    }

    @Override
    public getData(): File {
        return this.data;
    }
}
