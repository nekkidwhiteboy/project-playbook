import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Parser } from "expr-eval";
import { PRESETS } from "util/constants";
import type { Unpacked } from "util/util-types";
import type { FormItemValue, FormValues, SelectItem } from "./types";

// @ts-ignore
import difference from "set.prototype.difference";
difference.shim();

dayjs.extend(customParseFormat);

export function parseRelativeDateString(
    dateString: string | number,
    start?: string | Date | dayjs.Dayjs
): string {
    if (typeof dateString == "number") {
        const date = dayjs(dateString);
        return date.format("YYYY-MM-DD");
    } else if (dateString.startsWith("today")) {
        const days = Number.parseInt(dateString.substring(5) || "0");
        return dayjs(start).add(days, "day").format("YYYY-MM-DD");
    } else if (dateString.startsWith("current_month")) {
        const months = Number.parseInt(dateString.substring(13) || "0");
        return dayjs(start).add(months, "month").format("YYYY-MM");
    }
    return dateString;
}

export function replacePipes(
    rawString: string,
    context: { [key: string]: any }
): string {
    return rawString.replaceAll(/{{([^}]+)}}/g, (match) => {
        try {
            return (
                evaluate(match.substring(2, match.length - 2), context) ?? match
            ).toString();
        } catch {
            return match;
        }
    });
}

const _defaultParser = new Parser({
    operators: {
        assignment: false,
    },
});
// Unlike the other custom functions, `sum` does not have a leading '$'
// This is for compatibility with python's builtin `sum`
_defaultParser.functions.sum = function (array: number[], start: number = 0) {
    return array.reduce((total, curr) => total + curr, start);
};

_defaultParser.functions.$if = function (
    cond: string,
    trueVal: any,
    falseVal: any
) {
    return cond ? trueVal : falseVal;
};
_defaultParser.functions.$truthy = function (val: any) {
    return !!val;
};
_defaultParser.functions.$startsWith = function (
    val: any,
    prefix: string,
    pos?: number
) {
    return typeof val === "string" ? val.startsWith(prefix, pos) : false;
};
_defaultParser.functions.$toCurrency = function (
    val: number,
    locales: Intl.LocalesArgument = "en-US",
    currency: string = "USD"
) {
    return val.toLocaleString(locales, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
        currency,
    });
};
_defaultParser.functions.$selectKey = function <Key extends string>(
    items: Record<Key, any>[],
    key: Key,
    defaultVal: any
) {
    return items.map((obj) => obj[key] ?? defaultVal);
};

const allowedActions = ["add", "format", "subtract"] as const;
_defaultParser.functions.$date = function (
    date: Date,
    action: (typeof allowedActions)[number],
    ...args: (string | number | Date)[]
) {
    if (!allowedActions.includes(action)) return date;
    return dayjs(date)[action](
        // @ts-ignore
        ...args
    );
};

const _defaultValueHandler: ProxyHandler<{
    [key: string]: any;
}> = {
    get: function (target, name: string) {
        return Object.hasOwn(target, name) ? target[name] : null;
    },
};

export function evaluate(
    expression: string,
    context: { [key: string]: any },
    parser: Parser = _defaultParser,
    defaultValueHandler: ProxyHandler<{
        [key: string]: any;
    }> = _defaultValueHandler
): any {
    return parser
        .parse(expression)
        .evaluate(new Proxy(context, defaultValueHandler));
}

/**
 *
 * @param item An item whose rules will be evaluated.
 * @param context The context in which the rules will be evaluated.
 * @param parser The {@link Parser} to pass to the evaluator.
 * @param defaultValueHandler The {@link ProxyHandler} to pass to the evaluator.
 * @returns true if all rules evaluate to true, else false.
 */
export function allRulesPass(
    item: { rules?: string[] },
    context: { [key: string]: any },
    parser?: Parser,
    defaultValueHandler?: ProxyHandler<{
        [key: string]: any;
    }>
): boolean {
    try {
        return (item.rules ?? []).every(
            (rule) =>
                evaluate(rule, context, parser, defaultValueHandler) === true
        );
    } catch (e) {
        console.warn(e);
        return false;
    }
}

/**
 *
 * @param options List of options to expand
 * @param values Context used to evaluate rules
 * @returns List of options with the presets expanded
 */
export function expandOptionPresets(
    options: SelectItem["options"],
    values: { [key: string]: any }
) {
    const _options: Exclude<
        Unpacked<SelectItem["options"]>,
        { preset: string }
    >[] = [];
    for (const option of options) {
        if (typeof option === "object" && "preset" in option) {
            if (allRulesPass(option, values) && option.preset in PRESETS) {
                _options.push(
                    ...PRESETS[option.preset].difference(
                        new Set(option.exclude ?? [])
                    )
                );
            }
        } else {
            _options.push(option);
        }
    }
    return _options;
}

/**
 * Recursively call .trim() on all string values in the object.
 * @param obj The object to recursively iterate over.
 * @returns the object with all its string values trimmed.
 */
export function stripRecursive(obj: FormItemValue): FormItemValue;
export function stripRecursive(obj: FormItemValue[]): FormItemValue[];
export function stripRecursive(obj: FormValues): FormValues;
export function stripRecursive(obj: FormValues[]): FormValues[];
export function stripRecursive(obj: any) {
    if (typeof obj === "string") {
        return obj.trim();
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            obj[i] = stripRecursive(obj[i]);
        }
        return obj;
    }

    if (typeof obj === "object" && obj !== null) {
        for (let key of Object.keys(obj)) {
            obj[key] = stripRecursive(obj[key]);
        }
        return obj;
    }

    return obj;
}
