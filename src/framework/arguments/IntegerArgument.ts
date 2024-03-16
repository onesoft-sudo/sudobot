import { ErrorType } from "./InvalidArgumentError";
import NumberArgument from "./NumberArgument";

class IntegerArgument extends NumberArgument {
    public override postTransformValidation(): boolean {
        if (!Number.isInteger(this.transformedValue)) {
            return this.error("Number must be an integer", ErrorType.InvalidType);
        }

        return super.postTransformValidation();
    }

    public override transform(): number {
        return parseInt(this.stringValue);
    }
}

export default IntegerArgument;
