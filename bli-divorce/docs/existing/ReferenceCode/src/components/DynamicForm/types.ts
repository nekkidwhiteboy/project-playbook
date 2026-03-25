import type { User } from "hooks/useCurrentUser";
import type { CSSProperties } from "react";
import type { Country } from "react-phone-number-input";
import type { Unpacked } from "util/util-types";
import { ArrayValidatorType, ValidatorType } from "./validators";

export type ValidatorExpression = `${ValidatorType}${string}`;
export type ArrayValidatorExpression = `${ArrayValidatorType}${string}`;

export enum ResultStatus {
    NotStarted = "Not Started",
    InProgress = "In Progress",
    Complete = "Complete",
    Failed = "Failed",
    Locked = "Locked",
}

export type FormItemValue = string | number | boolean | null;

export type FormValues = {
    [key: string]:
        | FormItemValue
        | FormItemValue[]
        | Record<string, FormItemValue | FormItemValue[]>
        | FormValues[];
} & {
    $meta?: Record<string, any>;
};

export interface FormResult {
    id: number;
    form: FormInfo;
    owner: number | User;

    user_agent: string;
    user_ip: string;

    date_finish: Date;
    date_start: Date;
    date_update: Date;

    result_status: ResultStatus;

    items: FormValues;
    page_id: number | null;
    percentage?: number;

    versions: ResultVersion[];
}

export interface ResultVersion {
    id: number;
    created_date: Date;
    created_by: number;
    description: string;
    result: number;
    is_current: boolean;
}

export const enum Item {
    Html = "HTML",
    TextShort = "TEXT_SHORT",
    TextLong = "TEXT_LONG",
    Number = "NUMBER",
    Radio = "RADIO",
    Hidden = "HIDDEN",
    Date = "DATE",
    Time = "TIME",
    Select = "SELECT",
    Checkbox = "CHECKBOX",
    Switch = "SWITCH",
    Multi = "MULTI",
    PhoneNumber = "PHONE_NUMBER",
    ParentingTime = "PTS",
    AddressBlock = "ADDRESS_BLOCK",
}

export interface FormInfo {
    id: number;
    name: string;
    description: string;
}

export interface FormSchema extends FormInfo {
    root_page: number;
    template_sets: number[];
    max_results_per_client: number | null;
    max_results_per_staff: number | null;
    slug: string;
}

export interface FormPageSchema {
    id: number;
    title: string;
    rows: FormRow[];
}
export interface FormSuccessPageSchema {
    id: number;
    title: string;
    link?: string;
    rows: HtmlItem[];
}

export type FormRow = MultiItem | FormItem[];

export type FormItem = FormInputItem | HtmlItem;

export type FormInputItem =
    | TextShortItem
    | TextLongItem
    | NumberItem
    | RadioItem
    | HiddenItem
    | DateItem
    | TimeItem
    | SelectItem
    | CheckboxItem
    | SwitchItem
    | PhoneNumberItem
    | ParentingPeriods
    | AddressBlock;

export interface FormItemBase {
    name: string;
    type: Item;
    label: string;
    rules: string[];
    validators: ValidatorExpression[];
    disabled?: boolean;
    placeholder?: string;
    style?: CSSProperties;
    tooltip?: string;
    initialValue?: FormItemValue;
    adminItem?: boolean;
    wrapperStyle?: CSSProperties;
    addonAfter?: AddonItem;
    addonBefore?: AddonItem;
}

type InputSize = "small" | "middle" | "large";

export interface HtmlItem {
    type: Item.Html;
    name: string;
    content: string;
    rules: string[];
    style?: CSSProperties;
    wrapperStyle?: CSSProperties;
}

export type AddonItem =
    | string
    | TextShortItem
    | NumberItem
    | DateItem
    | TimeItem
    | SelectItem
    | CheckboxItem;

export interface TextShortItem extends FormItemBase {
    type: Item.TextShort;
    allowClear?: boolean;
    autoComplete?: SelectItem["options"];
    bordered?: boolean;
    maxLength?: number;
    prefix?: string;
    size?: InputSize;
    subType?: "color" | "email" | "search" | "text" | "url";
    suffix?: string;
}

export interface TextLongItem
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.TextLong;
    allowClear?: boolean;
    autoSize?: boolean | { minRows: number; maxRows: number };
    bordered?: boolean;
    maxLength?: number;
    showCount?: boolean;
}

export interface NumberItem extends FormItemBase {
    type: Item.Number;
    bordered?: boolean;
    controls?: boolean;
    decimalSeparator?: string;
    max?: number;
    min?: number;
    precision?: number;
    prefix?: string;
    readonly?: boolean;
    size?: InputSize;
    step?: number;
}

