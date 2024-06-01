import type File from "./File";

class FileIOError extends Error {
    public constructor(message: string, public readonly file: File, public override readonly cause?: Error) {
        super(message, cause);
    }

    public override toString() {
        return `${this.constructor.name}: ${this.message} [${this.file.path}]`;
    }

    public get syscall() {
        return (this.cause as ErrnoException).syscall;
    }

    public get code() {
        return (this.cause as ErrnoException).code;
    }

    public get errno() {
        return (this.cause as ErrnoException).errno;
    }
}

export default FileIOError;