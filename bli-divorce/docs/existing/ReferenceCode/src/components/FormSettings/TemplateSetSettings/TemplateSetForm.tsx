import { CloseOutlined, ExportOutlined, PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Collapse,
    Form,
    Input,
    List,
    Select,
    SelectProps,
    Space,
    Typography,
} from "antd";
import type { FormListProps } from "antd/lib/form";
import { useTemplates } from "components/DocxBuilder/hooks";
import type {
    Template,
    TemplateRule,
    TemplateSet,
} from "components/DocxBuilder/types";
import { debounce } from "lodash";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RuleItemList from "../RuleItemList";
import UserItem from "../UserItem";

interface TemplateSetFormProps {
    initialValues?: TemplateSet;
    onFinish: (values: TemplateSet) => Promise<void>;
}

export default function TemplateSetForm({
    initialValues,
    onFinish,
}: TemplateSetFormProps) {
    const navigate = useNavigate();

    const [form] = Form.useForm();

    return (
        <Form<TemplateSet>
            form={form}
            initialValues={initialValues}
            onFinish={(values) =>
                onFinish({
                    ...values,
                    rules: values.rules?.filter((r) => !!r) ?? [],
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
            <Form.Item label="Visible To" name="visible_to" required>
                <Select
                    options={[
                        { label: "Anyone", value: "Anyone" },
                        { label: "Just Me", value: "Owner" },
                    ]}
                />
            </Form.Item>
            {initialValues ? (
                <Form.Item label="Created By" name="owner">
                    <UserItem />
                </Form.Item>
            ) : null}
            <Form.Item name="rules" label="Rules">
                <RuleItemList name="rules" />
            </Form.Item>
            <Collapse
                defaultActiveKey={
                    (initialValues?.templates?.length ?? 0) < 5
                        ? "templates"
                        : undefined
                }
                bordered
                ghost
            >
                <Collapse.Panel
                    header={
                        <Typography.Title level={4}>
                            Templates{" "}
                            <Typography.Text
                                type="secondary"
                                style={{ fontSize: "0.65em" }}
                            >
                                ({initialValues?.templates?.length || "0"}{" "}
                                Templates)
                            </Typography.Text>
                        </Typography.Title>
                    }
                    className="slim"
                    key="templates"
                    forceRender
                >
                    <TemplateItemList name="templates" />
                </Collapse.Panel>
            </Collapse>
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

function TemplateItemList(props: Omit<FormListProps, "children">) {
    const form = Form.useFormInstance();
    return (
        <Form.List
            {...props}
            rules={[
                {
                    validator: async (_, names) => {
                        if (!names || names.length < 1) {
                            return Promise.reject(
                                new Error(
                                    "Template Sets must contain at least 1 template"
                                )
                            );
                        }
                    },
                },
            ]}
        >
            {(fields, { add, remove }, { errors }) => (
                <List
                    footer={
                        <>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => add()}
                            >
                                Add
                            </Button>
                            <Form.ErrorList errors={errors} />
                        </>
                    }
                    dataSource={fields}
                    renderItem={({ key, ...field }, index) => {
                        const selectedTemplate: Template | undefined =
                            form.getFieldValue([
                                "templates",
                                field.name,
                            ])?.template;
                        return (
                            <List.Item
                                key={key}
                                actions={[
                                    <Link
                                        to={`../../templates/${selectedTemplate?.id}`}
                                    >
                                        <Button
                                            icon={<ExportOutlined />}
                                            type="text"
                                            title="Edit Template"
                                            size="small"
                                            disabled={!selectedTemplate}
                                        />
                                    </Link>,
                                    <Button
                                        icon={<CloseOutlined />}
                                        type="text"
                                        title="Remove"
                                        size="small"
                                        onClick={() => {
                                            remove(index);
                                            if (fields.length <= 1) add();
                                        }}
                                    />,
                                ]}
                            >
                                <Form.Item
                                    {...field}
                                    noStyle
                                    rules={[{ required: true }]}
                                >
                                    <TemplateItem
                                        errors={form.getFieldError([
                                            "templates",
                                            field.name,
                                        ])}
                                    />
                                </Form.Item>
                            </List.Item>
                        );
                    }}
                />
            )}
        </Form.List>
    );
}

function TemplateItem({
    value,
    onChange,
    errors: error,
}: {
    value?: TemplateRule;
    onChange?: (value: Partial<TemplateRule>) => void;
    errors?: string[];
}) {
    return (
        <div className="template-item">
            {!value?.template ? (
                <TemplateSelector
                    onChange={(template) =>
                        onChange?.({ template, rule: value?.rule ?? "" })
                    }
                    errors={error}
                />
            ) : (
                <Typography.Paragraph
                    ellipsis={{ rows: 1, tooltip: value?.template.name }}
                >
                    <Typography.Text type="secondary">
                        #{value.template.id}
                    </Typography.Text>{" "}
                    {value.template.name}
                </Typography.Paragraph>
            )}

            <Input.TextArea
                value={value?.rule}
                onChange={(e) => {
                    onChange?.({
                        ...value,
                        rule: e.target.value,
                    });
                }}
                maxLength={256}
                rows={2}
                placeholder="Always"
            />
        </div>
    );
}

interface TemplateSelectorProps
    extends Omit<SelectProps, "options" | "children"> {
    errors?: string[];
}

function TemplateSelector(props: TemplateSelectorProps) {
    const [search, _setSearch] = useState("");
    const { data, status } = useTemplates({ variables: { search } });

    const setSearch = useMemo(() => {
        return debounce((s: string) => _setSearch(s.toLowerCase()), 250);
    }, []);
    const options = useMemo(
        () =>
            data?.items?.map(({ name, id }) => ({
                label: name,
                value: id,
            })) ?? [],
        [data]
    );
    let placeholder = "Select Template";
    if (status === "pending") {
        placeholder = "Loading...";
    } else if (status === "error") {
        placeholder = "Unable to load templates!";
    }

    const { onChange, errors: error, ...selectProps } = props;
    return (
        <div className="template-selector">
            <Select
                {...selectProps}
                options={options}
                placeholder={placeholder}
                onChange={(value, option) => {
                    onChange?.(
                        data?.items?.find((template) => template.id === value),
                        option
                    );
                }}
                onSearch={setSearch}
                filterOption={false}
                showSearch
            />
            {error && (
                <div className="ant-form-item-explain-error">{error}</div>
            )}
        </div>
    );
}
