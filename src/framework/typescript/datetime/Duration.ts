import { BehavesLikePrimitive } from "@framework/contracts/BehavesLikePrimitive";
import { JSONSerializable } from "@framework/contracts/JSONSerializable";
import DurationParseError from "@framework/datetime/DurationParseError";
import { Override } from "@framework/decorators/Override";
import { isAlpha, isDigit } from "@framework/utils/string";
import { formatDuration } from "date-fns";

type DurationOptions = {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
};

type SerializedDuration = Required<DurationOptions>;

class Duration implements BehavesLikePrimitive, JSONSerializable<SerializedDuration> {
    public static readonly SECOND_MS: number = 1_000;
    public static readonly MINUTE_MS: number = Duration.SECOND_MS * 60;
    public static readonly HOUR_MS: number = Duration.MINUTE_MS * 60;
    public static readonly DAY_MS: number = Duration.HOUR_MS * 24;
    public static readonly WEEK_MS: number = Duration.DAY_MS * 7;
    public static readonly MONTH_MS: number = Duration.DAY_MS * 30;
    public static readonly YEAR_MS: number = Duration.DAY_MS * 365;

    public readonly years: number;
    public readonly months: number;
    public readonly weeks: number;
    public readonly days: number;
    public readonly hours: number;
    public readonly minutes: number;
    public readonly seconds: number;
    public readonly milliseconds: number;

    private _totalMilliseconds: number | null = null;
    private static readonly _keys = {
        y: "years",
        m: "months",
        w: "weeks",
        d: "days",
        h: "hours",
        i: "minutes",
        s: "seconds",
        ms: "milliseconds",
        years: "years",
        months: "months",
        weeks: "weeks",
        days: "days",
        hours: "hours",
        minutes: "minutes",
        seconds: "seconds",
        milliseconds: "milliseconds",
        year: "years",
        month: "months",
        week: "weeks",
        day: "days",
        hour: "hours",
        minute: "minutes",
        second: "seconds",
        millisecond: "milliseconds"
    } as const;

    public constructor(options: DurationOptions) {
        this.years = options.years ?? 0;
        this.months = options.months ?? 0;
        this.weeks = options.weeks ?? 0;
        this.days = options.days ?? 0;
        this.hours = options.hours ?? 0;
        this.minutes = options.minutes ?? 0;
        this.seconds = options.seconds ?? 0;
        this.milliseconds = options.milliseconds ?? 0;
    }

    public static fromMilliseconds(milliseconds: number): Duration {
        let remaining = milliseconds;

        const years = Math.floor(remaining / Duration.YEAR_MS);
        remaining -= years * Duration.YEAR_MS;

        const months = Math.floor(remaining / Duration.MONTH_MS);
        remaining -= months * Duration.MONTH_MS;

        const weeks = Math.floor(remaining / Duration.WEEK_MS);
        remaining -= weeks * Duration.WEEK_MS;

        const days = Math.floor(remaining / Duration.DAY_MS);
        remaining -= days * Duration.DAY_MS;

        const hours = Math.floor(remaining / Duration.HOUR_MS);
        remaining -= hours * Duration.HOUR_MS;

        const minutes = Math.floor(remaining / Duration.MINUTE_MS);
        remaining -= minutes * Duration.MINUTE_MS;

        const seconds = Math.floor(remaining / Duration.SECOND_MS);
        remaining -= seconds * Duration.SECOND_MS;

        return new Duration({
            years,
            months,
            days,
            hours,
            weeks,
            minutes,
            seconds,
            milliseconds: remaining
        });
    }

    public static fromDurationStringExpression(expression: string, retMs: true): number;
    public static fromDurationStringExpression(expression: string, retMs?: false): Duration;

    public static fromDurationStringExpression(
        expression: string,
        retMs?: boolean
    ): Duration | number {
        if (expression.length === 0) {
            throw new DurationParseError("Duration expression cannot be empty");
        }

        let ms = 0;
        const payload = {
            years: 0,
            months: 0,
            weeks: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 0
        };

        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === " ") {
                continue;
            }

            let number = "";

            while (i < expression.length && (expression[i] === "." || isDigit(expression[i]))) {
                number += expression[i];
                i++;
            }

            if (number === "") {
                throw new DurationParseError(`Expected number at position ${i} in expression`);
            }

            const value = +number;

            if (isNaN(value)) {
                throw new DurationParseError(`Invalid number at position ${i} in expression`);
            }

            let unit = "";

            while (i < expression.length && expression[i] === " ") {
                i++;
            }

            while (i < expression.length && isAlpha(expression[i])) {
                unit += expression[i];
                i++;
            }

            if (unit === "") {
                unit = "s";
            } else {
                i--;
            }

            unit = unit.toLowerCase();

            if (retMs) {
                ms += Duration.evalUnit(unit, value);
            } else {
                const key = this._keys[unit as keyof typeof this._keys];
                payload[key] = value;
            }
        }

        return retMs ? ms : new Duration(payload);
    }

    public static evalUnit(unit: string, value: number): number {
        switch (unit) {
            case "y":
            case "year":
            case "years":
                return value * Duration.YEAR_MS;
            case "mo":
            case "month":
            case "months":
                return value * Duration.MONTH_MS;
            case "w":
            case "week":
            case "weeks":
                return value * Duration.WEEK_MS;
            case "d":
            case "day":
            case "days":
                return value * Duration.DAY_MS;
            case "h":
            case "hour":
            case "hours":
                return value * Duration.HOUR_MS;
            case "m":
            case "minute":
            case "minutes":
                return value * Duration.MINUTE_MS;
            case "s":
            case "second":
            case "seconds":
                return value * Duration.SECOND_MS;
            case "ms":
            case "millisecond":
            case "milliseconds":
                return value;
            default:
                throw new DurationParseError(`Invalid unit: ${unit}`);
        }
    }

    public toMilliseconds(): number {
        if (this._totalMilliseconds === null) {
            const ms =
                this.years * Duration.YEAR_MS +
                this.months * Duration.MONTH_MS +
                this.weeks * Duration.WEEK_MS +
                this.days * Duration.DAY_MS +
                this.hours * Duration.HOUR_MS +
                this.minutes * Duration.MINUTE_MS +
                this.seconds * Duration.SECOND_MS +
                this.milliseconds;

            this._totalMilliseconds = ms;
        }

        return this._totalMilliseconds;
    }

    /**
     * Returns a string representation of the duration.
     *
     * @returns The formatted duration.
     */
    @Override
    public toString() {
        let formatted = formatDuration(this);

        if (this.milliseconds) {
            formatted += ` ${this.milliseconds} milliseconds`;
        }

        return formatted;
    }

    /**
     * Returns the JSON representation of the duration.
     *
     * @returns A serializable plain object.
     */
    @Override
    public toJSON(): Required<DurationOptions> {
        return {
            years: this.years,
            months: this.months,
            weeks: this.weeks,
            days: this.days,
            hours: this.hours,
            minutes: this.minutes,
            seconds: this.seconds,
            milliseconds: this.milliseconds
        };
    }

    /**
     * Converts the duration to a string or number.
     * Cannot use @Override annotation here because of a bug
     * in Bun interpreter.
     *
     * @param hint The hint to convert the duration to.
     * @returns The duration as a string or number.
     * @override
     */
    public [Symbol.toPrimitive](hint: "string" | "number" | "default") {
        if (hint === "number") {
            return this.toMilliseconds();
        }

        return this.toString();
    }
}

export default Duration;
