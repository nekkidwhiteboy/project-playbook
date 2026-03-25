import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, List, Modal, Typography } from "antd";
import { isAxiosError } from "axios";
import { useDeleteTemplate, useTemplates } from "components/DocxBuilder/hooks";
import type { TemplateInfo } from "components/DocxBuilder/types";
import { useCurrentRole } from "hooks/useCurrentUser";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import "../FormSettings.less";
import "./TemplateSettings.less";

export function Component() {
    const navigate = useNavigate();
    const { isAdmin } = useCurrentRole();

    const [searchParams, setSearchParams] = useSearchParams();
    const [searchVal, setSearchVal] = useState(
        searchParams.get("search") ?? ""
    );

    const header = useMemo(
        () => (
            <div className="template-list-header">
                <Input.Search
                    placeholder="Search Templates..."
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
                <Button
                    icon={<PlusOutlined />}
                    type="primary"
                    onClick={() => navigate("new")}
                >
                    New Template
                </Button>
            </div>
        ),
        [navigate, searchParams, searchVal, setSearchParams]
    );
    const queryClient = useQueryClient();
    const deleteTemplateMutation = useDeleteTemplate({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useTemplates.getPrimaryKey()],
            }),
    });
    const { data, status, error } = useTemplates({
        variables: {
            search: searchParams.get("search") ?? "",
            page: parseInt(searchParams.get("page") ?? "1"),
            page_size: 15,
        },
    });

    const getActions = useCallback(
        (template: TemplateInfo) => [
            <Link to={template.id.toString()}>
                <Button
                    icon={isAdmin ? <EditOutlined /> : <EyeOutlined />}
                    type="text"
                    title={isAdmin ? "Edit" : "View"}
                />
            </Link>,
            <Button
                icon={<DeleteOutlined />}
                type="text"
                title="delete"
                danger
                onClick={() =>
                    Modal.confirm({
                        title: `Are you sure you want to delete "${template.name}"?`,
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
                            deleteTemplateMutation.mutateAsync(template.id),
                    })
                }
                disabled={!isAdmin}
            />,
        ],
        [deleteTemplateMutation, isAdmin]
    );
    if (status === "error") {
        if (isAxiosError(error) && error.response?.status === 403) {
            return <p>{error.response.data.detail}</p>;
        }
        return <p>Unable to load Templates</p>;
    }
    return (
        <List
            header={header}
            dataSource={data?.items}
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
                            <Typography.Paragraph
                                ellipsis={{ rows: 1, tooltip: item.name }}
                            >
                                <Typography.Text type="secondary">
                                    #{item.id}
                                </Typography.Text>{" "}
                                {item.name}
                            </Typography.Paragraph>
                        }
                    />
                </List.Item>
            )}
            loading={status === "pending"}
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
            size="small"
            className="template-list"
        />
    );
}
Component.displayName = "TemplateList";
