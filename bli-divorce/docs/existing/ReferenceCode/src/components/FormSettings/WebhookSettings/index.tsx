import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
    useMutation,
    useQueryClient,
    useSuspenseQuery,
    type FetchQueryOptions,
    type QueryClient,
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
import { useCallback, useState } from "react";
import {
    Await,
    Link,
    useLoaderData,
    useNavigate,
    useSearchParams,
    type LoaderFunctionArgs,
} from "react-router-dom";
import { getPaginatedData, getQueryString } from "util/functions";
import type { Paginated } from "util/util-types";
import { WEBHOOK_EVENT_NAMES, type Webhook } from "./types";

const PAGE_SIZE = 10;

export const webhooksQuery = (params: {
    active?: boolean;
    search?: string;
    page?: number;
    page_size?: number | "auto";
}): FetchQueryOptions<Paginated<Webhook>> => ({
    queryKey: ["/webhooks", { params }],
    queryFn: async ({ signal }) =>
        getPaginatedData(
            await api.get<Webhook[]>(`/webhooks/?${getQueryString(params)}`, {
                signal,
            })
        ),
});

export const getLoader =
    (queryClient: QueryClient) =>
    ({ request }: LoaderFunctionArgs) => {
        const url = new URL(request.url);
        return {
            webhooks: queryClient.ensureQueryData(
                webhooksQuery({
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
    const { webhooks } = useLoaderData() as ReturnType<
        ReturnType<typeof getLoader>
    >;

    return (
        <Await resolve={webhooks} errorElement={<p>Error loading webhooks</p>}>
            <WebhookList />
        </Await>
    );
}
Component.displayName = "WebhookSettings";

function WebhookList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data } = useSuspenseQuery({
        ...webhooksQuery({
            active: searchParams.get("active")
                ? searchParams.get("active") === "true"
                : undefined,
            search: searchParams.get("search") ?? "",
            page: parseInt(searchParams.get("page") ?? "1"),
            page_size: PAGE_SIZE,
        }),
    });

    const deleteWebhook = useMutation({
        mutationFn: ({ id }: { id: number }) => api.delete(`/webhooks/${id}/`),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["/webhooks"],
            }),
    });

    const [searchVal, setSearchVal] = useState("");

    const header = (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Space wrap>
                <Input.Search
                    placeholder="Search Webhooks..."
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
                    New Webhook
                </Button>
            </Link>
        </div>
    );

    const getActions = useCallback(
        (hook: Webhook) => [
            <Link to={hook.id.toString()}>
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
                        title: `Are you sure you want to delete "${hook.name}"?`,
                        content: (
                            <p>
                                This action <strong>cannot</strong> be undone.
                            </p>
                        ),
                        okText: "Yes",
                        okType: "danger",
                        cancelText: "No",
                        zIndex: 1050,
                        onOk: () => deleteWebhook.mutateAsync({ id: hook.id }),
                    })
                }
            />,
        ],
        [deleteWebhook]
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
                            <Descriptions>
                                <Descriptions.Item label="Event">
                                    <Typography.Text>
                                        {WEBHOOK_EVENT_NAMES[item.event]}
                                    </Typography.Text>
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
