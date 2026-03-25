import { isPossiblePhoneNumber } from "react-phone-number-input";
import { PRESETS } from "util/constants";
import { isValidEmail } from "util/functions";
import { FormItemValue } from "./types";

// @ts-ignore
import union from "set.prototype.union";
union.shim();

export type Validator = (
    value: FormItemValue | undefined,
    ...args: any | undefined
) => string | null;

export const enum ValidatorType {
    REQUIRED = "REQUIRED",
    TEXT_ONLY = "TEXT_ONLY",
    ALPHA_NUMERIC = "ALPHA_NUMERIC",
    EMAIL = "EMAIL",
    PHONE_NUMBER = "PHONE_NUMBER",
    SSN = "SSN",
    EQUALS = "EQUALS",
    NOT_EQUALS = "NOT_EQUALS",
    STARTS_WITH = "STARTS_WITH",
    ENDS_WITH = "ENDS_WITH",
    CONTAINS = "CONTAINS",
    MATCHES = "MATCHES",
    ONE_OF = "ONE_OF",
}

export const validators: { [key in ValidatorType]: Validator } = {
    /**
     * Tests if a value is defined and not empty.
     *
     * @param value The value of the field being tested.
     * @returns Error message or null.
     */
    REQUIRED: function required(
        value: FormItemValue | undefined
    ): string | null {
        return value !== "" && value !== null && value !== undefined
            ? null
            : "This field is required";
    },
    /**
     * Tests if a value contains only a-zA-Z and whitespace characters.
     * Allows empty strings.
     *
     * @param value The value of the field being tested.
     * @returns Error message or null.
     */
    TEXT_ONLY: function textOnly(
        value: FormItemValue | undefined
    ): string | null {
        return value === null ||
            value === undefined ||
            (typeof value === "string" && /^[a-zA-Z\s]*$/g.test(value))
            ? null
            : "This field can only contain the letters a-z.";
    },
    /**
     * Tests if a value contains only a-zA-Z0-9 characters.
     * Allows empty strings.
     *
     * @param value The value of the field being tested.
     * @returns Error message or null.
     */
    ALPHA_NUMERIC: function alphaNumeric(
        value: FormItemValue | undefined
    ): string | null {
        return value === null ||
            value === undefined ||
            (typeof value === "string" && /^[a-zA-Z0-9]*$/g.test(value))
            ? null
            : "This field can only contain alpha-numeric characters (a-z 0-9)";
    },
    /**
     * Tests if a value contains a valid email address.
     *
     * @param value The value of the field being tested.
     * @returns Error message or null.
     */
    EMAIL: function emailAddress(
        value: FormItemValue | undefined
    ): string | null {
        return value === null ||
            value === undefined ||
            (typeof value === "string" && isValidEmail(value))
            ? null
            : "Invalid email address.";
    },
    /**
     * Tests if a value contains a valid phone number.
     *
     * @param value The value of the field being tested. Should be formatted as a string.
     * @returns Error message or null.
     */
    PHONE_NUMBER: function phoneNumber(
        value: FormItemValue | undefined
    ): string | null {
        return value === null ||
            value === undefined ||
            (typeof value === "string" && isPossiblePhoneNumber(value))
            ? null
            : "Invalid phone number.";
    },
    /**
     * Tests if a value is a valid Social Security Number.
     * SSNs can have the format XXXXXXXXX or XXX-XX-XXXX
     *
     * @param value The value of the field being tested.
     * @returns Error message or null.
     */
    SSN: function ssn(value: FormItemValue | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === "boolean") {
            return "Invalid Social Security Number";
        }
        if (typeof value === "number") {
            return value >= 100_00_0000 || value <= 999_99_9999
                ? null
                : "Invalid Social Security Number";
        }
        return /^\d{9}$|^\d{3}-\d{2}-\d{4}$/g.test(value)
            ? null
            : "Invalid Social Security Number";
    },
    /**
     * Tests if a value equals another.
     *
     * @param value The value of the field being tested.
     * @param validValue The value which the tested value must equal.
     * @param ignoreCase Whether or not to ignore capitalization in check.
     * @returns Error message or null.
     */
    EQUALS: function equals(value, validValue, ignoreCase = false) {
        if (
            (ignoreCase === "true" || ignoreCase === true) &&
            typeof value === "string" &&
            typeof validValue === "string"
        ) {
            return value.toLowerCase() === validValue.toLowerCase()
                ? null
                : `Invalid value "${value}".`;
        }
        return value === validValue ? null : `Invalid value "${value}".`;
    },
    /**
     * Tests if a value is NOT equal to another.
     *
     * @param value The value of the field being tested.
     * @param invalidValue The value which the tested value must NOT equal.
     * @param ignoreCase Whether or not to ignore capitalization in check.
     * @returns Error message or null.
     */
    NOT_EQUALS: function notEquals(value, invalidValue, ignoreCase = false) {
        if (
            (ignoreCase === "true" || ignoreCase === true) &&
            typeof value === "string" &&
            typeof invalidValue === "string"
        ) {
            return value.toLowerCase() === invalidValue.toLowerCase()
                ? `Invalid value "${value}".`
                : null;
        }
        return value === invalidValue ? `Invalid value "${value}."` : null;
    },
    /**
     * Tests if a value matches a regular expression.
     *
     * @param value The value of the field being tested.
     * @param regexStr The regular expression string to use to test.
     * @param flags Any regular expression flags to apply.
     * @returns Error message or null.
     */
    MATCHES: function matches(value, regexStr: string, flags = undefined) {
        const regex = new RegExp(regexStr, flags);
        if (typeof value === "string") {
            return regex.test(value) ? null : "Invalid value";
        }
        return null;
    },
    /**
     * Tests if a value starts with a specific substring.
     *
     * @param value The value of the field being tested.
     * @param searchString The string to the value must start with.
     * @param ignoreCase Whether or not to ignore capitalization in check.
     * @param position The position in the value at which to start the check. Supports negative indices.
     * @returns Error message or null.
     */
    STARTS_WITH: function startsWith(
        value,
        searchString,
        ignoreCase = false,
        position = 0
    ) {
        if (typeof value === "string" && typeof searchString === "string") {
            if (ignoreCase === "true" || ignoreCase === true) {
                value = value.toLowerCase();
                searchString = searchString.toLowerCase();
            }
            if (typeof position === "string") {
                position = parseInt(position);
                if (position < 0) {
                    position = value.length + position;
                }
            }
            return value.startsWith(searchString, position)
                ? null
                : `Value must start with "${searchString}"`;
        }
        return `Value must start with "${searchString}"`;
    },
    /**
     * Tests if a value ends with a specific substring.
     *
     * @param value The value of the field being tested.
     * @param searchString The substring the value must end with.
     * @param ignoreCase Whether or not to ignore capitalization in check.
     * @param position The position in the value at which to start the check. Supports negative indices.
     * @returns Error message or null.
     */
    ENDS_WITH: function endsWith(
        value,
        searchString,
        ignoreCase = false,
        position = undefined
    ) {
        if (typeof value === "string" && typeof searchString === "string") {
            if (ignoreCase === "true" || ignoreCase === true) {
                value = value.toLowerCase();
                searchString = searchString.toLowerCase();
            }
            if (typeof position === "string") {
                position = parseInt(position);
                if (position < 0) {
                    position = value.length + position;
                }
            }
            if (typeof position === "number") {
                // For compatibility with Python's endswith method's start arg
                position += searchString.length;
            }
            return value.endsWith(searchString, position)
                ? null
                : `Value must end with "${searchString}"`;
        }
        return `Value must end with "${searchString}"`;
    },
    /**
     * Tests if a value contains a specific substring.
     *
     * @param value The value of the field being tested.
     * @param searchString The substring the value must contain.
     * @param ignoreCase Whether or nor to ignore capitalization in check.
     * @param position The position in the value at which to start the check. Supports negative indices.
     * @returns Error message or null.
     */
    CONTAINS: function contains(
        value,
        searchString,
        ignoreCase = false,
        position = undefined
    ) {
        if (typeof value === "string" && typeof searchString === "string") {
            if (ignoreCase === "true" || ignoreCase === true) {
                value = value.toLowerCase();
                searchString = searchString.toLowerCase();
            }
            if (typeof position === "string") {
                position = parseInt(position);
                if (position < 0) {
                    position = value.length + position;
                }
            }
            return value.includes(searchString, position)
                ? null
                : `Value must contain "${searchString}"`;
        }
        return `Value must contain "${searchString}"`;
    },
    /**
     * Tests if a value is in a list of accepted options.
     *
     * @param value The value of the field being tested.
     * @param options The list of accepted options, separated by a semi-colon.
     *                If any option contains a space, the entire options string must be wrapped in quotes.
     * @param ignoreCase Whether or nor to ignore capitalization in check.
     * @returns Error message or null.
     *
     * @example "ONE_OF option1;option2"
     * @example "ONE_OF PRESET:STATES;foo true"
     * @example "ONE_OF \"foo;bar baz;biz\" true"
     */
    ONE_OF: function oneOf(value, options: string, ignoreCase = false) {
        value = value?.toString() ?? "";
        let _options = options
            .split(";")
            .reduce(
                (opts, curr) =>
                    curr.startsWith("PRESET:")
                        ? opts.union(PRESETS[curr.substring(7)])
                        : opts.union(new Set([curr])),
                new Set<string>()
            );
        if (ignoreCase === "true" || ignoreCase === true) {
            _options = new Set(
                Array.from(_options).map((o) => o.toLowerCase())
            );

            value = value.toLowerCase();
        }

        return _options.has(value) ? null : `Invalid value "${value}"`;
    },
};

