import { MinusOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { Button, Divider, Form, Select, Space } from "antd";
import { useFormResult } from "components/DynamicForm";
import { useFormEvent } from "components/DynamicForm/FormPage";
import { Label } from "components/DynamicForm/items/Label";
import type {
    FormValues,
    PTTemplateOption,
    ParentingPeriods,
    TimeMode,
} from "components/DynamicForm/types";
import { evaluate } from "components/DynamicForm/util";
import { ValidatorType } from "components/DynamicForm/validators";
import dayjs from "dayjs";
import type { FormikErrors } from "formik";
import { FieldArray, getIn, setIn, useFormikContext } from "formik";
import { Cascader, FormItem, type CascaderProps } from "formik-antd";
import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import TimePicker from "../TimePicker";
import Calendar from "./Calendar";
import {
    isParentingPeriod,
    type Interval,
    type NullableProps,
    type ParentingPeriod,
} from "./types";
import {
    circIntersections,
    getMinutes,
    invertPeriods,
    parsePtsString,
    toInterval,
    toParentingPeriod,
    toPtsString,
} from "./util";

import "./ParentingTimeSchedule.less";

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const emptyPeriod: NullableProps<ParentingPeriod> = {
    StartDay: null,
    StartTime: null,
    EndDay: null,
    EndTime: null,
};

interface Props extends ParentingPeriods {
    readonly?: boolean;
}

const ParentingTimeSchedule: FC<Props> = ({
    name,
    label,
    templates,
    numWeeks = 2,
    petColor = "#FF6666",
    petNameField = "PetFirst",
    respColor = "#6666FF",
    respNameField = "RespFirst",
    maxPeriods = 10,
    secondaryStyle = "#DD0000",
    templateLabel = "Select a Parenting Time Schedule Template",
    readonly = false,
    timeMode = "ALL" as TimeMode,
    defaultTime = "12:00",
    ...props
}) => {
    const result = useFormResult();
    const {
        values: pageValues,
        setFieldValue,
        setFieldError,
        errors: formErrors,
    } = useFormikContext<FormValues>();
    const { onFormValidate } = useFormEvent();

    const formValues: FormValues = useMemo(
        () => ({ ...result.items, ...pageValues }),
        [result.items, pageValues]
    );

    const value = getIn(
        pageValues,
        name,
        []
    ) as NullableProps<ParentingPeriod>[];
    const errors = getIn(formErrors, name);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
        null
    );

    const templateOptions = useMemo(
        () =>
            [
                {
                    label: "Custom",
                    value: "*",
                    disabled: selectedTemplate !== null,
                    title: selectedTemplate
                        ? "To create a custom schedule, add/edit the periods below."
                        : "Custom",
                    description: "Custom schedule",
                },
                ...templates.filter((option, $index) =>
                    (option.rules ?? []).every(
                        (rule: string) =>
                            evaluate(rule, { ...formValues, $index }) === true
                    )
                ),
            ] as PTTemplateOption[],
        [templates, formValues, selectedTemplate]
    );

    const overlaps = getIntersections(
        value.filter(isParentingPeriod).map((p) => toInterval(p))
    ).map((interval) => toParentingPeriod(interval));

    let petName = getIn(formValues, petNameField, "Petitioner");
    let respName = getIn(formValues, respNameField, "Respondent");
    if (petName === respName) {
        petName = "Petitioner";
        respName = "Respondent";
    }

    const petPercentage = calcPercentage(value, numWeeks, defaultTime);

    useEffect(
        () =>
            onFormValidate((formValues) => {
                let errors: FormikErrors<typeof formValues> = {};

                if (
                    props.validators.includes(ValidatorType.REQUIRED) &&
                    value.length === 0
                ) {
                    errors = setIn(
                        errors,
                        `${name}-template`,
                        "This field is required"
                    );
                }

                if (value.length > maxPeriods) {
                    errors = setIn(errors, name, "Too many items");
                }

                const intervals: Interval[] = [];
                const intervalMap: Record<number, string> = {};

                for (let [i, period] of value.entries()) {
                    if (isParentingPeriod(period)) {
                        const startKey = `${name}.${i}.StartDay`;
                        const endKey = `${name}.${i}.EndDay`;
                        const [start, end] = toInterval(period);

                        intervals.push([start, end]);

                        if (intervalMap[start]) {
                            errors = setIn(
                                errors,
                                startKey,
                                "Duplicate exchange time!"
                            );
                            errors = setIn(
                                errors,
                                intervalMap[start],
                                "Duplicate exchange time!"
                            );
                        } else {
                            intervalMap[start] = startKey;
                        }

                        if (intervalMap[end]) {
                            errors = setIn(
                                errors,
                                endKey,
                                "Duplicate exchange time!"
                            );
                            errors = setIn(
                                errors,
                                intervalMap[end],
                                "Duplicate exchange time!"
                            );
                        } else {
                            intervalMap[end] = endKey;
                        }
                    }
                }

                for (let [start, end] of getIntersections(intervals)) {
                    errors = setIn(
                        errors,
                        intervalMap[start],
                        "Overlapping period!"
                    );
                    errors = setIn(
                        errors,
                        intervalMap[end],
                        "Overlapping period!"
                    );
                }
                return errors;
            }),
        [maxPeriods, name, onFormValidate, value, props.validators]
    );

    useEffect(() => {
        if (value.length === 0 && selectedTemplate !== null) {
            setFieldValue(name, [emptyPeriod]);
        }
    }, [value, name, setFieldValue, selectedTemplate]);

    useEffect(() => {
        const ptsString = toPtsString(value);
        console.log(ptsString);
        if (templateOptions.find((option) => option.value === ptsString)) {
            setSelectedTemplate(ptsString);
        } else if (value.length > 0) {
            setSelectedTemplate("*");
        }
    }, [templateOptions, value]);

    const onTemplateChange = (value: string) => {
        const periods = parsePtsString(value);
        if (periods !== null) {
            setFieldValue(name, periods);
        }
        setSelectedTemplate(value);
        setFieldError(`${name}-template`, undefined);
    };

    const commonProps = {
        colon: false,
        hasFeedback: false,
        className: "label-above",
        required: props.validators.includes(ValidatorType.REQUIRED),
        tooltip: props.tooltip,
    };

    return (
        <div className="pts-item">
            <Form.Item
                label={<Label>{templateLabel}</Label>}
                {...commonProps}
                extra={
                    templateOptions.find(
                        ({ value }) => selectedTemplate === value
                    )?.description
                }
            >
                <Select
                    options={templateOptions}
                    open={readonly ? false : undefined}
                    onChange={onTemplateChange}
                    value={selectedTemplate}
                    style={{ width: 170 }}
                />
                {selectedTemplate !== null ? (
                    <Button
                        type="link"
                        icon={<SwapOutlined />}
                        title="Swap Parties"
                        onClick={() =>
                            setFieldValue(name, invertPeriods(value))
                        }
                    />
                ) : null}
                {getIn(formErrors, `${name}-template`) && (
                    <p className="error-message">
                        {getIn(formErrors, `${name}-template`)}
                    </p>
                )}
            </Form.Item>
            {selectedTemplate !== null && (
                <Space direction="vertical">
                    <Calendar
                        periods={value}
                        numWeeks={numWeeks}
                        petColor={petColor}
                        respColor={respColor}
                        secondaryPeriods={overlaps}
                        secondaryStyle={secondaryStyle}
                        defaultTime={defaultTime}
                    />
                    <Space>
                        <span style={{ marginLeft: 15 }}>
                            <span
                                className="party-color"
                                style={{ backgroundColor: petColor }}
                            />
                            {petName} ({petPercentage.toFixed(2)}%)
                        </span>
                        <span>
                            <span
                                className="party-color"
                                style={{ backgroundColor: respColor }}
                            />
                            {respName} ({(100 - petPercentage).toFixed(2)}%)
                        </span>
                    </Space>
                    <p style={{ marginBottom: 0 }}>{label}</p>
                    <div
                        style={{ display: "inline-block", padding: "0px 10px" }}
                    >
                        <FieldArray name={name}>
                            {({ push, remove }) =>
                                value
                                    .map(
                                        (_, i): ReactNode => (
                                            <ParentingPeriodItem
                                                key={i}
                                                name={`${name}.${i}`}
                                                numWeeks={numWeeks}
                                                cascaderProps={{
                                                    allowClear:
                                                        selectedTemplate ===
                                                        "*",
                                                }}
                                                readonly={readonly}
                                                timeMode={timeMode}
                                                {...commonProps}
                                            />
                                        )
                                    )
                                    .concat(
                                        !readonly ? (
                                            <Space key={`${name}_controls`}>
                                                <Button
                                                    icon={<PlusOutlined />}
                                                    onClick={() =>
                                                        push(emptyPeriod)
                                                    }
                                                    disabled={
                                                        value.length >=
                                                        maxPeriods
                                                    }
                                                >
                                                    Add
                                                </Button>
                                                <Button
                                                    icon={<MinusOutlined />}
                                                    onClick={() =>
                                                        // Use 'remove' instead of 'pop' so that Calendar is updated immediately
                                                        remove(value.length - 1)
                                                    }
                                                    disabled={value.length <= 1}
                                                    danger
                                                >
                                                    Remove
                                                </Button>
                                            </Space>
                                        ) : null
                                    )
                            }
                        </FieldArray>
                        {typeof errors === "string" ? (
                            <p className="error-message">{errors}</p>
                        ) : null}
                    </div>
                </Space>
            )}
        </div>
    );
};

