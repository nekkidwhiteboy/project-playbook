import { useFormikContext } from "formik";
import {
    AutoComplete,
    Checkbox,
    FormItem,
    Input,
    InputNumber,
    Radio,
    Select,
    Switch,
} from "formik-antd";
import { useCurrentRole } from "hooks/useCurrentUser";
import type { FC, ReactNode } from "react";
import { useFormResult } from ".";
import AddressBlock from "./items/AddressBlock";
import { HtmlMarkup } from "./items/HtmlMarkup";
import { Label } from "./items/Label";
import ParentingTimeSchedule from "./items/ParentingTimeSchedule";
import PhoneNumberInput from "./items/PhoneNumberInput";
import TimePicker from "./items/TimePicker";
import {
    type ArrayValidatorExpression,
    type FormItemBase,
    type FormItem as FormItemSchema,
    type FormItemValue,
    type FormValues,
    Item,
    type ValidatorExpression,
} from "./types";
import {
    allRulesPass,
    evaluate,
    expandOptionPresets,
    parseRelativeDateString,
} from "./util";
import {
    ArrayValidatorType,
    ValidatorType,
    arrayValidators,
    validators,
} from "./validators";

interface Props {
    item: FormItemSchema;
    readonly?: boolean;
    noStyle?: boolean;
}

