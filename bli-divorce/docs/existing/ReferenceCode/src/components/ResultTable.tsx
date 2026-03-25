import {
    EditOutlined,
    FileAddOutlined,
    LoadingOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Form,
    Input,
    Modal,
    Popover,
    Select,
    Space,
    Switch,
    Table,
} from "antd";
import type { ColumnType, TablePaginationConfig } from "antd/lib/table";
import type { FilterValue } from "antd/lib/table/interface";
import api from "api";
import { useCurrentRole, type User } from "hooks/useCurrentUser";
import useSessionStorage from "hooks/useSessionStorage";
import { useMemo, useState, type FC } from "react";
import { Link } from "react-router-dom";
import { getQueryString } from "util/functions";
import DocxBuilder from "./DocxBuilder";
import ReviewTable from "./DynamicForm/ReviewTable";
import {
    useDeleteResult,
    useResetResult,
    useResults,
    useUpdateResultStatus,
} from "./DynamicForm/hooks";
import { FormInfo, ResultStatus, type FormResult } from "./DynamicForm/types";
import ExtraActions from "./ExtraActions";
import ResultVersionModal from "./ResultVersionModal";
import UserInfoCard from "./Users/UserInfoCard";

import "./HomePage.less";

const COLUMNS: ColumnType<FormResult>[] = [
    {
        title: "ID",
        dataIndex: "id",
        key: "id",
        defaultSortOrder: "descend",
        sorter: (a, b) => a.id - b.id,
        width: 75,
    },
    {
        title: "Status",
        dataIndex: "result_status",
        key: "result_status",
        filters: [
            { text: "Complete", value: ResultStatus.Complete },
            { text: "In Progress", value: ResultStatus.InProgress },
            { text: "Not Started", value: ResultStatus.NotStarted },
            { text: "Locked", value: ResultStatus.Locked },
            { text: "Failed", value: ResultStatus.Failed },
        ],
        render: (status, result) => (
            <StatusSelect status={status} result={result} />
        ),
    },
];
const USER_COL = {
    title: "User",
    dataIndex: "owner",
    key: "owner",
    ellipsis: true,
    render: (user: User) => (
        <Popover
            content={
                <UserInfoCard
                    userId={user.id}
                    showClientBadge
                    showCopyEmailButton
                />
            }
        >
            <Link to={`/users/${user.id}`} onClick={(e) => e.stopPropagation()}>
                {user.first_name} {user.last_name}
            </Link>
        </Popover>
    ),
};

const FORM_COL = {
    title: "Form",
    dataIndex: "form",
    key: "form",
    ellipsis: true,
    render: (formInfo: FormInfo) => (
        <Link
            to={`/forms/${formInfo.id}/results`}
            onClick={(e) => e.stopPropagation()}
        >
            {formInfo.name}
        </Link>
    ),
};
interface ResultTableProps {
    formId?: number;
    owner?: number;
    search?: string;
}

