import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import {
    Alert,
    Button,
    Col,
    Empty,
    Progress,
    Row,
    Space,
    Typography,
} from "antd";
import LoadingIndicator from "components/LoadingIndicator";
import {
    FieldArray,
    Formik,
    getIn,
    setIn,
    useFormikContext,
    type FieldArrayRenderProps,
    type FormikErrors,
    type FormikTouched,
} from "formik";
import { Form, SubmitButton } from "formik-antd";
import { Persist } from "formik-persist";
import _memoize from "lodash/memoize";
import _merge from "lodash/merge";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";
import { useFormResult } from ".";
import DynamicFormItem from "./DynamicFormItem";
import { useFormPageSchema, useResultPage } from "./hooks";
import {
    Item,
    isMultiItem,
    type FormItem,
    type FormItemValue,
    type FormPageSchema,
    type FormRow,
    type FormValues,
    type MultiItem,
    type TimeMode,
} from "./types";
import {
    allRulesPass,
    evaluate,
    expandOptionPresets,
    replacePipes,
    stripRecursive,
} from "./util";

type ValidateHandler<T> = (
    values: T
) => void | object | Promise<FormikErrors<T>>;

const FormEventContext = createContext<{
    onFormValidate: (handler: ValidateHandler<FormValues>) => () => void;
} | null>(null);

export const useFormEvent = () => useContext(FormEventContext)!;

interface Props {
    pageId: number;
    onPrevious: () => Promise<void> | void;
    onSave: (values: FormValues) => Promise<void> | void;
    onNext: (values: FormValues) => Promise<void> | void;
    readonly?: boolean;
    persist?: boolean;
}

export default function FormPage(props: Props) {
    const result = useFormResult();

    const [validateHandlers, setValidateHandlers] = useState<
        ValidateHandler<FormValues>[]
    >([]);

    const { data: schema, status: schemaStatus } = useFormPageSchema({
        variables: { id: props.pageId },
    });
    const queryKey = ["results", result.id, { page: props.pageId }];
    const { data: resultPage, status: dataStatus } = useResultPage({
        variables: {
            id: result.id,
            page: props.pageId,
            persist: props.persist,
        },
    });

    const initialTouched = useMemo(
        () => getInitialTouched(resultPage?.items ?? {}),
        [resultPage]
    );

    const percent = Math.round((resultPage?.percentage ?? 0) * 1000) / 10;

    const progBarElm = document.querySelector(".post-form-container");

    const subscribe = useCallback(
        (handler: ValidateHandler<FormValues>): (() => void) => {
            setValidateHandlers((prev) => [...prev, handler]);
            return () => {
                setValidateHandlers((prev) => {
                    const index = prev.indexOf(handler);
                    prev.splice(index, 1);
                    return prev;
                });
            };
        },
        []
    );

    const runFormValidators = async (values: FormValues) =>
        Promise.all(validateHandlers.map((fn) => fn(values))).then((results) =>
            results.reduce(
                (errors, all) => _merge(errors, all),
                {} as FormikErrors<FormValues>
            )
        );

    useEffect(
        () => () => window.localStorage.removeItem(JSON.stringify(queryKey))
    );

    const loading = schemaStatus === "pending" || dataStatus === "pending";
    return (
        <FormEventContext.Provider value={{ onFormValidate: subscribe }}>
            <Helmet
                title={`${schema ? `${schema.title} | ` : ""}${
                    result.form.name
                } | Barrow Brown Carrington, PLLC`}
            />
            <Formik<FormValues>
                initialValues={resultPage?.items ?? {}}
                initialTouched={initialTouched}
                onSubmit={(values) =>
                    props.onNext(
                        cleanValues(
                            values,
                            schema!, // Form cannot be submitted until after the schema has loaded
                            result.items
                        )
                    )
                }
                validate={runFormValidators}
                validateOnChange={false}
                validateOnBlur={false}
                enableReinitialize
            >
                {({ isSubmitting, values }) => (
                    <Form
                        className={props.readonly ? "readonly" : ""}
                        layout="vertical"
                    >
                        {props.readonly ? (
                            <Alert
                                message="This form is locked. If you need to make changes, please contact our office."
                                type="warning"
                            />
                        ) : null}
                        <LoadingIndicator spinning={isSubmitting || loading}>
                            {schemaStatus === "success"
                                ? getFormRows(
                                      schema,
                                      //   DO NOT USE _merge HERE. We must preserve references to any arrays in `values`
                                      {
                                          $meta: {
                                              date_start: result.date_start,
                                          },
                                          ...result.items,
                                          ...values,
                                      },
                                      props.readonly
                                  )
                                : null}
                        </LoadingIndicator>
                        <Row
                            gutter={[10, 10]}
                            style={{ marginTop: "1em" }}
                            justify="center"
                        >
                            <Col
                                xs={{ span: 24, order: 3 }}
                                sm={{ span: 8, order: 1 }}
                            >
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        props.onPrevious();
                                    }}
                                    disabled={isSubmitting || loading}
                                    size="large"
                                    block
                                >
                                    Previous Page
                                </Button>
                            </Col>
                            {props.pageId !== null && (
                                <Col
                                    xs={{ span: 24, order: 2 }}
                                    sm={{ span: 8, order: 2 }}
                                >
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        disabled={
                                            props.readonly ||
                                            isSubmitting ||
                                            loading
                                        }
                                        onClick={() => {
                                            props.onSave(
                                                cleanValues(
                                                    values,
                                                    schema!, // Button is disabled while the schema is loading
                                                    result.items
                                                )
                                            );
                                        }}
                                    >
                                        Save Progress
                                    </Button>
                                </Col>
                            )}
                            <Col
                                xs={{ span: 24, order: 1 }}
                                sm={{ span: 8, order: 3 }}
                            >
                                <SubmitButton
                                    type="primary"
                                    size="large"
                                    block
                                    // Only disable the SubmitButton during loading.
                                    // This prevents the button from staying disabled if an invalid field becomes hidden by a rule.
                                    disabled={loading}
                                >
                                    Next Page
                                </SubmitButton>
                            </Col>
                        </Row>
                        {props.persist && (
                            <Persist name={JSON.stringify(queryKey)} />
                        )}
                        <ClearSubmitting />
                    </Form>
                )}
            </Formik>
            {progBarElm &&
                createPortal(
                    <Progress
                        percent={percent}
                        trailColor="darkgrey"
                        strokeWidth={12}
                    />,
                    progBarElm
                )}
        </FormEventContext.Provider>
    );
}