const DynamicFormItem: FC<Props> = ({
    item,
    readonly = false,
    noStyle = false,
}) => {
    const { isAdmin } = useCurrentRole();
    const { items: resultValues, date_start } = useFormResult();
    const {
        values: pageValues,
        validateField,
        setFieldError,
    } = useFormikContext<FormValues>();

    const values = { ...resultValues, ...pageValues };

    if (item.type === Item.Html) {
        const { content, ...props } = item;
        return <HtmlMarkup text={content} {...props} />;
    }

    // Item.Hidden differs item.adminItem in that they never shown
    if (item.type === Item.Hidden) {
        return <Input type="hidden" name={item.name} />;
    }

    // Render item.adminItem as a hidden input, if the current user is not an Admin
    if (item.adminItem && !isAdmin) {
        return <Input type="hidden" name={item.name} />;
    }

    let _addonAfter: ReactNode = null;
    if ("addonAfter" in item && item.addonAfter) {
        if (typeof item.addonAfter === "string") {
            _addonAfter = item.addonAfter;
        } else {
            _addonAfter = (
                <DynamicFormItem
                    item={item.addonAfter}
                    readonly={readonly}
                    noStyle
                />
            );
        }
    }
    let _addonBefore: ReactNode = null;
    if ("addonBefore" in item && item.addonBefore) {
        if (typeof item.addonBefore === "string") {
            _addonBefore = item.addonBefore;
        } else {
            _addonBefore = (
                <DynamicFormItem
                    item={item.addonBefore}
                    readonly={readonly}
                    noStyle
                />
            );
        }
    }

    const commonProps = {
        name: item.name,
        label: <Label>{item.label}</Label>,
        tooltip: item.tooltip,
        colon: false,
        hasFeedback: false,
        className: "label-above",
        noStyle,
    };
    switch (item.type) {
        case Item.TextShort: {
            let {
                type,
                label,
                rules,
                validators,
                subType: subtype,
                style,
                disabled,
                initialValue,
                autoComplete,
                suffix = <span />,
                prefix = <span />,
                addonAfter,
                addonBefore,
                adminItem,
                ...props
            } = item;
            const _subtype = ["color", "email", "search", "url"].includes(
                subtype ?? ""
            )
                ? subtype
                : "text";
            let required = validators.includes(ValidatorType.REQUIRED);
            return (
                <FormItem
                    {...commonProps}
                    required={required}
                    validate={(value) =>
                        fieldValidation(validators, value?.trim())
                    }
                >
                    {autoComplete ? (
                        <AutoComplete
                            {...props}
                            disabled={readonly || !!disabled}
                            style={{ maxWidth: 200, ...style }}
                            onChange={(value) =>
                                setFieldError(
                                    item.name,
                                    fieldValidation(
                                        item.validators,
                                        value?.trim()
                                    ) || undefined
                                )
                            }
                            options={expandOptionPresets(autoComplete, values)
                                .map((option) =>
                                    typeof option === "object"
                                        ? option
                                        : { value: option, label: option }
                                )
                                .filter((option, $index) =>
                                    allRulesPass(option, { ...values, $index })
                                )}
                            suffixIcon={suffix}
                            filterOption
                        />
                    ) : (
                        <Input
                            {...props}
                            type={_subtype}
                            readOnly={readonly && !!disabled}
                            disabled={disabled}
                            style={{ maxWidth: 200, ...style }}
                            onChange={(e) =>
                                setFieldError(
                                    item.name,
                                    fieldValidation(
                                        item.validators,
                                        e.target.value?.trim()
                                    ) || undefined
                                )
                            }
                            suffix={suffix}
                            prefix={prefix}
                            addonAfter={_addonAfter}
                            addonBefore={_addonBefore}
                        />
                    )}
                </FormItem>
            );
        }

        case Item.TextLong: {
            let {
                type,
                label,
                rules,
                validators,
                disabled,
                initialValue,
                adminItem,
                ...props
            } = item;
            return (
                <FormItem
                    {...commonProps}
                    required={validators.includes(ValidatorType.REQUIRED)}
                    validate={(val) => fieldValidation(validators, val?.trim())}
                >
                    <Input.TextArea
                        {...props}
                        readOnly={readonly && !!disabled}
                        disabled={disabled}
                        onChange={() => validateField(item.name)}
                    />
                </FormItem>
            );
        }

        case Item.Number: {
            let {
                type,
                label,
                rules,
                validators,
                disabled,
                initialValue,
                adminItem,
                addonAfter,
                addonBefore,
                ...props
            } = item;
            let required = validators.includes(ValidatorType.REQUIRED);

            return (
                <FormItem
                    {...commonProps}
                    required={required}
                    validate={(val) => fieldValidation(validators, val)}
                >
                    <InputNumber
                        {...props}
                        readOnly={readonly && !!disabled}
                        disabled={disabled}
                        onChange={() => validateField(item.name)}
                        onBlur={() => validateField(item.name)}
                        style={{ maxWidth: 150, width: "auto", ...props.style }}
                        addonAfter={_addonAfter}
                        addonBefore={_addonBefore}
                    />
                </FormItem>
            );
        }

        case Item.Radio: {
            let {
                type,
                label,
                rules,
                validators,
                vertical,
                disabled,
                initialValue,
                options,
                adminItem,
                ...props
            } = item;

            const _options = options
                .map((option) =>
                    typeof option === "object"
                        ? option
                        : { value: option, label: option }
                )
                .filter((option, $index) => {
                    const rules = option.rules ?? [];
                    return rules.every(
                        (rule: string) =>
                            evaluate(rule, { ...values, $index }) === true
                    );
                });

            return (
                <FormItem
                    {...commonProps}
                    required={validators.includes(ValidatorType.REQUIRED)}
                    validate={(val) => fieldValidation(validators, val)}
                >
                    <Radio.Group
                        {...props}
                        options={_options}
                        disabled={readonly || !!disabled}
                        className={vertical ? "vertical-group" : ""}
                        onChange={(e) =>
                            setFieldError(
                                item.name,
                                fieldValidation(validators, e.target.value) ||
                                    undefined
                            )
                        }
                    />
                </FormItem>
            );
        }

        case Item.Date: {
            let {
                type,
                label,
                rules,
                validators,
                min,
                max,
                disabled,
                initialValue,
                mode,
                adminItem,
                addonAfter,
                addonBefore,
                ...props
            } = item;
            const _mode = mode === "month" ? "month" : "date";
            let required = validators.includes(ValidatorType.REQUIRED);
            return (
                <FormItem
                    {...commonProps}
                    required={required}
                    validate={(val) => fieldValidation(validators, val)}
                >
                    <Input
                        type={_mode}
                        {...props}
                        min={
                            min
                                ? parseRelativeDateString(min, date_start)
                                : undefined
                        }
                        max={
                            max
                                ? parseRelativeDateString(max, date_start)
                                : undefined
                        }
                        style={{ maxWidth: 130, height: 32, ...props.style }}
                        onChange={() => validateField(item.name)}
                        onBlur={() => validateField(item.name)}
                        addonAfter={_addonAfter}
                        addonBefore={_addonBefore}
                    />
                </FormItem>
            );
        }

        case Item.Time: {
            let {
                type,
                label,
                rules,
                validators,
                style,
                initialValue,
                adminItem,
                addonAfter,
                addonBefore,
                ...props
            } = item;
            const required = validators.includes(ValidatorType.REQUIRED);
            return (
                <FormItem
                    {...commonProps}
                    required={required}
                    validate={(v) => fieldValidation(validators, v)}
                >
                    <TimePicker
                        {...props}
                        readOnly={readonly}
                        addonAfter={_addonAfter}
                        addonBefore={_addonBefore}
                    />
                </FormItem>
            );
        }

        case Item.Select: {
            let {
                type,
                label,
                rules,
                validators,
                style,
                disabled,
                initialValue,
                options,
                adminItem,
                ...props
            } = item;

            const required = validators.includes(ValidatorType.REQUIRED);

            const _options = expandOptionPresets(options, values)
                .map((option) =>
                    typeof option === "object"
                        ? option
                        : { value: option, label: option }
                )
                .filter((option, $index) =>
                    allRulesPass(option, { ...values, $index })
                );
            if (!required) {
                // @ts-ignore
                _options.unshift({ label: "", value: null });
            }
            const validate = (val: any) => {
                if (_options.findIndex(({ value }) => value === val) === -1) {
                    return "Please select an option from the list.";
                }
                return fieldValidation(validators, val);
            };

            return (
                <FormItem
                    {...commonProps}
                    required={required}
                    validate={validate}
                >
                    <Select
                        {...props}
                        options={_options}
                        open={readonly ? false : undefined}
                        disabled={disabled}
                        style={{ maxWidth: 300, ...style }}
                        onChange={(val) =>
                            setFieldError(
                                item.name,
                                fieldValidation(validators, val) || undefined
                            )
                        }
                    />
                </FormItem>
            );
        }

        case Item.Checkbox: {
            let {
                type,
                label,
                rules,
                validators,
                vertical,
                options,
                initialValue,
                adminItem,
                ...props
            } = item;
            const _options = expandOptionPresets(options, values)
                .map((option) =>
                    typeof option === "object"
                        ? option
                        : { value: option, label: option }
                )
                .filter((option, $index) =>
                    allRulesPass(option, { ...values, $index })
                );
            return (
                <FormItem
                    {...commonProps}
                    required={validators.includes(ArrayValidatorType.REQUIRED)}
                    validate={(values) => {
                        return arrayFieldValidation(validators, values);
                    }}
                >
                    <Checkbox.Group
                        {...props}
                        options={_options}
                        className={vertical ? "vertical-group" : ""}
                        onChange={(val) =>
                            setFieldError(
                                item.name,
                                arrayFieldValidation(
                                    validators,
                                    val as FormItemValue[]
                                ) || undefined
                            )
                        }
                    />
                </FormItem>
            );
        }

        case Item.Switch: {
            let {
                type,
                label,
                rules,
                validators,
                initialValue,
                adminItem,
                innerLabel,
                mode,
                ...props
            } = item;

            return (
                <FormItem
                    {...commonProps}
                    required={validators.includes(ValidatorType.REQUIRED)}
                    validate={(values) => {
                        return fieldValidation(validators, values);
                    }}
                >
                    {mode === "checkbox" ? (
                        <Checkbox {...props}>{innerLabel}</Checkbox>
                    ) : (
                        <>
                            <Switch {...props} />
                            {innerLabel ? " " + innerLabel : ""}
                        </>
                    )}
                </FormItem>
            );
        }

        case Item.PhoneNumber: {
            let {
                type,
                label,
                rules,
                validators,
                style,
                disabled,
                initialValue,
                adminItem,
                ...props
            } = item;
            let required = validators.includes(ValidatorType.REQUIRED);
            return (
                <FormItem
                    {...commonProps}
                    required={required}
                    validate={(value) =>
                        fieldValidation(
                            [...validators, ValidatorType.PHONE_NUMBER],
                            value ?? null
                        )
                    }
                >
                    <PhoneNumberInput
                        {...props}
                        disabled={readonly || !!disabled}
                        style={{ maxWidth: 200, ...style }}
                        onChange={(val) => {
                            setFieldError(
                                item.name,
                                fieldValidation(validators, val) || undefined
                            );
                        }}
                    />
                </FormItem>
            );
        }

        case Item.ParentingTime: {
            return <ParentingTimeSchedule readonly={readonly} {...item} />;
        }

        case Item.AddressBlock: {
            return <AddressBlock readonly={readonly} {...item} />;
        }

        default: {
            const _item = item as FormItemBase;
            console.warn(`"${_item.name}" has in valid type '${_item.type}'"`);
            return (
                <FormItem
                    {...commonProps}
                    required={_item.validators.includes(ValidatorType.REQUIRED)}
                    validate={(value) =>
                        fieldValidation(_item.validators, value)
                    }
                    tooltip={_item.tooltip}
                >
                    <Input
                        name={_item.name}
                        placeholder={_item.placeholder}
                        disabled={readonly || !!_item.disabled}
                        style={{ maxWidth: 200, ..._item.style }}
                        onChange={(e) => validateField(_item.name)}
                    />
                </FormItem>
            );
        }
    }
};

