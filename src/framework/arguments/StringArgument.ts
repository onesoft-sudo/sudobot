import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

class StringArgument extends Argument<string> {
    public override toString(): string {
        return this.getValue();
    }

    public override validate(): boolean {
        if (!this.stringValue!.length) {
            return this.error("String cannot be empty", ErrorType.InvalidType);
        }

        return true;
    }

    public override transform() {
        return this.stringValue;
    }
}

export default StringArgument;
