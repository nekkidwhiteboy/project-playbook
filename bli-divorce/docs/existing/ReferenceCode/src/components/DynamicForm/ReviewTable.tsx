import { useQuery } from "@tanstack/react-query";
import { Col, Divider, List, Row } from "antd";
import api from "api";
import LoadingIndicator from "components/LoadingIndicator";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { getIn } from "formik";
import { ReactNode, useEffect, useState } from "react";
import { formatPhoneNumber } from "react-phone-number-input";
import { Link, useParams } from "react-router-dom";
import { UAParser } from "ua-parser-js";
import "./ReviewTable.less";
import { useResult } from "./hooks";
import { ParentingPeriod } from "./items/ParentingTimeSchedule/types";
import { toPtsString } from "./items/ParentingTimeSchedule/util";
import {
    FormItem,
    FormResult,
    FormRow,
    Item,
    MultiItem,
    type FormInputItem,
} from "./types";
import { allRulesPass, expandOptionPresets, replacePipes } from "./util";

dayjs.extend(customParseFormat);

interface FormReviewTableSchema {
    id: number;
    root_page: number;
    pages: {
        id: number;
        next: {
            page: number;
            rules: string[];
        }[];
        rows: FormRow[];
    }[];
}

interface Props {
    height?: number | string;
    result?: number | FormResult;
    showHidden?: boolean;
    showMeta?: boolean;
    extra?: { [rowName: string]: ReactNode };
    filter?: string;
    labelSet?: "label" | "name";
    labelLinksEnabled?: boolean;
}
const ReviewTable = ({
    extra = {},
    height = "auto",
    labelSet = "label",
    labelLinksEnabled = false,
    showMeta = false,
    ...props
}: Props) => {
    const params = useParams();

    let resultId: number;
    let initResult = false;
    if (props.result === undefined) {
        resultId = parseInt(params.resultId ?? "0");
    } else if (typeof props.result === "number") {
        resultId = props.result;
    } else {
        resultId = props.result.id;
        initResult = true;
    }

    const { data: result, status: resultStatus } = useResult({
        variables: { id: resultId },
        staleTime: initResult ? 1000 : 0,
        initialData: () =>
            initResult ? (props.result as FormResult) : undefined,
    });

    const { data: formSchema, status: schemaStatus } = useQuery({
        queryKey: ["/df/forms", { id: result?.form.id, view: "schema" }],
        queryFn: () =>
            api
                .get<FormReviewTableSchema>(
                    `/df/forms/${result?.form.id}/?view=schema`
                )
                .then((res) => res.data),
        enabled: !!result?.form.id,
        staleTime: 5 * 60 * 1000, // 5 Minutes
    });

    const [items, setItems] = useState<(FormItem | MultiItem)[]>([]);
    const [pageMap, setPageMap] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const meta: { [key: string]: number } = {};
        const items: (FormItem | MultiItem)[] = [];
        if (formSchema && result) {
            const pages = getUsedPages(formSchema, result);
            for (let page of pages) {
                for (let item of page.rows.flat()) {
                    items.push(item);
                    meta[item.name] = page.id;
                }
            }
        }
        setItems(items);
        setPageMap(meta);
    }, [formSchema, result]);

    if (resultStatus === "pending" || schemaStatus === "pending") {
        return <LoadingIndicator />;
    }

    if (resultStatus === "success" && schemaStatus === "success") {
        return (
            <List
                itemLayout="vertical"
                style={{
                    maxHeight: height,
                    overflowY: height === "auto" ? "initial" : "scroll",
                }}
                className="review-table"
            >
                {items
                    .reduce((list, item) => {
                        if (
                            item.type === Item.Html ||
                            (!props.showHidden && item.type === Item.Hidden) ||
                            (!props.showHidden &&
                                "adminItem" in item &&
                                item.adminItem) ||
                            (!props.showHidden &&
                                !allRulesPass(item, result.items))
                        ) {
                            return list;
                        }

                        const label =
                            labelSet === "label"
                                ? replacePipes(item.label ?? "", {
                                      $meta: {
                                          date_start: result.date_start,
                                      },
                                      ...result.items,
                                  })
                                : item.name;
                        if (
                            props.filter &&
                            !label
                                .toLowerCase()
                                .includes(props.filter.toLowerCase())
                        ) {
                            return list;
                        }

                        return [
                            ...list,
                            <List.Item key={item.name}>
                                <Row
                                    gutter={[16, 16]}
                                    key={`${item.name}_label`}
                                >
                                    <Col
                                        md={
                                            item.type === Item.Multi ||
                                            item.type === Item.ParentingTime
                                                ? 24
                                                : 14
                                        }
                                        xs={24}
                                        style={{ fontWeight: 700 }}
                                    >
                                        {labelLinksEnabled ? (
                                            <Link
                                                to={`/results/${result.id}`}
                                                state={{
                                                    pageId: pageMap[item.name],
                                                }}
                                                className="label-link"
                                            >
                                                {label}
                                            </Link>
                                        ) : (
                                            label
                                        )}
                                        {item.name in extra ? (
                                            <>
                                                <br />
                                                {extra[item.name]}
                                            </>
                                        ) : null}
                                    </Col>
                                    {item.type !== Item.Multi &&
                                        item.type !== Item.ParentingTime && (
                                            <Col md={10} xs={24}>
                                                {getDisplayValue(
                                                    item,
                                                    result.items
                                                )}
                                            </Col>
                                        )}
                                </Row>
                                {item.type === Item.Multi
                                    ? getMultiItemRows(
                                          item,
                                          result,
                                          labelSet,
                                          extra
                                      )
                                    : null}
                                {item.type === Item.ParentingTime &&
                                    getIn(result.items, item.name, []).map(
                                        (
                                            period: ParentingPeriod,
                                            $index: number,
                                            list: ParentingPeriod[]
                                        ) => (
                                            <div key={`${item.name}.${$index}`}>
                                                <Row
                                                    key={`${item.name}.${$index}.StartDay`}
                                                    style={{
                                                        marginTop: 5,
                                                    }}
                                                    gutter={[16, 16]}
                                                >
                                                    <Col
                                                        xs={14}
                                                        style={{
                                                            paddingLeft: 16,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        Start Day
                                                    </Col>
                                                    <Col xs={10}>
                                                        {getWeekAndDay(
                                                            period.StartDay
                                                        )}
                                                    </Col>
                                                </Row>
                                                {period.StartTime && (
                                                    <Row
                                                        key={`${item.name}.${$index}.StartTime`}
                                                        style={{
                                                            marginTop: 5,
                                                        }}
                                                        gutter={[16, 16]}
                                                    >
                                                        <Col
                                                            xs={14}
                                                            style={{
                                                                paddingLeft: 16,
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            Start Time
                                                        </Col>
                                                        <Col xs={10}>
                                                            {dayjs(
                                                                period.StartTime,
                                                                "HH:mm"
                                                            ).format("h:mm A")}
                                                        </Col>
                                                    </Row>
                                                )}
                                                <Row
                                                    key={`${item.name}.${$index}.EndDay`}
                                                    style={{
                                                        marginTop: 5,
                                                    }}
                                                    gutter={[16, 16]}
                                                >
                                                    <Col
                                                        xs={14}
                                                        style={{
                                                            paddingLeft: 16,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        End Day
                                                    </Col>
                                                    <Col xs={10}>
                                                        {getWeekAndDay(
                                                            period.EndDay
                                                        )}
                                                    </Col>
                                                </Row>
                                                {period.EndTime && (
                                                    <Row
                                                        key={`${item.name}.${$index}.EndTime`}
                                                        style={{
                                                            marginTop: 5,
                                                        }}
                                                        gutter={[16, 16]}
                                                    >
                                                        <Col
                                                            xs={14}
                                                            style={{
                                                                paddingLeft: 16,
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            End Time
                                                        </Col>
                                                        <Col xs={10}>
                                                            {dayjs(
                                                                period.EndTime,
                                                                "HH:mm"
                                                            ).format("h:mm A")}
                                                        </Col>
                                                    </Row>
                                                )}
                                                {$index < list.length - 1 && (
                                                    <Divider
                                                        dashed
                                                        style={{
                                                            margin: "10px auto",
                                                            width: "98%",
                                                            minWidth: "98%",
                                                        }}
                                                        key={`${item.name}_${$index}_divider`}
                                                    />
                                                )}
                                            </div>
                                        )
                                    )}
                            </List.Item>,
                        ];
                    }, [] as JSX.Element[])
                    .concat(showMeta ? getMetaItems(result) : [])}
            </List>
        );
    }
    return <div>Error Loading Result (#{resultId})</div>;
};
export default ReviewTable;

function getMultiItemRows(
    multiItem: MultiItem,
    result: FormResult,
    labelSet: "label" | "name",
    extra: { [rowName: string]: ReactNode }
) {
    const rows: ReactNode[] = [];
    const itemVals = getIn(result.items, multiItem.name, []);
    for (let $index = 0; $index < itemVals.length; $index++) {
        const context = { ...result.items, $index };
        for (let item of multiItem.rows.flat(2)) {
            const name = replacePipes(item.name, context);
            if (
                item.type !== Item.Html &&
                item.type !== Item.Hidden &&
                allRulesPass(item, context)
            ) {
                const _item = { ...item, name };
                if ("addonAfter" in _item && _item.addonAfter) {
                    if (typeof _item.addonAfter === "string") {
                        _item.addonAfter = replacePipes(
                            _item.addonAfter,
                            context
                        );
                    } else {
                        _item.addonAfter = {
                            ..._item.addonAfter,
                            name: replacePipes(_item.addonAfter.name, context),
                        };
                    }
                }
                if ("addonBefore" in _item && _item.addonBefore) {
                    if (typeof _item.addonBefore === "string") {
                        _item.addonBefore = replacePipes(
                            _item.addonBefore,
                            context
                        );
                    } else {
                        _item.addonBefore = {
                            ..._item.addonBefore,
                            name: replacePipes(_item.addonBefore.name, context),
                        };
                    }
                }
                rows.push(
                    <Row key={name} style={{ marginTop: 5 }} gutter={[16, 16]}>
                        <Col
                            xs={14}
                            style={{ paddingLeft: 16, fontWeight: 500 }}
                        >
                            {labelSet === "label"
                                ? replacePipes(item.label, context)
                                : name}
                            {name in extra ? (
                                <>
                                    <br />
                                    {extra[name]}
                                </>
                            ) : null}
                        </Col>
                        <Col xs={10}>{getDisplayValue(_item, context)}</Col>
                    </Row>
                );
            }
        }
        // Insert divider in between itemsVals
        if ($index < itemVals.length - 1) {
            rows.push(
                <Divider
                    dashed
                    style={{
                        margin: "10px auto",
                        width: "98%",
                        minWidth: "98%",
                    }}
                    key={`${multiItem.name}_${$index}_divider`}
                />
            );
        }
    }
    return rows;
}

function getDisplayValue(
    item: FormInputItem,
    context: {
        [key: string]: any;
    }
): ReactNode {
    let value = getIn(context, item.name);

    if (value === undefined || value === null) {
        return "";
    }

    if (item.type === Item.Date) {
        if (item.mode === "month") {
            value = dayjs(value, "YYYY-MM").format("MMM YYYY");
        } else {
            value = dayjs(value, "YYYY-MM-DD").format("M/D/YYYY");
        }
    } else if (item.type === Item.Time) {
        if (value.length === 8) {
            value = dayjs(value, "HH:mm:ss").format("H:mm:ss A");
        } else {
            value = dayjs(value, "HH:mm").format("H:mm A");
        }
    } else if (item.type === Item.PhoneNumber) {
        value = formatPhoneNumber(value);
    } else if (item.type === Item.Number) {
        value = `${item.prefix || ""}${value.toFixed(item.precision || 0)}`;
    } else if (item.type === Item.ParentingTime) {
        value = toPtsString(value);
    } else if (item.type === Item.Select || item.type === Item.Radio) {
        for (let option of expandOptionPresets(item.options, context)) {
            if (typeof option === "object") {
                if (
                    (typeof option.value !== "string" &&
                        value === option.value) ||
                    (typeof option.value === "string" &&
                        value === replacePipes(option.value, context))
                ) {
                    value = replacePipes(option.label, context);
                    break;
                }
            } else if (value === replacePipes(option, context)) {
                break;
            }
        }
    } else if (item.type === Item.Checkbox) {
        const values = new Set(value);
        const options = expandOptionPresets(item.options, context).map(
            (option) =>
                typeof option === "object"
                    ? option
                    : { value: option, label: option }
        );

        return (
            <ul>
                {options.reduce(
                    (prev, opt, i) =>
                        values.has(opt.value)
                            ? [...prev, <li key={i}>{opt.label}</li>]
                            : prev,
                    [] as ReactNode[]
                )}
            </ul>
        );
    } else if (item.type === Item.Switch) {
        if (item.unCheckedChildren && !value) {
            value = item.unCheckedChildren;
        } else if (item.checkedChildren && value) {
            value = item.checkedChildren;
        } else if (item.innerLabel && value) {
            value = item.innerLabel;
        } else if (item.innerLabel && !value) {
            value = "";
        }
    } else if (item.type === Item.AddressBlock) {
        if (value.Street) {
            return (
                <div>
                    {value.Street}
                    <br />
                    {value.Line2 && (
                        <>
                            {value.Line2}
                            <br />
                        </>
                    )}
                    {value.City}, {value.State} {value.PostalCode}
                    <br />
                    {value.Country}
                </div>
            );
        } else {
            return "";
        }
    }

    if ("addonAfter" in item && item.addonAfter) {
        if (typeof item.addonAfter === "string") {
            value = `${value} ${replacePipes(item.addonAfter, context)}`;
        } else {
            value = `${value} ${getDisplayValue(item.addonAfter, context)}`;
        }
    }

    if ("addonBefore" in item && item.addonBefore) {
        if (typeof item.addonBefore === "string") {
            value = `${replacePipes(item.addonBefore, context)} ${value}`;
        } else {
            value = `${getDisplayValue(item.addonBefore, context)} ${value}`;
        }
    }

    return value.toString();
}

function getWeekAndDay([weekNum, dayNum]: [number, number]): string {
    const DAYS = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];
    return `Week ${weekNum + 1} ${DAYS[dayNum]}`;
}

function getMetaItems(result: FormResult): JSX.Element[] {
    const uaParser = new UAParser(result.user_agent);
    const browser = uaParser.getBrowser();
    const os = uaParser.getOS();
    return [
        <List.Item key="result_status">
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24} style={{ fontWeight: 700 }}>
                    Result Status
                </Col>
                <Col md={10} xs={24}>
                    {result.result_status}
                </Col>
            </Row>
        </List.Item>,
        <List.Item key="result_meta">
            <Row gutter={[16, 16]}>
                <Col md={24} style={{ fontWeight: 700 }}>
                    Meta:
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24}>
                    Date Started
                </Col>
                <Col md={10} xs={24}>
                    {result.date_start
                        ? dayjs(result.date_start).format("M/D/YYYY h:mm A")
                        : "N/A"}
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24}>
                    Last Updated
                </Col>
                <Col md={10} xs={24}>
                    {result.date_update
                        ? dayjs(result.date_update).format("M/D/YYYY h:mm A")
                        : "N/A"}
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24}>
                    Date Submitted
                </Col>
                <Col md={10} xs={24}>
                    {result.date_finish
                        ? dayjs(result.date_finish).format("M/D/YYYY h:mm A")
                        : "N/A"}
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24}>
                    User IP
                </Col>
                <Col md={10} xs={24}>
                    {result.user_ip}
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24}>
                    Browser
                </Col>
                <Col md={10} xs={24}>
                    {browser.name} {browser.version}
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                <Col md={14} xs={24}>
                    OS
                </Col>
                <Col md={10} xs={24}>
                    {os.name} {os.version}
                </Col>
            </Row>
        </List.Item>,
    ];
}

function getUsedPages(
    schema: FormReviewTableSchema,
    result: FormResult
): { id: number; rows: FormRow[] }[] {
    const usedPages = [];
    const pageMap = new Map(schema.pages.map((p) => [p.id, p]));

    let page = pageMap.get(schema.root_page);
    while (page) {
        usedPages.push(page);
        page = pageMap.get(
            page.next.find((nextRules) => allRulesPass(nextRules, result.items))
                ?.page ?? -1 // Valid pages cannot have an id <= 0
        );
    }

    return usedPages;
}
