export function makeNoOpMethodDecorator() {
    return (_target: object, _propertyKey: PropertyKey, _descriptor?: PropertyDescriptor) => {};
}
