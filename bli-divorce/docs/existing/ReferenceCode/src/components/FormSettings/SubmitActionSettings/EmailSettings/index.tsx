import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
    type FetchQueryOptions,
    type QueryClient,
    useQueryClient,
    useSuspenseQuery,
} from "@tanstack/react-query";
import {
    Button,
    Descriptions,
    Input,
    List,
    Select,
    Space,
    Tag,
    Typography,
} from "antd";
import confirm from "antd/lib/modal/confirm";
import api from "api";
import { SelectedFormContext } from "components/SelectedForm";
import { useCallback, useContext, useState } from "react";
import {
    Await,
    Link,
    type LoaderFunctionArgs,
    useLoaderData,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { getPaginatedData, getQueryString } from "util/functions";
import type { Paginated } from "util/util-types";
import { useDeleteEmailAction } from "./hooks";
import type { EmailAction } from "./types";

const PAGE_SIZE = 10;

export const emailActionsQuery = (params: {
    parent_form: number;
    active?: boolean;
    search?: string;
    page?: number;
    page_size?: number | "auto";
}): FetchQueryOptions<Paginated<EmailAction>> => ({
    queryKey: ["/submit_actions/email", { ...params }],
    queryFn: async ({ signal }) =>
        getPaginatedData(
            await api.get(
                `/df/submit_actions/email/?${getQueryString(params)}`,
                { signal }
            )
        ),
});

export const getLoader =
    (queryClient: QueryClient) =>
    async ({ params, request }: LoaderFunctionArgs) => {
        const url = new URL(request.url);
        return {
            emailActions: queryClient.ensureQueryData(
                emailActionsQuery({
                    parent_form: parseInt(params.formId ?? "0"),
                    active: url.searchParams.get("active")
                        ? url.searchParams.get("active") === "true"
                        : undefined,
                    search: url.searchParams.get("search") ?? "",
                    page: parseInt(url.searchParams.get("page") ?? "1"),
                    page_size: PAGE_SIZE,
                })
            ),
        };
    };

export function Component() {
    const { emailActions } = useLoaderData() as {
        emailActions: Promise<Paginated<EmailAction>>;
    };
    return (
        <Await
            resolve={emailActions}
            errorElement={<p>Error loading Submit Actions</p>}
        >
            <EmailActionList />
        </Await>
    );
}
Component.displayName = "EmailActionListWrapper";

function EmailActionList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedForm = useContext(SelectedFormContext);

    const { data } = useSuspenseQuery({
        ...emailActionsQuery({
            parent_form: selectedForm.id,
            active: searchParams.get("active")
                ? searchParams.get("active") === "true"
                : undefined,
            search: searchParams.get("search") ?? "",
            page: parseInt(searchParams.get("page") ?? "1"),
            page_size: PAGE_SIZE,
        }),
    });

    const queryClient = useQueryClient();
    const deleteActionMutation = useDeleteEmailAction({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "/submit_actions/email",
                    { parent_form: selectedForm.id },
                ],
            }),
    });

    const [searchVal, setSearchVal] = useState("");

    const header = (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Space wrap>
                <Input.Search
                    placeholder="Search Actions..."
                    onSearch={(newSearch) => {
                        if (newSearch === "") {
                            searchParams.delete("search");
                        } else {
                            searchParams.set("search", newSearch);
                        }
                        setSearchParams(searchParams);
                    }}
                    onChange={(e) => setSearchVal(e.target.value.toLowerCase())}
                    value={searchVal}
                    allowClear
                />
                <Select
                    options={[
                        { label: "All", value: "All" },
                        {
                            label: "Active",
                            value: "true",
                        },
                        {
                            label: "Inactive",
                            value: "false",
                        },
                    ]}
                    value={searchParams.get("active") ?? "All"}
                    onChange={(val) => {
                        if (val === "All") {
                            searchParams.delete("active");
                        } else {
                            searchParams.set("active", val);
                        }
                        setSearchParams(searchParams);
                    }}
                    placeholder="Select Status"
                    bordered={false}
                    dropdownMatchSelectWidth={false}
                />
            </Space>
            <Link to="new">
                <Button icon={<PlusOutlined />} type="primary">
                    New Action
                </Button>
            </Link>
        </div>
    );

    const getActions = useCallback(
        (action: EmailAction) => [
            <Link to={action.id.toString()}>
                <Button
                    key={1}
                    icon={<EditOutlined />}
                    type="text"
                    title={"Edit"}
                />
            </Link>,
            <Button
                key={2}
                icon={<DeleteOutlined />}
                type="text"
                title="delete"
                danger
                onClick={() =>
                    confirm({
                        title: `Are you sure you want to delete "${action.name}"?`,
                        content: (
                            <p>
                                This action <strong>cannot</strong> be undone.
                            </p>
                        ),
                        okText: "Yes",
                        okType: "danger",
                        cancelText: "No",
                        zIndex: 1050,
                        onOk: () =>
                            deleteActionMutation.mutateAsync({ id: action.id }),
                    })
                }
            />,
        ],
        [deleteActionMutation]
    );

    return (
        <List
            header={header}
            dataSource={data.items}
            rowKey={(item) => item.id}
            renderItem={(item) => (
                <List.Item
                    actions={getActions(item)}
                    onDoubleClick={() => navigate(item.id.toString())}
                    className="selectable"
                    style={{ paddingLeft: 5 }}
                >
                    <List.Item.Meta
                        title={
                            <>
                                <Typography.Text type="secondary">
                                    #{item.id}
                                </Typography.Text>{" "}
                                <Typography.Text>{item.name}</Typography.Text>{" "}
                                <Tag
                                    color={item.active ? "success" : "warning"}
                                >
                                    {item.active ? "Active" : "Inactive"}
                                </Tag>
                            </>
                        }
                        description={
                            <Descriptions column={{ xs: 1, sm: 2 }}>
                                <Descriptions.Item label="Subject" span={2}>
                                    {item.subject}
                                </Descriptions.Item>
                                <Descriptions.Item label="To">
                                    {item.to.join(", ")}
                                </Descriptions.Item>
                                <Descriptions.Item label="From">
                                    {item.from_addr}
                                </Descriptions.Item>
                            </Descriptions>
                        }
                    />
                </List.Item>
            )}
            pagination={{
                current: data.page,
                pageSize: data.pageSize,
                total: data.total,
                onChange: (page) => {
                    if (page === 1) {
                        searchParams.delete("page");
                    } else {
                        searchParams.set("page", page.toString());
                    }
                    setSearchParams(searchParams);
                },
                hideOnSinglePage: true,
            }}
        />
    );
}
