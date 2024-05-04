import type { ModerationRuleContextType } from "../contracts/ModerationRuleHandlerContract";

export function AcceptsMessageRuleContextType(type: ModerationRuleContextType) {
    return (target: object, key: string) => {
        const existing = Reflect.getMetadata("rule:context:types", target) || {};
        existing[key] ??= [];
        existing[key].push(type);
        Reflect.defineMetadata("rule:context:types", existing, target);
    };
}
