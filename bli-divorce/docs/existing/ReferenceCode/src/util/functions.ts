import type { AxiosResponse } from "axios";
import { EMAIL_REGEX, PASSWORD_REGEX } from "./constants";
import type { Paginated } from "./util-types";

/**
 * Checks if a given string is a valid email.
 * @param email The email to validate.
 * @returns Whether the given email is valid.
 */
export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

/**
 * Checks if a given string meets the password requirements.
 * @param password The password to check.
 * @returns Whether the given string meets the requirements.
 */
export function isValidPassword(password: string): boolean {
    return PASSWORD_REGEX.test(password);
}

/**
 * Converts an object to a query-string.
 * Ignores any keys whose value is undefined | null | "".
 *
 * @param options The key-value pairs to map to the query string.
 * @returns A query string built from the provided options.
 */
export function getQueryString(options: Record<string, any>): string {
    return new URLSearchParams(
        Object.entries(options).filter(
            ([_, val]) => val !== undefined && val !== null && val !== ""
        )
    ).toString();
}

/**
 * Extract pagination information from response headers.
 * Uses the headers:
 *  PAGINATION-PAGE-SIZE - Max number of items per page.
 *  TOTAL-COUNT - Total number of items across all pages.
 *
 * @param response AxiosResponse containing the paginated data.
 * @returns Object containing items and pagination info.
 */
export function getPaginatedData<T>(
    response: AxiosResponse<T[]>
): Paginated<T> {
    const url = new URL(response.config.url ?? response.request.responseURL);
    return {
        items: response.data,
        page: parseInt(url.searchParams.get("page") ?? "1"),
        pageSize: parseInt(
            response.headers["pagination-page-size"] ??
                response.data.length.toString()
        ),
        total: parseInt(
            response.headers["total-count"] ?? response.data.length.toString()
        ),
    };
}

type FN<T extends any> = (...args: T[]) => string;
/**
 * Removes whitespace from the front of a template literal
 * Source: https://gist.github.com/zenparsing/5dffde82d9acef19e43c
 */
export function dedent<T extends any>(callSite: FN<T>, ...args: T[]): FN<T>;
export function dedent<T extends any>(
    callSite: TemplateStringsArray,
    ...args: T[]
): string;
export function dedent<T extends any>(
    callSite: FN<T> | TemplateStringsArray,
    ...args: T[]
): string | FN<T> {
    function format(str: string) {
        let size = -1;
        return str.replace(/\n(\s+)/g, (m, m1) => {
            if (size < 0) size = m1.replace(/\t/g, "    ").length;
            return "\n" + m1.slice(Math.min(m1.length, size));
        });
    }

    if (typeof callSite === "string") return format(callSite);

    if (typeof callSite === "function")
        return (...args: T[]) => format(callSite(...args));

    let output = callSite
        .slice(0, args.length + 1)
        .map((text: string, i: number) => (i === 0 ? "" : args[i - 1]) + text)
        .join("");

    return format(output);
}

/**
 * Sorts an object's entries by their key.
 * @param obj The object tot sort
 * @param compareFn An optional function to determine how the object is sorted
 * @see {@link Array.sort}
 * @returns A shallow copy of obj, with its keys sorted.
 */
export function sortObjectKeys(
    obj: { [key: string]: any },
    compareFn?: (a: string, b: string) => number
): { [key: string]: any } {
    return Object.keys(obj)
        .sort(compareFn)
        .reduce((o, k) => {
            o[k] = obj[k];
            return o;
        }, {} as { [key: string]: any });
}

/**
 * Wrapper around a try/catch block that allows it to be used inline.
 * @param func Function to call which could throw an error.
 * @param fallback Value to return if `func` throws an error.
 * @returns The result of `func` else `fallback`.
 */
export function tryCatch<T, D>(func: () => T, fallback: D): T | D {
    try {
        return func();
    } catch (e) {
        return fallback;
    }
}
