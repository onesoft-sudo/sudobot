import BaseCommand from "./structures/BaseCommand";
import BaseEvent from "./structures/BaseEvent";
import { fill, green, red, yellow } from "./util";

let colLengths = [19, 33, 10];
let totalLength = colLengths.reduce((acc, val) => acc + val);

export async function registrationStart() {
    if (process.env.ENV === 'prod' || !process.argv.includes('--verbose'))
        return;

    console.log(`+-----------------------------------------------------+`);
    console.log(`|Name               |Time                  |Status    |`);
}

export async function registered(command: BaseCommand | BaseEvent, startTime: number = 0, endTime: number = 0) {
    if (process.env.ENV === 'prod' || !process.argv.includes('--verbose'))
        return;

    console.log(`|-------------------+----------------------+----------|`);

    let name = command.getName();
    let time: number = endTime - startTime;
    let timeString = time + 'ms';

    if (time >= 100) {
        timeString = red(timeString);
    }
    else if (time >= 50) {
        timeString = yellow(timeString);
    }
    else {
        timeString = green(timeString);
    }

    let status = 'Success';

    if (colLengths[0] > name.length) {
        name = fill(colLengths[0], name);
    }

    if (colLengths[1] > timeString.length) {
        timeString = fill(colLengths[1], timeString);
    }

    if (colLengths[2] > status.length) {
        status = fill(colLengths[2], status);
    }

    console.log(`|${green(name)}|${timeString}|${green(status)}|`);
}

export async function registrationEnd() {
    if (process.env.ENV === 'prod' || !process.argv.includes('--verbose'))
        return;

    console.log(`+-----------------------------------------------------+`);
    console.log(`\n`);
}