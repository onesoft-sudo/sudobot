import chalk from "chalk";

class Progress {
    private _status: string = "<idle>";
    private _progress: number;
    private _total: number;

    public constructor(total: number) {
        this._progress = 0;
        this._total = total;
    }

    public setTotal(total: number): void {
        this._total = total;
        this.render();
    }

    public addToTotal(increment: number): void {
        this._total += increment;
        this.render();
    }

    public getTotal(): number {
        return this._total;
    }

    public increment(value = 1): void {
        this._progress += value;
        this.render();
    }

    public get progress(): number {
        return this._progress;
    }

    public getPercentage(): number {
        return (this._progress / this._total) * 100;
    }

    public render() {
        const { columns } = process.stdout;

        if (columns < 80) {
            return;
        }

        const percentage = this.getPercentage();

        if (percentage > 100 || this._progress > this._total) {
            return;
        }

        const string =
            `\r${chalk.bold(this._status)} [` +
            chalk.white.dim(
                `${"=".repeat(Math.floor(percentage / 2))}${percentage === 100 ? "=" : ">"}${" ".repeat(Math.ceil(Math.max((100 - percentage) / 2 - 1, 0)))}`
            ) +
            `] ${percentage.toFixed(0)}%`;

        process.stdout.write(
            string.concat(
                " ".repeat(
                    Math.max(columns - string.replaceAll(/\x1B\[[0-9;]*[a-zA-Z]/g, "").length, 0)
                )
            )
        );
    }

    public destroy(): void {
        process.stdout.write("\r");
    }

    public setStatus(status: string): void {
        this._status = status;
        this.render();
    }

    public print(
        message: unknown,
        consoleMethod: "log" | "error" | "warn" | "info" | "debug" = "log"
    ): void {
        const { columns } = process.stdout;
        const string = String(message);
        console[consoleMethod].call(
            console,
            `\r${string
                .split("\n")
                .map(s => s.padEnd(columns, " "))
                .join("\n")}`
        );
        this.render();
    }

    public reset(): void {
        this._progress = 0;
    }
}

export default Progress;
