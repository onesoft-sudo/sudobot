export default function Bind(name: string) {
    return function (constructor: object) {
        Reflect.defineMetadata("di:bind_as", name, constructor);
    };
}