export type ArrayValidator = (
    values: FormItemValue[],
    ...args: any | undefined
) => string | null;

export const enum ArrayValidatorType {
    REQUIRED = "REQUIRED",
    SOME_REQUIRED = "SOME_REQUIRED",
    ALL_REQUIRED = "ALL_REQUIRED",
    EXCLUSIVE = "EXCLUSIVE",
    DEPENDENT = "DEPENDENT",
}

export const arrayValidators: { [key in ArrayValidatorType]: ArrayValidator } =
    {
        /**
         * Tests if there is at least 1 value in the array.
         *
         * @param values The array of values being tested.
         * @returns Error message or null.
         */
        REQUIRED: function required(values: FormItemValue[]): string | null {
            return Array.isArray(values) && values.length > 0
                ? null
                : "This field is required!";
        },
        /**
         * Tests if there is at least 1 non-empty value in the array.
         *
         * @param values The array of values being tested.
         * @returns Error message or null.
         */
        SOME_REQUIRED: function someRequired(
            values: FormItemValue[]
        ): string | null {
            return values.some(
                (value) => value !== "" && value !== null && value !== undefined
            )
                ? null
                : "At least one value is required!";
        },
        /**
         * Tests if all values in the array are non-empty.
         *
         * @param values The array of values being tested.
         * @returns Error message or null.
         */
        ALL_REQUIRED: function allRequired(
            values: FormItemValue[]
        ): string | null {
            return values.every(
                (value) => value !== "" && value !== null && value !== undefined
            )
                ? null
                : "All values are required!";
        },
        /**
         * Test if two or more options are not in used together.
         *
         * @param values The array of values being tested.
         * @param options The options which are mutually exclusive.
         * @returns Error message or null.
         *
         * @example EXCLUSIVE Foo;Bar
         */
        EXCLUSIVE: function exclusive(
            values: FormItemValue[],
            options: string
        ) {
            const _values = new Set(values.map((v) => v?.toString() ?? ""));
            const _options = options
                .split(";")
                .reduce(
                    (opts, curr) =>
                        curr.startsWith("PRESET:")
                            ? opts.union(PRESETS[curr.substring(7)])
                            : opts.union(new Set([curr])),
                    new Set<string>()
                );
            const intersection = _values.intersection(_options);
            if (intersection.size > 1) {
                return `Options "${Array.from(intersection).join(
                    '" and "'
                )}" cannot be selected together!`;
            }
            return null;
        },
        /**
         * Tests if two or more options are used together.
         *
         * @param values The array of values being tested.
         * @param options The options which are dependent on each other.
         * @returns Error message or null.
         *
         * @example DEPENDENT Foo;Bar
         */
        DEPENDENT: function dependent(
            values: FormItemValue[],
            options: string
        ) {
            const _values = new Set(values.map((v) => v?.toString() ?? ""));
            const _options = options
                .split(";")
                .reduce(
                    (opts, curr) =>
                        curr.startsWith("PRESET:")
                            ? opts.union(PRESETS[curr.substring(7)])
                            : opts.union(new Set([curr])),
                    new Set<string>()
                );
            const intersection = _values.intersection(_options);
            if (intersection.size > 0 && !intersection.isSupersetOf(_options)) {
                return `Options "${Array.from(_options).join(
                    '" and "'
                )}" must be selected together!`;
            }
            return null;
        },
    };