const ResultTable: FC<ResultTableProps> = ({ formId, search, owner }) => {
    const queryClient = useQueryClient();

    const { isAdmin } = useCurrentRole();

    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState<FormResult>();
    const [pagination, setPagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: 10,
        pageSizeOptions: [5, 10, 25],
        showSizeChanger: true,
    });
    const [filteredInfo, setFilteredInfo] = useState<
        Record<string, FilterValue | null>
    >({});

    const deleteMutation = useDeleteResult({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: useResults.getKey() }),
    });

    const resetMutation = useResetResult({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: useResults.getKey() }),
    });

    const query = {
        form: formId,
        owner,
        page: pagination.current,
        page_size: pagination.pageSize,
        detail: true,
        search,
        ...filteredInfo,
    };
    const { data: results, isFetching: resultsLoading } = useQuery({
        queryKey: [...useResults.getKey(), query],
        queryFn: async () => {
            const response = await api.get<FormResult[]>(
                `/df/results/?${getQueryString(query)}`
            );

            let page_size = parseInt(
                response.headers["pagination-page-size"] ?? "10"
            );
            let total = parseInt(response.headers["total-count"] ?? "0");
            setPagination((pagination) => ({
                ...pagination,
                page_size,
                total,
            }));
            return response.data;
        },
        staleTime: 0,
        enabled: !!formId || !!owner,
    });

    const columns = useMemo<ColumnType<FormResult>[]>(() => {
        const cols = [...COLUMNS];
        if (!formId) {
            cols.splice(1, 0, FORM_COL);
        }
        if (!owner) {
            cols.splice(1, 0, USER_COL);
        }
        cols.push({
            title: "Actions",
            key: "actions",
            fixed: "right",
            align: "center",
            render: (_, result) => (
                <>
                    <Button
                        type="text"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!result.versions[0]?.is_current) {
                                Modal.warning({
                                    content: (
                                        <p>
                                            This result is not using its most
                                            recent version. Documents might not
                                            generate properly!
                                        </p>
                                    ),
                                });
                            }
                            setShowModal(true);
                            setSelectedResult(result);
                        }}
                        icon={<FileAddOutlined />}
                        disabled={
                            result.result_status !== ResultStatus.Complete
                        }
                        title="Generate Documents"
                    />
                    <Link
                        to={`/results/${result.id}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            title="Edit"
                        />
                    </Link>
                    <ExtraActions
                        actions={[
                            {
                                label: "View",
                                action: () => {
                                    window.open(
                                        `/results/${result.id}/summary?headless=true`,
                                        "resultSummary",
                                        "left=100,top=100,width=780,height=800"
                                    );
                                },
                            },
                            {
                                label: "Reset",
                                action: () =>
                                    resetMutation.mutate({
                                        id: result.id,
                                    }),
                                disabled:
                                    result.result_status !==
                                    ResultStatus.InProgress,
                                hideIfDisabled: true,
                                confirm: {
                                    title: "Are you sure reset this result?",
                                    content: (
                                        <div>
                                            <p>
                                                This will clear{" "}
                                                <strong>all</strong> of the
                                                user's responses, requiring them
                                                to restart from the beginning.
                                            </p>
                                            <p>
                                                This action{" "}
                                                <strong>cannot</strong> be
                                                undone.
                                            </p>
                                        </div>
                                    ),
                                },
                            },
                            {
                                label: "Delete",
                                action: () => {
                                    setExpandedRowKeys([]); // Prevents error if this result is expanded
                                    return deleteMutation.mutate({
                                        id: result.id,
                                    });
                                },
                                danger: true,
                                confirm: true,
                                disabled: !isAdmin,
                            },
                        ]}
                    />
                </>
            ),
        });
        return cols;
    }, [formId, owner, deleteMutation, resetMutation, isAdmin]);

    return (
        <>
            <Table
                dataSource={results}
                rowKey={(r) => r.id}
                columns={columns}
                size="small"
                loading={{
                    indicator: <LoadingOutlined />,
                    spinning: resultsLoading,
                }}
                scroll={{ x: 500, scrollToFirstRowOnChange: true }}
                pagination={pagination}
                onChange={(pagination, filters) => {
                    setPagination(pagination);
                    setFilteredInfo(filters);
                }}
                expandable={{
                    expandedRowKeys,
                    expandedRowRender: (result) => (
                        <ResultViewer result={result} height={300} />
                    ),
                    onExpand: (expanded, result) => {
                        if (expanded) {
                            setExpandedRowKeys([result.id]);
                        } else {
                            setExpandedRowKeys([]);
                        }
                    },
                    expandRowByClick: true,
                }}
            />
            <DocxBuilder
                open={showModal && selectedResult !== undefined}
                onOk={() => setShowModal(false)}
                onCancel={() => setShowModal(false)}
                result={selectedResult}
                key={selectedResult?.form.id ?? 0}
            />
        </>
    );
};

export default ResultTable;

interface ResultViewerProps {
    result: FormResult;
    height?: number;
}
const ResultViewer: FC<ResultViewerProps> = ({ result, height }) => {
    const [showAll, setShowAll] = useSessionStorage("resultView_showAll", true);
    const [filter, setFilter] = useState<string>();
    const [labelSet, setLabelSet] = useState<"label" | "name">("label");
    const [showVersions, setShowVersions] = useState(false);

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <Space>
                    <Form.Item style={{ marginBottom: 5 }}>
                        <Input
                            placeholder="Filter..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            suffix={<span />}
                            allowClear
                        />
                    </Form.Item>
                    <Button
                        type="link"
                        onClick={() => setShowVersions(true)}
                        disabled={result.versions.length === 0}
                    >
                        {result.versions.length} version
                        {result.versions.length === 1 ? "" : "s"}
                    </Button>
                    <ResultVersionModal
                        versions={result.versions}
                        open={showVersions}
                        onOk={() => setShowVersions(false)}
                        onCancel={() => setShowVersions(false)}
                    />
                </Space>
                <Space>
                    <Select
                        options={[
                            { label: "Questions", value: "label" },
                            { label: "Field Names", value: "name" },
                        ]}
                        value={labelSet}
                        onSelect={(v) => setLabelSet(v)}
                        style={{ width: 120 }}
                    />
                    <label>
                        Show All{" "}
                        <Switch
                            onChange={(v) => setShowAll(v)}
                            checked={showAll}
                        />
                    </label>
                </Space>
            </div>
            <ReviewTable
                result={result}
                height={height}
                showHidden={showAll}
                filter={filter}
                labelSet={labelSet}
                labelLinksEnabled
                showMeta
            />
        </Space>
    );
};

interface StatusSelectProps {
    status: ResultStatus;
    result: FormResult;
}
const StatusSelect: FC<StatusSelectProps> = ({ status, result }) => {
    const isCurrent = result.versions[0]?.is_current ?? true;

    const { isAdmin } = useCurrentRole();

    const queryClient = useQueryClient();
    const updateResultStatus = useUpdateResultStatus({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useResults.getPrimaryKey()],
            }),
    });

    const handleSelect = (newStatus: ResultStatus) => {
        if (newStatus === status) return;
        updateResultStatus.mutate({ id: result.id, status: newStatus });
    };

    if (isAdmin) {
        return (
            <Select
                value={status}
                bordered={false}
                onClick={(e) => e.stopPropagation()}
                onSelect={handleSelect}
                style={{ width: 115 }}
                showArrow={false}
            >
                <Select.Option value={ResultStatus.Complete}>
                    <span className="result-status-Complete">
                        Complete{isCurrent ? "" : "*"}
                    </span>
                </Select.Option>
                <Select.Option value={ResultStatus.InProgress}>
                    <span className="result-status-In_Progress">
                        In Progress{isCurrent ? "" : "*"}
                    </span>
                </Select.Option>
                <Select.Option value={ResultStatus.NotStarted}>
                    <span className="result-status-Not_Started">
                        Not Started{isCurrent ? "" : "*"}
                    </span>
                </Select.Option>
                <Select.Option value={ResultStatus.Locked}>
                    <span className="result-status-Locked">
                        Locked{isCurrent ? "" : "*"}
                    </span>
                </Select.Option>
                <Select.Option value={ResultStatus.Failed}>
                    <span className="result-status-Failed">
                        Failed{isCurrent ? "" : "*"}
                    </span>
                </Select.Option>
            </Select>
        );
    }
    return (
        <p className={`result-status-${status.replaceAll(" ", "_")}`}>
            {status}
            {isCurrent ? "" : "*"}
        </p>
    );
};
