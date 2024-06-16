import type { FileSink } from 'bun';
import type File from './File';

class FileWriter implements Disposable, AsyncDisposable {
    private readonly sink: FileSink;
    private readonly updater: (size: number) => void;

    public constructor(sink: FileSink, updater: (size: number) => void) {
        this.updater = updater;
        this.sink = sink;
    }

    public write(data: string | ArrayBuffer | ArrayBufferView | SharedArrayBuffer) {
        return this.sink.write(data);
    }

    private async dispose() {
        const bytesWritten = await this.sink.end();
        this.updater.call(undefined, bytesWritten);
    }

    public [Symbol.dispose]() {
        this.dispose()
    }

    public async [Symbol.asyncDispose]() {
        await this.dispose()
    }
}

export default FileWriter;