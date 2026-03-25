import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Col,
    Form,
    Input,
    List,
    Row,
    Select,
    Space,
    Switch,
    Typography,
} from "antd";
import type { FormListProps } from "antd/lib/form";
import type { FormSchema } from "components/DynamicForm/types";
import RuleItemList from "components/FormSettings/RuleItemList";
import { SelectedFormContext } from "components/SelectedForm";
import { CSSProperties, useContext } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import type { NewResultAction } from "./types";

interface $NewResultAction extends Omit<NewResultAction, "item_map"> {
    item_map: [string, string | null][];
}

interface NewResultActionFormProps {
    initialValues?: NewResultAction;
    onFinish: (values: NewResultAction) => Promise<void>;
}

export default function NewResultActionForm({
    initialValues,
    onFinish,
}: NewResultActionFormProps) {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const formOptions = useRouteLoaderData("forms") as Awaited<FormSchema[]>;
    const selectedForm = useContext(SelectedFormContext);

    return (
        <Form<$NewResultAction>
            form={form}
            initialValues={{
                active: false,
                name: "",
                rules: [],
                run_on_resubmit: false,
                new_result_form: selectedForm.id,
                ...initialValues,
                item_map: Object.entries(initialValues?.item_map ?? {}),
            }}
            onFinish={(values) =>
                onFinish({
                    ...values,
                    // Filter out any blank rules
                    rules: values.rules.filter((r) => !!r),
                    // Reformat item_map into object format
                    item_map: values.item_map.reduce(
                        (prev, [key, val]) =>
                            val === null ? key : { ...prev, [key]: val },
                        {}
                    ),
                })
            }
            validateMessages={{
                required: "This field is required",
            }}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
        >
            <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true }, { min: 4, max: 50 }]}
            >
                <Input />
            </Form.Item>
            <Form.Item label="Active" name="active" valuePropName="checked">
                <Switch />
            </Form.Item>
            <Form.Item label="New Result Form" name="new_result_form" required>
                <Select
                    options={
                        formOptions?.map((f) => ({
                            label: f.name,
                            value: f.id,
                        })) ?? []
                    }
                    placeholder="Select Form"
                />
            </Form.Item>
            <Form.Item
                label="Run on Resubmit"
                name="run_on_resubmit"
                valuePropName="checked"
            >
                <Switch />
            </Form.Item>
            <Form.Item name="item_map" label="Mapped Items">
                <MappedItemList name="item_map" />
            </Form.Item>
            <Form.Item name="rules" label="Rules">
                <RuleItemList name="rules" />
            </Form.Item>
            <Form.Item shouldUpdate style={{ margin: "auto 16px" }}>
                {() => (
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {initialValues ? "Save" : "Create"}
                        </Button>
                        <Button onClick={() => navigate(-1)}>Cancel</Button>
                        <Button
                            onClick={() => form.resetFields()}
                            disabled={!form.isFieldsTouched()}
                        >
                            Reset
                        </Button>
                    </Space>
                )}
            </Form.Item>
        </Form>
    );
}

interface MappedItemListProps extends Omit<FormListProps, "children"> {
    addBtnLabel?: string;
    style?: CSSProperties;
    emptyText?: string;
}

export function MappedItemList({
    style = {},
    addBtnLabel = "Add Mapped Item",
    emptyText = "No Mapped Items",
    ...props
}: MappedItemListProps) {
    return (
        <Form.List {...props}>
            {(fields, { add, remove }) => (
                <List
                    dataSource={fields}
                    renderItem={({ key, ...field }, index) => (
                        <List.Item
                            key={key}
                            extra={
                                <Button
                                    icon={<CloseOutlined />}
                                    type="text"
                                    title="remove"
                                    onClick={() => remove(index)}
                                />
                            }
                            style={{ ...style, alignItems: "flex-start" }}
                        >
                            <Row gutter={[5, 5]}>
                                <Col sm={12}>
                                    <Form.Item
                                        name={[field.name, 0]}
                                        rules={[
                                            { required: true },
                                            {
                                                max: 50,
                                                message:
                                                    "Cannot exceed 50 characters",
                                            },
                                        ]}
                                        wrapperCol={{ flex: 1 }}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Input placeholder="Destination Name" />
                                    </Form.Item>
                                </Col>
                                <Col sm={12}>
                                    <Form.Item
                                        name={[field.name, 1]}
                                        wrapperCol={{ flex: "auto" }}
                                        rules={[
                                            { required: true },
                                            {
                                                max: 50,
                                                message:
                                                    "Cannot exceed 50 characters",
                                            },
                                        ]}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Input placeholder="Destination Value" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </List.Item>
                    )}
                    footer={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => add()}
                        >
                            {addBtnLabel}
                        </Button>
                    }
                >
                    {fields.length === 0 && (
                        <List.Item style={{ paddingTop: 6 }}>
                            <Typography.Text type="secondary">
                                {emptyText}
                            </Typography.Text>
                        </List.Item>
                    )}
                </List>
            )}
        </Form.List>
    );
}
