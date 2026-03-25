import {
    DeleteOutlined,
    EditOutlined,
    LoadingOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
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
import { isAxiosError } from "axios";
import { SelectedFormContext } from "components/SelectedForm";
import { useCallback, useContext, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FormInfoItem from "./FormInfoItem";
import { useDeleteNewResultAction, useNewResultActions } from "./hooks";
import { NewResultAction } from "./types";

export function Component() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedForm = useContext(SelectedFormContext);

    const [searchVal, setSearchVal] = useState(
        searchParams.get("search") ?? ""
    );

    const { data, error, isLoading, isError } = useNewResultActions({
        variables: {
            parent_form: selectedForm.id,
            active: searchParams.get("active")
                ? searchParams.get("active") === "true"
                : undefined,
            search: searchParams.get("search") ?? "",
            page: parseInt(searchParams.get("page") ?? "1"),
            page_size: 10,
        },
    });

    const deleteActionMutation = useDeleteNewResultAction({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: useNewResultActions.getKey(),
            }),
    });

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
                        { label: "Active", value: "true" },
                        { label: "Inactive", value: "false" },
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
                    tagRender={(props) => (
                        <Tag
                            {...props}
                            color={props.value ? "success" : "warning"}
                        >
                            {props.label}
                        </Tag>
                    )}
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
        (action: NewResultAction) => [
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

    if (isError) {
        if (isAxiosError(error) && error.response?.status === 403) {
            return <p>{error.response.data.detail}</p>;
        }
        return <p>Error loading Submit Actions</p>;
    }

    return (
        <List
            header={header}
            dataSource={data?.items}
            loading={{ spinning: isLoading, indicator: <LoadingOutlined /> }}
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
                                <Descriptions.Item label="New Result Form">
                                    <FormInfoItem id={item.new_result_form} />
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
