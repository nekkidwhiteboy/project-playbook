import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Descriptions, Input, List, Typography } from "antd";
import confirm from "antd/lib/modal/confirm";
import {
    useDeleteTemplateSet,
    useTemplateSets,
} from "components/DocxBuilder/hooks";
import { TemplateSet } from "components/DocxBuilder/types";
import { useCurrentRole } from "hooks/useCurrentUser";
import { useCallback, useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import UserItem from "../UserItem";

import "../FormSettings.less";

export function Component() {
    const params = useParams();
    const formId = parseInt(params.formId ?? "0");

    return (
        <div className="template-set-list">
            <TemplateSetList formId={formId} />
        </div>
    );
}
Component.displayName = "TemplateSetSettings";

interface TemplateSetListProps {
    formId: number;
}

function TemplateSetList({ formId }: TemplateSetListProps) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchVal, setSearchVal] = useState(
        searchParams.get("search") ?? ""
    );

    const { isAdmin } = useCurrentRole();

    const queryClient = useQueryClient();
    const deleteSetMutation = useDeleteTemplateSet({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useTemplateSets.getPrimaryKey()],
            }),
    });

    const { data, status } = useTemplateSets({
        variables: {
            search: searchParams.get("search") ?? "",
            page: parseInt(searchParams.get("page") ?? "1"),
            form: formId,
            page_size: 10,
        },
    });

    const header = useMemo(
        () => (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Input.Search
                    placeholder="Search Template Sets..."
                    style={{ maxWidth: 300, marginRight: 5 }}
                    onSearch={(newSearch) => {
                        if (newSearch === "") {
                            searchParams.delete("search");
                        } else {
                            searchParams.set("search", newSearch);
                        }
                        setSearchParams(searchParams);
                    }}
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    allowClear
                />
                <Link to="new">
                    <Button icon={<PlusOutlined />} type="primary">
                        New Template Set
                    </Button>
                </Link>
            </div>
        ),
        [setSearchParams, searchParams, searchVal]
    );

    const getActions = useCallback(
        (set: TemplateSet) => [
            <Link to={set.id.toString()}>
                <Button
                    key={1}
                    icon={isAdmin ? <EditOutlined /> : <EyeOutlined />}
                    type="text"
                    title={isAdmin ? "Edit" : "View"}
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
                        title: `Are you sure you want to delete "${set.name}"?`,
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
                            deleteSetMutation.mutateAsync({ id: set.id }),
                    })
                }
                disabled={!isAdmin}
            />,
        ],
        [deleteSetMutation, isAdmin]
    );

    if (status === "error") {
        return <p>Error loading Template Sets</p>;
    }
    return (
        <List
            header={header}
            dataSource={data?.items}
            loading={status === "pending"}
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
                                <Typography.Text>{item.name}</Typography.Text>
                            </>
                        }
                        description={
                            <Descriptions column={{ xs: 1, sm: 2 }}>
                                <Descriptions.Item>
                                    {item.templates?.length || "0"} Template
                                    {item.templates?.length === 1 ? "" : "s"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Owner">
                                    <UserItem value={item.owner} />
                                </Descriptions.Item>
                                <Descriptions.Item label="Visible To">
                                    {item.visible_to}
                                </Descriptions.Item>
                            </Descriptions>
                        }
                    />
                </List.Item>
            )}
            pagination={{
                current: data?.page ?? 0,
                pageSize: data?.pageSize ?? 0,
                total: data?.total ?? 0,
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
