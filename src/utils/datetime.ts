export function stringToTimeInterval(input: string, { milliseconds = false } = {}) {
    let seconds = 0;
    let number = "";

    for (let i = 0; i < input.length; i++) {
        if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."].includes(input[i])) {
            number += input[i];
        } else {
            const unit = input.substring(i);
            const float = parseFloat(number.toString());

            if (Number.isNaN(float)) {
                return { error: "Invalid numeric time value", result: NaN };
            }

            if (["s", "sec", "secs", "second", "seconds"].includes(`${unit}`)) {
                seconds += float;
            } else if (["m", "min", "mins", "minute", "minutes"].includes(`${unit}`)) {
                seconds += float * 60;
            } else if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) {
                seconds += float * 60 * 60;
            } else if (["d", "dy", "dys", "day", "days"].includes(unit)) {
                seconds += float * 60 * 60 * 24;
            } else if (["w", "wk", "wks", "week", "weeks"].includes(unit)) {
                seconds += float * 60 * 60 * 24 * 7;
            } else if (["M", "mo", "mos", "month", "months"].includes(unit)) {
                seconds += float * 60 * 60 * 24 * 30;
            } else if (["y", "yr", "yrs", "year", "years"].includes(unit)) {
                seconds += float * 60 * 60 * 24 * 365;
            } else {
                return { error: "Invalid time unit", result: NaN };
            }

            break;
        }
    }

    return { error: undefined, result: seconds * (milliseconds ? 1000 : 1) };
}

export function displayDate(date: Date) {
    return displayTime(date.getTime());
}

export function displayTime(time: number) {
    return `<t:${time}:f> (<t:${time}:R>)`;
}
