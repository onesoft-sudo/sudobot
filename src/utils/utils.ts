export function isSnowflake(input: string) {
    return /^\d{16,22}$/.test(input);
}

export function stringToTimeInterval(input: string) {
    let seconds = 0;
    let number = '';

    for (let i = 0; i < input.length; i++) {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].includes(input[i])) {
            number += input[i];
        }
        else {
            const unit = input[i];
            const float = parseFloat(number);

            if (isNaN(float)) {
                return { error: "Invalid numeric time value", seconds: NaN };
            }

            if (unit === 's') {
                seconds += float;
            }
            else if (unit === 'm') {
                seconds += float * 60;
            }
            else if (unit === 'h') {
                seconds += float * 60 * 60;
            }
            else if (unit === 'd') {
                seconds += float * 60 * 60 * 24;
            }
            else if (unit === 'w') {
                seconds += float * 60 * 60 * 24 * 7;
            }
            else if (unit === 'M') {
                seconds += float * 60 * 60 * 24 * 30;
            }
            else if (unit === 'y') {
                seconds += float * 60 * 60 * 24 * 365;
            }
            else {
                return { error: "Invalid time unit", seconds: NaN };
            }

            number = '';
        }
    }

    return { error: undefined, seconds };
}