export interface RadioItem
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.Radio;
    options: Exclude<Unpacked<SelectItem["options"]>, { preset: string }>[];
    buttonStyle?: "outline" | "solid";
    optionType?: "default" | "button";
    size?: InputSize;
    vertical?: boolean;
}

export interface HiddenItem
    extends Omit<
        FormItemBase,
        "style" | "adminItem" | "addonAfter" | "addonBefore"
    > {
    type: Item.Hidden;
}

export interface DateItem extends FormItemBase {
    type: Item.Date;
    allowClear?: boolean;
    bordered?: boolean;
    max?: string;
    min?: string;
    mode?: "date" | "month";
    size?: InputSize;
}

export interface TimeItem extends FormItemBase {
    type: Item.Time;
    min: string;
    max: string;
    step: number;
}

export interface SelectItem
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.Select;
    options: (
        | string
        | {
              label: string;
              value: Exclude<FormItemValue, null | boolean>;
              rules?: string[];
          }
        | { preset: string; rules: string[]; exclude?: string[] }
    )[];
    bordered?: boolean;
    dropdownStyle?: CSSProperties;
    filterOption?: boolean;
    listHeight?: number;
    mode?: "multiple" | "tags";
    showArrow?: boolean;
    showSearch?: boolean;
    size?: InputSize;
    virtual?: boolean;
}

export interface CheckboxItem
    extends Omit<FormItemBase, "validators" | "addonAfter" | "addonBefore"> {
    type: Item.Checkbox;
    options: SelectItem["options"];
    vertical?: boolean;
    validators: ArrayValidatorExpression[];
}

export interface SwitchItem
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.Switch;
    mode?: "switch" | "checkbox";
    size?: "small" | "default";
    innerLabel?: string;
    checkedChildren?: string;
    unCheckedChildren?: string;
}

export type MultiItem = Omit<
    FormItemBase,
    "label" | "tooltip" | "initialValue" | "addonAfter" | "addonBefore"
> & {
    type: Item.Multi;
    label?: string;
    rows: FormItem[][];
    emptyText?: string;
    emptyImage?: string;
    emptyImageStyle?: CSSProperties;
} & (
        | {
              minItems: number | null;
              maxItems: number | null;
              initialItems: number;
          }
        | {
              source: string;
              start?: number;
              stop?: number;
          }
    );

export function isMultiItem(row: FormRow): row is MultiItem {
    return !Array.isArray(row) && row.type === Item.Multi;
}

export interface PhoneNumberItem
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.PhoneNumber;
    country?: Country;
    international?: boolean;
    withCountryCallingCode?: boolean;
    defaultCountry?: Country;
    smartCaret?: boolean;
    useNationalFormatForDefaultCountryValue?: boolean;
}

export type TimeMode = "All" | "None" | "Weekend";
export interface PTTemplateOption {
    label: string;
    value: string;
    rules?: string[];
    description?: string;
    tooltip?: string;
    disabled?: boolean;
}

export interface ParentingPeriods
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.ParentingTime;
    templates: PTTemplateOption[];
    maxPeriods?: number;
    numWeeks?: number;
    petColor?: string;
    petNameField?: string;
    respColor?: string;
    respNameField?: string;
    secondaryStyle?: CanvasFillStrokeStyles["fillStyle"];
    templateLabel: string;
    timeMode?: TimeMode;
    defaultTime?: string;
}

export interface AddressBlock
    extends Omit<FormItemBase, "addonAfter" | "addonBefore"> {
    type: Item.AddressBlock;
    defaultCountry?: string;
    showCountry?: boolean;
    cityProps?: {
        allowClear?: boolean;
        bordered?: boolean;
        label?: string;
        maxLength?: number;
        prefix?: string;
        size?: InputSize;
        style?: CSSProperties;
        suffix?: string;
    };
    countryProps?: {
        bordered?: boolean;
        dropdownStyle?: CSSProperties;
        filterOption?: boolean;
        label?: string;
        listHeight?: number;
        showArrow?: boolean;
        showSearch?: boolean;
        size?: InputSize;
        style?: CSSProperties;
        virtual?: boolean;
    };
    postalCodeProps?: {
        allowClear?: boolean;
        bordered?: boolean;
        label?: string;
        labelUSA?: string;
        maxLength?: number;
        prefix?: string;
        size?: InputSize;
        style?: CSSProperties;
        suffix?: string;
    };
    stateProps?: {
        allowClear?: boolean;
        bordered?: boolean;
        label?: string;
        labelUSA?: string;
        maxLength?: number;
        prefix?: string;
        showSearch?: boolean;
        size?: InputSize;
        style?: CSSProperties;
        suffix?: string;
    };
    streetProps?: {
        allowClear?: boolean;
        bordered?: boolean;
        label?: string;
        maxLength?: number;
        prefix?: string;
        showLine2?: boolean;
        size?: InputSize;
        style?: CSSProperties;
        suffix?: string;
    };
}
