import { useQuery } from "@tanstack/react-query";
import {
    Button,
    Descriptions,
    Space,
    Table,
    type TablePaginationConfig,
} from "antd";
import type { ColumnType, FilterValue } from "antd/lib/table/interface";
import api from "api";
import DatePicker from "components/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { isNumber } from "lodash";
import { CSSProperties, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UAParser } from "ua-parser-js";
import { getQueryString } from "util/functions";

interface UserEvent {
    id: number;
    type: string;
    target: number;
    source: number | null;
    timestamp: string;
    description: string;
    detail: Record<string, string | null>;
}

type UserEventProperty = Exclude<keyof UserEvent, "details">;

interface UserEventListProps {
    target?: number;
    source?: number;
    cols?: UserEventProperty[];
}

export default function UserEventList({
    source,
    target,
    cols,
}: UserEventListProps) {
    const _cols = cols ?? ["timestamp", "type", "description"];
    const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
        null,
        null,
    ]);
    const [pagination, setPagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: 15,
        onChange: (current) => setPagination((p) => ({ ...p, current })),
        hideOnSinglePage: true,
    });
    const [filteredInfo, setFilteredInfo] = useState<
        Record<string, FilterValue | null>
    >({});
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    const query = {
        source,
        target,
        page: pagination.current,
        page_size: pagination.pageSize,
        timestamp_after: range?.[0]?.format("YYYY-MM-DD"),
        timestamp_before: range?.[1]?.format("YYYY-MM-DD"),
        ...filteredInfo,
    };

    const { data, isPending } = useQuery({
        queryKey: ["/events", query],
        queryFn: async () => {
            const response = await api.get<UserEvent[]>(
                `/auth/events/?${getQueryString(query)}`
            );

            setPagination((pagination) => ({
                ...pagination,
                pageSize: parseInt(
                    response.headers["pagination-page-size"] ?? "25"
                ),
                total: parseInt(response.headers["total-count"] ?? "0"),
            }));

            return response.data;
        },
    });

    const columns: ColumnType<UserEvent>[] = useMemo(
        () => [
            {
                title: "Id",
                dataIndex: "id",
                key: "id",
                width: 75,
            },
            {
                title: "Timestamp",
                dataIndex: "timestamp",
                key: "timestamp",
                width: 180,
                render: (value) =>
                    dayjs(value).format("MM/DD/YYYY [at] HH:mm:ss"),
                filterDropdown: ({ confirm, setSelectedKeys }) => (
                    <div
                        style={{
                            padding: 8,
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <Space direction="vertical">
                            <DatePicker.RangePicker
                                value={range}
                                onChange={(val) => {
                                    if (!val?.[0] && !val?.[1]) {
                                        setSelectedKeys([]);
                                        confirm();
                                    }
                                    setRange(val);
                                }}
                                allowEmpty={[true, true]}
                            />
                            <Space>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setSelectedKeys(["timestamp"]);
                                        confirm();
                                        setRange([
                                            dayjs()
                                                .startOf("day")
                                                .add(-1, "month"),
                                            dayjs().endOf("day"),
                                        ]);
                                    }}
                                >
                                    Past Month
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setSelectedKeys(["timestamp"]);
                                        confirm();
                                        setRange([
                                            dayjs()
                                                .startOf("day")
                                                .add(-1, "week"),
                                            dayjs().endOf("day"),
                                        ]);
                                    }}
                                >
                                    Past Week
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setSelectedKeys(["timestamp"]);
                                        confirm();
                                        setRange([
                                            dayjs().startOf("day"),
                                            dayjs().endOf("day"),
                                        ]);
                                    }}
                                >
                                    Today
                                </Button>
                            </Space>
                        </Space>
                    </div>
                ),
            },
            {
                title: "Type",
                dataIndex: "type",
                key: "type",
                width: 150,
                filters: [
                    {
                        text: "Authentication",
                        value: "",
                        children: [
                            { text: "Login", value: "LOGIN" },
                            { text: "Logout", value: "LOGOUT" },
                            { text: "Lockout", value: "LOCKOUT" },
                            {
                                text: "Login Failure",
                                value: "LOGIN_FAILURE",
                            },
                            {
                                text: "Password Reset Request",
                                value: "PASSWORD_RESET_REQUEST",
                            },
                            { text: "Password Reset", value: "PASSWORD_RESET" },
                        ],
                    },
                    {
                        text: "DocxBuilder",
                        value: "",
                        children: [
                            { text: "Generate Docs", value: "GENERATE_DOCS" },
                        ],
                    },
                ],
                filterMode: "tree",
            },
            {
                title: "Source",
                dataIndex: "source",
                key: "source",
            },
            {
                title: "Target",
                dataIndex: "target",
                key: "target",
            },
            {
                title: "Description",
                dataIndex: "description",
                key: "description",
            },
        ],
        [range]
    );

    return (
        <div>
            <Table
                dataSource={data ?? []}
                loading={isPending}
                rowKey="id"
                columns={columns.filter(({ dataIndex }) =>
                    _cols.includes(dataIndex as UserEventProperty)
                )}
                pagination={pagination}
                scroll={{ y: 585, x: 550, scrollToFirstRowOnChange: true }}
                size="small"
                onChange={(pagination, filters) => {
                    setPagination(pagination as any);
                    setFilteredInfo(filters);
                }}
                expandable={{
                    expandedRowKeys,
                    expandedRowRender,
                    onExpand: (expanded, event) => {
                        if (expanded) {
                            setExpandedRowKeys([event.id]);
                        } else {
                            setExpandedRowKeys([]);
                        }
                    },
                    expandRowByClick: true,
                }}
            />
        </div>
    );
}

