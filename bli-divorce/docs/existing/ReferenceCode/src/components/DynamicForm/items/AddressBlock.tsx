import FormItem from "antd/es/form/FormItem";
import { getIn, useFormikContext, type FieldValidator } from "formik";
import { Form, Input, Select } from "formik-antd";
import { useEffect, useState } from "react";
import { COUNTRIES, STATES, US_TERRITORIES } from "util/constants";
import type { AddressBlock as AddressBlockType } from "../types";
import { ValidatorType } from "../validators";
import { Label } from "./Label";

// @ts-ignore
import union from "set.prototype.union";
union.shim();

export interface Address {
    Street: string | null;
    Line2: string | null;
    City: string | null;
    State: string | null;
    PostalCode: string | null;
    Country: string | null;
}

interface AddressBlockProps extends AddressBlockType {
    readonly?: boolean;
}

const COUNTRY_OPTIONS = Array.from(COUNTRIES).map((v) => ({
    label: v,
    value: v,
}));
const STATE_OPTIONS = Array.from(STATES.union(US_TERRITORIES)).map((v) => ({
    label: v,
    value: v,
}));

export default function AddressBlock({
    name,
    style,
    readonly = false,
    showCountry = true,
    ...props
}: AddressBlockProps) {
    const { values } = useFormikContext();

    const [isUSA, setIsUSA] = useState(false);
    const required = props.validators.includes(ValidatorType.REQUIRED);

    const { label: cityLabel, ...cityProps } = props.cityProps ?? {};
    const { label: countryLabel, ...countryProps } = props.countryProps ?? {};
    const {
        label: postLabel,
        labelUSA: postLabelUSA,
        ...postalCodeProps
    } = props.postalCodeProps ?? {};
    const {
        showSearch,
        label: stateLabel,
        labelUSA: stateLabelUSA,
        ...stateProps
    } = props.stateProps ?? {};
    const {
        showLine2 = true,
        label: streetLabel,
        ...streetProps
    } = props.streetProps ?? {};

    useEffect(() => {
        setIsUSA(getIn(values, name + ".Country") === "United States");
    }, [values, name]);

    const validateStreet: FieldValidator = (street: Address["Street"]) => {
        if (
            (required && !street?.length) ||
            (!street?.length && getIn(values, name + ".Line2"))
        ) {
            return "This field is required";
        }
        if (street && street.length > (streetProps.maxLength ?? Infinity)) {
            return `Cannot exceed ${streetProps.maxLength} characters`;
        }
    };
    const validateLine2: FieldValidator = (line2: Address["Line2"]) => {
        if (line2 && line2.length > (streetProps.maxLength ?? Infinity)) {
            return `Cannot exceed ${streetProps.maxLength} characters`;
        }
    };
    const validateCity: FieldValidator = (city: Address["City"]) => {
        if (required && !city?.length) {
            return "This field is required";
        }
        if (city && city.length > (cityProps.maxLength ?? Infinity)) {
            return `Cannot exceed ${cityProps.maxLength} characters`;
        }
    };
    const validateState: FieldValidator = (state: Address["State"]) => {
        if (required && !state?.length) {
            return "This field is required";
        }
        if (
            state &&
            isUSA &&
            !(STATES.has(state) || US_TERRITORIES.has(state))
        ) {
            return "Please select an item from the list";
        }
    };
    const validatePostalCode: FieldValidator = (
        postalCode: Address["PostalCode"]
    ) => {
        if (required && !postalCode?.length) {
            return "This field is required";
        }
        if (isUSA && !/^\d{5}(-\d{4})?$/g.test(postalCode ?? "")) {
            return "Zip codes may only contain numbers";
        }
        if (!isUSA && !/^[ a-zA-Z\d-]+$/g.test(postalCode ?? "")) {
            return "Postal codes may only contain numbers (0-9), letters (A-Z), hyphens (-) and spaces";
        }
    };
    const validateCountry: FieldValidator = (country: Address["Country"]) => {
        if (required && !country?.length) {
            return "This field is required";
        }
        if (country && !COUNTRIES.has(country)) {
            return "Please select an item from the list";
        }
    };

    return (
        <FormItem
            label={props.label}
            required={required}
            style={{ marginBottom: 0, ...style }}
            tooltip={props.tooltip}
            wrapperCol={{ style: { paddingLeft: props.label ? 10 : 0 } }}
        >
            <Form.Item
                name={name + ".Street"}
                label={<Label>{streetLabel ?? "Street Address"}</Label>}
                validate={validateStreet}
                required={required}
                style={{ marginBottom: 10 }}
            >
                <Input
                    name={name + ".Street"}
                    {...streetProps}
                    style={{ maxWidth: 300, ...streetProps.style }}
                    readOnly={readonly}
                    suffix={streetProps.suffix ?? <span />}
                    prefix={streetProps.prefix ?? <span />}
                />
            </Form.Item>
            {showLine2 && (
                <Form.Item name={name + ".Line2"} validate={validateLine2}>
                    <Input
                        name={name + ".Line2"}
                        {...streetProps}
                        style={{ maxWidth: 300, ...streetProps.style }}
                        readOnly={readonly}
                        suffix={streetProps.suffix ?? <span />}
                        prefix={streetProps.prefix ?? <span />}
                    />
                </Form.Item>
            )}
            <div style={{ display: "flex", columnGap: 20, flexWrap: "wrap" }}>
                <Form.Item
                    name={name + ".City"}
                    label={<Label>{cityLabel ?? "City"}</Label>}
                    validate={validateCity}
                    required={required}
                >
                    <Input
                        name={name + ".City"}
                        {...cityProps}
                        readOnly={readonly}
                        suffix={streetProps.suffix ?? <span />}
                        prefix={streetProps.prefix ?? <span />}
                    />
                </Form.Item>
                <Form.Item
                    name={name + ".State"}
                    label={
                        <Label>
                            {isUSA
                                ? stateLabelUSA ?? "State"
                                : stateLabel ?? "State/Province/Region"}
                        </Label>
                    }
                    validate={validateState}
                    required={required}
                >
                    {isUSA ? (
                        <Select
                            name={name + ".State"}
                            {...stateProps}
                            options={STATE_OPTIONS}
                            style={{
                                minWidth: 125,
                                ...stateProps?.style,
                            }}
                            open={readonly ? false : undefined}
                            showSearch={!readonly && countryProps.showSearch}
                        />
                    ) : (
                        <Input
                            name={name + ".State"}
                            {...stateProps}
                            style={{
                                minWidth: 125,
                                ...stateProps?.style,
                            }}
                            readOnly={readonly}
                            suffix={streetProps.suffix ?? <span />}
                            prefix={streetProps.prefix ?? <span />}
                        />
                    )}
                </Form.Item>
                <Form.Item
                    name={name + ".PostalCode"}
                    label={
                        <Label>
                            {isUSA
                                ? postLabelUSA ?? "Zip Code"
                                : postLabel ?? "Postal Code"}
                        </Label>
                    }
                    validate={validatePostalCode}
                    required={required}
                >
                    <Input
                        name={name + ".PostalCode"}
                        {...postalCodeProps}
                        style={{
                            maxWidth: 80,
                            ...postalCodeProps?.style,
                        }}
                        readOnly={readonly}
                        suffix={streetProps.suffix ?? <span />}
                        prefix={streetProps.prefix ?? <span />}
                    />
                </Form.Item>
            </div>
            {showCountry && (
                <Form.Item
                    name={name + ".Country"}
                    label={<Label>Country</Label>}
                    validate={validateCountry}
                    required={required}
                >
                    <Select
                        name={name + ".Country"}
                        {...countryProps}
                        options={COUNTRY_OPTIONS}
                        open={readonly ? false : undefined}
                        showSearch={!readonly && countryProps.showSearch}
                        style={{ maxWidth: 220, ...countryProps.style }}
                    />
                </Form.Item>
            )}
        </FormItem>
    );
}
