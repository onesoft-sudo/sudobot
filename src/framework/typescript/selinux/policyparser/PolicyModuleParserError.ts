import type { Location, Range } from "./PolicyModuleParserTypes";

class PolicyModuleParserError extends SyntaxError {
    public readonly location: Range;

    public constructor(message: string, location: Location | Range) {
        super(message);
        this.location = Array.isArray(location) ? { start: location, end: location } as Range: (location as Range);
    }
}

export default PolicyModuleParserError;
