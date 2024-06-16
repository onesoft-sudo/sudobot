import type { MessageRuleScope } from "../contracts/ModerationRuleHandlerContract";

export function AcceptsMessageRuleScopes(...scopes: MessageRuleScope[]) {
    return (target: object, key: string) => {
        const existing = Reflect.getMetadata("rule:context:scopes", target) || {};
        existing[key] ??= [];
        existing[key].push(...scopes);
        Reflect.defineMetadata("rule:context:scopes", existing, target);
    };
}
