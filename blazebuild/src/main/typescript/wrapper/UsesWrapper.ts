import type BlazeWrapper from "./BlazeWrapper";

abstract class UsesWrapper {
    protected readonly wrapper: BlazeWrapper;

    public constructor(wrapper: BlazeWrapper) {
        this.wrapper = wrapper;
    }
}

export default UsesWrapper;