function getFormRows(
    schema: FormPageSchema,
    values: FormValues,
    readonly?: boolean
) {
    return schema.rows.map((row, rowIndex) =>
        generateRow(row, `FormPage_row_${rowIndex}`, values)
    );

    function generateRow(
        row: FormRow,
        key: string | number,
        values: FormValues
    ) {
        if (isMultiItem(row)) {
            return generateMultiItem(row, key, values);
        }
        return (
            <div style={{}} className="input-row" key={key}>
                {row
                    .filter((item) => {
                        const allRulesPassed = allRulesPass(item, values);
                        if (!allRulesPassed && item.type !== Item.Html) {
                            // This is needed to hide any fields dependant on this one
                            // This should NOT actually change Formik's values
                            values = setIn(
                                values,
                                replacePipes(item.name, values),
                                null
                            );
                        }

                        return allRulesPassed;
                    })
                    .map(({ wrapperStyle = {}, ...item }, i, a) => (
                        <div
                            style={{
                                flexGrow: a.length === 1 ? 1 : 0,
                                flexShrink: 1,
                                ...wrapperStyle,
                            }}
                            key={replacePipes(item.name, values)}
                        >
                            <DynamicFormItem
                                item={replacePipesInFormItem(item, values)}
                                readonly={readonly}
                            />
                        </div>
                    ))}
            </div>
        );
    }
    function generateMultiItem(
        item: MultiItem,
        key: string | number,
        values: FormValues
    ) {
        if (allRulesPass(item, values)) {
            return (
                <div key={key}>
                    {item.label ? (
                        <div className="input-row">
                            <div className="ant-form-item-label">
                                <label className="ant-form-item-no-colon">
                                    {replacePipes(item.label, values)}
                                </label>
                            </div>
                        </div>
                    ) : null}
                    <div style={{ padding: "0px 10px" }}>
                        <FieldArray name={item.name} key={item.name}>
                            {({ pop, push }: FieldArrayRenderProps) => {
                                values[item.name] ??= [];
                                // Shallow copy so push/pop alter values[items.name] but makes TS happy
                                const _item_values = values[
                                    item.name
                                ] as FormValues[];

                                if ("source" in item) {
                                    const source = getIn(
                                        values,
                                        item.source,
                                        []
                                    ).slice(item.start ?? 0, item.stop);

                                    // Remove any extra items
                                    while (
                                        _item_values.length > source.length
                                    ) {
                                        _item_values.pop();
                                    }
                                    // Add missing items
                                    while (
                                        _item_values.length < source.length
                                    ) {
                                        _item_values.push(
                                            getInitialMultiItemValue(item)
                                        );
                                    }

                                    return _item_values.map(
                                        (_: any, $index: number) =>
                                            item.rows.map((subRow, index) =>
                                                generateRow(
                                                    subRow,
                                                    `${key}_${index}`,
                                                    {
                                                        ...values,
                                                        $index,
                                                        $item: source[$index],
                                                    }
                                                )
                                            )
                                    );
                                } else {
                                    const minItems = item.minItems ?? 0;
                                    if (
                                        (!(item.name in values) ||
                                            _item_values.length === 0) &&
                                        minItems === 0
                                    ) {
                                        return (
                                            <Empty
                                                description={
                                                    <Typography.Text>
                                                        {item.emptyText ??
                                                            "No Items"}
                                                    </Typography.Text>
                                                }
                                                key={`${item.name}_placeholder`}
                                                image={
                                                    item.emptyImage ??
                                                    Empty.PRESENTED_IMAGE_SIMPLE
                                                }
                                                imageStyle={
                                                    item.emptyImageStyle
                                                }
                                            >
                                                {!readonly ? (
                                                    <Button
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            push(
                                                                getInitialMultiItemValue(
                                                                    item
                                                                )
                                                            )
                                                        }
                                                    >
                                                        Add
                                                    </Button>
                                                ) : null}
                                            </Empty>
                                        );
                                    }

                                    const initialCount =
                                        _item_values.length === 0
                                            ? item.initialItems
                                            : minItems;

                                    while (_item_values.length < initialCount) {
                                        _item_values.push(
                                            getInitialMultiItemValue(item)
                                        );
                                    }
                                    const items = _item_values.map(
                                        (_: any, $index: number) =>
                                            item.rows.map((subRow, index) =>
                                                generateRow(
                                                    subRow,
                                                    `${key}_${index}`,
                                                    { ...values, $index }
                                                )
                                            )
                                    );
                                    const buttons = (
                                        <Space
                                            key={`${item.name}_controls`}
                                            className="input-row"
                                            style={{ marginBottom: 20 }}
                                        >
                                            {(!item.maxItems ||
                                                _item_values.length <
                                                    item.maxItems) && (
                                                <Button
                                                    icon={<PlusOutlined />}
                                                    onClick={() =>
                                                        push(
                                                            getInitialMultiItemValue(
                                                                item
                                                            )
                                                        )
                                                    }
                                                >
                                                    Add
                                                </Button>
                                            )}
                                            {_item_values.length > minItems && (
                                                <Button
                                                    icon={<MinusOutlined />}
                                                    onClick={pop}
                                                    danger
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </Space>
                                    );
                                    if (!readonly && _item_values.length > 0)
                                        return [...items, buttons];

                                    return items;
                                }
                            }}
                        </FieldArray>
                    </div>
                </div>
            );
        }
        return null;
    }
}

function replacePipesInFormItem<T extends FormItem>(
    formItem: T,
    values: { [key: string]: any }
): T {
    const newItem = { ...formItem };

    newItem.name = replacePipes(newItem.name, values);

    if ("content" in newItem) {
        newItem.content = replacePipes(newItem.content, values);
    }
    if ("label" in newItem) {
        newItem.label = replacePipes(newItem.label, values);
    }
    if ("templateLabel" in newItem) {
        newItem.templateLabel = replacePipes(newItem.templateLabel, values);
    }
    if ("tooltip" in newItem && newItem.tooltip) {
        newItem.tooltip = replacePipes(newItem.tooltip, values);
    }
    if ("addonAfter" in newItem && newItem.addonAfter) {
        if (typeof newItem.addonAfter === "string") {
            newItem.addonAfter = replacePipes(newItem.addonAfter, values);
        } else {
            newItem.addonAfter = replacePipesInFormItem(
                newItem.addonAfter,
                values
            );
        }
    }
    if ("addonBefore" in newItem && newItem.addonBefore) {
        if (typeof newItem.addonBefore === "string") {
            newItem.addonBefore = replacePipes(newItem.addonBefore, values);
        } else {
            newItem.addonBefore = replacePipesInFormItem(
                newItem.addonBefore,
                values
            );
        }
    }

    if (newItem.type === Item.Radio) {
        newItem.options = newItem.options
            .map((option) =>
                typeof option === "object"
                    ? option
                    : { value: option, label: option }
            )
            .map(({ label, value, ...rest }) => ({
                label: replacePipes(label, values),
                value:
                    typeof value === "string"
                        ? replacePipes(value, values)
                        : value,
                ...rest,
            }));
    } else if (newItem.type === Item.Select) {
        newItem.options = expandOptionPresets(newItem.options, values)
            .map((option) =>
                typeof option === "object"
                    ? option
                    : { value: option, label: option }
            )
            .map(({ label, value, ...rest }) => ({
                label: replacePipes(label, values),
                value:
                    typeof value === "string"
                        ? replacePipes(value, values)
                        : value,
                ...rest,
            }));
    } else if (newItem.type === Item.ParentingTime) {
        if (typeof newItem.numWeeks === "string") {
            newItem.numWeeks = evaluate(newItem.numWeeks, values);
        }
        newItem.timeMode = replacePipes(
            newItem.timeMode ?? "Weekend",
            values
        ) as TimeMode;
    }
    return newItem;
}

function getInitialMultiItemValue(schema: MultiItem) {
    const value: FormValues = {};
    for (let item of schema.rows.flat()) {
        if (item.type === Item.Html) continue;
        if (item.type === Item.AddressBlock) {
            value[item.name.split(".")[2]] = {
                City: null,
                Country: item.defaultCountry ?? null,
                Line2: null,
                PostalCode: null,
                State: null,
                Street: null,
            };
        } else {
            value[item.name.split(".")[2]] = item.initialValue ?? null;
        }

        if ("addonAfter" in item && typeof item.addonAfter === "object") {
            value[item.addonAfter.name.split(".")[2]] =
                item.addonAfter.initialValue ?? null;
        }
        if ("addonBefore" in item && typeof item.addonBefore === "object") {
            value[item.addonBefore.name.split(".")[2]] =
                item.addonBefore.initialValue ?? null;
        }
    }
    return value;
}

function getInitialTouched(initialValues: FormValues) {
    const initialTouched: Record<string, unknown> = {};

    for (let [key, val] of Object.entries(initialValues)) {
        if (Array.isArray(val)) {
            const touchedList = [];
            for (let item of val) {
                if (item !== null && typeof item === "object") {
                    const touched: Record<string, boolean> = {};
                    for (let [_key, _val] of Object.entries(item)) {
                        touched[_key] = _val !== null;
                    }
                    touchedList.push(touched);
                } else {
                    touchedList.push(item !== null);
                }
            }
            initialTouched[key] = touchedList;
        } else if (typeof val === "object" && val !== null) {
            const touchedObject: Record<string, boolean> = {};
            for (let [_key, _val] of Object.entries(val)) {
                touchedObject[_key] = _val !== null;
            }
            initialTouched[key] = touchedObject;
        } else {
            initialTouched[key] = val !== null;
        }
    }

    return initialTouched as FormikTouched<FormValues>;
}

/**
 * Cleans up values from this page of the form before submission.
 *
 * Updates the values as follows:
 * - Sets the value of any field which is hidden by the schema to `null`.
 * - Removes any values that are not for fields in the schema.
 * - Strips leading and trailing whitespace for any value of type `string`.
 *
 * @param values The current values from this page of the form.
 * @param schema The schema for this page of the form.
 * @param context The values form other pages of the form.
 * @returns Cleaned values for this page of the form.
 */
function cleanValues(
    values: FormValues,
    schema: { rows: FormPageSchema["rows"] },
    context: FormValues = {}
) {
    const ITEM_PREFIX_REGEX = /^\w+\.{{\$index}}\./;
    const getItemName = _memoize((fullName: string) =>
        fullName.replace(ITEM_PREFIX_REGEX, "")
    );
    let cleanedValues: FormValues = {};

    for (const row of schema.rows) {
        cleanedValues = Object.assign(
            cleanedValues,
            cleanRow(row, _merge(context, values, cleanedValues))
        );
    }

    return cleanedValues;

    function cleanRow(
        row: FormRow,
        context: FormValues = {},
        $index = 0
    ): FormValues {
        let rowValues: FormValues = {};
        let _context = Object.assign(context, { $index });

        if (isMultiItem(row)) {
            const multiItemValues: {
                [key: string]: FormItemValue;
            }[] = [];

            if (
                allRulesPass(row, _context) &&
                Array.isArray(values[row.name])
            ) {
                // @ts-ignore error about values[row.name]'s type, it is checked above
                for (let i = 0; i < values[row.name].length; i++) {
                    let cleanedItem = {};
                    for (const subRow of row.rows) {
                        cleanedItem = Object.assign(
                            cleanedItem,
                            cleanRow(subRow, context, i)
                        );
                    }

                    multiItemValues.push(cleanedItem);
                }
            }
            rowValues[row.name] = multiItemValues;
        } else {
            for (const item of row) {
                if (item.type !== Item.Html) {
                    if (allRulesPass(item, _context)) {
                        rowValues[getItemName(item.name)] = getIn(
                            values,
                            replacePipes(item.name, { $index })
                        );
                        if (
                            "addonAfter" in item &&
                            item.addonAfter &&
                            typeof item.addonAfter !== "string"
                        ) {
                            rowValues[getItemName(item.addonAfter.name)] =
                                getIn(
                                    values,
                                    replacePipes(item.addonAfter.name, {
                                        $index,
                                    })
                                );
                        }
                        if (
                            "addonBefore" in item &&
                            item.addonBefore &&
                            typeof item.addonBefore !== "string"
                        ) {
                            rowValues[getItemName(item.addonBefore.name)] =
                                getIn(
                                    values,
                                    replacePipes(item.addonBefore.name, {
                                        $index,
                                    })
                                );
                        }
                    } else {
                        rowValues[getItemName(item.name)] = null;
                        // Clear the value in the context so that fields dependant
                        //  on this value also have their value cleared
                        _context = setIn(
                            _context,
                            replacePipes(item.name, { $index }),
                            null
                        );
                        if (
                            "addonAfter" in item &&
                            item.addonAfter &&
                            typeof item.addonAfter !== "string"
                        ) {
                            rowValues[getItemName(item.addonAfter.name)] = null;
                            // Clear the value in the context so that fields dependant
                            //  on this value also have their value cleared
                            _context = setIn(
                                _context,
                                replacePipes(item.addonAfter.name, { $index }),
                                null
                            );
                        }
                        if (
                            "addonBefore" in item &&
                            item.addonBefore &&
                            typeof item.addonBefore !== "string"
                        ) {
                            rowValues[getItemName(item.addonBefore.name)] =
                                null;
                            // Clear the value in the context so that fields dependant
                            //  on this value also have their value cleared
                            _context = setIn(
                                _context,
                                replacePipes(item.addonBefore.name, { $index }),
                                null
                            );
                        }
                    }
                }
            }
        }

        return stripRecursive(rowValues) as FormValues;
    }
}

/**
 * Ensures that the parent Formik.isSubmitting === false when it mounts.
 * This ensures that the form is not stuck in a submitting state if it is
 * submitted, navigated away from and then back.
 *
 * e.g. The last page of the form is submitted and then the back button is clicked on the ReviewPage.
 */
function ClearSubmitting() {
    const { setSubmitting } = useFormikContext<FormItem>();
    useEffect(() => {
        setSubmitting(false);
    }, [setSubmitting]);

    return null;
}
