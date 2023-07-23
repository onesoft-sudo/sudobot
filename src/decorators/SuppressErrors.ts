export function SuppressErrors() {
    return (target: Object, methodName: string, descriptor: TypedPropertyDescriptor<any>) => {
        Reflect.defineMetadata(
            "suppress_errors",
            {
                mode: "suppress"
            } as SuppressErrorsMetadata,
            target,
            methodName
        );
    };
}

export interface SuppressErrorsMetadata {
    mode: "suppress" | "log" | "disabled";
}