function expandedRowRender(event: UserEvent) {
    const labelStyle: CSSProperties = {
        fontWeight: 600,
        textTransform: "capitalize",
    };

    const getItems = (event: { [key: string]: any }) =>
        Object.entries(event).reduce((prev, [key, val]): JSX.Element[] => {
            if (key === "timestamp") {
                return [
                    ...prev,
                    <Descriptions.Item
                        label="Timestamp"
                        labelStyle={labelStyle}
                        key={key}
                    >
                        {dayjs(val).format("MM/DD/YYYY [at] HH:mm:ss")}
                    </Descriptions.Item>,
                ];
            }
            if (key === "user_agent" && val) {
                const parser = new UAParser(val);
                const browser = parser.getBrowser();
                const os = parser.getOS();
                return [
                    ...prev,
                    <Descriptions.Item
                        label="Browser"
                        labelStyle={labelStyle}
                        key={key}
                    >
                        {browser.name} {browser.version}
                    </Descriptions.Item>,
                    <Descriptions.Item
                        label="OS"
                        labelStyle={labelStyle}
                        key={key}
                    >
                        {os.name} {os.version}
                    </Descriptions.Item>,
                ];
            }
            if (val !== null && typeof val === "object") {
                return [...prev, ...getItems(val)];
            }
            if ((key === "target" || key === "source") && isNumber(val)) {
                return [
                    ...prev,
                    <Descriptions.Item
                        label={key}
                        key={key}
                        labelStyle={labelStyle}
                    >
                        <Link to={`/users/${val}`}>{val}</Link>
                    </Descriptions.Item>,
                ];
            }
            return [
                ...prev,
                <Descriptions.Item
                    label={key.replaceAll("_", " ")}
                    key={key}
                    labelStyle={labelStyle}
                >
                    {val ?? "null"}
                </Descriptions.Item>,
            ];
        }, [] as JSX.Element[]);

    return (
        <div style={{ backgroundColor: "#FFFFFF" }}>
            <Descriptions layout="vertical" size="small" bordered>
                {getItems(event)}
            </Descriptions>
        </div>
    );
}
