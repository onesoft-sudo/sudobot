import breakBeforeControlRule from "./rules/BreakBeforeControlRule";
import { version } from "../../../package.json";
import type { Rule } from "eslint";

const rules = {
    "break-before-control": breakBeforeControlRule
} as unknown as Record<string, Rule.RuleModule>;

const LocalPlugin = {
    rules,
    meta: { name: "local", version }
};

export default LocalPlugin;
