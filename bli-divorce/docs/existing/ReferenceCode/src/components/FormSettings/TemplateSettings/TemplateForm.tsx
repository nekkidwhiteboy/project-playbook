import { CloseOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
    Button,
    Collapse,
    Form,
    Input,
    InputRef,
    List,
    Select,
    Space,
    Typography,
} from "antd";
import type { FormListProps } from "antd/lib/form";
import { useTemplateUrl } from "components/DocxBuilder/hooks";
import { Template } from "components/DocxBuilder/types";
import { type ForwardedRef, forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserItem from "../UserItem";
import ExtraFieldEditor from "./ExtraFieldEditor";

const urlStaleTime = 300;

interface TemplateFormProps {
    initialValues?: Template;
    onFinish: (values: Template) => Promise<void>;
}
export default forwardRef(function TemplateForm(
    { initialValues, onFinish }: TemplateFormProps,
    fileRef: ForwardedRef<InputRef>
) {
    const navigate = useNavigate();

    const [form] = Form.useForm();

    const { data, status, isStale, isFetching, refetch } = useTemplateUrl({
        variables: { id: initialValues?.id ?? 0 },
        meta: { staleTime: urlStaleTime },
        staleTime: urlStaleTime * 1000,
        gcTime: urlStaleTime * 1000,
        enabled: !!initialValues,
    });

    const [showUpload, setShowUpload] = useState(!initialValues);
    const [error, setError] = useState("");

    return (
        <Form<Template>
            form={form}
            initialValues={
                initialValues ?? {
                    name: "",
                    output_filename: "{{filename}}",
                    visible_to: "Owner",
                    extra_fields: [],
                    preprocessor: "NONE",
                    generator: "AUTO",
                }
            }
            onFinish={(values) =>
                onFinish(values).catch(() => setError("Unable to submit form!"))
            }
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
            validateMessages={{
                required: "This field is required",
            }}
        >
            <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true }, { min: 4, max: 200 }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Output Filename"
                name="output_filename"
                rules={[{ required: true }, { min: 1, max: 200 }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Visible To"
                name="visible_to"
                rules={[{ required: true }]}
            >
                <Select
                    options={[
                        { label: "Anyone", value: "Anyone" },
                        { label: "Just Me", value: "Owner" },
                    ]}
                />
            </Form.Item>
            <Form.Item label="Preprocessor" name="preprocessor">
                <Select
                    options={[
                        { label: "None", value: "NONE" },
                        {
                            label: "CSOW",
                            value: "docx::CSOWPreprocessor",
                        },
                        {
                            label: "FillablePDF",
                            value: "pdf::FillablePdfPreprocessor",
                        },
                    ]}
                />
            </Form.Item>
            <Form.Item
                label="Generator"
                name="generator"
                rules={[{ required: true }]}
            >
                <Select
                    options={[
                        { label: "Auto", value: "AUTO" },
                        { label: "Text", value: "text::TextGenerator" },
                        {
                            label: "DocxGenerator",
                            value: "docx::DocxGenerator",
                        },
                        { label: "PdfFiller", value: "pdf::PdfFiller" },
                        {
                            label: "JinjaPDF",
                            value: "pdf::JinjaPdfFiller",
                        },
                    ]}
                />
            </Form.Item>
            <Form.Item label="File" required>
                {initialValues && (
                    <Space>
                        {(status === "pending" || isFetching) && (
                            <p>Loading...</p>
                        )}
                        {status === "success" && !isFetching && (
                            <>
                                <Typography.Link
                                    href={data.url}
                                    download
                                    disabled={isStale}
                                >
                                    {initialValues?.name}
                                </Typography.Link>
                                {isStale && (
                                    <Button
                                        icon={<ReloadOutlined />}
                                        type="text"
                                        onClick={() => refetch()}
                                        title="Refresh Link"
                                    />
                                )}
                            </>
                        )}
                        {status === "error" && <p>Error getting file url!</p>}
                        {!showUpload && (
                            <Button
                                size="small"
                                onClick={() => setShowUpload(true)}
                            >
                                Update
                            </Button>
                        )}
                    </Space>
                )}
                {showUpload && (
                    <Input
                        type="file"
                        accept="text/plain,text/html,text/csv,text/xml,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        ref={fileRef}
                    />
                )}
            </Form.Item>
            {initialValues ? (
                <Form.Item
                    label="Created By"
                    name="owner"
                    rules={[{ required: true }]}
                >
                    <UserItem />
                </Form.Item>
            ) : null}
            <Collapse
                ghost
                bordered
                defaultActiveKey={
                    (initialValues?.extra_fields.length ?? 0) < 5
                        ? "extra_fields"
                        : undefined
                }
            >
                <Collapse.Panel
                    header={
                        <Typography.Title
                            level={4}
                            style={{ paddingTop: 0, paddingBottom: 0 }}
                        >
                            Extra Fields
                        </Typography.Title>
                    }
                    className="slim"
                    key="extra_fields"
                >
                    <ExtraFieldList name="extra_fields" />
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
            {error && (
                <div className="ant-form-item-explain-error">{error}</div>
            )}
        </Form>
    );
});

function ExtraFieldList(props: Omit<FormListProps, "children">) {
    return (
        <Form.List {...props}>
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
                    renderItem={({ key, ...field }, index) => (
                        <List.Item
                            key={key}
                            actions={[
                                <Button
                                    icon={<CloseOutlined />}
                                    type="text"
                                    title="Remove"
                                    size="small"
                                    onClick={() => remove(index)}
                                />,
                            ]}
                        >
                            <Form.Item
                                {...field}
                                noStyle
                                rules={[{ required: true }]}
                            >
                                <ExtraFieldEditor />
                            </Form.Item>
                        </List.Item>
                    )}
                >
                    {fields.length === 0 && (
                        <List.Item key="empty" style={{ marginLeft: "24px" }}>
                            <div>No Extra Fields</div>
                        </List.Item>
                    )}
                </List>
            )}
        </Form.List>
    );
}