export default ParentingTimeSchedule;

interface ItemProps {
    name: string;
    numWeeks: number;
    cascaderProps?: Omit<CascaderProps, "options" | "children" | "name">;
    readonly?: boolean;
    required?: boolean;
    maxTime?: string;
    minTime?: string;
    timeMode?: TimeMode;
    defaultTime?: string;
}

const ParentingPeriodItem: FC<ItemProps> = ({
    name,
    numWeeks,
    cascaderProps,
    maxTime = "23:59",
    minTime = "00:00",
    timeMode = "Weekend",
    readonly = false,
    required = false,
    ...commonProps
}) => {
    const { values, setFieldValue } = useFormikContext();

    const [showStart, showEnd] = showTime(
        timeMode,
        getIn(values, name + ".StartDay"),
        getIn(values, name + ".EndDay")
    );
    useEffect(() => {
        if (!showStart && getIn(values, name + ".StartTime") !== null) {
            setFieldValue(name + ".StartTime", null);
        }
        if (!showEnd && getIn(values, name + ".EndTime") !== null) {
            setFieldValue(name + ".EndTime", null);
        }
    }, [showStart, showEnd, setFieldValue, name, values]);

    const dayOptions = useMemo(
        () =>
            Array.from({ length: numWeeks }, (_, w) => ({
                label: `Week ${w + 1}`,
                value: w,
                children: Array.from({ length: 7 }, (_, d) => ({
                    label: DAYS[d],
                    value: d,
                })),
            })),
        [numWeeks]
    );
    const validateDay = useCallback((value?: [number, number]) => {
        if (value?.length !== 2) {
            return "This field is required!";
        }
    }, []);
    const validateTime = useCallback(
        (value?: string) => {
            if (!value) {
                return "This field is required!";
            }
            const time = dayjs(value, "HH:mm");
            if (
                !time.isValid() ||
                time.isBefore(dayjs(minTime, "HH:mm"), "hour") ||
                time.isAfter(dayjs(maxTime, "HH:mm"), "hour")
            ) {
                return "Invalid time!";
            }
        },
        [minTime, maxTime]
    );

    return (
        <div className="pts-period">
            <div className="pts-exchange">
                <FormItem
                    name={`${name}.StartDay`}
                    label={<Label children="Start Day" />}
                    {...commonProps}
                    validate={validateDay}
                    required
                >
                    <Cascader
                        options={dayOptions}
                        name={`${name}.StartDay`}
                        {...cascaderProps}
                        style={{
                            width: 140,
                            ...cascaderProps?.style,
                        }}
                        open={readonly ? false : cascaderProps?.open}
                        disabled={readonly || cascaderProps?.disabled}
                    />
                </FormItem>
                {showStart ? (
                    <FormItem
                        name={`${name}.StartTime`}
                        label={<Label children="Start Time" />}
                        validate={validateTime}
                        {...commonProps}
                        required
                    >
                        <TimePicker
                            name={`${name}.StartTime`}
                            step={900}
                            max={maxTime}
                            min={minTime}
                            readOnly={readonly}
                        />
                    </FormItem>
                ) : null}
            </div>
            <div className="pts-exchange">
                <FormItem
                    name={`${name}.EndDay`}
                    label={<Label children="End Day" />}
                    validate={validateDay}
                    {...commonProps}
                    required
                >
                    <Cascader
                        name={`${name}.EndDay`}
                        options={dayOptions}
                        {...cascaderProps}
                        style={{
                            width: 140,
                            ...cascaderProps?.style,
                        }}
                        open={readonly ? false : cascaderProps?.open}
                        disabled={readonly || cascaderProps?.disabled}
                    />
                </FormItem>
                {showEnd ? (
                    <FormItem
                        name={`${name}.EndTime`}
                        label={<Label children="End Time" />}
                        validate={validateTime}
                        {...commonProps}
                        required
                    >
                        <TimePicker
                            name={`${name}.EndTime`}
                            step={900}
                            max={maxTime}
                            min={minTime}
                            readOnly={readonly}
                        />
                    </FormItem>
                ) : null}
            </div>
            <Divider style={{ margin: "10px 0px" }} />
        </div>
    );
};

