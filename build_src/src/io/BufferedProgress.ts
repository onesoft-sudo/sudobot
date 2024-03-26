import chalk from "chalk";
import EventEmitter from "events";

export class BufferedProgress extends EventEmitter {
    protected status?: string;

    public constructor(
        protected progress = 0,
        protected max: number = 100,
        protected readonly statusWidth: number = 0
    ) {
        super();
    }

    /**
     * Set the progress of the progress bar.
     * @param progress Progress value between 0 and 100.
     */
    public setProgress(progress: number) {
        this.progress = progress;
        this.render();
    }

    /**
     * Increment the progress of the progress bar.
     * @param increment Increment value.
     */
    public incrementProgress(increment: number) {
        this.progress += increment;
        this.render();
    }

    public println(message: string) {
        const width = process.stdout.columns || 80;
        process.stdout.write(`${message.padEnd(width, " ")}\n`);
        this.render();
    }

    /**
     * Render the progress bar.
     */
    public render() {
        const progressWidth = this.getProgressWidth();
        const progress = this.progress;
        const progressBar = "=".repeat(Math.floor((progressWidth * progress) / this.max));
        const progressText = `${
            this.status ? chalk.bold(this.status.padEnd(this.statusWidth, " ")) + " | " : ""
        }[${progressBar
            .concat(progressBar.length < progressWidth ? ">" : "")
            .padEnd(progressWidth)}] ${progress.toString()}/${this.max}`;
        process.stdout.write(`${progressText}\r`);
    }

    public getProgressWidth() {
        const width = process.stdout.columns || 80;
        return Math.max(width / 2 - 10, 20);
    }

    public end() {
        this.fill();
        this.emit("end");
    }

    public setStatus(status?: string) {
        this.status = status;
        this.render();
    }

    public fill() {
        process.stdout.write(" ".repeat((process.stdout.columns || 80) - 1) + "\r");
    }

    public setMax(max: number) {
        this.max = max;
        this.render();
    }

    public getMax() {
        return this.max;
    }
}
