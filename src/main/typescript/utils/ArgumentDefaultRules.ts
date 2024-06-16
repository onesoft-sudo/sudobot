import { Limits } from "@main/constants/Limits";

export const ArgumentDefaultRules = {
    Reason: {
        "range:max": Limits.Reason,
        "range:min": 1
    }
};