const showTime = (
    timeMode: TimeMode,
    startDay?: [number, number],
    endDay?: [number, number]
) => {
    switch (timeMode) {
        case "All":
            return [true, true];
        case "None":
            return [false, false];
        case "Weekend":
            if (startDay && endDay) {
                if (startDay[0] === endDay[0] && startDay[1] === endDay[1]) {
                    return [true, true];
                }
            }
            return [(startDay?.[1] ?? 0) >= 5, (endDay?.[1] ?? 0) >= 5];
    }
};

function calcPercentage(
    periods: NullableProps<ParentingPeriod>[],
    numWeeks: number = 2,
    defaultTime: string = "12:00"
): number {
    const MINS_IN_DAY = 1440; // 24 * 60
    let totalMinutes = 0;
    for (let { StartDay, StartTime, EndDay, EndTime } of periods) {
        if (StartDay && EndDay) {
            const startMinutes =
                (StartDay[0] * 7 + StartDay[1]) * MINS_IN_DAY +
                getMinutes(StartTime ?? defaultTime);
            const endMinutes =
                (EndDay[0] * 7 + EndDay[1]) * MINS_IN_DAY +
                getMinutes(EndTime ?? defaultTime);

            totalMinutes += endMinutes - startMinutes;
            if (startMinutes >= endMinutes) {
                totalMinutes += 7 * numWeeks * MINS_IN_DAY;
            }
        }
    }
    return (totalMinutes / (7 * numWeeks * MINS_IN_DAY)) * 100;
}

function getIntersections(intervals: Interval[]): Interval[] {
    const intersections: Interval[] = [];

    for (let i1 = 0; i1 < intervals.length - 1; i1++) {
        for (let i2 = i1 + 1; i2 < intervals.length; i2++) {
            intersections.push(
                ...circIntersections(intervals[i1], intervals[i2])
            );
        }
    }

    return intersections;
}
