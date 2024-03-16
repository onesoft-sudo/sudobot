import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

class NumberArgument extends Argument<number> {
    public override toString(): string {
        return this.stringValue!.toString();
    }

    public override validate(): boolean {
        return true;
    }

    public override transform(): number {
        return parseFloat(this.stringValue);
    }

    public override postTransformValidation(): boolean {
        if (isNaN(this.transformedValue!)) {
            return this.error("Number must be a valid number", ErrorType.InvalidType);
        }

        if (this.rules?.["range:min"] && this.transformedValue! < this.rules?.["range:min"]) {
            return this.error("Number is too small", ErrorType.InvalidRange);
        }

        if (this.rules?.["range:max"] && this.transformedValue! > this.rules?.["range:max"]) {
            return this.error("Number is too large", ErrorType.InvalidRange);
        }

        return true;
    }
}

export default NumberArgument;