export default DynamicFormItem;

function arrayFieldValidation(
    fieldValidators: ArrayValidatorExpression[],
    value: FormItemValue[]
): string | void {
    let error: string | null;
    for (let validatorExp of fieldValidators) {
        let [fieldValidator, ...args] = parseValidatorExp(validatorExp);
        if (fieldValidator in arrayValidators) {
            error = arrayValidators[fieldValidator](value, ...args);
            if (error) return error;
        } else {
            console.warn(`Unable to find validator "${fieldValidator}".`);
        }
    }
}

function fieldValidation(
    fieldValidators: ValidatorExpression[],
    value: FormItemValue
): string | void {
    let error: string | null;
    for (let validatorExp of fieldValidators) {
        let [fieldValidator, ...args] = parseValidatorExp(validatorExp);
        if (fieldValidator in validators) {
            error = validators[fieldValidator](value, ...args);
            if (error) return error;
        } else {
            console.warn(`Unable to find validator "${fieldValidator}".`);
        }
    }
}

function parseValidatorExp(
    validatorExp: ValidatorExpression
): [ValidatorType, ...string[]];
function parseValidatorExp(
    validatorExp: ArrayValidatorExpression
): [ArrayValidatorType, ...string[]];
function parseValidatorExp(
    validatorExp: ValidatorExpression | ArrayValidatorExpression
) {
    // Based on: https://stackoverflow.com/a/46946490
    return (
        validatorExp.match(/\\?.|^$/g)?.reduce(
            (p, c) => {
                if (c === '"') {
                    p.quote = !p.quote;
                } else if (!p.quote && c === " ") {
                    p.a.push("");
                } else {
                    p.a[p.a.length - 1] += c.replace(/\\(.)/, "$1");
                }
                return p;
            },
            { a: [""], quote: false }
        ).a ?? [validatorExp]
    );
}
